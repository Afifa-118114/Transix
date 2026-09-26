import { FiArrowRight, FiCheck } from "react-icons/fi";
import { FaPlane } from "react-icons/fa";
import { formatCompactSchedule } from "../../utils/scheduleFormatter";

export default function FlightCard({
  flight,
  selected,
  isSaved = false,
  isPending = false,
  onClick,
}) {
  const origin = flight.origin?.code || flight.origin?.name || "";
  const destination = flight.destination?.code || flight.destination?.name || "";
  const scheduleText = formatCompactSchedule(flight.operatingDays);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group mb-2 w-full rounded-xl border p-3 text-left transition-all duration-150
        ${
          selected
            ? "border-sky-500 dark:border-sky-400 bg-sky-50/70 dark:bg-sky-950/50 shadow-xs ring-1 ring-sky-500/40"
            : isPending
            ? "border-purple-500 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 shadow-xs ring-1 ring-purple-500/30"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-sky-300 dark:hover:border-sky-600/50 hover:bg-slate-50/50 dark:hover:bg-[#162036]"
        }`}
    >
      {/* Header: Airline, Flight Number & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 text-xs shrink-0">
            <FaPlane />
          </span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition">
            {flight.airline}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            #{flight.flightNumber}
          </span>
        </div>

        {/* Status Indicator */}
        {isSaved ? (
          <span className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs shrink-0">
            <FiCheck size={11} />
            <span>Saved</span>
          </span>
        ) : isPending ? (
          <span className="flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs shrink-0">
            <FiCheck size={11} />
            <span>Selected</span>
          </span>
        ) : selected ? (
          <span className="rounded-md bg-sky-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs shrink-0">
            Viewing
          </span>
        ) : null}
      </div>

      {/* Timing & Route Row: 05:40 BOM → GAU 08:50 */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {flight.departureTime}
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-slate-600 dark:text-slate-300">
            {origin}
          </span>
        </div>

        <FiArrowRight className="text-slate-400 dark:text-slate-500 text-sm shrink-0 mx-2" />

        <div className="flex items-baseline gap-1.5 text-right">
          <span className="text-xs sm:text-[13px] font-bold text-slate-600 dark:text-slate-300">
            {destination}
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {flight.arrivalTime}
          </span>
        </div>
      </div>

      {/* Secondary Information: Direct · Daily */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium">
        <span>Direct · {scheduleText}</span>
        {selected && !isPending && !isSaved && (
          <span className="text-sky-600 dark:text-sky-400 font-bold text-xs">Viewing</span>
        )}
      </div>
    </button>
  );
}
