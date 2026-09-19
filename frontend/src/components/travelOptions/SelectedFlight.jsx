import { FiCheck } from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import WeeklyScheduleChips from "./WeeklyScheduleChips";
import defaultFlightImg from "../../assets/travel/flight.jpg";

function getDuration(flight) {
  if (flight.duration) return flight.duration;
  if (flight.departureTime && flight.arrivalTime) {
    const [depH, depM] = flight.departureTime.split(":").map(Number);
    const [arrH, arrM] = flight.arrivalTime.split(":").map(Number);
    if (!isNaN(depH) && !isNaN(arrH)) {
      let diffM = arrH * 60 + arrM - (depH * 60 + depM);
      if (diffM < 0) diffM += 24 * 60;
      const h = Math.floor(diffM / 60);
      const m = diffM % 60;
      return `~${h}h ${m > 0 ? `${m}m` : ""}`.trim();
    }
  }
  return "~2h 10m";
}

export default function SelectedFlight({
  flight,
  directionLabel = "Outbound",
  isSaved = false,
  isPending = false,
  onSelectPending = null,
}) {
  if (!flight) {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-6 text-center shadow-xs transition-colors">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 mb-2">
          <FaPlane className="text-base" />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Select a flight to view details
        </p>
      </div>
    );
  }

  const originCode = flight.origin?.code || "";
  const originName = flight.origin?.name || "";
  const destCode = flight.destination?.code || "";
  const destName = flight.destination?.name || "";
  const duration = getDuration(flight);

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs overflow-hidden transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
        {/* LEFT: Default Flight Image */}
        <div className="md:col-span-4 lg:col-span-4 relative h-40 sm:h-44 md:h-auto min-h-[160px] max-h-[270px] overflow-hidden bg-slate-900">
          <img
            src={defaultFlightImg}
            alt="Flight"
            className="h-full w-full object-cover"
          />
          <div className="absolute top-2.5 left-2.5 rounded-lg bg-sky-600/90 backdrop-blur-xs px-2.5 py-1 text-xs font-bold text-white shadow-sm flex items-center gap-1.5">
            <FaPlane className="text-xs" />
            <span>Flight</span>
          </div>
        </div>

        {/* RIGHT: Selected Flight Information with Enhanced Readability */}
        <div className="md:col-span-8 lg:col-span-8 p-3.5 sm:p-4.5 flex flex-col justify-between">
          <div className="space-y-2.5">
            {/* 1. Airline + Flight Number & Direction */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {flight.airline}
                </h2>
                <p className="text-xs sm:text-sm font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  #{flight.flightNumber}
                </p>
              </div>
              <span className="rounded-lg bg-sky-50 dark:bg-sky-950/70 border border-sky-100 dark:border-sky-800/60 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky-300 shrink-0">
                {directionLabel}
              </span>
            </div>

            {/* 2. Route */}
            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
              {originName} {originCode ? `(${originCode})` : ""} → {destName} {destCode ? `(${destCode})` : ""}
            </p>

            {/* 3. Departure, Arrival, Duration Stats Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Departure
                </p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {flight.departureTime}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {originName || originCode}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Arrival
                </p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {flight.arrivalTime}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {destName || destCode}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 p-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Duration
                </p>
                <p className="text-base sm:text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
                  {duration}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                  Direct
                </p>
              </div>
            </div>

            {/* 4. Weekly Schedule Day Chips (MON TUE WED THU FRI SAT SUN) */}
            <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
                Schedule:
              </span>
              <WeeklyScheduleChips daysData={flight.operatingDays} />
            </div>

            {/* 5. Direct / Stops Information */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-300">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Route Type:</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">Direct Non-stop</span>
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
                <span>✓ Selected as {directionLabel} Flight</span>
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
                <FaPlane className="text-xs" />
                <span>Select as {directionLabel} Flight</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
