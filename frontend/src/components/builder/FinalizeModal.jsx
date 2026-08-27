import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiArrowRight,
  FiCalendar,
  FiUsers,
  FiEye,
  FiCheck,
  FiAlertTriangle,
} from "react-icons/fi";
import { useTripBuilder } from "../../context/TripBuilderContext";
import toast from "react-hot-toast";

export default function FinalizeModal() {
  const navigate = useNavigate();
  const {
    trip,
    budgetStats,
    validationStats,
    isFinalizeModalOpen,
    setIsFinalizeModalOpen,
    saveItinerary,
  } = useTripBuilder();

  const [step, setStep] = useState("checklist"); // 'checklist' | 'confirmed'
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isFinalizeModalOpen) return null;

  const hasTransport = trip.itinerary.some((d) =>
    (d.plan || []).some((item) => {
      const cat = (item.category || "").toLowerCase();
      return (
        cat.includes("train") ||
        cat.includes("flight") ||
        cat.includes("bus") ||
        cat.includes("transport")
      );
    })
  );

  const hasStay = trip.itinerary.some((d) =>
    (d.plan || []).some((item) => {
      const cat = (item.category || "").toLowerCase();
      return cat.includes("hotel") || cat.includes("stay");
    })
  );

  // Authoritative finalization gating
  const isBudgetValid = !budgetStats.isOverBudget;
  const isFeasible = validationStats.isFeasible && validationStats.conflictsCount === 0;
  const canFinalize = isBudgetValid && isFeasible && (trip.itinerary?.length > 0);

  const checklistItems = [
    {
      title: "Budget within limit",
      status: isBudgetValid,
      isBlocking: true,
      desc: isBudgetValid
        ? `Within limit (₹${budgetStats.remaining.toLocaleString()} remaining)`
        : `BLOCKED: Over budget by ₹${budgetStats.overAmount.toLocaleString()} (Limit: ₹${budgetStats.totalBudget.toLocaleString()})`,
    },
    {
      title: "Schedule feasibility",
      status: isFeasible,
      isBlocking: true,
      desc: isFeasible
        ? "0 schedule conflicts • All activities properly buffered"
        : `BLOCKED: ${validationStats.conflictsCount} schedule conflict(s) detected`,
    },
    {
      title: "Activities density",
      status: validationStats.totalActivities >= trip.itinerary.length,
      isBlocking: false,
      desc: `${validationStats.totalActivities} activities scheduled across ${trip.itinerary.length} days`,
    },
    {
      title: "Transport status",
      status: hasTransport,
      isBlocking: false,
      desc: hasTransport
        ? "Transit legs configured"
        : "Optional: Local transport can be booked later",
    },
    {
      title: "Stays & Accommodations",
      status: hasStay,
      isBlocking: false,
      desc: hasStay ? "Accommodations allocated" : "Stays are flexible",
    },
  ];

  const handleFinalize = async () => {
    // Strict programmatic rejection if criteria not met
    if (!canFinalize) {
      if (!isFeasible) {
        toast.error(`Cannot confirm: Please resolve ${validationStats.conflictsCount} schedule conflict(s) first.`, { icon: "⚠️" });
      } else if (!isBudgetValid) {
        toast.error(`Cannot confirm: Total cost (₹${budgetStats.totalSpent.toLocaleString()}) exceeds budget (₹${budgetStats.totalBudget.toLocaleString()}).`, { icon: "⚠️" });
      }
      return;
    }

    setIsProcessing(true);
    await saveItinerary();
    setTimeout(() => {
      setIsProcessing(false);
      setStep("confirmed");
    }, 400);
  };

  const handleClose = () => {
    setIsFinalizeModalOpen(false);
    setStep("checklist");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-[#131b2e] shadow-2xl transition-all border border-slate-200 dark:border-slate-800/80">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <FiX className="text-sm" />
        </button>

        {step === "checklist" ? (
          /* ================= STEP 1: PRE-FINALIZATION CHECKLIST ================= */
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-xl text-indigo-600 dark:text-indigo-400">
                ✨
              </div>
              <h2 className="mt-2.5 text-lg font-bold text-slate-900 dark:text-white">
                Finalize Your Tour Plan
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review automated validation checks before confirming
              </p>
            </div>

            {/* Blocking Alerts if any criteria fails */}
            {!canFinalize && (
              <div className="mt-3.5 space-y-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/80 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <FiAlertTriangle className="text-rose-600 dark:text-rose-400 text-sm shrink-0" />
                  <span>Finalization Blocked</span>
                </div>
                {!isFeasible && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    • Schedule has {validationStats.conflictsCount} conflict(s). Adjust overlapping activity timings to proceed.
                  </p>
                )}
                {!isBudgetValid && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    • Total spent (₹{budgetStats.totalSpent.toLocaleString()}) exceeds budget (₹{budgetStats.totalBudget.toLocaleString()}) by ₹{budgetStats.overAmount.toLocaleString()}.
                  </p>
                )}
              </div>
            )}

            {/* Checklist List */}
            <div className="mt-4 space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                    item.status
                      ? "border-emerald-200 dark:border-emerald-700/50 bg-emerald-50/40 dark:bg-emerald-950/20"
                      : item.isBlocking
                      ? "border-rose-200 dark:border-rose-700/50 bg-rose-50/40 dark:bg-rose-950/20"
                      : "border-amber-200 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.status ? (
                      <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 text-sm" />
                    ) : item.isBlocking ? (
                      <FiAlertTriangle className="text-rose-600 dark:text-rose-400 text-sm" />
                    ) : (
                      <FiAlertCircle className="text-amber-600 dark:text-amber-400 text-sm" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                    <p className={`text-[11px] ${item.status ? "text-slate-600 dark:text-slate-400" : item.isBlocking ? "text-rose-700 dark:text-rose-300 font-medium" : "text-amber-700 dark:text-amber-300"}`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trip Stats Pill */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Total Estimated Cost:</span>
              <span className={`text-sm font-extrabold ${isBudgetValid ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                ₹{budgetStats.totalSpent.toLocaleString()} / ₹{budgetStats.totalBudget.toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Back to Editing
              </button>
              <button
                onClick={handleFinalize}
                disabled={isProcessing || !canFinalize}
                title={!canFinalize ? "Resolve conflicts and budget limit to finalize" : "Confirm and save itinerary"}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs transition ${
                  canFinalize
                    ? "bg-indigo-600 hover:bg-indigo-700 active:scale-98 cursor-pointer"
                    : "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                }`}
              >
                {isProcessing ? (
                  <span>Saving Itinerary...</span>
                ) : (
                  <>
                    <span>Confirm Itinerary</span>
                    <FiArrowRight className="text-xs" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 2: CONFIRMATION SCREEN ================= */
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
              🎉
            </div>

            <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">
              YOUR TRIP IS READY!
            </h2>

            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {trip.destination || "Custom Tour"}
            </p>

            <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <FiCalendar className="text-indigo-600 dark:text-indigo-400 text-xs" />
                {trip.itinerary.length} Days
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiUsers className="text-indigo-600 dark:text-indigo-400 text-xs" />
                {trip.travelers || 2} Travelers
              </span>
            </div>

            {/* Price Box */}
            <div className="my-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 p-4 border border-indigo-100 dark:border-indigo-800/60">
              <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                Total Tour Cost
              </p>
              <p className="mt-0.5 text-2xl font-black text-indigo-900 dark:text-indigo-200">
                ₹{budgetStats.totalSpent.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Your custom itinerary and day plan have been saved.
              </p>
            </div>

            {/* Next Steps CTA Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleClose();
                  navigate(`/itinerary/${trip._id || "active-trip"}`, {
                    state: { trip, dayIndex: 0 },
                  });
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                <FiEye className="text-xs" />
                <span>View Timeline</span>
              </button>

              <button
                onClick={() => {
                  handleClose();
                  navigate("/home");
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 active:scale-98 transition"
              >
                <FiCheck className="text-xs" />
                <span>Go to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
