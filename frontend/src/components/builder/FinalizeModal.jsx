import { useState, useMemo } from "react";
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
  FiCompass,
} from "react-icons/fi";
import { FaWandMagicSparkles } from "react-icons/fa6";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { updateOperatorAccess, finalizeTrip, updateTrip } from "../../api/tripApi";
import BusPreferenceSection from "./BusPreferenceSection";
import toast from "react-hot-toast";

export default function FinalizeModal() {
  const navigate = useNavigate();
  const {
    trip,
    setTrip,
    budgetStats = {},
    validationStats = {},
    isFinalizeModalOpen,
    setIsFinalizeModalOpen,
    saveItinerary,
    busRequirements = [],
    saveBusPreferences,
  } = useTripBuilder();

  // All React Hooks MUST be called unconditionally at the very top of the component
  const [step, setStep] = useState("checklist"); // 'checklist' | 'bus_preferences' | 'guide_prompt' | 'consent' | 'confirmed'
  const [isProcessing, setIsProcessing] = useState(false);
  const [busPreferencesSaved, setBusPreferencesSaved] = useState(false);
  const [savedLocalPlan, setSavedLocalPlan] = useState(null);

  // Traveler Guide Requirement state
  const [guideRequiredChoice, setGuideRequiredChoice] = useState(null); // null | false | true
  const [guideForm, setGuideForm] = useState({
    numberOfGuides: "1",
    genderPreference: "Either",
    preferredLanguages: ["English", "Hindi"],
    specialNotes: "",
  });

  const hasTransport = (trip?.itinerary || []).some((d) =>
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

  const hasStay = (trip?.itinerary || []).some((d) =>
    (d.plan || []).some((item) => {
      const cat = (item.category || "").toLowerCase();
      return cat.includes("hotel") || cat.includes("stay");
    })
  );

  // Authoritative finalization gating
  const isCampus = trip?.tripCategory === 'CAMPUS';
  const hasRoadMovements = (busRequirements || []).length > 0;

  const isValidGroupTransportPlan = (p) => {
    if (!p || typeof p !== "object") return false;
    const travelers = Number(
      p.totalTravelers ||
      (Number(p.studentsCount || 0) + Number(p.teachersStaffCount || 0))
    );
    const capacity = Number(p.capacityPerVehicle || 0);
    const vehicles = Number(
      p.vehiclesRequired || (travelers > 0 && capacity > 0 ? Math.ceil(travelers / capacity) : 0)
    );
    return travelers > 0 && capacity > 0 && vehicles > 0;
  };

  const effectiveCampusPlan = useMemo(() => {
    if (!isCampus) return null;
    if (savedLocalPlan && isValidGroupTransportPlan(savedLocalPlan)) {
      return savedLocalPlan;
    }
    if (trip?.campusTransportPlan && isValidGroupTransportPlan(trip.campusTransportPlan)) {
      return trip.campusTransportPlan;
    }
    if (trip?.campusConfig?.groupTransportPlan && isValidGroupTransportPlan(trip.campusConfig.groupTransportPlan)) {
      return trip.campusConfig.groupTransportPlan;
    }
    if (busRequirements.length > 0 && busRequirements[0]?.groupTransportPlan && isValidGroupTransportPlan(busRequirements[0].groupTransportPlan)) {
      return busRequirements[0].groupTransportPlan;
    }
    // Check if existing bus requirements have saved group preferences
    const reqWithPrefs = (busRequirements || []).find(
      (r) => r.preferences && (r.preferences.vehiclesRequired || r.preferences.capacityPerVehicle)
    );
    if (reqWithPrefs) {
      const p = reqWithPrefs.preferences;
      const students = Number(p.studentsCount || trip?.campusConfig?.expectedParticipants || trip?.travelers || 200);
      const staff = Number(p.teachersStaffCount !== undefined ? p.teachersStaffCount : 10);
      const total = Number(p.seatCount || p.totalTravelers || (students + staff));
      const cap = Number(p.capacityPerVehicle || 25);
      const veh = Number(p.vehiclesRequired || (total > 0 && cap > 0 ? Math.ceil(total / cap) : 9));
      return {
        studentsCount: students,
        teachersStaffCount: staff,
        totalTravelers: total,
        vehicleType: p.vehicleType || "Luxury Coach",
        comfort: p.comfort || "AC",
        capacityPerVehicle: cap,
        vehiclesRequired: veh,
        luggageCount: p.luggageCount !== undefined ? p.luggageCount : total,
        notes: p.notes || "",
        status: "PENDING",
      };
    }
    return null;
  }, [trip, isCampus, busRequirements, savedLocalPlan]);

  const defaultStudents = Number(
    effectiveCampusPlan?.studentsCount ||
    trip?.campusConfig?.expectedParticipants ||
    trip?.travelers ||
    200
  );
  const defaultTeachers = Number(
    effectiveCampusPlan?.teachersStaffCount !== undefined
      ? effectiveCampusPlan.teachersStaffCount
      : 10
  );
  const defaultTravelersCount = defaultStudents + defaultTeachers;

  // 1. Does the Campus Trip require group road transport?
  const requiresRoadTransport = isCampus && hasRoadMovements;

  // 2. If yes, does one valid Campus Group Transport Plan exist?
  // 3. Is the plan complete enough to support the required fleet calculation?
  const hasValidGroupPlan = !requiresRoadTransport || Boolean(effectiveCampusPlan);

  const formatFleetSummary = (plan) => {
    if (!plan) return "";
    const count = plan.vehiclesRequired;
    const type = plan.vehicleType || "Coach";
    const comfort = plan.comfort || "AC";

    if (type === "Luxury Coach" && comfort === "AC") {
      return `${count} Luxury AC Coaches`;
    }
    if (type.toLowerCase().includes("coach")) {
      const base = type.endsWith("es") ? type : (type.endsWith("h") ? `${type}es` : `${type}s`);
      if (comfort && !base.includes(comfort)) {
        return `${count} ${comfort} ${base}`;
      }
      return `${count} ${base}`;
    }
    return `${count} ${comfort ? `${comfort} ` : ""}${type}s`;
  };

  const campusTotalBudget = isCampus ? ((trip?.campusConfig?.budgetPerStudent || 0) * (trip?.campusConfig?.expectedParticipants || 1)) : 0;
  const actualBudgetLimit = isCampus ? campusTotalBudget : (budgetStats.totalBudget || 0);
  const isBudgetValid = (budgetStats.totalSpent || 0) <= actualBudgetLimit;
  const isFeasible = Boolean(validationStats.isFeasible) && (validationStats.conflictsCount || 0) === 0;

  // If yes -> Group Transport Fleet validation passes
  const canFinalize = isBudgetValid && isFeasible && ((trip?.itinerary?.length || 0) > 0) && hasValidGroupPlan;

  const checklistItems = [
    {
      title: "Budget within limit",
      status: isBudgetValid,
      isBlocking: true,
      desc: isBudgetValid
        ? `Within limit (₹${(actualBudgetLimit - (budgetStats.totalSpent || 0)).toLocaleString()} remaining)`
        : `BLOCKED: Over budget by ₹${((budgetStats.totalSpent || 0) - actualBudgetLimit).toLocaleString()} (Limit: ₹${actualBudgetLimit.toLocaleString()})`,
    },
    {
      title: "Schedule feasibility",
      status: isFeasible,
      isBlocking: true,
      desc: isFeasible
        ? "0 schedule conflicts • All activities properly buffered"
        : `BLOCKED: ${validationStats.conflictsCount || 0} schedule conflict(s) detected`,
    },
    {
      title: "Activities density",
      status: (validationStats.totalActivities || 0) >= (trip?.itinerary?.length || 0),
      isBlocking: false,
      desc: `${validationStats.totalActivities || 0} activities scheduled across ${trip?.itinerary?.length || 0} days`,
    },
    {
      title: isCampus && hasRoadMovements
        ? hasValidGroupPlan
          ? "Group fleet preferences saved"
          : "Group fleet preferences required"
        : hasRoadMovements
        ? (trip?.localTransportPreference?.arrangementType === "TRAVELER_MANAGED" || trip?.localTransportPreference?.arrangement === "TRAVELER_ARRANGED")
          ? "Local transport: Traveler managed"
          : (busPreferencesSaved || trip?.localTransportPreference)
          ? `Local transport: ${trip?.localTransportPreference?.arrangementType === "PRIVATE_MINIBUS" ? "Private Mini Bus" : "Private Car"}`
          : "Local transport options"
        : "Transport status",
      status: isCampus && hasRoadMovements
        ? hasValidGroupPlan
        : true, // Local transport is optional for Personal Trips
      isBlocking: isCampus && hasRoadMovements && !hasValidGroupPlan,
      desc: isCampus && hasRoadMovements
        ? hasValidGroupPlan
          ? `${effectiveCampusPlan.totalTravelers} travelers • ${effectiveCampusPlan.vehiclesRequired} coaches • ${busRequirements.length} road movements`
          : `${defaultTravelersCount} travelers • ${busRequirements.length} road movements identified`
        : hasRoadMovements
        ? (trip?.localTransportPreference?.arrangementType === "TRAVELER_MANAGED" || trip?.localTransportPreference?.arrangement === "TRAVELER_ARRANGED")
          ? `Traveler managed · ${busRequirements.length} scheduled local movement(s)`
          : (busPreferencesSaved || trip?.localTransportPreference)
          ? `${trip?.localTransportPreference?.arrangementType === "PRIVATE_MINIBUS" ? "Private Mini Bus" : "Private Car"} · ${busRequirements.length} movement(s) (${trip?.localTransportPreference?.vehicleType || "Vehicle"} · ${trip?.localTransportPreference?.comfort || "AC"})`
          : `${busRequirements.length} scheduled local movement(s) · Optional private vehicle coordination`
        : hasTransport
        ? "Transit legs configured"
        : "Optional: Local transport can be booked later",
      action: isCampus && hasRoadMovements ? (
        hasValidGroupPlan ? (
          <button
            type="button"
            onClick={() => setStep("bus_preferences")}
            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
          >
            Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep("bus_preferences")}
            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <span>Set Group Fleet Preferences</span>
            <FiArrowRight className="text-xs" />
          </button>
        )
      ) : hasRoadMovements ? (
        <button
          type="button"
          onClick={() => setStep("bus_preferences")}
          className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
        >
          {trip?.localTransportPreference || busPreferencesSaved ? "Edit" : "Configure"}
        </button>
      ) : null,
    },
    {
      title: "Stays & Accommodations",
      status: hasStay,
      isBlocking: false,
      desc: hasStay ? "Accommodations allocated" : "Stays are flexible",
    },
  ];

  const handleSaveBusPreferences = (updatedReqs, campusPlanData, localTransportPref) => {
    saveBusPreferences(updatedReqs, campusPlanData, localTransportPref);
    if (campusPlanData) {
      setSavedLocalPlan(campusPlanData);
    }
    setBusPreferencesSaved(true);
    toast.success(
      isCampus
        ? "Group transport preferences saved"
        : (localTransportPref?.arrangementType === "TRAVELER_MANAGED" || localTransportPref?.arrangement === "TRAVELER_MANAGED" || localTransportPref?.arrangement === "TRAVELER_ARRANGED")
        ? "Local transport set to traveler managed"
        : "Local transport preferences saved",
      { icon: isCampus ? "🚌" : "🚗" }
    );
  };

  const handleChecklistProceed = () => {
    if (!isFeasible) {
      toast.error(`Cannot confirm: Please resolve ${validationStats.conflictsCount} schedule conflict(s) first.`, { icon: "⚠️" });
      return;
    }
    if (!isBudgetValid) {
      toast.error(`Cannot confirm: Total cost (₹${budgetStats.totalSpent.toLocaleString()}) exceeds budget (₹${actualBudgetLimit.toLocaleString()}).`, { icon: "⚠️" });
      return;
    }

    if (isCampus && hasRoadMovements && !hasValidGroupPlan) {
      setStep("bus_preferences");
      return;
    }

    // Advance to Guide Requirement Prompt before finalization
    setStep("guide_prompt");
  };

  const handleFinalizeWithGuide = async (guideReqData) => {
    setIsProcessing(true);
    try {
      await saveItinerary();

      const token = localStorage.getItem("token");

      // Persist guide requirement directly to the trip
      if (token && trip?._id) {
        await updateTrip(trip._id, { guideRequirement: guideReqData }, token).catch(() => null);
      }

      if (isCampus) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ guideRequirement: guideReqData }),
        });
        
        if (!res.ok) {
          throw new Error("Failed to finalize campus trip");
        }
        const data = await res.json();
        if (data?.trip && setTrip) {
          setTrip({
            ...data.trip,
            guideRequirement: guideReqData,
          });
        }
      } else {
        const data = await finalizeTrip(trip._id, token);
        if (data?.trip && setTrip) {
          setTrip({
            ...data.trip,
            guideRequirement: guideReqData,
          });
        }
      }

      setTimeout(() => {
        setIsProcessing(false);
        setStep("consent");
      }, 400);
    } catch (err) {
      setIsProcessing(false);
      toast.error(err.response?.data?.message || "Unable to finalize your trip. Please try again.");
    }
  };

  const handleOperatorConsent = async (consent) => {
    if (consent) {
      setIsProcessing(true);
      try {
        const token = localStorage.getItem("token");
        const res = await updateOperatorAccess(trip._id, true, token);
        if (res?.trip && setTrip) {
          setTrip(res.trip);
        }
        toast.success("Trip shared with your operator.");
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to share trip.");
      }
      setIsProcessing(false);
    }
    setStep("confirmed");
  };

  const handleClose = () => {
    setIsFinalizeModalOpen(false);
    setStep("checklist");
  };

  // Safe early exit AFTER all hooks and derivations have executed unconditionally
  if (!isFinalizeModalOpen || !trip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#131b2e] shadow-2xl transition-all border border-slate-200 dark:border-slate-800/80 custom-scrollbar">
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
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    • Total spent (₹{budgetStats.totalSpent.toLocaleString()}) exceeds budget (₹{actualBudgetLimit.toLocaleString()}) by ₹{(budgetStats.totalSpent - actualBudgetLimit).toLocaleString()}.
                  </p>
                )}
                {isCampus && hasRoadMovements && !hasValidGroupPlan && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    • Group fleet preferences required: Please configure the bus fleet for {defaultTravelersCount} travelers across {busRequirements.length} road movements.
                  </p>
                )}
              </div>
            )}

            {/* Checklist List */}
            <div className="mt-4 space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-2.5 text-xs transition ${
                    item.status
                      ? "border-emerald-200 bg-emerald-50/40"
                      : item.isBlocking
                      ? "border-rose-200 bg-rose-50/40"
                      : "border-amber-200 bg-amber-50/40"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {item.status ? (
                        <FiCheckCircle className="text-emerald-600 dark:text-emerald-400 text-sm" />
                      ) : item.isBlocking ? (
                        <FiAlertTriangle className="text-rose-600 dark:text-rose-400 text-sm" />
                      ) : (
                        <FiAlertCircle className="text-amber-600 dark:text-amber-400 text-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
                      <p className={`text-[11px] ${item.status ? "text-slate-600 dark:text-slate-400" : item.isBlocking ? "text-rose-700 dark:text-rose-300 font-medium" : "text-amber-700 dark:text-amber-300"}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                  {item.action && (
                    <div className="shrink-0">
                      {item.action}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {validationStats.warnings?.length > 0 && (
              <div className="mt-3 space-y-1 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5 text-xs text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <FiAlertTriangle className="text-amber-600 dark:text-amber-400 text-sm" />
                  <span>{validationStats.warnings.length} Warning(s)</span>
                </div>
                {validationStats.warnings.map((w, idx) => (
                  <p key={idx} className="text-[11px] text-amber-700 dark:text-amber-400 ml-5">
                    • {w.message}
                  </p>
                ))}
              </div>
            )}

            {/* Trip Stats Pill */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#fafaf9] p-3 border border-[#e7e5e4] text-xs font-semibold text-[#57534e]">
              <span>Total Estimated Cost:</span>
              <span className={`text-sm font-extrabold ${isBudgetValid ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}>
                ₹{budgetStats.totalSpent.toLocaleString()} / ₹{actualBudgetLimit.toLocaleString()}
              </span>
            </div>

            {/* Campus Group Transport Summary Pill if configured */}
            {isCampus && hasRoadMovements && effectiveCampusPlan && (
              <div className="mt-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 border border-indigo-200 dark:border-indigo-800/60 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Group Transport
                  </span>
                  <button
                    type="button"
                    onClick={() => setStep("bus_preferences")}
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Edit Preferences
                  </button>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {effectiveCampusPlan.totalTravelers} travelers
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {formatFleetSummary(effectiveCampusPlan)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {effectiveCampusPlan.capacityPerVehicle} seats/coach
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={handleClose}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Back to Editing
              </button>
              <button
                onClick={handleChecklistProceed}
                disabled={isProcessing || !isBudgetValid || !isFeasible}
                title={
                  !isFeasible
                    ? "Resolve conflicts to finalize"
                    : !isBudgetValid
                    ? "Adjust budget to finalize"
                    : !hasValidGroupPlan
                    ? "Configure group fleet preferences"
                    : "Confirm and save itinerary"
                }
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white shadow-xs transition ${
                  !isBudgetValid || !isFeasible
                    ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-98 cursor-pointer"
                }`}
              >
                {isProcessing ? (
                  <span>Saving Itinerary...</span>
                ) : isCampus && hasRoadMovements && !hasValidGroupPlan ? (
                  <>
                    <span>Set Group Fleet Preferences</span>
                    <FiArrowRight className="text-xs" />
                  </>
                ) : (
                  <>
                    <span>Confirm Itinerary</span>
                    <FiArrowRight className="text-xs" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : step === "bus_preferences" ? (
          /* ================= STEP: BUS TRANSPORT PREFERENCES ================= */
          <div className="p-6 space-y-4">
            <BusPreferenceSection
              requirements={busRequirements}
              trip={trip}
              onSavePreferences={handleSaveBusPreferences}
              isSaved={
                isCampus
                  ? busPreferencesSaved || Boolean(effectiveCampusPlan)
                  : busPreferencesSaved || Boolean(trip?.localTransportPreference)
              }
            />

            {/* Campus Group Transport Summary before confirming */}
            {isCampus && effectiveCampusPlan && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 text-xs text-left">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                  Group Transport
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {effectiveCampusPlan.totalTravelers} travelers
                </div>
                <div className="text-xs font-black text-indigo-800 dark:text-indigo-200 mt-0.5">
                  {formatFleetSummary(effectiveCampusPlan)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {effectiveCampusPlan.capacityPerVehicle} seats/coach
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep("checklist")}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Back to Checklist
              </button>
              <button
                type="button"
                onClick={() => setStep("guide_prompt")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-98"
              >
                <span>Continue to Guide Requirement</span>
                <FiArrowRight className="text-xs" />
              </button>
            </div>
          </div>
        ) : step === "guide_prompt" ? (
          /* ================= STEP: GUIDE REQUIREMENT PROMPT & FORM ================= */
          <div className="p-6 text-left">
            {guideRequiredChoice === null ? (
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-2xl text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-700/50 mb-3">
                  <FiCompass size={24} />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white text-center">
                  Do you need a guide for this trip?
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-sm mx-auto">
                  A certified local Transix guide can lead historical walks, manage logistics, and provide cultural insights for your group.
                </p>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setGuideRequiredChoice(true)}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wide transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <span>YES, I NEED A GUIDE</span>
                    <FiArrowRight />
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      setGuideRequiredChoice(false);
                      handleFinalizeWithGuide({
                        required: false,
                        numberOfGuides: "0",
                        genderPreference: "Either",
                        preferredLanguages: [],
                        specialNotes: "Traveler opted for no guide.",
                        status: "none",
                      });
                    }}
                    className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {isProcessing ? "Finalizing Trip..." : "NO, I DON'T NEED A GUIDE"}
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setStep(isCampus && hasRoadMovements ? "bus_preferences" : "checklist")}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                  >
                    Back to previous step
                  </button>
                </div>
              </div>
            ) : (
              /* Traveler's Guide Requirement Form */
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                      <FiCompass size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        Traveler Guide Requirement
                      </h3>
                      <p className="text-[10px] text-slate-400">Specify preferences for your trip's matched guides</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGuideRequiredChoice(null)}
                    className="text-[11px] font-bold text-slate-400 hover:text-slate-200"
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-4 text-xs font-medium">
                  {/* Field 1: How many guides */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      1. How many guides do you need? *
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {["1", "2", "3", "4", "5+"].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setGuideForm((prev) => ({ ...prev, numberOfGuides: num }))}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            guideForm.numberOfGuides === num
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 2: Gender Preference */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      2. Guide Gender Preference *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Either", "Male", "Female"].map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setGuideForm((prev) => ({ ...prev, genderPreference: gender }))}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            guideForm.genderPreference === gender
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Field 3: Preferred Guide Language */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      3. Preferred Guide Languages (Optional)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "English",
                        "Hindi",
                        "Malayalam",
                        "Tamil",
                        "Marathi",
                        "Kannada",
                        "Gujarati",
                        "Bengali",
                        "Telugu",
                        "French",
                        "German",
                        "Spanish",
                      ].map((lang) => {
                        const isSelected = guideForm.preferredLanguages.includes(lang);
                        return (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => {
                              setGuideForm((prev) => {
                                const exists = prev.preferredLanguages.includes(lang);
                                return {
                                  ...prev,
                                  preferredLanguages: exists
                                    ? prev.preferredLanguages.filter((l) => l !== lang)
                                    : [...prev.preferredLanguages, lang],
                                };
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              isSelected
                                ? "bg-teal-600/20 text-teal-300 border-teal-500/50"
                                : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            {isSelected ? `✓ ${lang}` : `+ ${lang}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Field 4: Special Notes / Requirements */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                      4. Special Notes / Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={guideForm.specialNotes}
                      onChange={(e) => setGuideForm((prev) => ({ ...prev, specialNotes: e.target.value }))}
                      placeholder="Add any preferences, accessibility requirements, language needs, group considerations, locations, or other notes for the guide."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGuideRequiredChoice(null)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => {
                      handleFinalizeWithGuide({
                        required: true,
                        numberOfGuides: guideForm.numberOfGuides,
                        genderPreference: guideForm.genderPreference,
                        preferredLanguages: guideForm.preferredLanguages,
                        specialNotes: guideForm.specialNotes,
                        status: "pending",
                      });
                    }}
                    className="flex-[2] flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-98 cursor-pointer"
                  >
                    {isProcessing ? "Finalizing Trip..." : "Save Requirement & Finalize Trip"}
                    <FiArrowRight className="text-xs" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : step === "consent" ? (
          /* ================= STEP 2: OPERATOR CONSENT ================= */
          <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50">
              🤝
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-900 dark:text-white uppercase">
              Trip Finalized Successfully
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Your itinerary is saved.
            </p>

            <div className="my-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-5 border border-slate-200 dark:border-slate-700 text-left">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
                Would you like to share this trip with your tour operator?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">This allows the operator to:</p>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>monitor your journey</li>
                <li>coordinate trip requirements</li>
                <li>track booking status</li>
                <li>respond to operational issues</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleOperatorConsent(false)}
                disabled={isProcessing}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Not Now
              </button>
              <button
                onClick={() => handleOperatorConsent(true)}
                disabled={isProcessing}
                className="flex-[2] rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center"
              >
                {isProcessing ? "Sharing..." : "Share with Operator"}
              </button>
            </div>
          </div>
        ) : (
          /* ================= STEP 3: CONFIRMATION SCREEN ================= */
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

            {/* Campus Group Transport Finalization Summary */}
            {isCampus && effectiveCampusPlan && (
              <div className="my-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 text-left text-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                  Group Transport
                </div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {effectiveCampusPlan.totalTravelers} travelers
                </div>
                <div className="text-xs font-black text-slate-800 dark:text-slate-200 mt-0.5">
                  {formatFleetSummary(effectiveCampusPlan)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {effectiveCampusPlan.capacityPerVehicle} seats/coach
                </div>
              </div>
            )}

            {/* Personal Trip Local Transport Finalization Summary */}
            {!isCampus && trip?.localTransportPreference && (
              <div className="my-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200 dark:border-slate-700 text-left text-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-1">
                  Local Transport
                </div>
                {(trip.localTransportPreference.arrangementType === "TRAVELER_MANAGED" ||
                  trip.localTransportPreference.arrangement === "TRAVELER_ARRANGED") ? (
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Traveler managed (Ola / Uber / auto / taxi / self-drive)
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {trip.localTransportPreference.arrangementType === "PRIVATE_MINIBUS" ? "Private Mini Bus" : "Private Car"} · {trip.localTransportPreference.vehicleType || "Private Vehicle"}
                    </div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {trip.localTransportPreference.comfort || "AC"} · {trip.localTransportPreference.seatCount || trip.travelers || 2} seats · {trip.localTransportPreference.luggageCount || trip.travelers || 2} bags · Entire trip
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Next Steps CTA Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleClose();
                  if (trip.tripCategory === 'CAMPUS') {
                    navigate(`/campus/${trip._id || "active-trip"}/dashboard`);
                  } else {
                    navigate(`/itinerary/${trip._id || "active-trip"}`, {
                      state: { trip, dayIndex: 0 },
                    });
                  }
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white py-2.5 text-xs font-bold text-[#57534e] hover:bg-[#fafaf9] hover:text-[#0c0a09] transition"
              >
                <FiEye className="text-xs" />
                <span>View Timeline</span>
              </button>

              <button
                onClick={() => {
                  handleClose();
                  if (trip.tripCategory === 'CAMPUS') {
                    navigate(`/campus/${trip._id || "active-trip"}/dashboard`);
                  } else {
                    navigate("/home");
                  }
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
