import { useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";

import ItineraryHero from "../components/itinerary/ItineraryHero";
import StayPlan from "../components/itinerary/StayPlan";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";

import { regenerateDay } from "../api/tripApi";

export default function DetailedItinerary() {
  const { state } = useLocation();
  const { trip: contextTrip, schedulingConflicts, applySuggestion } = useTripBuilder();
  const { user } = useAuth();

  // Prepare values before hooks
  const trip = state?.trip || contextTrip;
  const initialDay = state?.dayIndex ?? 0;
  const viewOnly = state?.viewOnly === true;

  // Hooks (must always be called)
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [loading, setLoading] = useState(false);

  // Redirect only if absolutely no trip exists in context or storage
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

  // Role-based visibility for full Stay Plan:
  // - Campus Coordinator: can view Stay Plan section and navigate to full Stay Plan page
  // - Campus Student/Participant: hidden (cannot view or navigate to full Stay Plan)
  // - Operator: hidden (cannot view or navigate to full Stay Plan)
  // - Personal Trip: visible for travelers (hidden for operator)
  const canViewStayPlan = isCampus ? isCoordinator : !isOperator;

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

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-8 gap-6">
        {/* 1. Trip Summary (Preserved existing design) */}
        <ItineraryHero trip={trip} />

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

        {/* 5. Stay Plan (Role-based: Coordinator only for Campus, Personal Trip travelers; hidden for Student & Operator) */}
        {canViewStayPlan && (
          <StayPlan trip={trip} staySegments={trip.staySegments} />
        )}

        {/* 6. Bottom Actions */}
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
