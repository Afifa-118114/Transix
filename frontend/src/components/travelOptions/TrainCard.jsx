import { FiClock, FiMapPin, FiArrowRight } from "react-icons/fi";

function TrainCard({ train, selected, onClick }) {
  const fromCode = train.from?.code || train.from?.name || train.source || "";
  const toCode = train.to?.code || train.to?.name || train.destination || "";
  const stopsCount =
    train.totalStops !== undefined
      ? train.totalStops
      : train.stops !== undefined
        ? train.stops
        : 0;

  return (
    <button
      onClick={onClick}
      className={`group mb-2 w-full rounded-xl border p-2.5 sm:p-3 text-left transition-all duration-200
        ${
          selected
            ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-600/30 dark:ring-indigo-500/30"
            : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-xs"
        }`}
    >
      {/* Top Header: Train Name & Type Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {train.trainName}
          </h3>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">#{train.trainNumber}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {train.isGateway && (
            <span className="rounded-md bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 text-[8px] font-bold text-amber-800 dark:text-amber-300">
              Gateway
            </span>
          )}
          <span className="rounded-md bg-indigo-100/80 dark:bg-indigo-900/50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
            {train.type || "Express"}
          </span>
        </div>
      </div>

      {/* Timing Row */}
      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-2.5 py-1.5 border border-slate-100 dark:border-slate-700/60">
        <div>
          <p className="text-xs font-extrabold text-slate-900 dark:text-white">{train.departure}</p>
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{fromCode}</p>
        </div>

        <div className="flex flex-col items-center px-1.5">
          <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">{train.duration}</span>
          <FiArrowRight className="text-slate-400 dark:text-slate-500 text-[10px] my-0.2" />
        </div>

        <div className="text-right">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white">{train.arrival}</p>
          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{toCode}</p>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <FiClock className="text-indigo-600 dark:text-indigo-400 text-[9px]" />
            <span>{train.duration}</span>
          </span>

          <span className="flex items-center gap-1">
            <FiMapPin className="text-indigo-600 dark:text-indigo-400 text-[9px]" />
            <span>{stopsCount} stops</span>
          </span>
        </div>

        {train.price && (
          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
            ₹{train.price.toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}

export default TrainCard;
