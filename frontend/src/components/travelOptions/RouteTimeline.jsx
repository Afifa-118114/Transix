import { useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";

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
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Route &amp; Stoppages ({route.length} Stations)
        </h3>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
        >
          {expanded ? (
            <>
              <span>Collapse</span>
              <ChevronUp size={14} />
            </>
          ) : (
            <>
              <span>View All {route.length} Stops</span>
              <ChevronDown size={14} />
            </>
          )}
        </button>
      </div>

      {/* ================= PREVIEW HORIZONTAL TIMELINE ================= */}
      {!expanded && (
        <div className="overflow-x-auto py-2">
          <div className="flex min-w-[500px] items-center justify-between px-2">
            {previewStations.map((station, index) => (
              <div key={index} className="flex flex-1 items-center">
                <div className="flex flex-col items-center text-center">
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    {station.departure !== "Source"
                      ? station.departure
                      : station.arrival}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Day {station.day}
                  </p>

                  <div
                    className={`my-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-700 shadow-2xs
                    ${
                      index === 0 || index === previewStations.length - 1
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    }`}
                  >
                    <MapPin size={11} />
                  </div>

                  <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    {station.code}
                  </p>
                  <p className="max-w-[80px] text-[9px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    {station.name}
                  </p>
                </div>

                {index !== previewStations.length - 1 && (
                  <div className="mx-1.5 mb-8 h-[2px] flex-1 rounded-full bg-indigo-200 dark:bg-indigo-800/60" />
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
                className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-[#1a233a] px-3 py-2 text-xs transition hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      index === 0 || index === route.length - 1
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {index + 1}
                  </span>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 dark:text-white">{station.code}</span>
                      <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">{station.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Day {station.day}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Arr / Dep</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {station.arrival} – {station.departure}
                    </span>
                  </div>
                  <div className="w-16">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Distance</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{station.distance} km</span>
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
