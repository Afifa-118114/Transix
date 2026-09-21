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
import { FaWandMagicSparkles } from "react-icons/fa6";
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
        toast.error(`Cannot confirm: Please resolve ${validationStats.conflictsCount} schedule conflict(s) first.`);
      } else if (!isBudgetValid) {
        toast.error(`Cannot confirm: Total cost (₹${budgetStats.totalSpent.toLocaleString()}) exceeds budget (₹${budgetStats.totalBudget.toLocaleString()}).`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-[#e7e5e4]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[#fafaf9] border border-[#e7e5e4] text-[#777169] hover:bg-[#f5f5f4] hover:text-[#0c0a09] transition"
        >
          <FiX className="text-sm" />
        </button>

        {step === "checklist" ? (
          /* ================= STEP 1: PRE-FINALIZATION CHECKLIST ================= */
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#034F46]/10 text-[#034F46]">
                <FaWandMagicSparkles className="text-lg" />
              </div>
              <h2 className="mt-2.5 text-lg font-bold text-[#0c0a09]">
                Finalize Your Tour Plan
              </h2>
              <p className="text-xs text-[#777169]">
                Review automated validation checks before confirming
              </p>
            </div>

            {/* Blocking Alerts if any criteria fails */}
            {!canFinalize && (
              <div className="mt-3.5 space-y-1.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
                <div className="flex items-center gap-1.5 font-bold">
                  <FiAlertTriangle className="text-rose-600 text-sm shrink-0" />
                  <span>Finalization Blocked</span>
                </div>
                {!isFeasible && (
                  <p className="text-[11px] text-rose-700">
                    • Schedule has {validationStats.conflictsCount} conflict(s). Adjust overlapping activity timings to proceed.
                  </p>
                )}
                {!isBudgetValid && (
                  <p className="text-[11px] text-rose-700">
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
                      ? "border-emerald-200 bg-emerald-50/40"
                      : item.isBlocking
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.status ? (
                      <FiCheckCircle className="text-emerald-700 text-sm" />
                    ) : item.isBlocking ? (
                      <FiAlertTriangle className="text-rose-600 text-sm" />
                    ) : (
                      <FiAlertCircle className="text-amber-600 text-sm" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-[#0c0a09]">{item.title}</h4>
                    <p
                      className={`text-[11px] ${
                        item.status
                          ? "text-[#57534e]"
                          : item.isBlocking
                          ? "text-rose-700 font-medium"
                          : "text-amber-800"
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trip Stats Pill */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#fafaf9] p-3 border border-[#e7e5e4] text-xs font-semibold text-[#57534e]">
              <span>Total Estimated Cost:</span>
              <span
                className={`text-sm font-extrabold ${
                  isBudgetValid ? "text-[#034F46]" : "text-rose-600"
                }`}
              >
                ₹{budgetStats.totalSpent.toLocaleString()} / ₹{budgetStats.totalBudget.toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-full border border-[#e7e5e4] bg-white py-2.5 text-xs font-bold text-[#57534e] hover:bg-[#fafaf9] hover:text-[#0c0a09] transition"
              >
                Back to Editing
              </button>
              <button
                onClick={handleFinalize}
                disabled={isProcessing || !canFinalize}
                title={
                  !canFinalize
                    ? "Resolve conflicts and budget limit to finalize"
                    : "Confirm and save itinerary"
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold text-white shadow-xs transition ${
                  canFinalize
                    ? "bg-[#0c0a09] hover:bg-[#292524] active:scale-98 cursor-pointer"
                    : "bg-[#d6d3d1] text-[#777169] cursor-not-allowed opacity-60"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <FiCheckCircle className="text-2xl" />
            </div>

            <h2 className="mt-3 text-xl font-black text-[#0c0a09]">
              YOUR TRIP IS READY!
            </h2>

            <p className="text-xs font-semibold text-[#034F46]">
              {trip.destination || "Custom Tour"}
            </p>

            <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-[#777169]">
              <span className="flex items-center gap-1">
                <FiCalendar className="text-[#034F46] text-xs" />
                {trip.itinerary.length} Days
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiUsers className="text-[#034F46] text-xs" />
                {trip.travelers || 2} Travelers
              </span>
            </div>

            {/* Price Box */}
            <div className="my-4 rounded-xl bg-[#fafaf9] p-4 border border-[#e7e5e4]">
              <p className="text-[10px] font-bold uppercase text-[#777169]">
                Total Tour Cost
              </p>
              <p className="mt-0.5 text-2xl font-black text-[#034F46]">
                ₹{budgetStats.totalSpent.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[#777169]">
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
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white py-2.5 text-xs font-bold text-[#57534e] hover:bg-[#fafaf9] hover:text-[#0c0a09] transition"
              >
                <FiEye className="text-xs" />
                <span>View Timeline</span>
              </button>

              <button
                onClick={() => {
                  handleClose();
                  navigate("/home");
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#0c0a09] py-2.5 text-xs font-bold text-white hover:bg-[#292524] active:scale-98 transition"
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
