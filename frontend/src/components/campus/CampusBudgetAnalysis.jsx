import React, { useState, useMemo } from "react";
import {
  FiLayers,
  FiTrendingUp,
  FiScissors,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiEdit2,
} from "react-icons/fi";
import {
  calculateCampusCategoryBudgetAnalysis,
  getCampusCostReductionScenarios,
  simulateCampusReductionScenario,
  getTripDurationDays,
} from "../../utils/campusBudgetUtils";
import { detectConflicts } from "../../utils/schedulingEngine";
import toast from "react-hot-toast";

/**
 * Campus Package Budget Analysis component.
 *
 * Implements the Transix Campus Trip Budget Analysis using existing canonical finalized Trip data:
 * - ACTUAL INCLUDED COST = Accommodation + Actual Travel + Included Itinerary Activities
 * - NO separate Food line (food provided via accommodation agreement)
 * - NO artificial baseline/prediction UI
 * - Budget Exceeded flow shows:
 *     🔴 PACKAGE BUDGET EXCEEDED
 *     Required: ₹X / student
 *     Budget: ₹Y / student
 *     Shortfall: ₹Z / student
 *     [ Increase Budget ] [ Reduce Activities ]
 * - Live simulation for Reduce Activities
 * - Deterministic validation & scheduling checks before applying changes
 */
