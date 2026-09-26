import { useState } from "react";
import { FiMapPin, FiChevronDown, FiChevronUp } from "react-icons/fi";

function RouteTimeline({ route }) {
  const [expanded, setExpanded] = useState(false);

  if (!route || route.length === 0) return null;

  const previewStations =
    route.length <= 6
      ? route
      : [
          route[0],
          route[Math.floor(route.length * 0.2)],
          route[Math.floor(route.length * 0.4)],
          route[Math.floor(route.length * 0.6)],
          route[Math.floor(route.length * 0.8)],
          route[route.length - 1],
        ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Route &amp; Stoppages
          </h3>
          <p className="text-[11px] text-stone-400">
            {route.length} Stations along the official railway corridor
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 hover:border-stone-300"
        >
          {expanded ? (
            <>
              <span>Collapse View</span>
              <FiChevronUp className="text-xs text-stone-500" />
            </>
          ) : (
            <>
              <span>View All {route.length} Stops</span>
              <FiChevronDown className="text-xs text-stone-500" />
            </>
          )}
        </button>
      </div>

      {/* ================= PREVIEW HORIZONTAL TIMELINE ================= */}
      {!expanded && (
        <div className="overflow-x-auto py-2">
          <div className="flex min-w-[520px] items-center justify-between px-2">
            {previewStations.map((station, index) => (
              <div key={index} className="flex flex-1 items-center">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs font-bold text-[#034F46]">
                    {station.departure !== "Source"
                      ? station.departure
                      : station.arrival}
                  </p>
                  <p className="text-[10px] font-medium text-stone-400">
                    Day {station.day}
                  </p>

                  <div
                    className={`my-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-2xs ${
                      index === 0 || index === previewStations.length - 1
                        ? "bg-[#034F46] text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    <FiMapPin className="text-[11px]" />
                  </div>

                  <p className="text-xs font-bold text-stone-800">
                    {station.code}
                  </p>
                  <p className="max-w-[85px] text-[10px] text-stone-500 truncate">
                    {station.name}
                  </p>
                </div>

                {index !== previewStations.length - 1 && (
                  <div className="mx-2 mb-8 h-[2px] flex-1 rounded-full bg-stone-200" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= EXPANDED FULL ROUTE LIST ================= */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            {route.map((station, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-white px-3.5 py-2.5 text-xs transition hover:border-[#034F46]/40 hover:bg-[#034F46]/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      index === 0 || index === route.length - 1
                        ? "bg-[#034F46] text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{station.code}</span>
                      <span className="text-stone-500 truncate max-w-[200px] sm:max-w-xs">{station.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Day {station.day}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Arrival – Departure</span>
                    <span className="font-semibold text-stone-800">
                      {station.arrival} – {station.departure}
                    </span>
                  </div>
                  <div className="w-16">
                    <span className="text-[10px] text-stone-400 block">Distance</span>
                    <span className="font-medium text-stone-600">{station.distance} km</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RouteTimeline;
