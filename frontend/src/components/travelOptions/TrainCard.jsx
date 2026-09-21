import { FiArrowRight, FiCheck, FiMapPin, FiClock } from "react-icons/fi";
import { FaTrain } from "react-icons/fa";
import { formatCompactSchedule } from "../../utils/scheduleFormatter";

export default function TrainCard({ train, selected, isSaved = false, isPending = false, onClick }) {
  const fromCode = train.from?.code || train.from?.name || train.source || "";
  const toCode = train.to?.code || train.to?.name || train.destination || "";
  const scheduleText = formatCompactSchedule(train.runningDays);
  const stopsCount =
    train.totalStops !== undefined
      ? train.totalStops
      : train.stops !== undefined
      ? train.stops
      : (train.route?.length || 0);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group mb-2 w-full rounded-xl border p-3 text-left transition-all duration-150 cursor-pointer
        ${
          selected
            ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-1 ring-indigo-500/40"
            : isPending
            ? "border-purple-500 dark:border-purple-500 bg-purple-50/40 dark:bg-purple-950/30 shadow-xs ring-1 ring-purple-500/30"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-slate-50/50 dark:hover:bg-[#162036]"
        }`}
    >
      {/* Header: Train Name, Number, Badges & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs shrink-0">
            <FaTrain />
          </span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {train.trainName}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            #{train.trainNumber}
          </span>
          {train.isGateway && (
            <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0">
              Gateway
            </span>
          )}
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
          <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-white shadow-2xs shrink-0">
            Viewing
          </span>
        ) : train.type ? (
          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
            {train.type}
          </span>
        ) : null}
      </div>

      {/* Timing & Route Row */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {train.departure}
          </span>
          <span className="text-xs sm:text-[13px] font-bold text-slate-600 dark:text-slate-300">
            {fromCode}
          </span>
        </div>

        <div className="flex flex-col items-center px-1">
          <span className="text-[11px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {train.duration}
          </span>
          <FiArrowRight className="text-slate-400 dark:text-slate-500 text-xs" />
        </div>

        <div className="flex items-baseline gap-1.5 text-right">
          <span className="text-xs sm:text-[13px] font-bold text-slate-600 dark:text-slate-300">
            {toCode}
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
            {train.arrival}
          </span>
        </div>
      </div>

      {/* Secondary Information: Schedule, Halts & Price */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 font-medium">
        <div className="flex items-center gap-2">
          {scheduleText && <span>Runs: {scheduleText}</span>}
          {stopsCount > 0 && (
            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
              • {stopsCount} halts
            </span>
          )}
        </div>
        {train.price && (
          <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
            ₹{train.price.toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}
