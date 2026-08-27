import { useState } from "react";
import {
  FiDollarSign,
  FiCheckCircle,
  FiAlertTriangle,
  FiSave,
  FiArrowRight,
  FiClock,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi";
import { useTripBuilder } from "../../context/TripBuilderContext";

export default function TripSummaryPanel() {
  const {
    trip,
    updateTripMeta,
    budgetStats,
    validationStats,
    saveItinerary,
    resetToSample,
    setIsFinalizeModalOpen,
    isSaved,
  } = useTripBuilder();

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [tempBudget, setTempBudget] = useState(trip.budget || 60000);

  const handleBudgetSave = () => {
    updateTripMeta("budget", Number(tempBudget) || 60000);
    setIsEditingBudget(false);
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-4 shadow-xs transition-colors">
      <div className="space-y-3.5 overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Trip Summary</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Live budget &amp; feasibility engine</p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              validationStats.isFeasible
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-700/50"
            }`}
          >
            {validationStats.isFeasible ? (
              <>
                <FiCheckCircle className="text-xs" /> Feasible
              </>
            ) : (
              <>
                <FiAlertTriangle className="text-xs" /> {validationStats.conflictsCount} Conflicts
              </>
            )}
          </span>
        </div>

        {/* Trip Meta Card */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              <FiMapPin />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {trip.source} → {trip.destination}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {trip.itinerary.length} Days • {trip.travelers || 2} Travelers
              </p>
            </div>
          </div>
        </div>

        {/* ================= LIVE BUDGET ENGINE ================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FiDollarSign className="text-indigo-600 dark:text-indigo-400 text-sm font-bold" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Trip Budget</h3>
            </div>

            {/* Editable Budget Limit */}
            {isEditingBudget ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-20 rounded-md border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-[#1a233a] px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  autoFocus
                />
                <button
                  onClick={handleBudgetSave}
                  className="rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempBudget(budgetStats.totalBudget);
                  setIsEditingBudget(true);
                }}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Edit Limit
              </button>
            )}
          </div>

          {/* Budget Numbers */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white dark:bg-[#1a233a] p-2 border border-slate-100 dark:border-slate-700/60">
              <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                Planned Limit
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                ₹{budgetStats.totalBudget.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg bg-white dark:bg-[#1a233a] p-2 border border-slate-100 dark:border-slate-700/60">
              <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">
                Total Spent
              </p>
              <p
                className={`mt-0.5 text-xs font-extrabold ${
                  budgetStats.isOverBudget ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"
                }`}
              >
                ₹{budgetStats.totalSpent.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              <span>{budgetStats.spentPercentage}% utilized</span>
              <span className={budgetStats.isOverBudget ? "text-rose-600 dark:text-rose-400 font-bold" : "text-emerald-700 dark:text-emerald-400 font-bold"}>
                {budgetStats.isOverBudget
                  ? `₹${budgetStats.overAmount.toLocaleString()} over`
                  : `₹${budgetStats.remaining.toLocaleString()} left`}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  budgetStats.isOverBudget
                    ? "bg-rose-500"
                    : budgetStats.spentPercentage > 85
                    ? "bg-amber-500"
                    : "bg-indigo-600"
                }`}
                style={{ width: `${Math.min(100, budgetStats.spentPercentage)}%` }}
              />
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mt-3 space-y-1 border-t border-slate-200 dark:border-slate-700/60 pt-2">
            <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">
              Category Breakdown
            </p>
            {Object.entries(budgetStats.breakdown).map(([category, amount]) => {
              if (amount === 0) return null;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400"
                >
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span>{category}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SCHEDULE STATS ================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 p-3">
          <div className="flex items-center gap-1.5">
            <FiClock className="text-indigo-600 dark:text-indigo-400 text-sm font-bold" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Schedule &amp; Timing</h3>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white dark:bg-[#1a233a] p-2 border border-slate-100 dark:border-slate-700/60">
              <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Activities</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-white">
                {validationStats.totalActivities} items
              </p>
            </div>

            <div className="rounded-lg bg-white dark:bg-[#1a233a] p-2 border border-slate-100 dark:border-slate-700/60">
              <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Travel Time</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800 dark:text-white">
                {validationStats.formattedTravelTime}
              </p>
            </div>
          </div>

          {/* Schedule Status & Conflicts List */}
          <div className="mt-2">
            {validationStats.isFeasible ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>🟢 All days feasible with proper buffers</span>
              </div>
            ) : (
              <div className="space-y-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                  <FiAlertTriangle className="text-amber-600 dark:text-amber-400 text-xs" />
                  <span>{validationStats.conflictsCount} Schedule Conflict(s)</span>
                </div>
                {validationStats.conflicts.slice(0, 2).map((c, idx) => (
                  <p key={idx} className="text-[10px] text-amber-700 dark:text-amber-400">
                    • {c.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-3 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
        {/* Save & Reset Row */}
        <div className="flex gap-2">
          <button
            onClick={saveItinerary}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
              isSaved
                ? "border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                : "border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white"
            }`}
          >
            <FiSave className="text-xs" />
            <span>{isSaved ? "✓ Saved" : "Save Plan"}</span>
          </button>

          <button
            onClick={resetToSample}
            title={`Reset Itinerary for ${trip.destination || "Trip"}`}
            className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <FiRefreshCw className="text-xs" />
            <span>Reset</span>
          </button>
        </div>

        {/* Master FINALIZE MY TRIP Button */}
        <button
          onClick={() => setIsFinalizeModalOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
        >
          <span>FINALIZE MY TRIP</span>
          <FiArrowRight className="text-xs" />
        </button>
      </div>
    </div>
  );
}
