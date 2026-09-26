import { useState, useEffect } from "react";
import { FiZap, FiCheck, FiX, FiClock, FiCalendar } from "react-icons/fi";
import { suggestSmartShift, applySmartShift } from "../../api/tripApi";
import { useTripBuilder } from "../../context/TripBuilderContext";
import toast from "react-hot-toast";

export default function SmartShiftModal({ isOpen, onClose, item, trip }) {
  const { setTrip } = useTripBuilder();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  // Auto-fetch suggestions when modal opens
  useEffect(() => {
    if (isOpen && item && trip) {
      fetchSuggestions();
    }
  }, [isOpen, item]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const res = await suggestSmartShift(trip._id, item.id, token);
      setSuggestions(res);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate alternatives.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (alternative) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await applySmartShift(trip._id, item.id, alternative, token);
      
      // SYNC CANONICAL TRIP
      setTrip(res.trip);
      toast.success("SmartShift applied successfully! Timeline updated.", { icon: "⚡" });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply SmartShift.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm dark:bg-black/60">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 text-amber-500">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <FiZap className="text-xl" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">SmartShift</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Affected Item */}
        <div className="mb-6 rounded-xl bg-slate-50 p-4 border border-slate-100 dark:border-slate-800 dark:bg-slate-800/50">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">Disruption Detected</p>
          <h3 className="font-bold text-slate-900 dark:text-white mb-1">{item?.name || item?.activity}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <FiClock /> {item?.startTime} - {item?.endTime}
          </p>
        </div>

        {/* Loading State */}
        {loading && !suggestions && (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-slate-500">Analyzing schedule alternatives...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Alternatives */}
        {!loading && suggestions && suggestions.alternatives?.length > 0 && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Possible safe alternatives:</h4>
            {suggestions.alternatives.map((alt, idx) => (
              <div key={alt.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-500 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-500 uppercase">Option {idx + 1}</span>
                    <h5 className="font-bold text-slate-900 dark:text-white mt-1">{alt.title}</h5>
                  </div>
                </div>
                
                <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2 mt-2 font-medium">
                    <FiCalendar className="text-slate-400" /> Day {alt.changes.toDay}
                    <FiClock className="ml-2 text-slate-400" /> {alt.changes.toStartTime} - {alt.changes.toEndTime}
                  </div>
                </div>

                <div className="mb-4 space-y-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <div className="flex items-center gap-1.5"><FiCheck /> No conflicts</div>
                  <div className="flex items-center gap-1.5"><FiCheck /> Hotel unchanged</div>
                  <div className="flex items-center gap-1.5"><FiCheck /> No additional cost</div>
                </div>

                <button
                  onClick={() => handleApply(alt)}
                  disabled={loading}
                  className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  {loading ? "Applying..." : "Apply this change"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Alternatives */}
        {!loading && suggestions && suggestions.alternatives?.length === 0 && (
          <div className="rounded-xl bg-slate-50 p-6 text-center border border-slate-100 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              No safe automatic shift is available for this activity. Manual adjustment is required.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
