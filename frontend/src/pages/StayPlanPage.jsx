import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useTripBuilder } from "../context/TripBuilderContext";
import DashboardLayout from "../layouts/DashboardLayout";
import { FiArrowLeft, FiMapPin, FiCalendar, FiMoon, FiStar, FiInfo, FiCheck, FiAlertCircle } from "react-icons/fi";
import { getHotelsForStaySegment } from "../services/inventoryService";
import { calculatePriceIntelligence } from "../utils/priceIntelligence";
import { formatDate } from "../utils/formatTrip";
import { getTripBookings } from "../api/tripApi";
import { calculateStayAccommodation, calculateAccommodationSummary, calculateAccommodationBudgetAnalysis, getCampusAccommodationBudget, calculateSegmentBudgetAllocation, isCampusTrip } from "../utils/campusBudgetUtils";

export default function StayPlanPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const viewOnly = state?.viewOnly === true;
  const { trip, setTrip, budgetStats } = useTripBuilder();

  // Canonical campus trip check
  const isCampus = useMemo(() => isCampusTrip(trip), [trip]);

  // Use local state for Stay Plan editing to prevent instant syncing
  const [staySegments, setStaySegments] = useState(() => {
    if (state?.draftStaySegments && Array.isArray(state.draftStaySegments) && state.draftStaySegments.length > 0) {
      return state.draftStaySegments;
    }
    return trip.staySegments || [];
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const originalPersisted = React.useRef(trip?.staySegments || []);

  useEffect(() => {
    if (state?.draftStaySegments && Array.isArray(state.draftStaySegments) && state.draftStaySegments.length > 0) {
      setStaySegments(state.draftStaySegments);
    }
  }, [state?.draftStaySegments]);
  
  // Deterministically derive if there are unsaved geographic changes
  // by structurally comparing local staySegments against the saved trip.staySegments
  const hasUnsavedChanges = useMemo(() => {
    const original = originalPersisted.current || [];
    if (staySegments.length !== original.length) return true;
    for (let i = 0; i < staySegments.length; i++) {
      const loc1 = String(staySegments[i].location || "").toLowerCase().trim();
      const loc2 = String(original[i]?.location || "").toLowerCase().trim();
      if (loc1 !== loc2) return true;
      
      const n1 = parseInt(staySegments[i].nights, 10) || 0;
      const n2 = parseInt(original[i]?.nights, 10) || 0;
      if (n1 !== n2) return true;
    }
    return false;
  }, [staySegments]);

  // Sync local state when trip changes (from other pages) if no unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges && (!state?.draftStaySegments || state.draftStaySegments.length === 0)) {
      setStaySegments(trip.staySegments || []);
      originalPersisted.current = trip.staySegments || [];
    }
  }, [trip.staySegments, hasUnsavedChanges, state?.draftStaySegments]);

  // Local state for fetching status and results
  const [segmentData, setSegmentData] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await getTripBookings(trip._id, token);
        if (res.success) {
          setBookings(res.bookings);
        }
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }
    };
    if (trip._id) {
      fetchBookings();
    }
  }, [trip._id]);

  useEffect(() => {
    // Fetch hotels for each segment independently
    staySegments.forEach((segment) => {
      const segmentKey = segment.id || segment.location;

      // Skip if already fetched or loading
      if (segmentData[segmentKey] || loadingMap[segmentKey] || segment.selectedHotel) {
        return;
      }

      setLoadingMap((prev) => ({ ...prev, [segmentKey]: true }));
      setErrorMap((prev) => ({ ...prev, [segmentKey]: null }));

      const fetchSegmentHotels = async () => {
        try {
          const token = localStorage.getItem("token");
          const hotels = await getHotelsForStaySegment(segment, trip, token);
          setSegmentData((prev) => ({ ...prev, [segmentKey]: hotels }));
        } catch (err) {
          console.error(`Failed to load hotels for ${segment.location}:`, err);
          setErrorMap((prev) => ({ ...prev, [segmentKey]: true }));
        } finally {
          setLoadingMap((prev) => ({ ...prev, [segmentKey]: false }));
        }
      };

      fetchSegmentHotels();
    });
  }, [staySegments, trip, segmentData, loadingMap]);

  // Handle viewing all hotels for a segment
  const handleExploreHotels = (segment, hotels) => {
    navigate("/hotel-details", {
      state: {
        hotels: hotels,
        activeIndex: 0,
        stayContext: {
          staySegmentId: segment.id || segment.location,
          location: segment.location,
          checkIn: segment.checkIn,
          checkOut: segment.checkOut,
          nights: segment.nights,
          travelers: trip.travelers || 2,
          segmentIndex: staySegments.findIndex(s => s === segment || s.id === segment.id)
        },
        draftStaySegments: staySegments
      }
    });
  };

  // Handle viewing a specific hotel
  const handleViewHotel = (segment, hotels, hotelIndex) => {
    navigate("/hotel-details", {
      state: {
        hotels: hotels,
        activeIndex: hotelIndex,
        stayContext: {
          staySegmentId: segment.id || segment.location,
          location: segment.location,
          checkIn: segment.checkIn,
          checkOut: segment.checkOut,
          nights: segment.nights,
          travelers: trip.travelers || 2,
          segmentIndex: staySegments.findIndex(s => s === segment || s.id === segment.id)
        },
        draftStaySegments: staySegments
      }
    });
  };

  // Immediate hotel selection for draft stay segment without navigating away
  const handleSelectHotel = (segmentIndex, hotelData) => {
    const seg = staySegments[segmentIndex];
    const dummySeg = { ...seg, selectedHotel: hotelData };
    const stayPricing = calculateStayAccommodation(dummySeg, trip);
    const updatedHotel = {
      ...hotelData,
      price: stayPricing.groupCost,
      groupPrice: stayPricing.groupCost,
      perStudentPrice: stayPricing.perStudentCost,
      rooms: stayPricing.rooms,
      nightlyPrice: stayPricing.nightlyRate,
      isEstimatedPrice: stayPricing.isEstimated,
    };
    const newSegments = [...staySegments];
    newSegments[segmentIndex] = {
      ...newSegments[segmentIndex],
      selectedHotel: updatedHotel
    };
    updateLocalSegments(newSegments);
  };

  // Calculate Summary
  const accommodationSummary = useMemo(() => {
    return calculateAccommodationSummary(staySegments, trip);
  }, [staySegments, trip]);

  // Overall Trip total nights calculation
  const totalNights = useMemo(() => {
    return staySegments.reduce((acc, seg) => acc + (seg.nights || 0), 0);
  }, [staySegments]);

  // Canonical Accommodation Budget Analysis strictly for Accommodation / Stay Plan Page
  const accommodationBudgetAnalysis = useMemo(() => {
    return calculateAccommodationBudgetAnalysis(trip, staySegments);
  }, [trip, staySegments]);

  const [editingSegmentIdx, setEditingSegmentIdx] = useState(null);
  const [editForm, setEditForm] = useState({ location: '', nights: 1 });
  const [validationError, setValidationError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [missingHotelsModal, setMissingHotelsModal] = useState(null);
  const [removeConfirmation, setRemoveConfirmation] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const getTransitDays = useCallback(() => {
    const transitDays = new Set();
    if (!trip || !trip.itinerary || !Array.isArray(trip.itinerary)) return transitDays;
    
    trip.itinerary.forEach((day, index) => {
      if (Array.isArray(day.plan)) {
        day.plan.forEach(item => {
           const cat = String(item.category || "").toLowerCase();
           if (cat.includes("transport") || item.trainNumber || item.flightNumber) {
              const timeStr = item.startTime || (item.time ? String(item.time).split("-")[0] : null);
              const endStr = item.endTime || (item.time ? String(item.time).split("-")[1] : null);
              
              const timeToMins = (t) => {
                if (!t) return null;
                const parts = t.trim().split(/\s+/);
                if (parts.length < 2) return null;
                const [time, period] = parts;
                const tParts = time.split(":");
                if (tParts.length < 2) return null;
                let h = parseInt(tParts[0], 10);
                const m = parseInt(tParts[1], 10);
                if (period.toLowerCase() === "pm" && h !== 12) h += 12;
                if (period.toLowerCase() === "am" && h === 12) h = 0;
                return h * 60 + m;
              };

              const tStart = timeToMins(timeStr);
              const tEnd = timeToMins(endStr);
              if (tStart !== null && tEnd !== null && tEnd < tStart) {
                 transitDays.add(index);
              }
           }
        });
      }
    });
    return transitDays;
  }, [trip]);

  const recalculateDates = (segments) => {
     let currentDate = new Date(trip.startDate + (trip.startDate.includes('T') ? '' : 'T00:00:00Z'));
     const transitDays = getTransitDays();
     let currentDayIndex = 0; // days offset from start

     segments.forEach(s => {
       // Skip transit nights before assigning checkIn
       while (transitDays.has(currentDayIndex)) {
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
          currentDayIndex++;
       }
       
       s.checkIn = currentDate.toISOString().split("T")[0];
       
       let nightsToAssign = parseInt(s.nights, 10) || 0;
       while (nightsToAssign > 0) {
           currentDate.setUTCDate(currentDate.getUTCDate() + 1);
           currentDayIndex++;
           
           if (!transitDays.has(currentDayIndex - 1)) {
               nightsToAssign--;
           }
       }
       s.checkOut = currentDate.toISOString().split("T")[0];
     });
     return segments;
  };

  // Calculate required overnight nights dynamically
  const expectedTripNights = useMemo(() => {
    if (!trip || !trip.startDate || !trip.endDate) return 0;
    
    const transitDays = getTransitDays();
    const transitNights = transitDays.size;

    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) - transitNights;
  }, [trip, getTransitDays]);

  // Derived state for the sticky action bar
  const totalStayNights = staySegments.reduce((sum, seg) => sum + (parseInt(seg.nights, 10) || 0), 0);
  const selectedHotelsCount = staySegments.filter(s => s.selectedHotel).length;
  const isStayPlanValid = staySegments.length > 0 && totalStayNights === expectedTripNights;

  // If no trip is found, redirect to planner
  if (!trip) {
    return <Navigate to="/planner" replace />;
  }

  const updateLocalSegments = (newSegments) => {
     setStaySegments(recalculateDates(newSegments));
  };

  const handleSaveStayPlan = () => {
    // 1. Validation: Nights must be positive
    for (let i = 0; i < staySegments.length; i++) {
        const n = parseInt(staySegments[i].nights, 10);
        if (isNaN(n) || n <= 0) {
            alert(`Cannot save Stay Plan: Segment ${i + 1} must have at least 1 night.`);
            return;
        }
    }

    // 2. Validation: valid geographic location
    const hasInvalid = staySegments.some(s => {
       const loc = (s.location || "").toLowerCase().trim();
       return !loc || loc === "new destination" || loc.includes("hotel") || loc.includes("resort") || loc.includes("boutique");
    });
    if (hasInvalid) {
       alert("Cannot save Stay Plan: One or more segments have an invalid geographic location.");
       return;
    }

    // 3. Compare actual required overnight nights vs covered nights
    if (totalStayNights !== expectedTripNights) {
       const diff = expectedTripNights - totalStayNights;
       const start = new Date(trip.startDate);
       const end = new Date(trip.endDate);
       const tripDuration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
       if (diff > 0) {
           setValidationError({
               type: 'incomplete',
               tripDuration,
               expectedTripNights,
               totalStayNights,
               missingNights: diff
           });
           return;
       } else {
           setValidationError({
               type: 'overassigned',
               tripDuration,
               expectedTripNights,
               totalStayNights,
               extraNights: Math.abs(diff)
           });
           return;
       }
    }

    // 4. Check if any segment is missing a hotel
    const missingHotels = staySegments.filter(s => !s.selectedHotel);
    if (missingHotels.length > 0) {
       setMissingHotelsModal({
          totalSegments: staySegments.length,
          selectedCount: staySegments.length - missingHotels.length,
          missingCount: missingHotels.length,
          missingSegments: missingHotels
       });
       return;
    }
    
    // 5. Open confirmation modal before executing single transaction
    setShowConfirmModal(true);
  };

  const executeSaveStayPlan = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const { syncItinerary } = await import("../api/tripApi");
      const res = await syncItinerary(trip._id, staySegments, token);
      if (res.success && res.trip) {
        setTrip(res.trip);
        originalPersisted.current = res.trip.staySegments || [];
        setStaySegments(res.trip.staySegments || []);
        setSyncSuccess(true);
      }
    } catch (err) {
      console.error("Failed to sync itinerary:", err);
      setSyncError(err.response?.data?.message || err.message);
    } finally {
      setIsSyncing(false);
    }
  };



  const handleEditClick = (idx, segment) => {
     setEditingSegmentIdx(idx);
     setEditForm({ location: segment.location, nights: segment.nights });
  };

  const handleSaveEdit = async (idx) => {
     let locationChanged = staySegments[idx].location !== editForm.location || editForm.location === "New Destination";
     let validatedLocation = editForm.location.trim();

     if (locationChanged) {
        setIsSyncing(true);
        try {
          const token = localStorage.getItem("token");
          const { getPlaces } = await import("../api/placeApi");
          const places = await getPlaces(validatedLocation, "city", token);

          if (!places || places.length === 0) {
            alert("Could not resolve this location. Please enter a valid geographic destination.");
            setIsSyncing(false);
            return;
          }

          const canonicalLocation = places[0].name || places[0].displayName?.text || places[0].formattedAddress.split(",")[0];
          const canonicalLower = canonicalLocation.toLowerCase();
          const inputLower = validatedLocation.toLowerCase();

          // Reject if the canonical name is a hotel/business
          const isBusiness = canonicalLower.includes("hotel") || 
                             canonicalLower.includes("resort") || 
                             canonicalLower.includes("boutique") || 
                             canonicalLower.includes("guest house") ||
                             canonicalLower.includes("homestay") ||
                             canonicalLower.includes("restaurant");

          // Reject free-form descriptive text (e.g. "a nice destination near manali")
          // Relaxed this to allow valid aliases like Alleppey -> Alappuzha
          const isDescriptive = inputLower.split(/\s+/).length > 3 && 
                                !canonicalLower.includes(inputLower.split(" ")[0]) &&
                                !inputLower.includes(canonicalLower);

          if (isBusiness || isDescriptive) {
            alert("Please enter a valid geographic destination/city name. Avoid descriptive phrases or specific hotel names.");
            setIsSyncing(false);
            return;
          }
          
          validatedLocation = canonicalLocation; // Normalize to canonical geographic location
        } catch (err) {
          console.error("Location validation failed:", err);
          alert("Error validating location. Please try again.");
          setIsSyncing(false);
          return;
        }
        setIsSyncing(false);
     }

     const newSegments = [...staySegments];
     // Re-check just in case normalization changed it back to original
     locationChanged = newSegments[idx].location !== validatedLocation;

     newSegments[idx] = {
         ...newSegments[idx],
         location: validatedLocation,
         nights: parseInt(editForm.nights, 10) || 1,
         manuallyEdited: true
     };
     
     if (locationChanged) {
         newSegments[idx].selectedHotel = null; // Clear hotel selection when location changes
     }
     
     updateLocalSegments(newSegments);
     setEditingSegmentIdx(null);
  };

  const handleRemoveSegment = (idx) => {
     setRemoveConfirmation(idx);
  };
  
  const confirmRemoveSegment = () => {
     if (removeConfirmation !== null) {
         const newSegments = [...staySegments];
         newSegments.splice(removeConfirmation, 1);
         updateLocalSegments(newSegments);
         setRemoveConfirmation(null);
     }
  };

  const handleMoveSegment = (idx, direction) => {
     if (direction === "up" && idx > 0) {
         const newSegments = [...staySegments];
         const temp = newSegments[idx];
         newSegments[idx] = newSegments[idx - 1];
         newSegments[idx - 1] = temp;
         updateLocalSegments(newSegments);
     } else if (direction === "down" && idx < staySegments.length - 1) {
         const newSegments = [...staySegments];
         const temp = newSegments[idx];
         newSegments[idx] = newSegments[idx + 1];
         newSegments[idx + 1] = temp;
         updateLocalSegments(newSegments);
     }
  };

  const handleAddSegment = () => {
     const newSegments = [...staySegments];
     newSegments.push({
         id: `stay-manual-${Date.now()}`,
         location: "New Destination",
         nights: 1,
         manuallyEdited: true
     });
     updateLocalSegments(newSegments);
     setEditingSegmentIdx(newSegments.length - 1);
     setEditForm({ location: "New Destination", nights: 1 });
  };

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="flex flex-col gap-6 pb-12 max-w-5xl mx-auto mt-4">

        {/* Page Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Itinerary</span>
          </button>

          {isCampus && (
            <div className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20">
              <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">
                Campus Educational Trip
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                {trip.organizationDetails?.name || 'Organization'} · {trip.source} → {trip.destination}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>{trip.itinerary?.length || totalNights} Days</span>
                <span className="hidden sm:inline">•</span>
                <span>{accommodationBudgetAnalysis.expectedStudents} Students / Travelers</span>
                <span className="hidden sm:inline">•</span>
                <span>Budget per Student: ₹{accommodationBudgetAnalysis.overallTripBudgetPerStudent.toLocaleString()}</span>
                <span className="hidden sm:inline">•</span>
                <span>Total Trip Budget: ₹{accommodationBudgetAnalysis.overallTripBudgetGroup.toLocaleString()}</span>
                <span className="hidden sm:inline">•</span>
                <span>Target Accommodation (50%): ₹{accommodationBudgetAnalysis.targetAccommodationBudgetPerStudent.toLocaleString()} / Student</span>
                <span className="hidden sm:inline">•</span>
                <span>Max Accommodation Allocation (60%): ₹{accommodationBudgetAnalysis.maxAccommodationBudgetPerStudent.toLocaleString()} / Student</span>
              </div>
            </div>
          )}

          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Stay Plan</h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
            Find the right stay for every stop in your journey.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {staySegments.length > 0 && (
              <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
                {staySegments.map(s => s.location).join(" → ")}
              </span>
            )}
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {staySegments.length} stay segment{staySegments.length !== 1 ? 's' : ''}
            </span>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {totalNights} night{totalNights !== 1 ? 's' : ''}
            </span>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1">
              {isCampus ? accommodationBudgetAnalysis.expectedStudents : (trip?.travelers || 2)} traveler{(isCampus ? accommodationBudgetAnalysis.expectedStudents : (trip?.travelers || 2)) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Timeline representation */}
        {staySegments.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] shadow-xs">
            {staySegments.map((segment, idx) => (
              <React.Fragment key={idx}>
                <div className="flex-1 flex flex-col justify-center items-center text-center p-2 rounded-xl bg-slate-50 dark:bg-[#1a233a] border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">Stay {idx + 1}</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{segment.location}</span>
                  <span className="text-xs font-semibold text-slate-500 mt-1">{segment.nights} night{segment.nights !== 1 ? 's' : ''}</span>
                </div>
                {idx < staySegments.length - 1 && (
                  <div className="hidden sm:flex flex-col justify-center items-center text-slate-300 dark:text-slate-700">
                    <FiArrowLeft className="rotate-180 text-xl" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Segments */}
        <div className="flex flex-col gap-8">
          {staySegments.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e]">
              <p className="text-sm font-semibold text-slate-500">No stay segments found for this trip.</p>
            </div>
          ) : (
            staySegments.map((segment, index) => {
              const segmentKey = segment._id || segment.id || `${index}-${segment.location}`;
              const dataKey = segment.id || segment.location; // Used for data mapping
              const isLoading = loadingMap[dataKey];
              const isError = errorMap[dataKey];
              const hotels = segmentData[dataKey] || [];
              const hasPricedHotels = hotels.some(h => h.nuitee?.livePriceAvailable);
              const pricedCount = hotels.filter(h => h.nuitee?.livePriceAvailable).length;

              const { recommendations, metadata } = calculatePriceIntelligence(hotels, trip);

              return (
                <section key={segmentKey} id={`segment-${index}`} className="flex flex-col gap-4">
                  {/* Segment Header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-slate-200 dark:border-slate-800 pb-4">
                    {editingSegmentIdx === index ? (
                      <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/50">
                        <div className="flex gap-4 mb-3">
                           <div className="flex-1">
                             <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                             <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold" />
                           </div>
                           <div className="w-24">
                             <label className="text-xs font-bold text-slate-500 uppercase">Nights</label>
                             <input type="number" min="1" value={editForm.nights} onChange={(e) => setEditForm({...editForm, nights: e.target.value})} className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold" />
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => handleSaveEdit(index)} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700">Save</button>
                           <button onClick={() => setEditingSegmentIdx(null)} className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-between w-full">
                        <div>
                          <div className="text-[10px] font-black text-indigo-500 tracking-widest uppercase mb-1 flex gap-2 items-center">
                            <span>0{index + 1}</span>
                            {segment.manuallyEdited && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[8px]">Edited</span>}
                          </div>
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{segment.location}</h2>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <FiCalendar className="text-indigo-500" />
                              <span>Check-in: {formatDate(segment.checkIn)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FiCalendar className="text-indigo-500" />
                              <span>Check-out: {formatDate(segment.checkOut)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <FiMoon className="text-indigo-500" />
                              <span>{segment.nights} night{segment.nights !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {isCampus && (() => {
                            const segAlloc = calculateSegmentBudgetAllocation(segment, staySegments, trip);
                            if (!segAlloc || !segAlloc.isCampus) return null;
                            return (
                              <div className="mt-2.5 inline-flex flex-wrap items-center gap-2 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                                <span>Segment Max Allocation: ₹{segAlloc.segmentMaxBudgetPerStudent.toLocaleString(undefined, { maximumFractionDigits: 2 })} / student</span>
                                <span className="text-indigo-400 dark:text-indigo-600">•</span>
                                <span>₹{segAlloc.segmentMaxBudgetGroup.toLocaleString()} group</span>
                                <span className="text-indigo-400 dark:text-indigo-600">•</span>
                                <span className="text-slate-500 font-medium">{segment.nights} of {totalNights} nights</span>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex flex-col gap-2 items-end justify-start">
                          {!viewOnly && (
                            <>
                              <div className="flex gap-1 mb-1">
                                <button onClick={() => handleMoveSegment(index, 'up')} disabled={index === 0} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-30 text-xs font-bold">↑</button>
                                <button onClick={() => handleMoveSegment(index, 'down')} disabled={index === staySegments.length - 1} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded disabled:opacity-30 text-xs font-bold">↓</button>
                              </div>
                              <button onClick={() => handleEditClick(index, segment)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">Edit</button>
                              <button onClick={() => handleRemoveSegment(index)} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">Remove</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selected Hotel for this Segment */}
                  {segment.selectedHotel ? (
                    <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 shadow-xs">
                      {bookings.find(b => b.staySegmentId === segment.id) && (
                        <div className="absolute top-0 right-10 p-2 bg-slate-800 text-white text-xs font-bold rounded-bl-xl shadow-sm z-10">
                          Status: {bookings.find(b => b.staySegmentId === segment.id).status.replace("_", " ")}
                        </div>
                      )}
                      <div className="absolute top-0 right-0 p-3 bg-emerald-500 rounded-bl-xl shadow-sm z-10">
                        <FiCheck className="text-white font-bold" />
                      </div>
                      <div className="mb-3 text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                        ✓ Your Selected Stay
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-32 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800">
                          {segment.selectedHotel.image && <img src={segment.selectedHotel.image} alt={segment.selectedHotel.name} className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{segment.selectedHotel.name}</h3>
                            <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                              <span>{formatDate(segment.checkIn)} → {formatDate(segment.checkOut)}</span>
                              <span>•</span>
                              <span>{segment.nights} nights</span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                            <div>
                              {(() => {
                                const stayPricing = calculateStayAccommodation(segment, trip);
                                if (!stayPricing.hasHotel) {
                                  return <span className="text-sm font-bold text-slate-500">Price unavailable</span>;
                                }
                                if (isCampus) {
                                  const segAlloc = calculateSegmentBudgetAllocation(segment, staySegments, trip);
                                  const isOverSeg = segAlloc && stayPricing.perStudentCost > segAlloc.segmentMaxBudgetPerStudent;
                                  return (
                                    <div>
                                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                        <div className="text-lg font-black text-slate-900 dark:text-white">
                                          ₹{stayPricing.groupCost.toLocaleString()} <span className="text-xs font-semibold text-slate-500">estimated group cost</span>
                                        </div>
                                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                          ₹{stayPricing.perStudentCost.toLocaleString()} / student
                                        </div>
                                      </div>
                                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                        ₹{stayPricing.nightlyRate.toLocaleString()} / room / night • {stayPricing.rooms} rooms ({stayPricing.studentsPerRoom} students/room) • {stayPricing.nights} nights
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded">
                                          Estimated Accommodation
                                        </span>
                                        {stayPricing.requiresVerification && (
                                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded">
                                            Requires Verification
                                          </span>
                                        )}
                                        {isOverSeg && (
                                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/30 px-2 py-0.5 rounded" title="This segment exceeds proportional allocation, but can be balanced by unused budget in other segments if overall accommodation limit is respected.">
                                            Exceeds Segment Allocation (+₹{Math.round(stayPricing.perStudentCost - segAlloc.segmentMaxBudgetPerStudent).toLocaleString()}/student)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div>
                                    <div className="text-lg font-black text-slate-900 dark:text-white">
                                      ₹{(segment.selectedHotel.price || stayPricing.groupCost).toLocaleString()} <span className="text-xs font-semibold text-slate-500">total</span>
                                    </div>
                                    {segment.selectedHotel.isEstimatedPrice && (
                                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">Estimated Fallback</div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            <div className="flex gap-2">
                              {(() => {
                                const booking = bookings.find(b => b.staySegmentId === segment.id);
                                if (booking && booking.externalUrl) {
                                  return (
                                    <a
                                      href={booking.externalUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 rounded-lg border border-indigo-600 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition flex items-center justify-center whitespace-nowrap"
                                    >
                                      Book Externally ↗
                                    </a>
                                  );
                                }
                                return null;
                              })()}
                              <button
                                onClick={() => handleViewHotel(segment, [segment.selectedHotel], 0)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition whitespace-nowrap"
                              >
                                View Details
                              </button>
                              {!viewOnly && (
                                <button
                                  onClick={() => {
                                    // Clear selection to change hotel
                                    const newSegments = [...staySegments];
                                    newSegments[index].selectedHotel = null;
                                    updateLocalSegments(newSegments);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition whitespace-nowrap"
                                >
                                  Change Hotel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Hotel Discovery & Intelligence
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 shadow-xs">
                      {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                          <p className="text-sm font-semibold text-slate-500">Finding stays in {segment.location}...</p>
                        </div>
                      ) : isError ? (
                        <div className="py-8 text-center bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400">Couldn't load hotel rates right now.</p>
                          <button onClick={() => window.location.reload()} className="mt-3 text-xs font-bold text-red-600 underline">Try again</button>
                        </div>
                      ) : hotels.length === 0 ? (
                        <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                          <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No hotel options found for {segment.location}.</p>
                        </div>
                      ) : (
                        <>
                          {/* Price Intelligence context */}
                          <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                            <div>
                              <h3 className="text-base font-black text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                                <span className="text-indigo-600 dark:text-indigo-400">✦</span> Price Intelligence
                              </h3>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {pricedCount > 0
                                  ? `Based on ${pricedCount} hotels with verified live prices.`
                                  : "Hotels found, but live rates are currently unavailable."}
                              </p>
                            </div>
                            {pricedCount > 0 && (
                              <div className="px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 text-[9px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                {metadata?.isDemoMode ? "Demo pricing · simulated data" : "Verified live provider rate"}
                              </div>
                            )}
                          </div>

                          {/* Recommendation Cards */}
                          <div className="grid gap-4 md:grid-cols-3 mb-6">
                            {recommendations.length > 0 ? recommendations.map((rec, i) => (
                              <div key={rec.id || i} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 transition-transform hover:border-indigo-300 dark:hover:border-indigo-600">
                                <div className="mb-3 flex items-center justify-between">
                                  <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}`}>
                                    <span>{rec.icon}</span> {rec.category}
                                  </span>
                                </div>
                                <div className="flex gap-3 mb-3">
                                  <div className="w-12 h-12 rounded bg-slate-200 shrink-0 overflow-hidden">
                                    {rec.image && <img src={rec.image} alt={rec.name} className="w-full h-full object-cover" />}
                                  </div>
                                  <div>
                                    <h4 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white" title={rec.name}>{rec.name}</h4>
                                    {rec.rating > 0 && (
                                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 mt-0.5">
                                        <FiStar className="fill-amber-500" />
                                        {rec.rating} {rec.reviews && `· ${rec.reviews} reviews`}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="mb-3">
                                  {isCampus ? (() => {
                                    const recPricing = calculateStayAccommodation({ ...segment, selectedHotel: rec }, trip);
                                    return (
                                      <div>
                                        <div className="text-base font-black text-slate-900 dark:text-white">
                                          ₹{recPricing.groupCost.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">estimated group</span>
                                        </div>
                                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                          ₹{recPricing.perStudentCost.toLocaleString()} / student
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                          ₹{recPricing.nightlyRate.toLocaleString()}/night · {recPricing.rooms} rooms ({recPricing.studentsPerRoom}/room)
                                        </div>
                                      </div>
                                    );
                                  })() : rec.nuitee?.livePriceAvailable ? (
                                    <>
                                      <div className="text-base font-black text-slate-900 dark:text-white">₹{rec.nuitee.totalPrice.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">total</span></div>
                                      {rec.nuitee.nightlyPrice && <div className="text-[10px] font-semibold text-slate-500">₹{rec.nuitee.nightlyPrice.toLocaleString()}/night</div>}
                                    </>
                                  ) : (
                                    <div className="text-xs font-bold text-slate-500">Live price unavailable</div>
                                  )}
                                </div>

                                {rec.reasons && rec.reasons.length > 0 && (
                                  <div className="mb-3">
                                    {rec.reasons.map((r, idx) => (
                                      <p key={idx} className="flex items-start gap-1 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                        <span className="mt-0.5 text-indigo-500">✓</span>
                                        <span className="line-clamp-1">{r}</span>
                                      </p>
                                    ))}
                                  </div>
                                )}

                                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                                  <button onClick={() => handleViewHotel(segment, hotels, rec.originalIndex)} className="flex-1 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">View Details</button>
                                  {!viewOnly && (
                                    <button onClick={() => handleSelectHotel(index, rec)} className="flex-1 py-1.5 rounded bg-indigo-600 text-[10px] font-bold text-white hover:bg-indigo-700 transition">Select for Stay</button>
                                  )}
                                </div>
                              </div>
                            )) : (
                              // Limited comparison view
                              hotels.slice(0, 3).map((hotel, i) => (
                                <div key={hotel.id || i} className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                                  <h4 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white mb-1" title={hotel.name}>{hotel.name}</h4>
                                  <div className="mb-3">
                                    {isCampus ? (() => {
                                      const hotelPricing = calculateStayAccommodation({ ...segment, selectedHotel: hotel }, trip);
                                      return (
                                        <div>
                                          <div className="text-base font-black text-slate-900 dark:text-white">
                                            ₹{hotelPricing.groupCost.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">estimated group</span>
                                          </div>
                                          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                            ₹{hotelPricing.perStudentCost.toLocaleString()} / student
                                          </div>
                                        </div>
                                      );
                                    })() : hotel.nuitee?.livePriceAvailable ? (
                                      <div className="text-base font-black text-slate-900 dark:text-white">₹{hotel.nuitee.totalPrice.toLocaleString()} <span className="text-[10px] font-semibold text-slate-500">total</span></div>
                                    ) : (
                                      <div className="text-xs font-bold text-slate-500">Live price unavailable</div>
                                    )}
                                  </div>
                                  <div className="mt-auto flex gap-2">
                                    <button onClick={() => handleViewHotel(segment, hotels, i)} className="flex-1 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">View Details</button>
                                    {!viewOnly && (
                                      <button onClick={() => handleSelectHotel(index, hotel)} className="flex-1 py-1.5 rounded bg-indigo-600 text-[10px] font-bold text-white hover:bg-indigo-700 transition">Select for Stay</button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="text-center border-t border-slate-100 dark:border-slate-800 pt-5 mt-2">
                            <button
                              onClick={() => handleExploreHotels(segment, hotels)}
                              className="px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                            >
                              Explore all {hotels.length} hotels in {segment.location}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>

        {/* Add Segment Button */}
        {!viewOnly && (
          <div className="flex justify-center mt-2">
            <button
              onClick={handleAddSegment}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/20 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition"
            >
              <span>+ Add Stay Segment</span>
            </button>
          </div>
        )}

        {/* Overall Accommodation Summary */}
        {staySegments.length > 0 && (
          <section className="mt-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-[#131b2e] shadow-md p-6">
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-4">
              Accommodation Summary
            </h2>

            {isCampus ? (
              /* Campus Educational Trip Layout */
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Column: Campus Stay Segment List + Summary Metrics Table */}
                <div className="flex-1 space-y-5">
                  <div className="space-y-3">
                    {accommodationSummary.items.map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row justify-between sm:items-center gap-3 transition-all hover:border-indigo-200 dark:hover:border-indigo-900"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">
                              {item.location}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.nights} {item.nights === 1 ? 'night' : 'nights'}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.pricing?.hasHotel ? item.pricing.hotelName : 'No hotel selected'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{formatDate(item.checkIn)} – {formatDate(item.checkOut)}</span>
                            {item.pricing?.hasHotel && (
                              <span>• {item.pricing.rooms} rooms @ ₹{item.pricing.nightlyRate?.toLocaleString()}/room/night</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col justify-between sm:items-end sm:text-right gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                          {item.pricing?.hasHotel ? (
                            <>
                              <div className="text-sm font-black text-slate-900 dark:text-white">
                                ₹{item.pricing.groupCost.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">group (est.)</span>
                              </div>
                              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{item.pricing.perStudentCost.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ student</span>
                              </div>
                              <div className="mt-1">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                    item.pricingStatus === 'Requires Verification'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      : item.pricingStatus === 'Exceeds Segment Allocation'
                                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.pricingStatus || 'Estimated'}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not selected</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Section 6: Bottom Metrics Table */}
                  <div className="pt-2">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Accommodation Summary Metrics
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase font-black text-[10px] tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Metric</th>
                            <th className="px-4 py-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">Total Travelers</td>
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                              {accommodationSummary.totalTravelers}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">Total Stay Segments</td>
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                              {accommodationSummary.totalSegments}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">Total Nights</td>
                            <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-white">
                              {accommodationSummary.totalNights}
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">Estimated Accommodation Cost per Student</td>
                            <td className="px-4 py-2 text-right font-black text-indigo-600 dark:text-indigo-400">
                              ₹{accommodationSummary.accommodationPerStudent.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">(Estimated)</span>
                            </td>
                          </tr>
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2 text-slate-600 dark:text-slate-400">Total Estimated Accommodation Cost for all Travelers</td>
                            <td className="px-4 py-2 text-right font-black text-indigo-600 dark:text-indigo-400">
                              ₹{accommodationSummary.totalAccommodationCost.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">(Estimated)</span>
                            </td>
                          </tr>
                          <tr className="bg-indigo-50/60 dark:bg-indigo-950/30 font-bold">
                            <td className="px-4 py-2.5 text-indigo-900 dark:text-indigo-200">
                              Accommodation Budget Utilization
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-indigo-700 dark:text-indigo-300 text-sm">
                              {accommodationSummary.accommodationBudgetUtilization}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Trip Budget Impact (Sections 7, 8, 9) */}
                <div className="w-full lg:w-96 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-5 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-4">
                  <div className="border-b border-slate-200 dark:border-slate-700 pb-2.5">
                    <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Trip Budget Impact
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Campus Educational Trip Allocation
                    </div>
                  </div>

                  {/* Section 8: Budget Validation Alerts (Cases 1, 2, 3) */}
                  {accommodationBudgetAnalysis.validationCase === 3 ? (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-2 shadow-xs">
                      <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-rose-600 dark:text-rose-400">
                        <FiAlertCircle className="shrink-0 text-sm" />
                        <span>Accommodation Exceeds Maximum Budget</span>
                      </div>
                      <p className="font-medium text-[11px] leading-relaxed text-rose-900 dark:text-rose-100">
                        Estimated accommodation exceeds the 60% maximum allocation (₹{accommodationBudgetAnalysis.maxAccommodationBudgetPerStudent.toLocaleString()} / student).
                      </p>
                      <div className="pt-2 border-t border-rose-200/80 dark:border-rose-800/50 text-[11px] space-y-1 font-semibold">
                        <div className="flex justify-between text-rose-700 dark:text-rose-300">
                          <span>Excess per student:</span>
                          <span className="font-bold">₹{accommodationBudgetAnalysis.excessPerStudent.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-rose-700 dark:text-rose-300">
                          <span>Excess group total:</span>
                          <span className="font-bold">₹{accommodationBudgetAnalysis.excessGroup.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-rose-700 dark:text-rose-300 font-medium italic pt-1">
                        Recommendation: Change hotel or select a more affordable option across stay segments.
                      </div>
                    </div>
                  ) : accommodationBudgetAnalysis.validationCase === 2 ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-amber-600 dark:text-amber-400">
                        <FiAlertCircle className="shrink-0 text-sm" />
                        <span>Approaching Allocated Limit</span>
                      </div>
                      <p className="font-medium text-[11px] leading-relaxed text-amber-900 dark:text-amber-100">
                        Estimated accommodation is between 50% and 60% of the per-student budget. It is approaching the maximum ceiling. You may proceed, ensuring sufficient funds remain for transport, meals, and activities.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5 shadow-xs">
                      <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-emerald-600 dark:text-emerald-400">
                        <FiCheck className="shrink-0 text-sm" />
                        <span>Accommodation Within Budget</span>
                      </div>
                      <p className="font-medium text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-100">
                        Estimated accommodation is within the target range (≤ 50% of per-student budget).
                      </p>
                    </div>
                  )}

                  {/* Section 7: Budget Overview */}
                  <div className="rounded-xl bg-white dark:bg-[#1a233a] p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      Budget Overview
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Budget per Student:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{accommodationBudgetAnalysis.overallTripBudgetPerStudent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Total Travelers:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {accommodationBudgetAnalysis.expectedStudents}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1 font-semibold">
                        <span className="text-slate-700 dark:text-slate-300">Total Trip Budget:</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          ₹{accommodationBudgetAnalysis.overallTripBudgetGroup.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Accommodation */}
                  <div className="rounded-xl bg-white dark:bg-[#1a233a] p-3.5 border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-indigo-50 dark:border-indigo-950 pb-1.5">
                      Accommodation
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Target Accommodation Budget per Student:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          ₹{accommodationBudgetAnalysis.targetAccommodationBudgetPerStudent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Maximum Accommodation Budget per Student:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{accommodationBudgetAnalysis.maxAccommodationBudgetPerStudent.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Total Maximum Accommodation Budget:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{accommodationBudgetAnalysis.maxAccommodationBudgetGroup.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1">
                        <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Estimated Accommodation per Student:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          ₹{accommodationBudgetAnalysis.estimatedAccommodationPerStudent.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">(Estimated)</span>
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Total Estimated Accommodation:</span>
                        <span className="font-black text-indigo-600 dark:text-indigo-400">
                          ₹{accommodationBudgetAnalysis.estimatedAccommodationGroup.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">(Estimated)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 5: Remaining Budget */}
                  <div className="rounded-xl bg-white dark:bg-[#1a233a] p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      Remaining Budget
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Remaining Budget per Student:</span>
                        <span className={`font-black ${accommodationBudgetAnalysis.remainingOverallPerStudentBudget < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {accommodationBudgetAnalysis.remainingOverallPerStudentBudget < 0 ? '-' : ''}₹{Math.abs(accommodationBudgetAnalysis.remainingOverallPerStudentBudget).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-slate-400">Remaining Total Budget:</span>
                        <span className={`font-black ${accommodationBudgetAnalysis.remainingOverallGroupBudget < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {accommodationBudgetAnalysis.remainingOverallGroupBudget < 0 ? '-' : ''}₹{Math.abs(accommodationBudgetAnalysis.remainingOverallGroupBudget).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section 7: Budget Utilization & Progress Bar */}
                  <div className="rounded-xl bg-white dark:bg-[#1a233a] p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Accommodation Utilization:</span>
                      <span className={`font-black text-sm ${
                        accommodationBudgetAnalysis.utilizationPercentage > 60
                          ? 'text-rose-600 dark:text-rose-400'
                          : accommodationBudgetAnalysis.utilizationPercentage > 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {accommodationBudgetAnalysis.utilizationPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          accommodationBudgetAnalysis.utilizationPercentage > 60
                            ? 'bg-rose-500'
                            : accommodationBudgetAnalysis.utilizationPercentage > 50
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, accommodationBudgetAnalysis.utilizationPercentage)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>0%</span>
                      <span>Target: 50%</span>
                      <span>Max: 60%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Section 9: Disclaimer Note */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                    <FiInfo className="shrink-0 mt-0.5 text-indigo-500 text-xs" />
                    <span>
                      Accommodation costs are estimates and may vary. Final prices and availability must be verified before booking.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Personal Trip Layout (Kept 100% Unchanged) */
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-3">
                  {accommodationSummary.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-sm py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.location}</span>
                          <span className="text-slate-500 text-xs">({item.nights} {item.nights === 1 ? 'night' : 'nights'})</span>
                        </div>
                        {item.pricing?.hasHotel ? (
                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.pricing.hotelName}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">No hotel selected</div>
                        )}
                      </div>
                      <div className="text-right">
                        {item.pricing?.hasHotel ? (
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            ₹{item.pricing.groupCost.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not selected</span>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="border-t-2 border-slate-200 dark:border-slate-700 pt-3 mt-2 flex justify-between items-end">
                    <div>
                      <div className="text-base font-black text-slate-900 dark:text-white uppercase">Total Accommodation</div>
                      <div className="text-[10px] font-semibold text-slate-500">
                        {accommodationSummary.selectedCount} of {staySegments.length} hotels selected (Estimated)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                        ₹{accommodationSummary.totalSelectedPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-84 shrink-0 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Trip Budget Impact</div>
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall Budget</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">₹{accommodationBudgetAnalysis.totalBudget?.toLocaleString() || accommodationBudgetAnalysis.overallBudgetPerStudent?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estimated Accommodation</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{accommodationBudgetAnalysis.estimatedAccommodation?.toLocaleString() || accommodationBudgetAnalysis.estimatedAccommodationGroup?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-baseline mb-1 border-t border-slate-200 dark:border-slate-700 pt-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Remaining</span>
                    <span className={`text-sm font-black ${accommodationBudgetAnalysis.isOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {accommodationBudgetAnalysis.isOverBudget ? '-' : ''}₹{Math.abs(accommodationBudgetAnalysis.remaining || 0).toLocaleString()}
                    </span>
                  </div>

                  {accommodationBudgetAnalysis.isOverBudget && (
                    <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <FiAlertCircle className="shrink-0" />
                      <span>Accommodation exceeds total budget by ₹{accommodationBudgetAnalysis.overAmount?.toLocaleString()}.</span>
                    </div>
                  )}
                  <div className="mt-2 text-[9px] text-slate-400 italic leading-tight">
                    Budget reflects the total trip budget for all travelers. Stay total is dynamically updated based on your selections.
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Sticky Action Bar */}
      {!viewOnly && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8 mt-8 bg-white/95 dark:bg-[#0f1525]/95 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-20 backdrop-blur-md pb-safe">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${totalStayNights === expectedTripNights ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'}`}>
                <FiMoon />
                <span>{totalStayNights}/{expectedTripNights} nights covered</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${selectedHotelsCount === staySegments.length ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'}`}>
                <FiCheck />
                <span>{selectedHotelsCount}/{staySegments.length} hotels selected</span>
              </div>
            </div>
            <button 
              onClick={handleSaveStayPlan} 
              disabled={isSyncing || !isStayPlanValid} 
              className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-xs cursor-pointer active:scale-98"
            >
              {isSyncing ? "Saving & Updating Itinerary..." : "Save Plan & Update Itinerary"}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Save & Update */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                <FiCalendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Update Itinerary?
                </h3>
                <p className="text-xs font-semibold text-slate-500">Your Stay Plan has been modified.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 font-medium">
              Saving these changes will:
            </p>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mb-4 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Update your Stay Plan</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Update the affected itinerary days</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Recalculate the schedule</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Validate the updated itinerary</span>
              </li>
            </ul>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-6">
              This may update activities and timings where the destination/location has changed.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSyncing}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  executeSaveStayPlan();
                }}
                disabled={isSyncing}
                className="flex-1 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 text-sm"
              >
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Success Modal */}
      {syncSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-emerald-200 dark:border-emerald-900/40 text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
              <FiCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Stay Plan updated</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Your Stay Plan and itinerary have been updated successfully.
            </p>
            <button 
              onClick={() => {
                setSyncSuccess(false);
                navigate(`/itinerary/${trip._id}`);
              }} 
              className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
            >
              View Updated Itinerary
            </button>
          </div>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removeConfirmation !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Remove stay segment?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to remove this stay segment? This may change the number of nights covered by your Stay Plan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveConfirmation(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={confirmRemoveSegment} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700">
                Remove Segment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Missing Hotels Modal */}
      {missingHotelsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Select hotels for all stays</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Your Stay Plan has {missingHotelsModal.totalSegments} stay segments, but {missingHotelsModal.missingCount} {missingHotelsModal.missingCount === 1 ? 'segment does' : 'segments do'} not have a selected hotel. Please select a hotel for every stay segment before updating your itinerary.
            </p>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Stay segments</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{missingHotelsModal.totalSegments}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Hotels selected</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{missingHotelsModal.selectedCount}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                <span className="text-red-600 dark:text-red-400">Hotels missing</span>
                <span className="text-red-600 dark:text-red-400">{missingHotelsModal.missingCount}</span>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {missingHotelsModal.missingSegments.map((seg, i) => (
                  <div key={i} className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                    • {seg.location} — {seg.nights} {seg.nights === 1 ? 'night' : 'nights'} — hotel not selected
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setMissingHotelsModal(null)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
              Go Back & Select Hotels
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-red-200 dark:border-red-900/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {validationError.type === 'incomplete' ? 'Stay Plan is incomplete' : 'Stay Plan has too many nights'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Your trip {validationError.type === 'incomplete' ? `is ${validationError.tripDuration} days long (${validationError.expectedTripNights} nights), but your Stay Plan currently covers only ${validationError.totalStayNights} nights.` : `requires ${validationError.expectedTripNights} nights, but your Stay Plan currently assigns ${validationError.totalStayNights} nights.`}
            </p>
            {validationError.type === 'incomplete' && (
              <>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  {validationError.missingNights} {validationError.missingNights === 1 ? 'night is' : 'nights are'} still missing a stay location.
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Please either:
                  <br />• Add {validationError.missingNights} more stay {validationError.missingNights === 1 ? 'segment' : 'segments'}, OR
                  <br />• Increase the number of nights in an existing stay segment.
                </p>
              </>
            )}
            
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Trip duration</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{validationError.tripDuration} days</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Required nights</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{validationError.expectedTripNights}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">{validationError.type === 'incomplete' ? 'Covered nights' : 'Assigned nights'}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{validationError.totalStayNights}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
                <span className="text-red-600 dark:text-red-400">{validationError.type === 'incomplete' ? 'Missing nights' : 'Extra nights'}</span>
                <span className="text-red-600 dark:text-red-400">{validationError.type === 'incomplete' ? validationError.missingNights : validationError.extraNights}</span>
              </div>
            </div>

            <button onClick={() => setValidationError(null)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
              Go Back & Edit
            </button>
          </div>
        </div>
      )}

      {/* Sync Error Modal */}
      {syncError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-xl border border-red-200 dark:border-red-900/40">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Unable to sync itinerary</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              We couldn't update your itinerary from the current Stay Plan. 
              <br /><br />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Reason:</span><br />
              {typeof syncError === 'string' ? syncError : "An unexpected error occurred."}
            </p>
            <button onClick={() => setSyncError(null)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
              Close
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
