import { FaArrowRight, FaTrain, FaPlane } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatCompactSchedule } from "../../../utils/scheduleFormatter";

export default function TravelCard({ option, source, destination, tripId, startDate, endDate }) {
  const navigate = useNavigate();
  const isFlight = option.type?.toLowerCase() === "flight";
  const modeKey = isFlight ? "flight" : "train";

  const handleNavigate = () => {
    navigate(
      `/travel-options?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}&mode=${modeKey}`,
      {
        state: {
          tripId,
          source,
          destination,
          travelMode: modeKey,
          startDate,
          endDate,
        },
      }
    );
  };

  const handleAddToTour = (e) => {
    e.stopPropagation();
    import("../../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
      const isTrain = option.type?.toLowerCase() === "train";
      addItemToTourBuilder(
        {
          id: option.id || (isTrain && option.trainNumber ? `train-${option.trainNumber}` : undefined),
          trainNumber: option.trainNumber,
          trainName: option.trainName || option.operator,
          departure: option.departure,
          arrival: option.arrival,
          stops: option.stops,
          route: option.route,
          fares: option.fares,
          name: isTrain
            ? `${option.trainName || option.operator} (#${option.trainNumber || ""})`
            : `${option.operator || option.company || option.type} (${source} → ${destination})`,
          activity: `${option.type} Journey: ${source} → ${destination}`,
          category: (option.type || "train").toLowerCase(),
          categoryLabel: option.type,
          icon: option.type === "Flight" ? "✈️" : option.type === "Train" ? "🚆" : "🚌",
          price: typeof option.price === "number" ? option.price : 1500,
          displayPrice: typeof option.price === "number" ? `₹${option.price.toLocaleString()}` : option.price,
          duration: option.duration,
          location: `${source} → ${destination}`,
          notes: option.departure && option.arrival ? `Departs ${option.departure} • Arrives ${option.arrival} (${option.duration})` : undefined,
        },
        0
      );
    });
  };

  const scheduleText = option.operatingDays
    ? formatCompactSchedule(option.operatingDays)
    : option.runningDays
    ? formatCompactSchedule(option.runningDays)
    : option.frequency
    ? formatCompactSchedule(option.frequency)
    : isFlight
    ? "Daily"
    : "Regular Schedule";

  const titleText = isFlight
    ? (option.operator || option.name || "Domestic Flight")
    : (option.operator || option.name || "Express Train");

  return (
    <div
      onClick={handleNavigate}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#006CE4] dark:hover:border-sky-500 hover:shadow-sm cursor-pointer"
    >
      <div>
        {/* Top Header: Mode & Status */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                isFlight
                  ? "bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/60"
                  : "bg-blue-50 dark:bg-sky-950/70 text-[#006CE4] dark:text-sky-400 border border-blue-100 dark:border-sky-800/60"
              }`}
            >
              {isFlight ? <FaPlane /> : <FaTrain />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {option.type}
            </span>
          </div>

          {option.isSelected && (
            <span className="rounded-md bg-blue-50 dark:bg-sky-950/60 border border-blue-200 dark:border-sky-800/60 px-2 py-0.5 text-[9px] font-bold text-[#006CE4] dark:text-sky-300">
              Selected in Itinerary
            </span>
          )}
        </div>

        {/* Carrier / Flight / Train Name */}
        <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white truncate">
          {titleText}
        </h4>

        {/* Departure → Arrival Time */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="font-extrabold text-[#1A1A1A] dark:text-white">
            {option.departure && option.arrival ? (
              <span>{option.departure} → {option.arrival}</span>
            ) : (
              <span>Scheduled Timing</span>
            )}
          </div>
        </div>

        {/* Route: Mumbai → Kerala */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {source} → {destination}
        </p>

        {/* Compact Stats Row: Duration & Schedule */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 rounded-lg bg-[#F5F7FA] dark:bg-slate-900/40 px-3 py-2 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Duration: </span>
            <strong className="font-semibold text-[#1A1A1A] dark:text-slate-200">
              {option.duration || (isFlight ? "~2h 30m" : "23h 30m")}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Schedule: </span>
            <strong className="font-semibold text-[#1A1A1A] dark:text-slate-200">
              {scheduleText}
            </strong>
          </div>
        </div>
      </div>

      {/* Action Footer: Add to Tour & Explore */}
      <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
        <button
          type="button"
          onClick={handleAddToTour}
          className="rounded-lg bg-blue-50 dark:bg-sky-950/40 hover:bg-blue-100 dark:hover:bg-sky-900/50 border border-blue-200 dark:border-sky-800/60 px-3 py-1.5 text-[11px] font-semibold text-[#006CE4] dark:text-sky-300 transition cursor-pointer"
        >
          + Add to Tour
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate();
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#006CE4] hover:text-[#005bb5] dark:text-sky-400 transition cursor-pointer"
        >
          <span>Explore {isFlight ? "Flights" : "Trains"}</span>
          <FaArrowRight className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
