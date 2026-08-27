import RouteTimeline from "./RouteTimeline";
import BookNowButton from "./BookNowButton";
import { addItemToTourBuilder } from "../../utils/tourBuilderHelper";

export default function SelectedTrain({ train }) {
  if (!train) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select a train to view details.</p>
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
        icon: "🚆",
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
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] shadow-xs overflow-hidden transition-colors">
      {/* Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 p-3.5 sm:p-4">
        {/* Compact Thumbnail Image */}
        <div className="lg:col-span-4 relative h-36 sm:h-40 lg:h-full min-h-[140px] overflow-hidden rounded-xl bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200"
            alt={train.trainName}
            className="h-full w-full object-cover opacity-90"
          />
          <div className="absolute left-2.5 top-2.5 rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
            {train.type || "Express"}
          </div>
          <div className="absolute bottom-2.5 left-2.5 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white">
            #{train.trainNumber}
          </div>
        </div>

        {/* Train Information */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {train.trainName}
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="text-indigo-600 dark:text-indigo-400">{train.from?.code || train.source}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal">({train.from?.name || ""})</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">→</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{train.to?.code || train.destination}</span>
                  <span className="text-slate-400 dark:text-slate-500 font-normal">({train.to?.name || ""})</span>
                </div>
                {train.isGateway && train.gatewayLabel && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                    <span>📍</span>
                    <span>{train.gatewayLabel}</span>
                  </div>
                )}
              </div>

              {train.price && (
                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 block">Base Fare</span>
                  <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                    ₹{train.price.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Journey Stats 4-Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Departure</p>
              <h4 className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">{train.departure}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Day {train.from?.day || 1}</p>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Arrival</p>
              <h4 className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">{train.arrival}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Day {train.to?.day || 1}</p>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Duration</p>
              <h4 className="mt-0.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{train.duration}</h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">{train.distance || "Direct"}</p>
            </div>

            <div className="rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50/80 dark:bg-slate-800/60 p-1.5">
              <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">Stops</p>
              <h4 className="mt-0.5 text-xs font-extrabold text-slate-900 dark:text-white">
                {train.totalStops !== undefined
                  ? train.totalStops
                  : train.stops !== undefined
                  ? train.stops
                  : 0}
              </h4>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">Halts</p>
            </div>
          </div>

          {/* Fare Tier Breakdown if available */}
          {train.fares && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 mr-1">Classes:</span>
              {Object.entries(train.fares).map(([cls, fare]) => (
                <div
                  key={cls}
                  className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60 px-1.5 py-0.5 text-[9px]"
                >
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">{cls}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{fare.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Running Days */}
          {runningDays.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0">
                Runs:
              </span>
              <div className="flex gap-1">
                {runningDays.map(([day, value]) => (
                  <div
                    key={day}
                    className={`flex h-4.5 w-4.5 items-center justify-center rounded text-[8px] font-bold transition ${
                      value
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600"
                    }`}
                    title={`${day}: ${value ? "Runs" : "Does not run"}`}
                  >
                    {day[0]}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2.5">
            <button
              onClick={handleAddToTour}
              className="flex-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 py-1.5 text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white"
            >
              + Add to Tour
            </button>
            <div className="flex-1">
              <BookNowButton train={train} />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 p-3 sm:p-3.5">
        <RouteTimeline route={train.route} />
      </div>
    </div>
  );
}
