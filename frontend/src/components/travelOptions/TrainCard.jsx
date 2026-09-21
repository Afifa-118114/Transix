import { FiClock, FiMapPin, FiArrowRight } from "react-icons/fi";
import { FaTrainSubway } from "react-icons/fa6";

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
      className={`group w-full rounded-2xl border text-left p-4 transition-all duration-150 ${
        selected
          ? "border-[#034F46] bg-[#034F46]/[0.03] ring-1 ring-[#034F46]/20 shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs"
      }`}
    >
      {/* Top Header: Train Name & Type Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                selected ? "bg-[#034F46] text-white" : "bg-stone-100 text-stone-600 group-hover:bg-stone-200"
              }`}
            >
              <FaTrainSubway className="text-xs" />
            </span>
            <h3
              className={`text-sm font-semibold truncate transition ${
                selected ? "text-[#034F46]" : "text-stone-900 group-hover:text-[#034F46]"
              }`}
            >
              {train.trainName}
            </h3>
          </div>
          <p className="mt-0.5 ml-8 text-[11px] font-medium text-stone-400">
            Train #{train.trainNumber}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {train.isGateway && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Gateway
            </span>
          )}
          <span className="rounded-full bg-stone-100 border border-stone-200/80 px-2 py-0.5 text-[10px] font-medium text-stone-700">
            {train.type || "Express"}
          </span>
        </div>
      </div>

      {/* Timing Schedule Row */}
      <div className="mt-3.5 flex items-center justify-between rounded-xl bg-stone-50/80 border border-stone-200/60 px-3.5 py-2.5">
        <div>
          <p className="text-sm font-bold text-stone-900">{train.departure}</p>
          <p className="text-[11px] font-medium text-stone-500">{fromCode}</p>
        </div>

        <div className="flex flex-col items-center px-2">
          <span className="text-[10px] font-semibold text-[#034F46]">{train.duration}</span>
          <div className="flex items-center gap-1 text-stone-300 my-0.5">
            <div className="h-[1px] w-6 bg-stone-300" />
            <FiArrowRight className="text-xs text-stone-400" />
            <div className="h-[1px] w-6 bg-stone-300" />
          </div>
          <span className="text-[9px] text-stone-400">Direct Rail</span>
        </div>

        <div className="text-right">
          <p className="text-sm font-bold text-stone-900">{train.arrival}</p>
          <p className="text-[11px] font-medium text-stone-500">{toCode}</p>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <FiClock className="text-stone-400 text-xs" />
            <span className="text-[11px]">{train.duration}</span>
          </span>

          <span className="flex items-center gap-1.5">
            <FiMapPin className="text-stone-400 text-xs" />
            <span className="text-[11px]">{stopsCount} halts</span>
          </span>
        </div>

        {train.price && (
          <div className="text-right">
            <span className="text-xs font-bold text-[#034F46]">
              ₹{train.price.toLocaleString()}
            </span>
            <span className="text-[10px] text-stone-400 ml-1">onwards</span>
          </div>
        )}
      </div>
    </button>
  );
}

export default TrainCard;
