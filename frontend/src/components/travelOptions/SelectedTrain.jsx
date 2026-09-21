import RouteTimeline from "./RouteTimeline";
import BookNowButton from "./BookNowButton";
import { addItemToTourBuilder } from "../../utils/tourBuilderHelper";
import { FiClock, FiMapPin, FiCalendar, FiCheck, FiPlus, FiArrowRight } from "react-icons/fi";
import { FaTrainSubway } from "react-icons/fa6";
import toast from "react-hot-toast";

export default function SelectedTrain({ train }) {
  if (!train) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-xs">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-400 mb-2.5">
          <FaTrainSubway className="text-base" />
        </div>
        <p className="text-xs font-semibold text-stone-600">Select a train to inspect its route & schedule.</p>
        <p className="text-[11px] text-stone-400 mt-0.5">Full halts, speed profile, and fare classes will display here.</p>
      </div>
    );
  }

  const runningDays = Object.entries(train.runningDays || {});

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

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-xs overflow-hidden">
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 sm:p-6">
        {/* Compact Thumbnail Image */}
        <div className="lg:col-span-4 relative h-44 sm:h-48 lg:h-full min-h-[160px] overflow-hidden rounded-xl bg-stone-900 shadow-inner">
          <img
            src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&auto=format&fit=crop&q=80"
            alt={train.trainName}
            className="h-full w-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute left-3 top-3 rounded-full bg-[#034F46] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
            {train.type || "Express Rail"}
          </div>
          <div className="absolute bottom-3 left-3 right-3 text-white">
            <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-300">Indian Railways</p>
            <p className="text-xs font-bold font-mono">#{train.trainNumber}</p>
          </div>
        </div>

        {/* Train Information */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 leading-tight">
                  {train.trainName}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-stone-700">
                  <span className="text-[#034F46] font-bold">{train.from?.code || train.source}</span>
                  <span className="text-stone-400 font-normal">({train.from?.name || ""})</span>
                  <FiArrowRight className="text-xs text-stone-400" />
                  <span className="text-[#034F46] font-bold">{train.to?.code || train.destination}</span>
                  <span className="text-stone-400 font-normal">({train.to?.name || ""})</span>
                </div>
                {train.isGateway && train.gatewayLabel && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    <FiMapPin className="text-[10px]" />
                    <span>{train.gatewayLabel}</span>
                  </div>
                )}
              </div>

              {train.price && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">Base Fare</span>
                  <span className="font-serif text-lg sm:text-xl font-bold text-[#034F46]">
                    ₹{train.price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Journey Stats 4-Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Departure</p>
              <h4 className="mt-0.5 text-xs font-bold text-stone-900">{train.departure}</h4>
              <p className="text-[9px] text-stone-500">Day {train.from?.day || 1}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Arrival</p>
              <h4 className="mt-0.5 text-xs font-bold text-stone-900">{train.arrival}</h4>
              <p className="text-[9px] text-stone-500">Day {train.to?.day || 1}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Duration</p>
              <h4 className="mt-0.5 text-xs font-bold text-[#034F46]">{train.duration}</h4>
              <p className="text-[9px] text-stone-500">{train.distance ? `${train.distance} km` : "Direct Corridor"}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Halts</p>
              <h4 className="mt-0.5 text-xs font-bold text-stone-900">
                {train.totalStops !== undefined
                  ? train.totalStops
                  : train.stops !== undefined
                  ? train.stops
                  : 0}
              </h4>
              <p className="text-[9px] text-stone-500">Stoppages</p>
            </div>
          </div>

          {/* Fare Tier Breakdown if available */}
          {train.fares && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mr-1">Available Classes:</span>
              {Object.entries(train.fares).map(([cls, fare]) => (
                <div
                  key={cls}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs"
                >
                  <span className="font-bold text-stone-700">{cls}</span>
                  <span className="font-semibold text-[#034F46]">₹{fare.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Running Days */}
          {runningDays.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 shrink-0">
                Operating Days:
              </span>
              <div className="flex gap-1.5">
                {runningDays.map(([day, value]) => (
                  <div
                    key={day}
                    className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-bold transition ${
                      value
                        ? "bg-[#034F46] text-white"
                        : "bg-stone-100 text-stone-300"
                    }`}
                    title={`${day}: ${value ? "Runs" : "No departure"}`}
                  >
                    {day[0]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 border-t border-stone-100 pt-3">
            <button
              onClick={handleAddToTour}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#034F46]/30 bg-[#034F46]/[0.06] py-2.5 text-center text-xs font-semibold text-[#034F46] transition hover:bg-[#034F46] hover:text-white"
            >
              <FiPlus className="text-sm" />
              <span>Add to Tour Builder</span>
            </button>
            <div className="flex-1">
              <BookNowButton train={train} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-stone-100 bg-stone-50/50 p-4 sm:p-5">
        <RouteTimeline route={train.route} />
      </div>
    </div>
  );
}
