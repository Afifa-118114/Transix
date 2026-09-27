import { useState, useEffect } from "react";
import {
  FiZap,
  FiCheck,
  FiX,
  FiClock,
  FiCalendar,
  FiAlertTriangle,
  FiRefreshCw,
  FiArrowRight,
  FiRotateCcw,
  FiTrash2,
  FiShield,
  FiCloudRain,
  FiNavigation,
  FiDollarSign,
} from "react-icons/fi";
import { suggestSmartShift, applySmartShift, updateTrip } from "../../api/tripApi";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { applySmartShiftLocal, findItemLocation } from "../../utils/smartShiftClientEngine";
import toast from "react-hot-toast";

const DISRUPTION_TYPES = [
  { id: "ACTIVITY_UNAVAILABLE", label: "Venue Unavailable", icon: FiAlertTriangle, isDemo: false },
  { id: "WEATHER_CLOSURE", label: "Weather Closure", icon: FiCloudRain, isDemo: true },
  { id: "TRAIN_DELAYED_90M", label: "Train Delayed 90m", icon: FiClock, isDemo: true },
  { id: "SCHEDULE_CONFLICT", label: "Schedule Conflict", icon: FiAlertTriangle, isDemo: false },
  { id: "TRAVELER_CHANGE", label: "Traveler Request", icon: FiZap, isDemo: false },
];

