import { useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import { useTripBuilder } from "../context/TripBuilderContext";

import ItineraryHero from "../components/itinerary/ItineraryHero";
import StayPlan from "../components/itinerary/StayPlan";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";

import { regenerateDay } from "../api/tripApi";

export default function DetailedItinerary() {
  const { state } = useLocation();
  const { trip: contextTrip, schedulingConflicts, schedulingSuggestions, isAutoScheduled, undoSchedule, applySuggestion } = useTripBuilder();

  // Prepare values before hooks
  const trip = state?.trip || contextTrip;
  const initialDay = state?.dayIndex ?? 0;

  // Hooks (must always be called)
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [loading, setLoading] = useState(false);

  // Redirect only if absolutely no trip exists in context or storage
  if (!trip) {
    return <Navigate to="/planner" replace />;
  }

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
      <div className="mx-auto flex max-w-6xl flex-col items-center space-y-8 px-6 py-8 gap-4">
        <ItineraryHero trip={trip} />

        {isAutoScheduled && schedulingConflicts?.length === 0 && (
          <div className="w-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">0 Schedule Conflicts</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Your itinerary is currently conflict-free and ready.</p>
              </div>
            </div>
            <button onClick={undoSchedule} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-sm">
              Undo Change
            </button>
          </div>
        )}

        {(!isAutoScheduled || schedulingConflicts?.length === 0) && !schedulingConflicts?.length && (
           <div className="w-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <span className="text-2xl">✓</span>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">0 Schedule Conflicts</h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Your itinerary is ready.</p>
              </div>
           </div>
        )}

        {schedulingConflicts?.length > 0 && (
          <div className="w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800/50 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-rose-50 dark:bg-rose-900/20 px-5 py-4 border-b border-rose-200 dark:border-rose-800/50">
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2">
                <span className="text-lg">⚠️</span> {schedulingConflicts.length} Schedule Conflict{schedulingConflicts.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-1 ml-7">Review and resolve before finalizing.</p>
            </div>
            <div className="divide-y divide-rose-100 dark:divide-rose-800/30">
              {schedulingConflicts.map((c, i) => (
                <div key={i} className="p-5">
                  <div className="mb-3">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Day {c.conflict.affectedDay}</div>
                    <div className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                      ⚠️ {c.conflict.itemTitle} {c.conflict.reason.replace('Conflicts with', 'conflicts with').replace('Overlaps with previous activity', 'overlaps with')}
                    </div>
                  </div>
                  
                  {c.suggestions && c.suggestions.length > 0 ? (
                    <div className="space-y-2 mt-4 ml-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Possible solutions:</p>
                      {c.suggestions.map((sug, j) => (
                        <div key={j} className="flex flex-wrap sm:flex-nowrap items-center justify-between bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-lg hover:border-rose-300 dark:hover:border-rose-600 transition">
                          <div className="text-xs text-slate-700 dark:text-slate-300 mb-2 sm:mb-0">
                            <span className="font-semibold">{j + 1}. Move {c.conflict.itemTitle}</span>
                            <br />
                            <span className="text-slate-500 dark:text-slate-400">{sug.action.type === "MOVE_DAY" ? `Day ${sug.action.toDay} · ` : ''}{sug.action.startTime} – {sug.action.endTime}</span>
                            <div className="text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                              <span className="text-xs">✓</span> Validated & Safe
                            </div>
                          </div>
                          <button
                            onClick={() => applySuggestion(sug.action)}
                            className="shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
                          >
                            Apply
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg ml-2">
                      <p className="text-xs font-bold text-red-800 dark:text-red-400 flex items-center gap-1">
                        <span>⚠️</span> No Safe Alternative
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        This activity cannot be safely moved without affecting your fixed travel schedule.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <StayPlan trip={trip} staySegments={trip.staySegments} />

        <DayTabs
          itinerary={itinerary}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
        />

        <Timeline plan={currentDay.plan} destination={trip.destination} accommodations={accommodationsToday} />
        <BottomNav
          selectedDay={selectedDay}
          totalDays={itinerary.length}
          setSelectedDay={setSelectedDay}
          onRegenerate={handleRegenerate}
          loading={loading}
        />
      </div>
    </div>
  );
}
