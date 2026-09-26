import { useLocation, useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  FiCompass,
  FiPlus,
  FiRefreshCw,
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiUsers,
  FiDownload,
  FiLayers,
  FiShare2,
  FiMap,
  FiList,
  FiGrid,
  FiHome,
  FiMapPin,
  FiAlertTriangle,
  FiEye,
  FiEyeOff,
  FiColumns,
  FiRotateCcw,
} from "react-icons/fi";
import { FaTrainSubway, FaPlaneDeparture, FaBus, FaCar, FaRupeeSign } from "react-icons/fa6";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import StayPlan from "../components/itinerary/StayPlan";
import TransportDetails from "../components/itinerary/TransportDetails";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";
import ItineraryMap from "../components/itinerary/ItineraryMap";
import { getTripById, regenerateDay } from "../api/tripApi";
import { generateTripItineraryPdf } from "../utils/itineraryPdfGenerator";
import { formatBudget, getDuration, formatDate } from "../utils/formatTrip";
import { resolveJourneyLocations } from "../utils/itineraryLocationHelper";
import { SAMPLE_TRIPS } from "../data/sampleTripsData";
import TourBookingModal from "../components/booking/TourBookingModal";

export default function DetailedItinerary() {
  const { tripId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const {
    trip: contextTrip,
    setTrip: contextSetTrip,
    schedulingConflicts,
    applySuggestion,
  } = useTripBuilder();

  // Prefer trip matching the URL tripId from state or context
  const initialTrip =
    tripId && state?.trip?._id === tripId
      ? state.trip
      : tripId && contextTrip?._id === tripId
      ? contextTrip
      : state?.trip || contextTrip;

  const [fetchedTrip, setFetchedTrip] = useState(null);
  const [fetchingTrip, setFetchingTrip] = useState(!initialTrip && Boolean(tripId));
  const [authError, setAuthError] = useState(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Fallback to sample trip if ID matches
  const trip =
    fetchedTrip ||
    initialTrip ||
    (tripId ? SAMPLE_TRIPS.find((s) => s.id === tripId || s._id === tripId) : null);

  const initialDay = state?.dayIndex ?? 0;
  const viewOnly = state?.viewOnly === true;

  // Selected Day state: "all" or 0, 1, 2...
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [regenerating, setRegenerating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Map & Location Resolution State
  const [locationData, setLocationData] = useState({
    allLocations: [],
    mappableLocations: [],
    locationsByDay: {},
    dayPolylines: {},
    allDaysPolyline: [],
    unmappableCount: 0,
    mappableCount: 0,
    categoryCounts: { attraction: 0, hotel: 0, transport: 0, start_end: 0, activity: 0 },
  });
  const [mapLoading, setMapLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  // Responsive view mode for tablet/mobile: "split" | "map" | "itinerary"
  const [viewMode, setViewMode] = useState("split");

  // Adjustable Resizable & Toggleable Panels State
  const [showMapPanel, setShowMapPanel] = useState(true);
  const [showItineraryPanel, setShowItineraryPanel] = useState(true);
  const [mapWidthPercent, setMapWidthPercent] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [activeSpecialTab, setActiveSpecialTab] = useState(null);

  const splitContainerRef = useRef(null);
  const itineraryScrollRef = useRef(null);
  const stayPlanRef = useRef(null);
  const transportPlanRef = useRef(null);

  // Divider dragging logic with min/max clamp
  const handlePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const rawPercent = ((e.clientX - rect.left) / rect.width) * 100;
      // Clamp between 25% and 75%
      const clamped = Math.max(25, Math.min(75, Math.round(rawPercent)));
      setMapWidthPercent(clamped);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  // Trigger Leaflet resize event when panels toggle or resize
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 120);
    return () => clearTimeout(timer);
  }, [showMapPanel, showItineraryPanel, mapWidthPercent]);

  // Scroll to Stay Plan Section
  const handleScrollToStayPlan = () => {
    setActiveSpecialTab("stay");
    if (!showItineraryPanel) setShowItineraryPanel(true);
    setTimeout(() => {
      const el = document.getElementById("stay-plan-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  // Scroll to Transport Details Section
  const handleScrollToTransportPlan = () => {
    setActiveSpecialTab("transport");
    if (!showItineraryPanel) setShowItineraryPanel(true);
    setTimeout(() => {
      const el = document.getElementById("transport-details-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  // Handle Day Selection from Tabs or Map Labels
  const handleSelectDayTab = (day) => {
    setActiveSpecialTab(null);
    setSelectedLocationId(null);
    setSelectedDay(day);
    if (!showItineraryPanel) setShowItineraryPanel(true);
    setTimeout(() => {
      if (day === "all") {
        if (itineraryScrollRef.current) {
          itineraryScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        const dayNum = typeof day === "number" ? day + 1 : Number(day) + 1;
        const el = document.getElementById(`day-section-${dayNum}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (itineraryScrollRef.current) {
          itineraryScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }, 80);
  };

  // Fallback direct trip fetch if landing directly or reloading without context/state
  useEffect(() => {
    if (!initialTrip && tripId) {
      // Check if it is a sample trip first
      const sampleMatch = SAMPLE_TRIPS.find((s) => s.id === tripId || s._id === tripId);
      if (sampleMatch) {
        setFetchedTrip(sampleMatch);
        setFetchingTrip(false);
        return;
      }

      let isMounted = true;
      setFetchingTrip(true);
      setAuthError(null);
      const authToken = token || localStorage.getItem("token");
      const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const apiBase = rawApi.replace(/\/api$/, "");

      // Try campus trips endpoint first
      fetch(`${apiBase}/api/campus-trips/${tripId}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      })
        .then(async (res) => {
          if (res.status === 403) throw new Error("UNAUTHORIZED");
          return res.json();
        })
        .then((data) => {
          if (isMounted && data?.success && data?.trip) {
            setFetchedTrip(data.trip);
            setFetchingTrip(false);
          } else {
            // Try standard trips endpoint
            return fetch(`${apiBase}/api/trips/${tripId}`, {
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            })
              .then(async (res) => {
                if (res.status === 403) throw new Error("UNAUTHORIZED");
                return res.json();
              })
              .then((pData) => {
                if (isMounted && pData?.success && pData?.trip) {
                  setFetchedTrip(pData.trip);
                } else if (isMounted) {
                  getTripById(tripId, authToken)
                    .then((res) => {
                      if (isMounted && res?.trip) setFetchedTrip(res.trip);
                    })
                    .catch(() => {});
                }
                if (isMounted) setFetchingTrip(false);
              });
          }
        })
        .catch((err) => {
          console.error("Failed to load trip directly:", err);
          if (err.message === "UNAUTHORIZED" && isMounted) {
            setAuthError("You do not have permission to view this campus trip's itinerary.");
          }
          if (isMounted) setFetchingTrip(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [initialTrip, tripId, token]);

  // Synchronize local itinerary state whenever canonical trip changes
  useEffect(() => {
    if (trip?.itinerary) {
      setItinerary(trip.itinerary);
    }
  }, [trip?.itinerary]);

  // Geocode and resolve all journey locations on trip load
  useEffect(() => {
    if (!trip) return;

    let isMounted = true;
    async function loadMapCoordinates() {
      setMapLoading(true);
      try {
        const resolved = await resolveJourneyLocations(trip);
        if (isMounted) {
          setLocationData(resolved);
        }
      } catch (err) {
        console.error("Failed to resolve journey locations:", err);
      } finally {
        if (isMounted) setMapLoading(false);
      }
    }

    loadMapCoordinates();
    return () => {
      isMounted = false;
    };
  }, [trip]);

  // Helper to calculate accommodations for any specific day
  const getAccommodationsForDay = useCallback(
    (dayIdx) => {
      const accommodations = [];
      if (trip?.staySegments?.length > 0 && trip?.startDate) {
        const tripStart = new Date(trip.startDate);
        tripStart.setHours(0, 0, 0, 0);
        const currentDateMs = tripStart.getTime() + dayIdx * 86400000;

        // Check if any segment is checking in on this date
        const hasCheckInToday = trip.staySegments.some(segment => {
          if (!segment.selectedHotel || !segment.checkIn) return false;
          const checkInMs = new Date(segment.checkIn).setHours(0, 0, 0, 0);
          return currentDateMs === checkInMs;
        });

        trip.staySegments.forEach((segment) => {
          if (!segment.selectedHotel) return;
          const checkInMs = new Date(segment.checkIn).setHours(0, 0, 0, 0);
          const checkOutMs = new Date(segment.checkOut).setHours(0, 0, 0, 0);

          if (currentDateMs >= checkInMs && currentDateMs <= checkOutMs) {
            let status = "Staying at";
            let dayOfStay = Math.round((currentDateMs - checkInMs) / 86400000) + 1;

            if (currentDateMs === checkInMs) {
              status = "Check-in";
            } else if (currentDateMs === checkOutMs) {
              // If another hotel is checking in today, avoid conflicting accommodation
              if (hasCheckInToday) return;
              status = "Check-out";
            } else {
              status = `Night ${dayOfStay} of ${segment.nights}`;
            }

            accommodations.push({
              ...segment.selectedHotel,
              segmentLocation: segment.location,
              nights: segment.nights,
              status,
            });
          }
        });
      }
      return accommodations;
    },
    [trip?.staySegments, trip?.startDate]
  );

  // Sync: Selecting a marker on the map highlights and scrolls to itinerary activity
  const handleSelectMapLocation = useCallback(
    (location) => {
      setSelectedLocationId(location.id);

      // If marker is on another day and we are in individual day mode, switch day
      if (
        typeof location.day === "number" &&
        location.day > 0 &&
        selectedDay !== "all" &&
        selectedDay !== location.day - 1
      ) {
        setSelectedDay(location.day - 1);
      }

      // Smooth scroll to corresponding itinerary item
      setTimeout(() => {
        const el = document.getElementById(`itinerary-item-${location.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 120);
    },
    [selectedDay]
  );

  // Sync: Clicking an activity in the itinerary focuses the marker on the map
  const handleSelectItineraryActivity = useCallback(
    (activity, activityId, mapLocation) => {
      if (mapLocation && mapLocation.coordinates) {
        setSelectedLocationId(mapLocation.id);
      } else {
        setSelectedLocationId(activityId);
        toast("No verified map pin for this activity", {
          icon: "📍",
          duration: 2500,
        });
      }
    },
    []
  );

  // Focus action from map popup
  const handleViewInItinerary = useCallback(
    (location) => {
      if (
        typeof location.day === "number" &&
        location.day > 0 &&
        selectedDay !== "all" &&
        selectedDay !== location.day - 1
      ) {
        setSelectedDay(location.day - 1);
      }

      setTimeout(() => {
        const el = document.getElementById(`itinerary-item-${location.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 120);
    },
    [selectedDay]
  );

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Itinerary link copied to clipboard!");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateTripItineraryPdf(trip);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      toast.error("Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleRegenerate = async () => {
    if (!trip?._id || selectedDay === "all") return;
    try {
      setRegenerating(true);
      const authToken = token || localStorage.getItem("token");
      const res = await regenerateDay(trip._id, selectedDay + 1, authToken);

      const updated = [...itinerary];
      updated[selectedDay] = res.day;

      setItinerary(updated);
      toast.success(`Day ${selectedDay + 1} regenerated with AI!`);
    } catch (err) {
      console.error(err);
      toast.error("Could not regenerate this day.");
    } finally {
      setRegenerating(false);
    }
  };

  if (fetchingTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Loading itinerary and map details...
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center text-xl mb-4">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{authError}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout trip={null} setTrip={contextSetTrip}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-[#e7e5e4] dark:border-slate-800 bg-white dark:bg-[#131b2e] p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto my-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-2xl text-indigo-600 dark:text-indigo-400 shadow-xs mb-4">
            <FiCompass />
          </div>
          <h2
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="text-2xl font-[400] text-[#0c0a09] dark:text-white"
          >
            Itinerary Not Found
          </h2>
          <p className="mt-2 text-xs text-[#777169] dark:text-slate-400 leading-relaxed max-w-xs">
            We couldn&apos;t load the requested journey plan. You can create a new travel itinerary with our AI planner.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 rounded-full bg-[#0c0a09] dark:bg-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#292524] dark:hover:bg-indigo-700"
            >
              <FiPlus className="text-sm" />
              <span>Plan New Trip</span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Determine current user & roles
  const currentUser =
    user ||
    (() => {
      try {
        const stored = localStorage.getItem("user");
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    })();

  const isCampus = trip?.tripCategory === "CAMPUS" || Boolean(trip?.campusConfig?.expectedParticipants);
  const isOperator = currentUser?.role === "operator" || localStorage.getItem("role") === "operator";

  const coordinatorId = trip?.coordinatorId?._id?.toString() || trip?.coordinatorId?.toString();
  const creatorId = trip?.userId?._id?.toString() || trip?.userId?.toString();
  const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString();

  const isCoordinator =
    isCampus &&
    ((coordinatorId && currentUserId && coordinatorId === currentUserId) ||
      (creatorId && currentUserId && creatorId === currentUserId) ||
      trip?._relation === "COORDINATOR" ||
      state?.relation === "COORDINATOR" ||
      currentUser?.role === "coordinator");

  const canViewStayPlan = !isOperator || isCoordinator;

  // Transit mode icon helper
  const getTransitIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case "flight":
        return <FaPlaneDeparture className="text-xs" />;
      case "bus":
        return <FaBus className="text-xs" />;
      case "car":
        return <FaCar className="text-xs" />;
      case "train":
      default:
        return <FaTrainSubway className="text-xs" />;
    }
  };

  const durationText =
    getDuration(trip) ||
    (trip?.duration
      ? typeof trip.duration === "number"
        ? `${trip.duration} Days`
        : trip.duration
      : `${trip?.itinerary?.length || 5} Days`);

  const budgetVal = trip?.campusConfig?.budgetPerStudent || trip?.budget;
  const budgetText = budgetVal ? formatBudget(budgetVal) : null;
  const travelersCount =
    trip?.campusConfig?.expectedParticipants ||
    trip?.registrationSettings?.capacity ||
    trip?.travelers ||
    2;

  // Content of the Interactive Itinerary Page
  const itineraryContent = (
    <div className="flex flex-col gap-4 w-full max-w-[1700px] mx-auto px-3 sm:px-6 py-4">
      {/* ================= 1. UNIFIED JOURNEY TOP BAR ================= */}
      <header className="w-full rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] p-4 sm:p-5 shadow-xs transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          {/* Back & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
            >
              <FiArrowLeft className="text-xs" />
              <span>Back</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-md">
              Interactive Itinerary Map
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
            >
              <FiShare2 className="text-xs" />
              <span>Share</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              id="download-itinerary-pdf-btn"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FiDownload className="text-xs" />
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {trip?.isBooked || trip?.status === "BOOKED" ? (
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
                ✓ Tour Booked & Confirmed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-4 py-1.5 text-xs font-bold text-white transition shadow-sm cursor-pointer"
              >
                <span>⚡</span>
                <span>Book Entire Tour</span>
              </button>
            )}

            {!viewOnly && (
              <Link
                to="/builder"
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-xs"
              >
                <FiLayers className="text-xs" />
                <span>Customize in Builder</span>
              </Link>
            )}
          </div>
        </div>

        {/* Journey Name & Route */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black capitalize text-slate-900 dark:text-white">
                {trip?.title || trip?.source || "Origin"}
              </h1>
              {trip?.destination && (
                <>
                  <FiArrowRight className="text-lg text-indigo-600 dark:text-indigo-400" />
                  <h1 className="text-xl sm:text-2xl font-black capitalize text-indigo-600 dark:text-indigo-400">
                    {trip?.destination}
                  </h1>
                </>
              )}
            </div>

            {/* Metadata Strip */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {trip?.startDate && trip?.endDate && (
                <div className="flex items-center gap-1.5">
                  <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                  </span>
                </div>
              )}

              {durationText && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{durationText}</span>
                </div>
              )}

              {budgetText && (
                <div className="flex items-center gap-1.5">
                  <FaRupeeSign className="text-indigo-600 dark:text-indigo-400" />
                  <span>{budgetText}</span>
                </div>
              )}

              {travelersCount ? (
                <div className="flex items-center gap-1.5">
                  <FiUsers className="text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {travelersCount} Travelers{!isCampus && trip?.tripType ? ` (${trip.tripType})` : ""}
                  </span>
                </div>
              ) : null}

              {trip?.travelMode && (
                <div className="flex items-center gap-1.5">
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {getTransitIcon(trip.travelMode)}
                  </span>
                  <span>{trip.travelMode}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= PANEL TOGGLE & SUMMARY STATS ROW ================= */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          {/* Left: Map & Timeline View Toggle Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowMapPanel((prev) => !prev)}
              title={showMapPanel ? "Hide Map Panel" : "Show Map Panel"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                showMapPanel
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FiMap className="text-xs" />
              <span>Map</span>
            </button>

            <button
              type="button"
              onClick={() => setShowItineraryPanel((prev) => !prev)}
              title={showItineraryPanel ? "Hide Itinerary Timeline" : "Show Itinerary Timeline"}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                showItineraryPanel
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FiList className="text-xs" />
              <span>Timeline</span>
            </button>

            {(mapWidthPercent !== 55 || !showMapPanel || !showItineraryPanel) && (
              <button
                type="button"
                onClick={() => {
                  setShowMapPanel(true);
                  setShowItineraryPanel(true);
                  setMapWidthPercent(55);
                }}
                title="Reset Layout to Default 55% / 45%"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 transition cursor-pointer"
              >
                <FiRotateCcw className="text-[11px]" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>

          {/* Right: Summary Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl">
              {locationData.mappableCount} Mappable Stops
            </span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 px-3 py-1 rounded-xl">
              {itinerary.length} Days Planned
            </span>
          </div>
        </div>

        {/* Top Day & Section Selector Bar */}
        <div className="mt-2.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <DayTabs
            itinerary={itinerary}
            selectedDay={selectedDay}
            setSelectedDay={handleSelectDayTab}
            showAllDaysOption={true}
            onSelectStayPlan={handleScrollToStayPlan}
            onSelectTransportPlan={handleScrollToTransportPlan}
            activeSpecialTab={activeSpecialTab}
            stayCount={trip?.staySegments?.length || 0}
          />
        </div>
      </header>

      {/* ================= 2. CONFLICT SECTION (IF ANY) ================= */}
      {schedulingConflicts?.length > 0 && (
        <div className="w-full bg-white dark:bg-[#131b2e] border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xs overflow-hidden">
          <div className="bg-rose-50/80 dark:bg-rose-950/40 px-4 py-2.5 border-b border-rose-200/80 dark:border-rose-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                {schedulingConflicts.length} Schedule Conflict{schedulingConflicts.length !== 1 ? "s" : ""}
              </h3>
            </div>
            <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
              Review and resolve before finalizing
            </span>
          </div>
          <div className="divide-y divide-rose-100 dark:divide-rose-900/30">
            {schedulingConflicts.map((c, i) => (
              <div key={i} className="p-3.5 space-y-2">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40 text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider mb-1">
                    Day {c.conflict.affectedDay}
                  </span>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                    {c.conflict.itemTitle}{" "}
                    {c.conflict.reason
                      .replace("Conflicts with", "conflicts with")
                      .replace("Overlaps with previous activity", "overlaps with")}
                  </p>
                </div>

                {c.suggestions && c.suggestions.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      Suggested resolution:
                    </p>
                    {c.suggestions.map((sug, j) => (
                      <div
                        key={j}
                        className="flex items-center justify-between bg-slate-50 dark:bg-[#1a233a] border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl hover:border-rose-300 dark:hover:border-rose-800/60 transition"
                      >
                        <div className="text-xs text-slate-700 dark:text-slate-300 pr-2">
                          <span className="font-semibold">
                            {j + 1}. Move {c.conflict.itemTitle}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5">
                            ({sug.action.type === "MOVE_DAY" ? `Day ${sug.action.toDay} · ` : ""}
                            {sug.action.startTime} – {sug.action.endTime})
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold ml-2">
                            ✓ Safe
                          </span>
                        </div>
                        <button
                          onClick={() => applySuggestion(sug.action)}
                          className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl">
                    <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                      <span>⚠️</span> No Safe Alternative
                    </p>
                    <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-0.5">
                      This activity cannot be safely moved without affecting your fixed travel schedule.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. ADJUSTABLE SPLIT MAIN VIEW: LEFT MAP / RIGHT ITINERARY ================= */}
      {!showMapPanel && !showItineraryPanel ? (
        <div className="w-full py-16 px-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-[#131b2e]/50 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl mb-3 shadow-xs">
            <FiEyeOff />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Both Panels Are Hidden
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            Display either panel or restore both using the controls above or quick action buttons below.
          </p>
          <div className="flex items-center gap-2.5 mt-5">
            <button
              type="button"
              onClick={() => setShowMapPanel(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <FiMap className="text-xs" />
              <span>Show Map</span>
            </button>
            <button
              type="button"
              onClick={() => setShowItineraryPanel(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <FiList className="text-xs" />
              <span>Show Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowMapPanel(true);
                setShowItineraryPanel(true);
                setMapWidthPercent(55);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              <FiRotateCcw className="text-xs" />
              <span>Restore Both</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={splitContainerRef}
          className={`w-full relative flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0 ${
            isDragging ? "select-none cursor-col-resize" : ""
          }`}
        >
          {/* LEFT / CENTER: INTERACTIVE MAP */}
          {showMapPanel && (
            <div
              style={{
                width: showItineraryPanel ? `${mapWidthPercent}%` : "100%",
              }}
              className="w-full lg:w-auto transition-[width] duration-75 shrink-0"
            >
              <div className="h-[520px] sm:h-[600px] lg:h-[calc(100vh-210px)] min-h-[460px] sticky top-4">
                <ItineraryMap
                  trip={trip}
                  selectedDay={selectedDay}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={handleSelectMapLocation}
                  onSelectDay={handleSelectDayTab}
                  mappableLocations={locationData.mappableLocations}
                  dayPolylines={locationData.dayPolylines}
                  dayRouteSegments={locationData.dayRouteSegments}
                  interDayConnections={locationData.interDayConnections}
                  dayStartLocations={locationData.dayStartLocations}
                  allDaysPolyline={locationData.allDaysPolyline}
                  loading={mapLoading}
                  unmappableCount={locationData.unmappableCount}
                  onViewInItinerary={handleViewInItinerary}
                />
              </div>
            </div>
          )}

          {/* Resizable Divider (Visible on Desktop when both panels are active) */}
          {showMapPanel && showItineraryPanel && (
            <div
              onPointerDown={handlePointerDown}
              className={`hidden lg:flex w-3.5 hover:w-3.5 items-center justify-center cursor-col-resize group shrink-0 relative z-30 transition-colors mx-1 ${
                isDragging ? "bg-indigo-600/30 rounded-lg" : "hover:bg-indigo-500/20 rounded-lg"
              }`}
              title="Drag to resize Map and Timeline panels"
            >
              <div className="w-1 h-14 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 group-hover:w-1.5 transition-all flex flex-col items-center justify-center gap-1 shadow-2xs">
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500 dark:bg-slate-400" />
                <span className="w-0.5 h-0.5 rounded-full bg-slate-500 dark:bg-slate-400" />
              </div>
            </div>
          )}

          {/* RIGHT: ITINERARY PANEL (ACTIVITIES, ACCOMMODATION, TRANSPORT) */}
          {showItineraryPanel && (
            <div
              style={{
                width: showMapPanel ? `calc(${100 - mapWidthPercent}% - 22px)` : "100%",
              }}
              className="w-full lg:w-auto transition-[width] duration-75 flex-1 min-w-0"
            >
              <div
                ref={itineraryScrollRef}
                className="lg:h-[calc(100vh-210px)] lg:overflow-y-auto lg:pr-2 space-y-5"
              >
                {/* If "All Days" mode selected: Show All Days sequentially */}
                {selectedDay === "all" ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 p-3.5 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                          Complete Journey Overview
                        </h3>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium mt-0.5">
                          Displaying all {itinerary.length} days and {locationData.mappableCount} mapped highlights
                        </p>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-xs">
                        All Days
                      </span>
                    </div>

                    {itinerary.map((day, dIdx) => {
                      const dayNum = day.day || dIdx + 1;
                      const dayAccommodations = getAccommodationsForDay(dIdx);
                      return (
                        <div
                          key={dayNum}
                          id={`day-section-${dayNum}`}
                          className="scroll-mt-28 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] p-3.5 sm:p-4 shadow-xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                DAY {dayNum}
                              </span>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                {day.title || `Day ${dayNum} Exploration`}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectDayTab(dIdx)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                            >
                              Focus Day {dayNum} →
                            </button>
                          </div>

                          <Timeline
                            plan={day.plan}
                            destination={trip.destination}
                            accommodations={dayAccommodations}
                            viewOnly={viewOnly}
                            dayNumber={dayNum}
                            selectedActivityId={selectedLocationId}
                            onSelectActivity={handleSelectItineraryActivity}
                            mappableLocations={locationData.mappableLocations}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Individual Day Mode */
                  <div className="space-y-4">
                    <div
                      id={`day-section-${selectedDay + 1}`}
                      className="scroll-mt-28 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] p-3.5 sm:p-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                            DAY {selectedDay + 1} OF {itinerary.length}
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                            {itinerary[selectedDay]?.title || `Day ${selectedDay + 1} Activities`}
                          </h3>
                        </div>

                        <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-black text-xs px-2.5 py-0.5">
                          {itinerary[selectedDay]?.plan?.length || 0} Stops
                        </span>
                      </div>

                      <Timeline
                        plan={itinerary[selectedDay]?.plan}
                        destination={trip.destination}
                        accommodations={getAccommodationsForDay(selectedDay)}
                        viewOnly={viewOnly}
                        dayNumber={selectedDay + 1}
                        selectedActivityId={selectedLocationId}
                        onSelectActivity={handleSelectItineraryActivity}
                        mappableLocations={locationData.mappableLocations}
                      />
                    </div>

                    {/* Bottom Day Pagination for Individual Day Mode */}
                    {!viewOnly && (
                      <BottomNav
                        selectedDay={selectedDay}
                        totalDays={itinerary.length}
                        setSelectedDay={setSelectedDay}
                        onRegenerate={handleRegenerate}
                        loading={regenerating}
                      />
                    )}
                  </div>
                )}

                {/* Stay Plan Section */}
                {canViewStayPlan && (
                  <div
                    id="stay-plan-section"
                    ref={stayPlanRef}
                    className="scroll-mt-28 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] p-4 sm:p-5 shadow-xs"
                  >
                    <StayPlan trip={trip} staySegments={trip.staySegments} viewOnly={viewOnly} />
                  </div>
                )}

                {/* Transport Details Section */}
                <div
                  id="transport-details-section"
                  ref={transportPlanRef}
                  className="scroll-mt-28 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#131b2e] p-4 sm:p-5 shadow-xs"
                >
                  <TransportDetails trip={trip} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. Tour Booking Modal */}
      <TourBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        trip={trip}
        token={token}
        user={user}
        onBookingSuccess={(confirmedData) => {
          if (contextSetTrip) {
            contextSetTrip((prev) => ({
              ...prev,
              isBooked: true,
              status: "BOOKED",
              bookingSummary: confirmedData,
            }));
          }
          setFetchedTrip((prev) => (prev ? { ...prev, isBooked: true, status: "BOOKED" } : prev));
        }}
      />
    </div>
  );

  if (viewOnly) {
    return (
      <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
        {itineraryContent}
      </div>
    );
  }

  return (
    <DashboardLayout trip={trip} setTrip={contextSetTrip}>
      <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200 -m-6 sm:-m-8 lg:-m-12">
        {itineraryContent}
      </div>
    </DashboardLayout>
  );
}
