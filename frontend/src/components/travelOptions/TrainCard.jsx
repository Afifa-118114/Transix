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
            ? "border-indigo-600 bg-indigo-50/70 shadow-xs ring-1 ring-indigo-600/30"
            : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs"
        }`}
    >
      {/* Top Header: Train Name & Type Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">
            {train.trainName}
          </h3>
          <p className="text-[10px] font-medium text-slate-400">#{train.trainNumber}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {train.isGateway && (
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-800">
              Gateway
            </span>
          )}
          <span className="rounded-md bg-indigo-100/80 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">
            {train.type || "Express"}
          </span>
        </div>
      </div>

      {/* Timing Row */}
      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50/80 px-2.5 py-1.5 border border-slate-100">
        <div>
          <p className="text-xs font-extrabold text-slate-900">{train.departure}</p>
          <p className="text-[9px] font-bold text-slate-500">{fromCode}</p>
        </div>

        <div className="flex flex-col items-center px-1.5">
          <span className="text-[9px] font-bold text-indigo-600">{train.duration}</span>
          <FiArrowRight className="text-slate-400 text-[10px] my-0.2" />
        </div>

        <div className="text-right">
          <p className="text-xs font-extrabold text-slate-900">{train.arrival}</p>
          <p className="text-[9px] font-bold text-slate-500">{toCode}</p>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <FiClock className="text-indigo-600 text-[9px]" />
            <span>{train.duration}</span>
          </span>

          <span className="flex items-center gap-1">
            <FiMapPin className="text-indigo-600 text-[9px]" />
            <span>{stopsCount} stops</span>
          </span>
        </div>

        {train.price && (
          <span className="text-xs font-extrabold text-indigo-600">
            ₹{train.price.toLocaleString()}
          </span>
        )}
      </div>
    </button>
  );
}

export default TrainCard;
