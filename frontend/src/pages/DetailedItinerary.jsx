import { useLocation, useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";

import ItineraryHero from "../components/itinerary/ItineraryHero";
import StayPlan from "../components/itinerary/StayPlan";
import TransportDetails from "../components/itinerary/TransportDetails";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";

import { regenerateDay } from "../api/tripApi";
import { generateTripItineraryPdf } from "../utils/itineraryPdfGenerator";

export default function DetailedItinerary() {
  const { tripId } = useParams();
  const { state } = useLocation();
  const { trip: contextTrip, schedulingConflicts, applySuggestion } = useTripBuilder();
  const { user } = useAuth();

  // Prefer trip matching the URL tripId from state or context
  const initialTrip = (tripId && state?.trip?._id === tripId)
    ? state.trip
    : ((tripId && contextTrip?._id === tripId) ? contextTrip : (state?.trip || contextTrip));

  const [fetchedTrip, setFetchedTrip] = useState(null);
  const [fetchingTrip, setFetchingTrip] = useState(!initialTrip && Boolean(tripId));
  const [authError, setAuthError] = useState(null);

  const trip = fetchedTrip || initialTrip;
  const initialDay = state?.dayIndex ?? 0;
  const viewOnly = state?.viewOnly === true;

  // Fallback direct trip fetch if landing directly or reloading without context/state
  useEffect(() => {
    if (!initialTrip && tripId) {
      let isMounted = true;
      setFetchingTrip(true);
      setAuthError(null);
      const token = localStorage.getItem("token");
      const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const apiBase = rawApi.replace(/\/api$/, "");

      fetch(`${apiBase}/api/campus-trips/${tripId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(async (res) => {
          if (res.status === 403) {
            throw new Error("UNAUTHORIZED");
          }
          return res.json();
        })
        .then((data) => {
          if (isMounted && data?.success && data?.trip) {
            setFetchedTrip(data.trip);
            setFetchingTrip(false);
          } else {
            return fetch(`${apiBase}/api/trips/${tripId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }).then(async (res) => {
              if (res.status === 403) throw new Error("UNAUTHORIZED");
              return res.json();
            }).then((pData) => {
              if (isMounted && pData?.success && pData?.trip) {
                setFetchedTrip(pData.trip);
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
  }, [initialTrip, tripId]);

  // Hooks (must always be called)
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [loading, setLoading] = useState(false);

  // Synchronize local itinerary state whenever the canonical trip changes
  useEffect(() => {
    if (trip?.itinerary) {
      setItinerary(trip.itinerary);
    }
  }, [trip?.itinerary]);

  if (fetchingTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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

  // Redirect only if absolutely no trip exists in context, state, or direct fetch
  if (!trip) {
    return <Navigate to="/planner" replace />;
  }

  // Determine current user
  const currentUser = user || (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

  // Role & relationship resolution for shared itinerary view
  const isCampus = trip?.tripCategory === "CAMPUS";
  const isOperator = currentUser?.role === "operator" || localStorage.getItem("role") === "operator";

  // Check coordinator relationship for Campus trips
  const coordinatorId = trip?.coordinatorId?._id?.toString() || trip?.coordinatorId?.toString();
  const creatorId = trip?.userId?._id?.toString() || trip?.userId?.toString();
  const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString();

  const isCoordinator = isCampus && (
    (coordinatorId && currentUserId && coordinatorId === currentUserId) ||
    (creatorId && currentUserId && creatorId === currentUserId) ||
    trip?._relation === "COORDINATOR" ||
    state?.relation === "COORDINATOR" ||
    currentUser?.role === "coordinator"
  );

  // Stay Plan is visible to Coordinators, Students, and Personal travelers (read-only for students/travelers)
  const canViewStayPlan = !isOperator || isCoordinator;

  const currentDay = itinerary[selectedDay];

  // Calculate accommodation context for the current day
  const accommodationsToday = [];
  if (trip?.staySegments?.length > 0 && trip?.startDate) {
    const tripStart = new Date(trip.startDate);
    tripStart.setHours(0, 0, 0, 0);
    const currentDateMs = tripStart.getTime() + selectedDay * 86400000;

    trip.staySegments.forEach(segment => {
      if (!segment.selectedHotel) return;
      const checkInMs = new Date(segment.checkIn).setHours(0, 0, 0, 0);
      const checkOutMs = new Date(segment.checkOut).setHours(0, 0, 0, 0);

      if (currentDateMs >= checkInMs && currentDateMs <= checkOutMs) {
        let status = "Staying at";
        let dayOfStay = Math.round((currentDateMs - checkInMs) / 86400000) + 1;
        
        if (currentDateMs === checkInMs) {
          status = "Check-in";
        } else if (currentDateMs === checkOutMs) {
          status = "Check-out";
        } else {
          status = `Night ${dayOfStay} of ${segment.nights}`;
        }
        
        accommodationsToday.push({
          ...segment.selectedHotel,
          segmentLocation: segment.location,
          nights: segment.nights,
          status
        });
      }
    });
  }

  const handleRegenerate = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await regenerateDay(trip._id, selectedDay + 1, token);

      const updated = [...itinerary];
      updated[selectedDay] = res.day;

      setItinerary(updated);
    } catch (err) {
      console.error(err);
      alert("Couldn't regenerate this day.");
    } finally {
      setLoading(false);
    }
  };

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateTripItineraryPdf(trip);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-8 gap-6">
        {/* 1. Trip Summary (Preserved existing design with Download Itinerary action) */}
        <ItineraryHero 
          trip={trip} 
          onDownloadPdf={handleDownloadPdf} 
          isGeneratingPdf={isGeneratingPdf} 
        />

        {/* 2. Conflict Section — ONLY when 1+ conflicts exist, compact and matching content card width (max-w-3xl) */}
        {schedulingConflicts?.length > 0 && (
          <div className="mx-auto w-full max-w-3xl bg-white dark:bg-[#131b2e] border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xs overflow-hidden">
            <div className="bg-rose-50/80 dark:bg-rose-950/40 px-4 py-2.5 border-b border-rose-200/80 dark:border-rose-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <h3 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                  {schedulingConflicts.length} Schedule Conflict{schedulingConflicts.length !== 1 ? 's' : ''}
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
                      {c.conflict.itemTitle} {c.conflict.reason.replace('Conflicts with', 'conflicts with').replace('Overlaps with previous activity', 'overlaps with')}
                    </p>
                  </div>
                  
                  {c.suggestions && c.suggestions.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Suggested resolution:</p>
                      {c.suggestions.map((sug, j) => (
                        <div key={j} className="flex items-center justify-between bg-slate-50 dark:bg-[#1a233a] border border-slate-200/80 dark:border-slate-800 p-2.5 rounded-xl hover:border-rose-300 dark:hover:border-rose-800/60 transition">
                          <div className="text-xs text-slate-700 dark:text-slate-300 pr-2">
                            <span className="font-semibold">{j + 1}. Move {c.conflict.itemTitle}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1.5">
                              ({sug.action.type === "MOVE_DAY" ? `Day ${sug.action.toDay} · ` : ''}{sug.action.startTime} – {sug.action.endTime})
                            </span>
                            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold ml-2">
                              ✓ Safe
                            </span>
                          </div>
                          <button
                            onClick={() => applySuggestion(sug.action)}
                            className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
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

        {/* 3. Day Tabs (Preserved existing component & navigation) */}
        <DayTabs
          itinerary={itinerary}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
        />

        {/* 4. Day-wise Itinerary (Timeline with hotels, activities, and transport) */}
        <Timeline plan={currentDay?.plan} destination={trip.destination} accommodations={accommodationsToday} viewOnly={viewOnly} />

        {/* 5. Stay Plan (Read-only for Students & Personal travelers, full navigation for Coordinator) */}
        {canViewStayPlan && (
          <StayPlan trip={trip} staySegments={trip.staySegments} viewOnly={viewOnly} />
        )}

        {/* 6. Transport Details (Read-only overview) */}
        <TransportDetails trip={trip} />

        {/* 7. Bottom Actions */}
        {!viewOnly && (
          <BottomNav
            selectedDay={selectedDay}
            totalDays={itinerary.length}
            setSelectedDay={setSelectedDay}
            onRegenerate={handleRegenerate}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