export default function CampusBudgetAnalysis({
  trip,
  categoryBudget,
  updateTripMeta,
  setTrip,
  saveItinerary,
  setIsSaved,
  toggleCampusInclusion,
}) {
  const [isIncreaseBudgetOpen, setIsIncreaseBudgetOpen] = useState(false);
  const [isReduceActivitiesOpen, setIsReduceActivitiesOpen] = useState(false);

  // Increase Budget form state
  const [newBudgetValue, setNewBudgetValue] = useState("");

  // Reduce Activities state: selected activity IDs to remove in simulation
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);

  // Derive canonical analysis directly from canonical trip data
  const analysis = useMemo(() => {
    return (
      categoryBudget ||
      calculateCampusCategoryBudgetAnalysis(trip, trip?.staySegments, trip?.itinerary)
    );
  }, [trip, categoryBudget]);

  const expectedStudents = analysis?.expectedStudents || 200;
  const durationDays = getTripDurationDays(trip);

  // Per Student metrics
  const perStudentAccom = analysis?.perStudent?.accommodation || 0;
  const perStudentTravel = analysis?.perStudent?.travel || 0;
  const perStudentActivities = analysis?.perStudent?.activities || 0;
  const totalIncludedPerStudent = analysis?.perStudent?.totalIncluded || 0;
  const budgetPerStudent = analysis?.overallBudgetPerStudent || 0;

  // Group / Bulk metrics
  const groupAccom = analysis?.group?.accommodation || 0;
  const groupTravel = analysis?.group?.travel || 0;
  const groupActivities = analysis?.group?.activities || 0;
  const totalIncludedGroup = analysis?.group?.totalIncluded || 0;
  const budgetGroup = analysis?.overallGroupBudget || 0;

  // Over budget determination
  const isOverBudget = totalIncludedPerStudent > budgetPerStudent;
  const gapPerStudent = Math.max(0, totalIncludedPerStudent - budgetPerStudent);
  const gapGroup = Math.max(0, totalIncludedGroup - budgetGroup);
  const remainingPerStudent = Math.max(0, budgetPerStudent - totalIncludedPerStudent);
  const remainingGroup = Math.max(0, budgetGroup - totalIncludedGroup);

  // Real Included Activities for Reduce Activities Modal
  const scenarios = useMemo(() => {
    return getCampusCostReductionScenarios(trip, trip?.staySegments, trip?.itinerary);
  }, [trip]);

  // Live Scenario Simulation
  const simulation = useMemo(() => {
    if (selectedActivityIds.length === 0) {
      return null;
    }
    return simulateCampusReductionScenario(trip, selectedActivityIds);
  }, [trip, selectedActivityIds]);

  // Selected activities objects for display in simulation
  const selectedActivitiesList = useMemo(() => {
    return (scenarios.activityOptions || []).filter((act) =>
      selectedActivityIds.includes(act.id)
    );
  }, [scenarios.activityOptions, selectedActivityIds]);

  // Open Increase Budget modal
  const handleOpenIncreaseBudget = () => {
    const suggested = Math.max(budgetPerStudent, totalIncludedPerStudent);
    setNewBudgetValue(String(suggested));
    setIsIncreaseBudgetOpen(true);
  };

  // Open Reduce Activities modal
  const handleOpenReduceActivities = () => {
    setSelectedActivityIds([]);
    setIsReduceActivitiesOpen(true);
  };

  // Confirm Increase Budget: modifies only coordinator-entered budget
  const handleConfirmIncreaseBudget = async () => {
    const entered = Number(newBudgetValue);
    if (!entered || isNaN(entered) || entered <= 0) {
      toast.error("Please enter a valid budget amount.");
      return;
    }

    const derivedAccomBudget = Math.min(entered, durationDays * 1000, 10000);
    const newConfig = {
      ...trip.campusConfig,
      budgetPerStudent: entered,
      accommodationBudgetPerStudent: derivedAccomBudget,
    };

    updateTripMeta("campusConfig", newConfig);
    updateTripMeta("budget", entered * expectedStudents);
    if (setIsSaved) setIsSaved(false);

    try {
      const token = localStorage.getItem("token");
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/campus-trips/${trip._id}/inclusions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inclusions: newConfig.inclusions,
            exclusions: newConfig.exclusions,
            mealInclusions: newConfig.mealInclusions,
            accommodationBudgetPerStudent: derivedAccomBudget,
            budgetPerStudent: entered,
          }),
        }
      );
    } catch (err) {
      console.error("Failed to sync budget update to backend:", err);
    }

    setIsIncreaseBudgetOpen(false);
    toast.success(`Package budget updated to ₹${entered.toLocaleString()}/student`, {
      icon: "💰",
    });
  };

  // Toggle activity selection for removal
  const toggleActivitySelection = (activityId) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId)
        ? prev.filter((id) => id !== activityId)
        : [...prev, activityId]
    );
  };

  // Apply & Revalidate: removes selected activities after validation
  const handleApplyAndRevalidate = async () => {
    if (!simulation || !simulation.simulatedTrip) return;

    const previousTrip = trip;

    // Run existing deterministic scheduler / conflict detection
    const conflicts = detectConflicts(simulation.simulatedTrip);
    const blockingConflicts = (conflicts || []).filter(
      (c) => c.severity === "critical" || c.severity === "error"
    );

    if (blockingConflicts.length > 0) {
      toast.error(
        `Validation failed: ${blockingConflicts[0].message || "Scheduling conflict detected"}`,
        { icon: "⚠️" }
      );
      return;
    }

    // Apply change to package
    setTrip(simulation.simulatedTrip);
    if (setIsSaved) setIsSaved(false);

    if (saveItinerary) {
      try {
        await saveItinerary();
      } catch (err) {
        console.error("Failed to save updated package:", err);
        setTrip(previousTrip);
        toast.error("Failed to persist updated package.", { icon: "❌" });
        return;
      }
    }

    setIsReduceActivitiesOpen(false);
    setSelectedActivityIds([]);
    toast.success("Package activities updated and revalidated successfully!", {
      icon: "✓",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ================= 1. HEADER ================= */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 pb-2">
        <div className="flex items-center gap-1.5">
          <FiLayers className="text-indigo-600 dark:text-indigo-400 text-sm font-bold" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Budget Analysis
          </h3>
        </div>
        <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 px-2 py-0.5 rounded-full">
          Campus Package
        </span>
      </div>

      {/* ================= 2. TITLE ================= */}
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
        CURRENT PACKAGE / ACTUAL INCLUDED COST
      </div>

      {/* ================= 3. PER STUDENT ================= */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/60 bg-white dark:bg-[#1a233a] p-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            PER STUDENT
          </span>
          <button
            onClick={handleOpenIncreaseBudget}
            className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
            title="Edit Budget"
          >
            <FiEdit2 className="text-[10px]" />
            <span>Edit Budget</span>
          </button>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Accommodation</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{perStudentAccom.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Travel</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{perStudentTravel.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Included Activities</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{perStudentActivities.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">Total Included</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400">
              ₹{totalIncludedPerStudent.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Budget</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ₹{budgetPerStudent.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {isOverBudget ? "Gap" : "Remaining"}
            </span>
            <span
              className={`font-black ${
                isOverBudget
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              ₹{(isOverBudget ? gapPerStudent : remainingPerStudent).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 4. OVERALL GROUP / BULK ================= */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-700/60 bg-white dark:bg-[#1a233a] p-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
            OVERALL GROUP / BULK
          </span>
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
            Expected Students: {expectedStudents}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Accommodation</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{groupAccom.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Travel</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{groupTravel.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
            <span>Included Activities</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              ₹{groupActivities.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">Total Included</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400">
              ₹{totalIncludedGroup.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Budget</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              ₹{budgetGroup.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {isOverBudget ? "Gap" : "Remaining"}
            </span>
            <span
              className={`font-black ${
                isOverBudget
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              ₹{(isOverBudget ? gapGroup : remainingGroup).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 5. OVER BUDGET SECTION ================= */}
      {isOverBudget && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 p-3 text-xs space-y-2.5 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-1.5 font-black text-rose-700 dark:text-rose-300 text-xs uppercase tracking-wider">
            <span>🔴</span>
            <span>PACKAGE BUDGET EXCEEDED</span>
          </div>

          <div className="space-y-1 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex justify-between">
              <span>Required:</span>
              <span className="font-bold">₹{totalIncludedPerStudent.toLocaleString()} / student</span>
            </div>
            <div className="flex justify-between">
              <span>Budget:</span>
              <span className="font-bold">₹{budgetPerStudent.toLocaleString()} / student</span>
            </div>
            <div className="flex justify-between font-black text-rose-700 dark:text-rose-300">
              <span>Shortfall:</span>
              <span>₹{gapPerStudent.toLocaleString()} / student</span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-rose-200/70 dark:border-rose-900/40">
            <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 mb-2">
              How would you like to resolve this?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleOpenIncreaseBudget}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-indigo-950/60 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition shadow-2xs cursor-pointer active:scale-98"
              >
                <FiTrendingUp className="text-xs" />
                <span>Increase Budget</span>
              </button>
              <button
                onClick={handleOpenReduceActivities}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-600 text-white px-3 py-2 text-xs font-bold hover:bg-rose-700 transition shadow-2xs cursor-pointer active:scale-98"
              >
                <FiScissors className="text-xs" />
                <span>Reduce Activities</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. INCLUSIONS TOGGLES (Preserved) ================= */}
      {toggleCampusInclusion && (
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30 p-2.5">
          <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">
            Package Inclusions
          </p>
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Accommodation</span>
              <button
                onClick={() => toggleCampusInclusion("inclusions", "accommodation")}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                  trip.campusConfig?.inclusions?.accommodation !== false
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {trip.campusConfig?.inclusions?.accommodation !== false ? "INCLUDED" : "EXCLUDED"}
              </button>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Main Travel</span>
              <button
                onClick={() => toggleCampusInclusion("inclusions", "travel")}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                  trip.campusConfig?.inclusions?.travel !== false
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {trip.campusConfig?.inclusions?.travel !== false ? "INCLUDED" : "EXCLUDED"}
              </button>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Local Transport</span>
              <button
                onClick={() => toggleCampusInclusion("inclusions", "localTransport")}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                  trip.campusConfig?.inclusions?.localTransport !== false
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                }`}
              >
                {trip.campusConfig?.inclusions?.localTransport !== false ? "INCLUDED" : "EXCLUDED"}
              </button>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Meals</span>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleCampusInclusion("mealInclusions", "breakfast")}
                  title="Breakfast"
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                    trip.campusConfig?.mealInclusions?.breakfast !== false
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  B
                </button>
                <button
                  onClick={() => toggleCampusInclusion("mealInclusions", "lunch")}
                  title="Lunch"
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                    trip.campusConfig?.mealInclusions?.lunch !== false
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  L
                </button>
                <button
                  onClick={() => toggleCampusInclusion("mealInclusions", "dinner")}
                  title="Dinner"
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                    trip.campusConfig?.mealInclusions?.dinner !== false
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                  }`}
                >
                  D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INCREASE BUDGET                                                  */}
      {/* ========================================================================= */}
      {isIncreaseBudgetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131b2e] p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                  <FiTrendingUp />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Increase Package Budget
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Coordinator-controlled budget adjustment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsIncreaseBudgetOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiX className="text-base" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Current Budget</span>
                  <p className="mt-0.5 text-xs font-black text-slate-800 dark:text-white">
                    ₹{budgetPerStudent.toLocaleString()}/student
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Required Package Cost</span>
                  <p className="mt-0.5 text-xs font-black text-rose-600 dark:text-rose-400">
                    ₹{totalIncludedPerStudent.toLocaleString()}/student
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enter New Budget (₹ / student):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={newBudgetValue}
                    onChange={(e) => setNewBudgetValue(e.target.value)}
                    className="w-full rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-[#1a233a] pl-7 pr-3 py-2 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  New Total Group Budget:{" "}
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{((Number(newBudgetValue) || 0) * expectedStudents).toLocaleString()}
                  </span>{" "}
                  ({expectedStudents} students)
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2 text-[10px] text-slate-500 dark:text-slate-400">
                Notice: Updating the budget does NOT alter your itinerary, hotels, trains, buses, or activities.
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsIncreaseBudgetOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmIncreaseBudget}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm active:scale-98 cursor-pointer"
              >
                Update Budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REDUCE ACTIVITIES (With Live Simulation Box)                     */}
      {/* ========================================================================= */}
      {isReduceActivitiesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#131b2e] p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col justify-between animate-in fade-in zoom-in-95">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold">
                    <FiScissors />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Reduce Activities
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select included activities to remove from the finalized itinerary
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReduceActivitiesOpen(false);
                    setSelectedActivityIds([]);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              {/* List of included activities */}
              <div className="mt-3.5 space-y-2 max-h-[32vh] overflow-y-auto pr-1 text-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Included Itinerary Activities ({scenarios.activityOptions.length})
                </span>
                {scenarios.activityOptions.length === 0 ? (
                  <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-3 text-center text-slate-500 text-xs">
                    No included activities with configured costs found in the current itinerary.
                  </div>
                ) : (
                  scenarios.activityOptions.map((act) => {
                    const isSelected = selectedActivityIds.includes(act.id);
                    return (
                      <div
                        key={act.id}
                        className={`flex items-center justify-between rounded-xl border p-2.5 transition ${
                          isSelected
                            ? "border-rose-300 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-950/30"
                            : "border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex-1 pr-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                            {act.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            Day {act.day} • Configured Cost: ₹{act.costPerStudent.toLocaleString()}/student (₹{act.cost.toLocaleString()} group)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleActivitySelection(act.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            isSelected
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {isSelected ? "Selected for Removal ✓" : "Select to Remove"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* SIMULATION BOX (Required Section 10 Format) */}
              <div className="mt-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 p-3 text-xs space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  SIMULATION
                </span>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                  <span className="font-bold">CURRENT COST</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    ₹{totalIncludedPerStudent.toLocaleString()}/student
                  </span>
                </div>

                <div className="border-t border-indigo-100 dark:border-indigo-900/40 pt-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    SELECTED ACTIVITIES TO REMOVE
                  </span>
                  {selectedActivitiesList.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">None selected</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedActivitiesList.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-[11px] text-rose-700 dark:text-rose-300 font-semibold"
                        >
                          <span>{item.name}</span>
                          <span>— ₹{item.costPerStudent.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t border-indigo-100 dark:border-indigo-900/40 pt-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>ESTIMATED REDUCTION</span>
                  <span>₹{(simulation?.reductionPerStudent || 0).toLocaleString()}/student</span>
                </div>

                <div className="flex justify-between items-center border-t border-indigo-100 dark:border-indigo-900/40 pt-1.5 text-xs">
                  <span className="font-black text-slate-900 dark:text-white">
                    SIMULATED NEW TOTAL
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    ₹{(simulation ? simulation.simulatedCostPerStudent : totalIncludedPerStudent).toLocaleString()}/student
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsReduceActivitiesOpen(false);
                  setSelectedActivityIds([]);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyAndRevalidate}
                disabled={selectedActivityIds.length === 0}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm ${
                  selectedActivityIds.length > 0
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 cursor-pointer"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                }`}
              >
                Apply &amp; Revalidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
