import { useState } from "react";
import { FiClock, FiMapPin, FiCalendar, FiCheck, FiPlus, FiArrowRight, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaTrain } from "react-icons/fa";
import { FaTrainSubway } from "react-icons/fa6";
import toast from "react-hot-toast";
import RouteTimeline from "./RouteTimeline";
import BookNowButton from "./BookNowButton";
import WeeklyScheduleChips from "./WeeklyScheduleChips";
import { addItemToTourBuilder } from "../../utils/tourBuilderHelper";
import defaultTrainImg from "../../assets/travel/train.jpg";

export default function SelectedTrain({
  train,
  directionLabel = "Outbound",
  isSaved = false,
  isPending = false,
  onSelectPending = null,
}) {
  const [isRouteExpanded, setIsRouteExpanded] = useState(false);

  if (!train) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-6 text-center shadow-xs transition-colors">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 mb-2">
          <FaTrain className="text-base" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Select a train to view details
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
          Full halts, schedule profile, and fare classes will display here.
        </p>
      </div>
    );
  }

  const fromCode = train.from?.code || train.source || "";
  const fromName = train.from?.name || "";
  const toCode = train.to?.code || train.destination || "";
  const toName = train.to?.name || "";
  const stopsCount =
    train.totalStops !== undefined
      ? train.totalStops
      : train.stops !== undefined
      ? train.stops
      : (train.route?.length || 0);

  const handleAddToTour = () => {
    addItemToTourBuilder(
      {
        id: `train-${train.trainNumber}`,
        trainNumber: train.trainNumber,
        trainName: train.trainName,
        type: train.type,
        name: `${train.trainName} (#${train.trainNumber || ""})`,
        activity: `Train Journey: ${train.from?.name || train.from?.code || train.source} → ${train.to?.name || train.to?.code || train.destination}`,
        category: "train",
        categoryLabel: "Trains",
        source: train.from?.name || train.from?.code || train.source,
        destination: train.to?.name || train.to?.code || train.destination,
        departure: train.departure,
        arrival: train.arrival,
        price: train.price || train.fare || null,
        displayPrice: (train.price || train.fare) ? `₹${(train.price || train.fare).toLocaleString()}` : null,
        duration: train.duration,
        durationMinutes: train.durationMinutes || 120,
        location: `${train.from?.name || train.from?.code || train.source} → ${train.to?.name || train.to?.code || train.destination}`,
        stops: train.stops !== undefined ? train.stops : train.totalStops !== undefined ? train.totalStops : 0,
        route: train.route,
        fares: train.fares,
        runningDays: train.runningDays,
        notes: `Departs ${train.departure} • Arrives ${train.arrival} (${train.duration})`,
      },
      0
    );
    toast.success(`Added ${train.trainName} to your Tour Builder!`);
  };

  // Derive compact route preview string (e.g. PNVL → RN → KAWR → UD → BDJ → PGT)
  const routeStations = Array.isArray(train.route) ? train.route : [];
  const stopCodes = routeStations.map((s) => s.code || s.name).filter(Boolean);
  let previewStops = [];
  if (stopCodes.length <= 6) {
    previewStops = stopCodes;
  } else {
    previewStops = [
      stopCodes[0],
      stopCodes[Math.floor(stopCodes.length * 0.2)],
      stopCodes[Math.floor(stopCodes.length * 0.4)],
      stopCodes[Math.floor(stopCodes.length * 0.6)],
      stopCodes[Math.floor(stopCodes.length * 0.8)],
      stopCodes[stopCodes.length - 1],
    ];
  }
  const previewRouteText = previewStops.join(" → ");

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs overflow-hidden transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* LEFT: Default Train Image */}
        <div className="md:col-span-4 lg:col-span-4 relative h-40 sm:h-44 md:h-auto min-h-[160px] max-h-[270px] overflow-hidden bg-slate-900">
          <img
            src={defaultTrainImg}
            alt={train.trainName || "Train"}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-2.5 left-2.5 rounded-lg bg-indigo-600/90 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1.5">
            <FaTrain className="text-xs" />
            <span>Train</span>
          </div>
          {train.type && (
            <div className="absolute bottom-2.5 left-2.5 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-semibold text-white">
              {train.type}
            </div>
          )}
        </div>

        {/* RIGHT: Selected Train Information */}
        <div className="md:col-span-8 lg:col-span-8 p-3.5 sm:p-4.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* 1. Train Name + Number & Direction / Base Fare */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {train.trainName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs sm:text-sm font-mono font-medium text-slate-500 dark:text-slate-400">
                    #{train.trainNumber}
                  </p>
                  {train.isGateway && train.gatewayLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      <FiMapPin className="text-[10px]" />
                      {train.gatewayLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {directionLabel && (
                  <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {directionLabel}
                  </span>
                )}
                {train.price && (
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{train.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* 2. Route */}
            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              {fromCode} {fromName ? `(${fromName})` : ""} → {toCode} {toName ? `(${toName})` : ""}
            </p>

            {/* 3. Departure, Arrival, Duration Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Departure
                </p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {train.departure}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {fromCode}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Arrival
                </p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {train.arrival}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {toCode}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Duration
                </p>
                <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {train.duration}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  {stopsCount} halts
                </p>
              </div>
            </div>

            {/* 4. Weekly Schedule Day Chips */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Schedule:
              </span>
              <WeeklyScheduleChips daysData={train.runningDays} />
            </div>

            {/* 5. Fare Tier Breakdown if available */}
            {train.fares && Object.keys(train.fares).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                  Available Classes:
                </span>
                {Object.entries(train.fares).map(([cls, fare]) => (
                  <div
                    key={cls}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151d30] px-2.5 py-1 text-xs"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-200">{cls}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">₹{fare.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Intermediate Stops Section with Compact Preview & View More / View Less */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Intermediate Stops ({stopsCount})
                </span>
                {routeStations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsRouteExpanded(!isRouteExpanded)}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isRouteExpanded ? "View Less" : "View More"}</span>
                    {isRouteExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                  </button>
                )}
              </div>

              {/* Collapsed short route preview */}
              {!isRouteExpanded && previewRouteText && (
                <p className="mt-1.5 text-xs sm:text-[13px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                  {previewRouteText}
                </p>
              )}

              {/* Expanded full sequence of stations */}
              {isRouteExpanded && routeStations.length > 0 && (
                <div className="mt-2.5 max-h-48 overflow-y-auto pr-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                  {routeStations.map((st, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-white dark:bg-[#151d30] border border-slate-100 dark:border-slate-800/80 px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {st.code}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px] text-xs">
                          {st.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-right shrink-0">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
                          {st.arrival} → {st.departure}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          Day {st.day || 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 7. Action Buttons */}
          <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-2">
            {onSelectPending ? (
              isPending ? (
                <button
                  type="button"
                  onClick={onSelectPending}
                  className="w-full flex-1 flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer"
                >
                  <FiCheck className="text-base" />
                  <span>✓ Selected as {directionLabel} Train</span>
                  <span className="text-xs opacity-80 ml-1">(Click to deselect)</span>
                </button>
              ) : isSaved ? (
                <div className="flex items-center justify-between gap-2 w-full flex-1">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-1">
                    <FiCheck className="text-emerald-600 dark:text-emerald-400 text-base shrink-0" />
                    <span>✓ Currently Saved in Itinerary</span>
                  </div>
                  <button
                    type="button"
                    onClick={onSelectPending}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Re-stage
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onSelectPending}
                  className="w-full flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer"
                >
                  <FaTrain className="text-xs" />
                  <span>Select as {directionLabel} Train</span>
                </button>
              )
            ) : null}

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleAddToTour}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-indigo-600/30 bg-indigo-50 dark:bg-indigo-950/50 py-2 px-3 text-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white cursor-pointer"
              >
                <FiPlus className="text-sm" />
                <span>Tour Builder</span>
              </button>
              <div className="shrink-0">
                <BookNowButton train={train} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
