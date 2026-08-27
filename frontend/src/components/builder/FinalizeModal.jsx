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
} from "react-icons/fi";
import { useTripBuilder } from "../../context/TripBuilderContext";

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

  const checklistItems = [
    {
      title: "Budget within limit",
      status: !budgetStats.isOverBudget,
      desc: budgetStats.isOverBudget
        ? `Over budget by ₹${budgetStats.overAmount.toLocaleString()}`
        : `Within limit (₹${budgetStats.remaining.toLocaleString()} remaining)`,
    },
    {
      title: "Schedule feasibility",
      status: validationStats.isFeasible,
      desc: validationStats.isFeasible
        ? "All activities spaced out comfortably"
        : `${validationStats.conflictsCount} schedule conflict(s) detected`,
    },
    {
      title: "Activities density",
      status: validationStats.totalActivities >= trip.itinerary.length,
      desc: `${validationStats.totalActivities} activities scheduled across ${trip.itinerary.length} days`,
    },
    {
      title: "Transport status",
      status: hasTransport,
      desc: hasTransport
        ? "Transit legs configured"
        : "Optional: Local transport can be booked later",
    },
    {
      title: "Stays & Accommodations",
      status: hasStay,
      desc: hasStay ? "Accommodations allocated" : "Stays are flexible",
    },
  ];

  const handleFinalize = async () => {
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
        >
          <FiX className="text-sm" />
        </button>

        {step === "checklist" ? (
          /* ================= STEP 1: PRE-FINALIZATION CHECKLIST ================= */
          <div className="p-6">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600">
                ✨
              </div>
              <h2 className="mt-2.5 text-lg font-bold text-slate-900">
                Finalize Your Tour Plan
              </h2>
              <p className="text-xs text-slate-500">
                Review automated validation checks before confirming
              </p>
            </div>

            {/* Checklist List */}
            <div className="mt-4 space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 text-xs transition ${
                    item.status
                      ? "border-emerald-200 bg-emerald-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.status ? (
                      <FiCheckCircle className="text-emerald-600 text-sm" />
                    ) : (
                      <FiAlertCircle className="text-amber-600 text-sm" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trip Stats Pill */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs font-semibold text-slate-700">
              <span>Total Estimated Budget:</span>
              <span className="text-sm font-extrabold text-indigo-600">
                ₹{budgetStats.totalSpent.toLocaleString()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Back to Editing
              </button>
              <button
                onClick={handleFinalize}
                disabled={isProcessing}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-98 transition disabled:opacity-70"
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
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 border border-emerald-200">
              🎉
            </div>

            <h2 className="mt-3 text-xl font-black text-slate-900">
              YOUR TRIP IS READY!
            </h2>

            <p className="text-xs font-semibold text-indigo-600">
              {trip.destination || "Custom Tour"}
            </p>

            <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <FiCalendar className="text-indigo-600 text-xs" />
                {trip.itinerary.length} Days
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <FiUsers className="text-indigo-600 text-xs" />
                {trip.travelers || 2} Travelers
              </span>
            </div>

            {/* Price Box */}
            <div className="my-4 rounded-xl bg-indigo-50/70 p-4 border border-indigo-100">
              <p className="text-[10px] font-bold uppercase text-indigo-700">
                Total Tour Cost
              </p>
              <p className="mt-0.5 text-2xl font-black text-indigo-900">
                ₹{budgetStats.totalSpent.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Your custom itinerary and day plan have been saved.
              </p>
            </div>

            {/* Next Steps CTA Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleClose();
                  navigate(`/itinerary/${trip._id || "trip-kerala-5d"}`, {
                    state: { trip, dayIndex: 0 },
                  });
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
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