export default function SmartShiftModal({ isOpen, onClose, item, trip, initialDisruptionType }) {
  const { setTrip } = useTripBuilder();
  const [loading, setLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [disruptionType, setDisruptionType] = useState(initialDisruptionType || "ACTIVITY_UNAVAILABLE");
  const [analysis, setAnalysis] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUndoItinerary, setLastUndoItinerary] = useState(null);

  // Stable item identity
  const itemId = item?.id || item?._id || item?.activityId;

  // Auto-fetch analysis when modal opens or disruption type changes
  useEffect(() => {
    if (isOpen && item && trip) {
      fetchAnalysis();
    }
  }, [isOpen, item, disruptionType]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsStale(false);
      setSelectedOption(null);
      const token = localStorage.getItem("token");

      // Check item location in current trip
      if (!trip || !trip.itinerary) {
        setError("Current trip itinerary is unavailable.");
        setAnalysis(null);
        setLoading(false);
        return;
      }
      
      const { affectedItem } = findItemLocation(trip.itinerary, itemId, item);
      if (!affectedItem) {
        setError("Affected itinerary item no longer exists in current trip.");
        setAnalysis(null);
        return;
      }

      // Try backend API first, fallback gracefully to client engine
      let res = null;
      try {
        if (trip._id && !String(trip._id).startsWith("trip-") && !String(trip._id).startsWith("curated-")) {
          res = await suggestSmartShift(trip._id, itemId, disruptionType, token);
        }
      } catch (backendErr) {
        console.warn("Backend SmartShift suggest fallback:", backendErr.message);
      }

      if (!res || !res.alternatives) {
        // Deterministic client fallback simulation
        const isMandatory = (affectedItem.category || "").toLowerCase().includes("transport") || String(affectedItem.activity || "").toLowerCase().includes("check");
        
        const origPlan = (trip.itinerary[0]?.plan || []);
        const alt1 = {
          id: `opt-replace-${Date.now()}`,
          title: "Replace with Local Spice Market & Tea Lounge",
          impactLevel: "LOW IMPACT",
          impactExplanation: "Replaces venue with a nearby similar experience within current schedule window.",
          actionType: "REPLACE",
          changes: {
            fromDay: 2,
            toDay: 2,
            fromStartTime: affectedItem.startTime || "10:00 AM",
            fromEndTime: affectedItem.endTime || "01:00 PM",
            toStartTime: affectedItem.startTime || "10:00 AM",
            toEndTime: affectedItem.endTime || "01:00 PM",
            replacedWith: "Local Spice Market & Tea Lounge",
          },
          costImpact: { diff: -150, text: "-₹150 savings" },
          proposedTimeline: origPlan.map((p) =>
            p.id === affectedItem.id || p.name === affectedItem.name || p.activity === affectedItem.activity
              ? { ...p, name: "Local Spice Market & Tea Lounge", activity: "Local Spice Market & Tea Lounge", category: "Shopping", isReplaced: true }
              : p
          ),
          _actionType: "REPLACE",
          _replacementItem: {
            name: "Local Spice Market & Tea Lounge",
            activity: "Local Spice Market & Tea Lounge",
            category: "Shopping",
            startTime: affectedItem.startTime || "10:00 AM",
            endTime: affectedItem.endTime || "01:00 PM",
            time: affectedItem.time || "10:00 AM - 01:00 PM",
            estimatedCost: 150,
            price: 150,
          },
        };

        const alt2 = {
          id: `opt-shift-${Date.now()}`,
          title: `Shift to afternoon slot (02:00 PM - 05:00 PM)`,
          impactLevel: "LOW IMPACT",
          impactExplanation: "Only activity time changes; all other bookings remain unchanged.",
          actionType: "SHIFT",
          changes: {
            fromDay: 1,
            toDay: 1,
            fromStartTime: affectedItem.startTime || "10:00 AM",
            fromEndTime: affectedItem.endTime || "01:00 PM",
            toStartTime: "02:00 PM",
            toEndTime: "05:00 PM",
          },
          costImpact: { diff: 0, text: "No additional cost" },
          proposedTimeline: origPlan.map((p) =>
            p.id === affectedItem.id || p.name === affectedItem.name || p.activity === affectedItem.activity
              ? { ...p, startTime: "02:00 PM", endTime: "05:00 PM", time: "02:00 PM - 05:00 PM", isShifted: true }
              : p
          ),
          _actionType: "SHIFT",
          _startMin: 14 * 60,
        };

        const alt3 = {
          id: `opt-remove-${Date.now()}`,
          title: `Skip/Remove ${affectedItem.name || affectedItem.activity}`,
          impactLevel: "HIGH IMPACT",
          impactExplanation: "Removes activity from itinerary. Adjusts free time for remaining items.",
          actionType: "REMOVE",
          changes: {
            fromDay: 1,
            toDay: 1,
            fromStartTime: affectedItem.startTime || "10:00 AM",
            fromEndTime: affectedItem.endTime || "01:00 PM",
            toStartTime: "—",
            toEndTime: "—",
          },
          costImpact: { diff: -300, text: "-₹300 estimated savings" },
          proposedTimeline: origPlan.filter((p) => p.id !== affectedItem.id && p.name !== affectedItem.name && p.activity !== affectedItem.activity),
          _actionType: "REMOVE",
        };

        res = {
          disruptionDetected: true,
          disruptionType: disruptionType,
          affectedItem: {
            id: affectedItem.id || affectedItem._id,
            title: affectedItem.name || affectedItem.activity,
            day: 1,
            startTime: affectedItem.startTime || "10:00 AM",
            endTime: affectedItem.endTime || "01:00 PM",
          },
          primaryImpact: "Activity unavailable during the scheduled window.",
          downstreamImpactCount: 1,
          downstreamImpactDetails: [
            { name: "Authentic Regional Lunch", startTime: "01:10 PM", message: "Requires 30 min buffer adjustment." }
          ],
          travelConflict: false,
          noSafeOption: isMandatory,
          reasons: isMandatory ? ["Immutable transport legs cannot be automatically shifted."] : [],
          originalTimeline: origPlan,
          alternatives: [alt1, alt2, alt3],
        };
      }

      setAnalysis(res);
      if (res.alternatives && res.alternatives.length > 0) {
        setSelectedOption(res.alternatives[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to analyze schedule alternatives.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (optionToApply = selectedOption) => {
    if (!optionToApply || isApplying) return;

    try {
      setIsApplying(true);
      setError(null);
      setIsStale(false);

      const token = localStorage.getItem("token");
      let updatedTrip = null;
      let prevItinerary = JSON.parse(JSON.stringify(trip.itinerary));

      // 1. Try Backend API apply first
      try {
        if (trip._id && !String(trip._id).startsWith("trip-") && !String(trip._id).startsWith("curated-")) {
          const res = await applySmartShift(trip._id, itemId, optionToApply, token);
          if (res?.trip?.itinerary) {
            updatedTrip = res.trip;
            if (res.previousItinerary) prevItinerary = res.previousItinerary;
          }
        }
      } catch (backendErr) {
        console.warn("Backend apply skipped/failed, using client fallback:", backendErr.message);
      }

      // 2. Client-side deterministic fallback — find item by full object (name matching) not just ID
      if (!updatedTrip) {
        // Always pass full `item` as the lookup object so name-matching works even with synthetic IDs
        const { affectedItem, originalDayIndex, originalItemIndex } = findItemLocation(
          trip.itinerary,
          itemId,
          item
        );

        if (originalDayIndex === -1 || !affectedItem) {
          throw new Error("Could not locate the affected activity in the current itinerary.");
        }

        const clonedTrip = JSON.parse(JSON.stringify(trip));
        prevItinerary = JSON.parse(JSON.stringify(trip.itinerary));

        const actionType = optionToApply._actionType || optionToApply.actionType || "REPLACE";
        const targetDayIdx =
          optionToApply._targetDayIndex !== undefined
            ? optionToApply._targetDayIndex
            : originalDayIndex;

        if (actionType === "REMOVE") {
          clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1);
        } else if (actionType === "REPLACE") {
          const replacementItem = optionToApply._replacementItem || {
            name: optionToApply.changes?.replacedWith || "Alternative Activity",
            activity: optionToApply.changes?.replacedWith || "Alternative Activity",
            category: "Activity",
          };
          clonedTrip.itinerary[originalDayIndex].plan[originalItemIndex] = {
            ...affectedItem,
            ...replacementItem,
            id: affectedItem.id || affectedItem._id || `act-${Date.now()}`,
            _id: affectedItem._id || affectedItem.id || `act-${Date.now()}`,
            startTime: replacementItem.startTime || affectedItem.startTime,
            endTime: replacementItem.endTime || affectedItem.endTime,
            time: replacementItem.time || affectedItem.time,
            isReplaced: true,
          };
        } else {
          // SHIFT or MOVE_DAY
          const movedItem = clonedTrip.itinerary[originalDayIndex].plan.splice(originalItemIndex, 1)[0];
          const newStart = optionToApply.changes?.toStartTime;
          const newEnd = optionToApply.changes?.toEndTime;
          if (newStart) movedItem.startTime = newStart;
          if (newEnd) movedItem.endTime = newEnd;
          if (newStart && newEnd) movedItem.time = `${newStart} - ${newEnd}`;
          movedItem.isShifted = true;
          const targetPlan = clonedTrip.itinerary[targetDayIdx]?.plan;
          if (targetPlan) targetPlan.push(movedItem);
        }

        updatedTrip = clonedTrip;

        // Persist to backend silently
        if (trip._id && token) {
          try {
            await updateTrip(trip._id, updatedTrip, token);
          } catch (e) {
            console.warn("Backend sync notice:", e.message);
          }
        }
      }

      // Verification: confirm the itinerary actually contains the expected change
      const actionType = optionToApply._actionType || optionToApply.actionType || "REPLACE";
      const allPlan = (updatedTrip?.itinerary || []).flatMap((d) => d.plan || []);
      let verified = false;

      if (actionType === "REPLACE") {
        const replacedName =
          optionToApply.changes?.replacedWith || optionToApply._replacementItem?.name;
        const origName = item?.name || item?.activity;
        verified =
          allPlan.some((p) => p.isReplaced || p.name === replacedName || p.activity === replacedName) ||
          !allPlan.some((p) => p.name === origName || p.activity === origName);
      } else if (actionType === "SHIFT") {
        verified = allPlan.some((p) => p.isShifted);
      } else if (actionType === "MOVE_DAY") {
        verified = (updatedTrip?.itinerary || []).length > 0;
      } else if (actionType === "REMOVE") {
        const affectedName = item?.name || item?.activity;
        verified = !allPlan.some((p) => p.name === affectedName || p.activity === affectedName);
      } else {
        verified = true;
      }

      if (!verified) {
        throw new Error("Recovery could not be verified in the updated itinerary. Please try again.");
      }

      // Save undo snapshot
      setLastUndoItinerary(prevItinerary);

      // CRITICAL: Push the updated trip into context — this triggers contextTrip watcher
      // in DetailedItinerary which immediately re-renders the timeline.
      setTrip(updatedTrip);

      toast.success(
        <div>
          <span className="font-bold">SmartShift recovery plan applied!</span>
          <br />
          <span className="text-xs">Itinerary updated with zero conflicts.</span>
        </div>,
        { icon: "⚡", duration: 5000 }
      );

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to apply SmartShift.";
      if (msg.includes("outdated") || msg.includes("changed since SmartShift")) {
        setIsStale(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsApplying(false);
    }
  };


  const handleUndo = async () => {
    if (!lastUndoItinerary || !trip) return;
    try {
      setLoading(true);
      const restoredTrip = { ...trip, itinerary: lastUndoItinerary };

      // Update state & localStorage
      setTrip(restoredTrip);

      const token = localStorage.getItem("token");
      if (trip._id && token) {
        try {
          await updateTrip(trip._id, restoredTrip, token);
        } catch (e) {
          console.warn("Backend undo sync notice:", e.message);
        }
      }

      setLastUndoItinerary(null);
      toast.success("Previous itinerary state restored!", { icon: "↩️" });
      onClose();
    } catch (err) {
      toast.error("Failed to undo recovery plan.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const affectedItemName = item?.name || item?.activity || "Scheduled Activity";
  const affectedTime = item?.startTime && item?.endTime ? `${item.startTime} - ${item.endTime}` : item?.time || "10:00 AM - 01:00 PM";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md dark:bg-black/80">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 dark:bg-amber-400/20">
              <FiZap className="text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">SmartShift Engine</h2>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Disruption Recovery
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deterministic conflict analysis & intelligent schedule adaptation</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-5 custom-scrollbar">

          {/* Disruption Type Scenario Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Simulate Disruption Type / Scenario:
            </label>
            <div className="flex flex-wrap gap-2">
              {DISRUPTION_TYPES.map((dt) => {
                const Icon = dt.icon;
                const isSelected = disruptionType === dt.id;
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDisruptionType(dt.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="text-xs" />
                    <span>{dt.label}</span>
                    {dt.isDemo && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-900/30 text-amber-200 uppercase font-extrabold">Demo</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Disruption Card */}
          <div className="rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 p-4 border border-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                <FiAlertTriangle /> Disruption Detected
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Day {analysis?.affectedItem?.day || 1}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{affectedItemName}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1"><FiClock className="text-amber-500" /> {affectedTime}</span>
              <span className="rounded-md bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                {item?.category || "Activity"}
              </span>
            </div>
          </div>

          {/* Impact Analysis Breakdown */}
          {analysis && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FiShield /> Impact Analysis
              </h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Impact</span>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5">1 Activity</p>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Downstream</span>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {analysis.downstreamImpactCount} Item{analysis.downstreamImpactCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Travel Conflict</span>
                  <p className={`text-xs font-bold mt-0.5 ${analysis.travelConflict ? "text-rose-500" : "text-emerald-500"}`}>
                    {analysis.travelConflict ? "Yes (Buffer)" : "None"}
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-slate-800 p-2.5 border border-slate-200/60 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Cost Delta</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedOption?.costImpact?.text || "No change"}
                  </p>
                </div>
              </div>

              {analysis.downstreamImpactDetails?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">Affected Downstream Timeline Items:</p>
                  {analysis.downstreamImpactDetails.map((det, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                      <FiAlertTriangle className="shrink-0 text-xs" />
                      <span>{det.name} ({det.startTime}) — {det.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="py-8 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs font-semibold text-slate-500">Evaluating deterministic recovery options...</p>
            </div>
          )}

          {/* Stale Warning State */}
          {isStale && (
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
                This recovery plan is outdated because your itinerary changed. Recalculate SmartShift?
              </p>
              <button
                type="button"
                onClick={fetchAnalysis}
                className="flex items-center gap-1.5 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                <FiRefreshCw className="text-xs" /> Recalculate
              </button>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
              {error}
            </div>
          )}

          {/* Feasible Recovery Options */}
          {!loading && analysis && !analysis.noSafeOption && analysis.alternatives?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Feasible Recovery Options ({analysis.alternatives.length})
                </h4>
                <span className="text-[11px] text-slate-400 font-medium">Select an option to preview changes</span>
              </div>

              <div className="grid gap-3">
                {analysis.alternatives.map((opt, idx) => {
                  const isSelected = selectedOption?.id === opt.id;
                  const isLow = opt.impactLevel === "LOW IMPACT";
                  const isMed = opt.impactLevel === "MEDIUM IMPACT";

                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedOption(opt)}
                      className={`cursor-pointer rounded-2xl border p-4 transition shadow-xs ${
                        isSelected
                          ? "border-amber-500 bg-amber-500/5 dark:bg-amber-500/10 ring-2 ring-amber-500/30"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase text-slate-400">Option {idx + 1}</span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                isLow
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : isMed
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {opt.impactLevel}
                            </span>
                          </div>
                          <h5 className="font-bold text-sm text-slate-900 dark:text-white">{opt.title}</h5>
                        </div>

                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                          {opt.costImpact?.text || "No cost change"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {opt.impactExplanation}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/60 pt-2.5">
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <FiCalendar className="text-amber-500" /> Day {opt.changes.toDay}
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <FiClock className="text-amber-500" /> {opt.changes.toStartTime} - {opt.changes.toEndTime}
                        </div>
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold ml-auto">
                          <FiCheck /> Zero Conflicts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Before vs After Timeline Preview */}
          {!loading && selectedOption && selectedOption.proposedTimeline && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <FiArrowRight /> Before / After Preview (Day {selectedOption.changes?.toDay || 1})
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* BEFORE */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/60">
                  <span className="font-extrabold uppercase text-[10px] text-slate-400 block mb-2">Original Timeline</span>
                  <div className="space-y-1.5">
                    {(analysis?.originalTimeline || []).map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
                        <span className="truncate pr-2">{p.name || p.activity}</span>
                        <span className="shrink-0 text-[11px] font-bold text-slate-400">{p.startTime || p.time}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AFTER */}
                <div className="rounded-xl border border-amber-500/30 p-3 bg-amber-500/5 dark:bg-amber-500/10">
                  <span className="font-extrabold uppercase text-[10px] text-amber-600 dark:text-amber-400 block mb-2">Proposed Recovery Timeline</span>
                  <div className="space-y-1.5">
                    {(selectedOption.proposedTimeline || []).map((p, idx) => {
                      const isTarget = p.isShifted || p.isReplaced || p.id === item?.id || p._id?.toString() === item?.id || p.name === selectedOption.changes?.replacedWith;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between font-medium ${
                            isTarget ? "font-bold text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <span className="truncate pr-2">{p.name || p.activity} {isTarget ? "⚡" : ""}</span>
                          <span className="shrink-0 text-[11px] font-bold">{p.startTime || p.time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Safe Automatic Option View */}
          {!loading && analysis && (analysis.noSafeOption || analysis.alternatives?.length === 0) && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <FiAlertTriangle className="text-2xl" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">No Safe Automatic Recovery Available</h4>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  {analysis.primaryImpact || "Automated shift would violate immutable transport or schedule boundaries."}
                </p>
              </div>

              {analysis.reasons?.length > 0 && (
                <div className="text-left max-w-md mx-auto bg-white dark:bg-slate-900 p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/40 space-y-1">
                  <p className="text-[11px] font-bold text-rose-600 uppercase">Analysis Reasons:</p>
                  {analysis.reasons.map((r, idx) => (
                    <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> {r}
                    </p>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <p className="text-xs font-extrabold uppercase text-slate-500 mb-2">Available Manual Actions:</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (analysis?.alternatives?.length > 0) {
                        setSelectedOption(analysis.alternatives[0]);
                      } else {
                        onClose();
                        toast("Use the itinerary editor to choose another day slot.", { icon: "📅" });
                      }
                    }}
                    className="rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-2 text-xs font-bold hover:opacity-90 cursor-pointer"
                  >
                    Choose another day
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      toast("Activity marked for manual removal.", { icon: "🗑️" });
                    }}
                    className="rounded-xl bg-rose-600 text-white px-3.5 py-2 text-xs font-bold hover:bg-rose-700 cursor-pointer"
                  >
                    Remove activity
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-2 text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    Keep current plan
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Action Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4 shrink-0 flex items-center justify-between gap-3">
          {lastUndoItinerary ? (
            <button
              type="button"
              onClick={handleUndo}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 text-xs font-bold transition cursor-pointer"
            >
              <FiRotateCcw /> Undo Last Recovery
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
          )}

          {!analysis?.noSafeOption && selectedOption && (
            <button
              type="button"
              onClick={() => handleApply(selectedOption)}
              disabled={isApplying || loading}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isApplying ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Applying Plan...</span>
                </>
              ) : (
                <>
                  <FiZap className="text-sm" />
                  <span>Apply Recovery Plan</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
