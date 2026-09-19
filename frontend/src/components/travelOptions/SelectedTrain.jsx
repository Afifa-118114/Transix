import { useState } from "react";
import { FiCheck, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaTrain } from "react-icons/fa";
import WeeklyScheduleChips from "./WeeklyScheduleChips";
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
            alt="Train"
            className="h-full w-full object-cover"
          />
          <div className="absolute top-2.5 left-2.5 rounded-lg bg-indigo-600/90 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1.5">
            <FaTrain className="text-xs" />
            <span>Train</span>
          </div>
        </div>

        {/* RIGHT: Selected Train Information with Enhanced Readability */}
        <div className="md:col-span-8 lg:col-span-8 p-3.5 sm:p-4.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* 1. Train Name + Number & Direction */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {train.trainName}
                </h2>
                <p className="text-xs sm:text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  #{train.trainNumber}
                </p>
              </div>
              <span className="rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0">
                {directionLabel}
              </span>
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

            {/* 4. Weekly Schedule Day Chips (MON TUE WED THU FRI SAT SUN) */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Schedule:
              </span>
              <WeeklyScheduleChips daysData={train.runningDays} />
            </div>

            {/* 5. Intermediate Stops Section with Compact Preview & View More / View Less */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Intermediate Stops ({stopsCount})
                </span>
                {routeStations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsRouteExpanded(!isRouteExpanded)}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex items-center gap-1"
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

              {/* Expanded full sequence of stations with code, name, timings, day */}
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

          {/* 6. Existing Selection Action Button */}
          <div className="mt-3.5 pt-1">
            {isPending ? (
              <button
                type="button"
                onClick={onSelectPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-sm transition"
              >
                <FiCheck className="text-base" />
                <span>✓ Selected as {directionLabel} Train</span>
                <span className="text-xs opacity-80 ml-1">(Click to deselect)</span>
              </button>
            ) : isSaved ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3.5 py-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 flex-1">
                  <FiCheck className="text-emerald-600 dark:text-emerald-400 text-base shrink-0" />
                  <span>✓ Currently Saved in Itinerary</span>
                </div>
                {onSelectPending && (
                  <button
                    type="button"
                    onClick={onSelectPending}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Re-stage
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onSelectPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-sm transition"
              >
                <FaTrain className="text-xs" />
                <span>Select as {directionLabel} Train</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
