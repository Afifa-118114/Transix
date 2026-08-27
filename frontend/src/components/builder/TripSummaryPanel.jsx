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
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="space-y-3.5 overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Trip Summary</h2>
            <p className="text-[11px] text-slate-500">Live budget & feasibility engine</p>
          </div>
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              validationStats.isFeasible
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
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
        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/80">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs">
              <FiMapPin />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">
                {trip.source} → {trip.destination}
              </h3>
              <p className="text-[10px] text-slate-500">
                {trip.itinerary.length} Days • {trip.travelers || 2} Travelers
              </p>
            </div>
          </div>
        </div>

        {/* ================= LIVE BUDGET ENGINE ================= */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FiDollarSign className="text-indigo-600 text-sm font-bold" />
              <h3 className="text-xs font-bold text-slate-900">Trip Budget</h3>
            </div>

            {/* Editable Budget Limit */}
            {isEditingBudget ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempBudget}
                  onChange={(e) => setTempBudget(e.target.value)}
                  className="w-20 rounded-md border border-indigo-400 bg-white px-1.5 py-0.5 text-xs font-bold outline-none"
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
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Edit Limit
              </button>
            )}
          </div>

          {/* Budget Numbers */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white p-2 border border-slate-100">
              <p className="text-[9px] uppercase font-bold text-slate-400">
                Planned Limit
              </p>
              <p className="mt-0.5 text-xs font-extrabold text-slate-900">
                ₹{budgetStats.totalBudget.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg bg-white p-2 border border-slate-100">
              <p className="text-[9px] uppercase font-bold text-slate-400">
                Total Spent
              </p>
              <p
                className={`mt-0.5 text-xs font-extrabold ${
                  budgetStats.isOverBudget ? "text-rose-600" : "text-indigo-600"
                }`}
              >
                ₹{budgetStats.totalSpent.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
              <span>{budgetStats.spentPercentage}% utilized</span>
              <span className={budgetStats.isOverBudget ? "text-rose-600 font-bold" : "text-emerald-700 font-bold"}>
                {budgetStats.isOverBudget
                  ? `₹${budgetStats.overAmount.toLocaleString()} over`
                  : `₹${budgetStats.remaining.toLocaleString()} left`}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
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
          <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
            <p className="text-[9px] font-bold uppercase text-slate-400">
              Category Breakdown
            </p>
            {Object.entries(budgetStats.breakdown).map(([category, amount]) => {
              if (amount === 0) return null;
              return (
                <div
                  key={category}
                  className="flex items-center justify-between text-[11px] text-slate-600"
                >
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span>{category}</span>
                  </span>
                  <span className="font-bold text-slate-900">
                    ₹{amount.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SCHEDULE STATS ================= */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <div className="flex items-center gap-1.5">
            <FiClock className="text-indigo-600 text-sm font-bold" />
            <h3 className="text-xs font-bold text-slate-900">Schedule & Timing</h3>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-white p-2 border border-slate-100">
              <p className="text-[9px] uppercase font-bold text-slate-400">Activities</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800">
                {validationStats.totalActivities} items
              </p>
            </div>

            <div className="rounded-lg bg-white p-2 border border-slate-100">
              <p className="text-[9px] uppercase font-bold text-slate-400">Travel Time</p>
              <p className="mt-0.5 text-xs font-bold text-slate-800">
                {validationStats.formattedTravelTime}
              </p>
            </div>
          </div>

          {/* Schedule Status & Conflicts List */}
          <div className="mt-2">
            {validationStats.isFeasible ? (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-1.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>🟢 All days feasible with proper buffers</span>
              </div>
            ) : (
              <div className="space-y-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900 border border-amber-200">
                <div className="flex items-center gap-1 font-bold text-amber-800">
                  <FiAlertTriangle className="text-amber-600 text-xs" />
                  <span>{validationStats.conflictsCount} Schedule Conflict(s)</span>
                </div>
                {validationStats.conflicts.slice(0, 2).map((c, idx) => (
                  <p key={idx} className="text-[10px] text-amber-700">
                    • {c.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
        {/* Save & Reset Row */}
        <div className="flex gap-2">
          <button
            onClick={saveItinerary}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold transition ${
              isSaved
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white"
            }`}
          >
            <FiSave className="text-xs" />
            <span>{isSaved ? "✓ Saved" : "Save Plan"}</span>
          </button>

          <button
            onClick={resetToSample}
            title="Reset to Kerala Sample"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
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
