import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiX, FiInfo, FiCheckCircle } from "react-icons/fi";
import { FaTrain, FaPlane } from "react-icons/fa";
import toast from "react-hot-toast";

import { searchTrains } from "../services/trainService";
import { searchFlights } from "../services/flightService";

import ModeTabs from "../components/travelOptions/ModeTabs";
import TrainList from "../components/travelOptions/TrainList";
import SelectedTrain from "../components/travelOptions/SelectedTrain";
import FlightList from "../components/travelOptions/FlightList";
import SelectedFlight from "../components/travelOptions/SelectedFlight";
import ReviewTrainChangeModal from "../components/travelOptions/ReviewTrainChangeModal";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  useTripBuilder,
  findSelectedTrainInItinerary,
  findSelectedFlightInItinerary,
  findSelectedTransportInItinerary,
} from "../context/TripBuilderContext";

function formatDisplayDate(dateVal) {
  if (!dateVal) return "Scheduled Date";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSearchDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

export default function TravelOptionsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const {
    trip,
    setTrip,
    previewTransportChanges,
    previewTrainChanges,
    applyApprovedTransportChanges,
  } = useTripBuilder();

  // Root trip endpoints
  const tripSource = trip?.source || state?.source || searchParams.get("source") || "Mumbai";
  const tripDestination = trip?.destination || state?.destination || searchParams.get("destination") || "Guwahati";

  // Derive start and end dates
  const startDate =
    state?.startDate ||
    state?.date ||
    trip?.startDate ||
    searchParams.get("date") ||
    searchParams.get("startDate") ||
    null;
  let endDate =
    state?.endDate ||
    trip?.endDate ||
    searchParams.get("endDate") ||
    null;
  if (!endDate && startDate) {
    const numDays = trip?.itinerary?.length || 5;
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      const e = new Date(s);
      e.setDate(e.getDate() + numDays - 1);
      endDate = e.toISOString().split("T")[0];
    }
  }

  // Journey Direction: "outbound" | "return"
  const [journeyDirection, setJourneyDirection] = useState(
    state?.journeyDirection || searchParams.get("direction") || "outbound"
  );

  // Selected Mode: "train" | "flight"
  const [selectedMode, setSelectedMode] = useState(
    state?.travelMode || searchParams.get("mode") || "train"
  );

  // Active journey route & date
  const currentSource = journeyDirection === "return" ? tripDestination : tripSource;
  const currentDestination = journeyDirection === "return" ? tripSource : tripDestination;
  const currentDate = journeyDirection === "return" ? endDate : startDate;

  // Train and Flight data states
  const [trains, setTrains] = useState([]);
  const [flights, setFlights] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Pending transport selections (temporary state, does not mutate canonical itinerary until user approves)
  // Each pending item is structured as { mode: "train"|"flight", item }
  const [pendingOutbound, setPendingOutbound] = useState(null);
  const [pendingReturn, setPendingReturn] = useState(null);

  // Proposed adaptation state for Review Change modal
  const [proposedAdaptation, setProposedAdaptation] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Success summary after approval
  const [successSummary, setSuccessSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Inspect saved transport for both journey directions from canonical trip
  const savedOutbound = useMemo(
    () => findSelectedTransportInItinerary(trip, { direction: "outbound", source: tripSource, destination: tripDestination }),
    [trip, tripSource, tripDestination]
  );

  const savedReturn = useMemo(
    () => findSelectedTransportInItinerary(trip, { direction: "return", source: tripDestination, destination: tripSource }),
    [trip, tripSource, tripDestination]
  );

  const activeSaved = journeyDirection === "return" ? savedReturn : savedOutbound;
  const activePending = journeyDirection === "return" ? pendingReturn : pendingOutbound;

  // Check saved/pending matches for Train
  const activeSavedTrain = activeSaved?.mode === "train" ? activeSaved : null;
  const activePendingTrain = activePending?.mode === "train" ? activePending.item : null;
  const isSelectedTrainSaved = Boolean(
    activeSavedTrain &&
    selectedTrain &&
    String(activeSavedTrain.trainNumber) === String(selectedTrain.trainNumber)
  );
  const isSelectedTrainPending = Boolean(
    activePendingTrain &&
    selectedTrain &&
    String(activePendingTrain.trainNumber) === String(selectedTrain.trainNumber)
  );

  // Check saved/pending matches for Flight
  const activeSavedFlight = activeSaved?.mode === "flight" ? activeSaved : null;
  const activePendingFlight = activePending?.mode === "flight" ? activePending.item : null;
  const isSelectedFlightSaved = Boolean(
    activeSavedFlight &&
    selectedFlight &&
    String(activeSavedFlight.flightNumber) === String(selectedFlight.flightNumber)
  );
  const isSelectedFlightPending = Boolean(
    activePendingFlight &&
    selectedFlight &&
    String(activePendingFlight.flightNumber) === String(selectedFlight.flightNumber)
  );

  // Fetch transport data when route, date, or mode changes
  useEffect(() => {
    let isCancelled = false;

    async function fetchTransport() {
      try {
        setLoading(true);
        setError("");
        const searchDateStr = formatSearchDate(currentDate);

        if (selectedMode === "train") {
          const data = await searchTrains(currentSource, currentDestination, searchDateStr);
          if (isCancelled) return;
          const trainList = data?.trains || (Array.isArray(data) ? data : []);
          setTrains(trainList);
          const currentPending = journeyDirection === "return" ? pendingReturn : pendingOutbound;
          if (currentPending?.mode === "train") {
            setSelectedTrain(currentPending.item);
          } else if (trainList.length > 0) {
            setSelectedTrain(trainList[0]);
          } else {
            setSelectedTrain(null);
          }
        } else if (selectedMode === "flight") {
          const data = await searchFlights(currentSource, currentDestination, searchDateStr);
          if (isCancelled) return;
          const flightList = data?.flights || (Array.isArray(data) ? data : []);
          setFlights(flightList);
          const currentPending = journeyDirection === "return" ? pendingReturn : pendingOutbound;
          if (currentPending?.mode === "flight") {
            setSelectedFlight(currentPending.item);
          } else if (flightList.length > 0) {
            setSelectedFlight(flightList[0]);
          } else {
            setSelectedFlight(null);
          }
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Fetch Transport Error:", err);
        setError(`Unable to fetch ${selectedMode} schedules from database.`);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchTransport();

    return () => {
      isCancelled = true;
    };
  }, [currentSource, currentDestination, currentDate, selectedMode, journeyDirection]);

  // Switching between OUTBOUND and RETURN (preserves pending selections)
  const handleSwitchDirection = (newDir) => {
    if (newDir === journeyDirection) return;
    setJourneyDirection(newDir);
    const pendingForNewDir = newDir === "return" ? pendingReturn : pendingOutbound;
    if (selectedMode === "flight") {
      setSelectedFlight(pendingForNewDir?.mode === "flight" ? pendingForNewDir.item : (flights[0] || null));
    } else {
      setSelectedTrain(pendingForNewDir?.mode === "train" ? pendingForNewDir.item : (trains[0] || null));
    }
  };

  // Preview item in right panel without mutating itinerary
  const handlePreviewTrain = useCallback((train) => {
    if (!train) return;
    setSelectedTrain(train);
  }, []);

  const handlePreviewFlight = useCallback((flight) => {
    if (!flight) return;
    setSelectedFlight(flight);
  }, []);

  // Stage a train selection
  const handleStagePendingTrain = useCallback((trainToStage) => {
    if (!trainToStage) return;
    const stageObj = { mode: "train", item: trainToStage };

    if (journeyDirection === "return") {
      if (pendingReturn?.mode === "train" && String(pendingReturn.item.trainNumber) === String(trainToStage.trainNumber)) {
        setPendingReturn(null);
        toast("Removed return train from pending changes", { icon: "↩️" });
      } else {
        setPendingReturn(stageObj);
        toast.success(`Selected Train #${trainToStage.trainNumber} for Return`, { icon: "🚆" });
      }
    } else {
      if (pendingOutbound?.mode === "train" && String(pendingOutbound.item.trainNumber) === String(trainToStage.trainNumber)) {
        setPendingOutbound(null);
        toast("Removed outbound train from pending changes", { icon: "↩️" });
      } else {
        setPendingOutbound(stageObj);
        toast.success(`Selected Train #${trainToStage.trainNumber} for Outbound`, { icon: "🚆" });
      }
    }
  }, [journeyDirection, pendingReturn, pendingOutbound]);

  // Stage a flight selection
  const handleStagePendingFlight = useCallback((flightToStage) => {
    if (!flightToStage) return;
    const stageObj = { mode: "flight", item: flightToStage };

    if (journeyDirection === "return") {
      if (pendingReturn?.mode === "flight" && String(pendingReturn.item.flightNumber) === String(flightToStage.flightNumber)) {
        setPendingReturn(null);
        toast("Removed return flight from pending changes", { icon: "↩️" });
      } else {
        setPendingReturn(stageObj);
        toast.success(`Selected Flight ${flightToStage.airline} #${flightToStage.flightNumber} for Return`, { icon: "✈️" });
      }
    } else {
      if (pendingOutbound?.mode === "flight" && String(pendingOutbound.item.flightNumber) === String(flightToStage.flightNumber)) {
        setPendingOutbound(null);
        toast("Removed outbound flight from pending changes", { icon: "↩️" });
      } else {
        setPendingOutbound(stageObj);
        toast.success(`Selected Flight ${flightToStage.airline} #${flightToStage.flightNumber} for Outbound`, { icon: "✈️" });
      }
    }
  }, [journeyDirection, pendingReturn, pendingOutbound]);

  // Stage outbound selection and smoothly continue to Step 2 (Return)
  const handleSaveOutboundAndContinue = useCallback((item, mode) => {
    if (!item) return;
    const stageObj = { mode, item };
    setPendingOutbound(stageObj);
    toast.success(
      mode === "flight"
        ? `Outbound Flight #${item.flightNumber} staged. Proceeding to Return...`
        : `Outbound Train #${item.trainNumber} staged. Proceeding to Return...`,
      { icon: mode === "flight" ? "✈️" : "🚆" }
    );
    setJourneyDirection("return");
    if (pendingReturn?.mode) {
      setSelectedMode(pendingReturn.mode);
    }
  }, [pendingReturn]);

  // Build proposed change preview and show Review Transport Change modal (DOES NOT MUTATE ITINERARY)
  const handlePrepareReview = useCallback((directSelection = null) => {
    let outTarget = pendingOutbound;
    let retTarget = pendingReturn;

    if (directSelection) {
      const mode = directSelection.flight ? "flight" : "train";
      const item = directSelection.flight || directSelection.train;
      const targetObj = { mode, item };

      if (journeyDirection === "return") {
        retTarget = targetObj;
        setPendingReturn(targetObj);
      } else {
        outTarget = targetObj;
        setPendingOutbound(targetObj);
      }
    }

    // Determine if outbound or return differs from canonical
    const isOutDiff = Boolean(
      outTarget && (
        !savedOutbound ||
        outTarget.mode !== savedOutbound.mode ||
        (outTarget.mode === "flight"
          ? String(outTarget.item.flightNumber) !== String(savedOutbound.flightNumber)
          : String(outTarget.item.trainNumber) !== String(savedOutbound.trainNumber))
      )
    );

    const isRetDiff = Boolean(
      retTarget && (
        !savedReturn ||
        retTarget.mode !== savedReturn.mode ||
        (retTarget.mode === "flight"
          ? String(retTarget.item.flightNumber) !== String(savedReturn.flightNumber)
          : String(retTarget.item.trainNumber) !== String(savedReturn.trainNumber))
      )
    );

    if (!isOutDiff && !isRetDiff) {
      toast("No transport changes selected. The selection matches your existing itinerary.", { icon: "ℹ️" });
      return;
    }

    try {
      setIsSaving(true);
      const res = (previewTransportChanges || previewTrainChanges)({
        outboundTransport: isOutDiff ? outTarget.item : null,
        returnTransport: isRetDiff ? retTarget.item : null,
        routeContext: {
          source: tripSource,
          destination: tripDestination,
          startDate,
          endDate,
        },
      });

      if (!res.success) {
        toast.error(res.error || "Failed to calculate transport adaptation preview.");
        return;
      }

      setProposedAdaptation(res);
      setIsReviewModalOpen(true);
    } catch (err) {
      console.error("Preview transport error:", err);
      toast.error("Failed to generate adaptation preview.");
    } finally {
      setIsSaving(false);
    }
  }, [
    pendingOutbound,
    pendingReturn,
    savedOutbound,
    savedReturn,
    journeyDirection,
    previewTransportChanges,
    previewTrainChanges,
    tripSource,
    tripDestination,
    startDate,
    endDate,
  ]);

  // Apply approved adaptation after user confirms
  const handleApproveChanges = useCallback(async () => {
    if (!proposedAdaptation || !proposedAdaptation.proposedTrip || isApproving) return;

    try {
      setIsApproving(true);
      const res = await applyApprovedTransportChanges(
        proposedAdaptation.proposedTrip,
        proposedAdaptation.diff?.itineraryAdjustments
      );

      if (res?.success) {
        setIsReviewModalOpen(false);
        setSuccessSummary(proposedAdaptation.diff);
        setProposedAdaptation(null);
        setPendingOutbound(null);
        setPendingReturn(null);
        toast.success("Transport preference updated & itinerary adapted.", { icon: "✅" });
      } else {
        toast.error(res?.error || "Failed to persist transport changes.");
      }
    } catch (err) {
      console.error("Approve transport changes error:", err);
      toast.error("Failed to apply transport changes.");
    } finally {
      setIsApproving(false);
    }
  }, [proposedAdaptation, isApproving, applyApprovedTransportChanges]);

  // Pending change flags
  const hasOutboundPendingChange = Boolean(
    pendingOutbound && (
      !savedOutbound ||
      pendingOutbound.mode !== savedOutbound.mode ||
      (pendingOutbound.mode === "flight"
        ? String(pendingOutbound.item.flightNumber) !== String(savedOutbound.flightNumber)
        : String(pendingOutbound.item.trainNumber) !== String(savedOutbound.trainNumber))
    )
  );

  const hasReturnPendingChange = Boolean(
    pendingReturn && (
      !savedReturn ||
      pendingReturn.mode !== savedReturn.mode ||
      (pendingReturn.mode === "flight"
        ? String(pendingReturn.item.flightNumber) !== String(savedReturn.flightNumber)
        : String(pendingReturn.item.trainNumber) !== String(savedReturn.trainNumber))
    )
  );

  const hasAnyPendingChange = hasOutboundPendingChange || hasReturnPendingChange;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-8 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Searching {journeyDirection === "return" ? "Return" : "Outbound"} verified {selectedMode} schedules...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentSource} → {currentDestination} • {formatDisplayDate(currentDate)}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] p-4 transition-colors duration-200">
        <div className="max-w-md rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-[#131b2e] p-6 shadow-sm text-center">
          <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">{error}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Unable to locate {selectedMode} schedules between {currentSource} and {currentDestination}.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const activeCount = selectedMode === "flight" ? flights.length : trains.length;
  const activeLabel = selectedMode === "flight" ? "Flights" : "Trains";

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        
        {/* ================= 1. PAGE HEADER ================= */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <FiArrowLeft className="text-sm" />
              <span>Back</span>
            </button>

            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                Travel Options
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {selectedMode === "flight"
                  ? "Official Indian Domestic Airline Flight Schedule Dataset"
                  : "Official Indian Railways Verified Dataset"}
              </p>
            </div>
          </div>
        </div>

        {/* ================= 2. JOURNEY LEG SELECTOR ================= */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleSwitchDirection("outbound")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-black transition-all ${
                journeyDirection === "outbound"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>STEP 1 · OUTBOUND</span>
              <span className="text-xs font-semibold opacity-90">
                {tripSource} → {tripDestination}
              </span>
              {hasOutboundPendingChange ? (
                <span className="ml-1 rounded-md bg-purple-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                  ● {pendingOutbound.mode.toUpperCase()} SELECTED
                </span>
              ) : savedOutbound ? (
                <span
                  className={`ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase ${
                    journeyDirection === "outbound"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <FiCheck size={11} />
                  <span>{savedOutbound.mode?.toUpperCase() || "TRAIN"} SAVED</span>
                </span>
              ) : (
                <span className="ml-1 text-[10px] opacity-60">Not Selected</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSwitchDirection("return")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-black transition-all ${
                journeyDirection === "return"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>STEP 2 · RETURN</span>
              <span className="text-xs font-semibold opacity-90">
                {tripDestination} → {tripSource}
              </span>
              {hasReturnPendingChange ? (
                <span className="ml-1 rounded-md bg-purple-500 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                  ● {pendingReturn.mode.toUpperCase()} SELECTED
                </span>
              ) : savedReturn ? (
                <span
                  className={`ml-1 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase ${
                    journeyDirection === "return"
                      ? "bg-white/20 text-white"
                      : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <FiCheck size={11} />
                  <span>{savedReturn.mode?.toUpperCase() || "TRAIN"} SAVED</span>
                </span>
              ) : (
                <span className="ml-1 text-[10px] opacity-60">Not Selected</span>
              )}
            </button>
          </div>

          <div className="px-2 text-right">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">
              Date: <strong className="text-indigo-600 dark:text-indigo-400">{formatDisplayDate(currentDate)}</strong>
            </span>
          </div>
        </div>

        {/* ================= 3. ACTIVE JOURNEY & MODE BAR ================= */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {currentSource} → {currentDestination}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
              {formatDisplayDate(currentDate)}
            </span>
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {activeCount} {activeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400">Mode:</span>
            <ModeTabs selectedMode={selectedMode} setSelectedMode={setSelectedMode} />
          </div>
        </div>

        {/* ================= 4. GLOBAL REVIEW CHANGES ACTION BAR ================= */}
        {hasAnyPendingChange && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/70 dark:bg-purple-950/30 p-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm">
              <span className="font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider text-xs">
                Pending Selections:
              </span>

              {hasOutboundPendingChange && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <span className="text-purple-600 dark:text-purple-400 font-black">Outbound:</span>
                  <span>
                    {pendingOutbound.mode === "flight"
                      ? `${pendingOutbound.item.airline} #${pendingOutbound.item.flightNumber}`
                      : `#${pendingOutbound.item.trainNumber} ${pendingOutbound.item.trainName || ""}`}
                  </span>
                </span>
              )}

              {hasReturnPendingChange && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-[#131b2e] border border-purple-200 dark:border-purple-800/60 px-3 py-1.5 text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <span className="text-purple-600 dark:text-purple-400 font-black">Return:</span>
                  <span>
                    {pendingReturn.mode === "flight"
                      ? `${pendingReturn.item.airline} #${pendingReturn.item.flightNumber}`
                      : `#${pendingReturn.item.trainNumber} ${pendingReturn.item.trainName || ""}`}
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingOutbound(null);
                  setPendingReturn(null);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handlePrepareReview()}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs sm:text-sm font-black text-white shadow-md transition flex items-center gap-1.5"
              >
                <FiCheck className="text-sm" />
                <span>Review Changes</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= 5. MAIN CONTENT LAYOUT ================= */}
        {selectedMode === "flight" ? (
          /* Flight View */
          <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 items-start gap-4">
            {/* Left Panel: Flight List */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
                <FlightList
                  flights={flights}
                  selectedFlight={selectedFlight}
                  savedFlight={activeSavedFlight}
                  pendingFlight={activePendingFlight}
                  onSelectFlight={handlePreviewFlight}
                />
              </div>
            </div>

            {/* Right Panel: Selected Flight Details */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-3">
              <SelectedFlight
                flight={selectedFlight}
                directionLabel={journeyDirection === "return" ? "Return" : "Outbound"}
                isSaved={isSelectedFlightSaved}
                isPending={isSelectedFlightPending}
                onSelectPending={() => handleStagePendingFlight(selectedFlight)}
              />

              {hasAnyPendingChange && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handlePrepareReview()}
                    className="w-full sm:w-auto rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-xs font-black text-white shadow-md transition flex items-center justify-center gap-2"
                  >
                    <FiCheck className="text-sm" />
                    <span>Review Changes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Train View */
          <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 items-start gap-4">
            {/* Left Panel: Trains List */}
            <div className="lg:col-span-6 xl:col-span-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TRAIN SCHEDULES ({trains.length})
                </span>
              </div>
              <div className="max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
                <TrainList
                  trains={trains}
                  selectedTrain={selectedTrain}
                  savedTrain={activeSavedTrain}
                  pendingTrain={activePendingTrain}
                  onSelectTrain={handlePreviewTrain}
                />
              </div>
            </div>

            {/* Right Panel: Selected Train Details */}
            <div className="lg:col-span-6 xl:col-span-7 space-y-3">
              <SelectedTrain
                train={selectedTrain}
                directionLabel={journeyDirection === "return" ? "Return" : "Outbound"}
                isSaved={isSelectedTrainSaved}
                isPending={isSelectedTrainPending}
                onSelectPending={() => handleStagePendingTrain(selectedTrain)}
              />

              {hasAnyPendingChange && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handlePrepareReview()}
                    className="w-full sm:w-auto rounded-xl bg-purple-600 hover:bg-purple-700 px-6 py-2.5 text-xs font-black text-white shadow-md transition flex items-center justify-center gap-2"
                  >
                    <FiCheck className="text-sm" />
                    <span>Review Changes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================= REVIEW TRANSPORT CHANGE CONFIRMATION MODAL ================= */}
      <ReviewTrainChangeModal
        isOpen={isReviewModalOpen}
        diff={proposedAdaptation?.diff}
        isApproving={isApproving}
        onCancel={() => {
          setIsReviewModalOpen(false);
          setProposedAdaptation(null);
        }}
        onApprove={handleApproveChanges}
      />

      {/* ================= SUCCESS NOTIFICATION MODAL AFTER APPROVAL ================= */}
      {successSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-6 shadow-2xl transition-all">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400">
                <FiCheckCircle className="text-2xl" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Transport preference updated
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your itinerary was adapted around the approved transport schedule with 0 conflicts.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              {(successSummary.transportChanges || successSummary.trainChanges || []).map((tc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-300">{tc.directionLabel}:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {tc.timingChanges?.transportChanged || tc.timingChanges?.trainChanged}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSuccessSummary(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessSummary(null);
                  const tripId = trip?._id || "active-trip";
                  navigate(`/itinerary/${tripId}`, { state: { trip } });
                }}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-5 py-2.5 text-xs font-black text-white transition flex items-center gap-1.5 shadow-md"
              >
                <FiCheckCircle className="text-sm" />
                <span>View Detailed Itinerary</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}