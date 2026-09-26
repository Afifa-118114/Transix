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
      className={`group relative flex flex-col justify-between rounded-2xl border bg-white dark:bg-[#131b2e] p-4 sm:p-4.5 shadow-xs transition-all duration-150 cursor-pointer
        ${
          isFlight
            ? "border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-sm"
            : "border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm"
        }`}
    >
      <div>
        {/* Top Header: Mode & Status */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                isFlight
                  ? "bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800/60"
                  : "bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60"
              }`}
            >
              {isFlight ? <FaPlane /> : <FaTrain />}
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {option.type}
            </span>
          </div>

          {option.isSelected && (
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2 py-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-300">
              Selected in Itinerary
            </span>
          )}
        </div>

        {/* Carrier / Flight / Train Name */}
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
          {titleText}
        </h4>

        {/* Departure → Arrival Time */}
        <div className="mt-2 flex items-center justify-between text-xs">
          <div className="font-extrabold text-slate-900 dark:text-white">
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
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2 border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Duration: </span>
            <strong className="font-bold text-slate-800 dark:text-slate-200">
              {option.duration || (isFlight ? "~2h 30m" : "23h 30m")}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Schedule: </span>
            <strong className="font-bold text-slate-800 dark:text-slate-200">
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
          className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
        >
          + Add to Tour
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate();
          }}
          className={`flex items-center gap-1.5 text-xs font-extrabold transition cursor-pointer ${
            isFlight
              ? "text-sky-600 hover:text-sky-500 dark:text-sky-400"
              : "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          }`}
        >
          <span>Explore {isFlight ? "Flights" : "Trains"}</span>
          <FaArrowRight className="text-[10px] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
