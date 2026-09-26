import TimelineCard from "./TimelineCard";
import { FiHome, FiMapPin, FiMoon } from "react-icons/fi";

export default function Timeline({
  plan,
  destination,
  accommodations = [],
  viewOnly = false,
  dayNumber = 1,
  selectedActivityId = null,
  onSelectActivity = null,
  mappableLocations = [],
}) {
  const hasPlan = Array.isArray(plan) && plan.length > 0;
  const hasAccommodations = Array.isArray(accommodations) && accommodations.length > 0;

  if (!hasPlan && !hasAccommodations) {
    return (
      <div className="relative mx-auto mt-4 w-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131b2e] p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          No activities scheduled for this day
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Customize in the Tour Builder to add or reorder items
        </p>
      </div>
    );
  }

  // Create quick lookup for mappable locations by activity or id
  const locMap = new Map();
  if (Array.isArray(mappableLocations)) {
    mappableLocations.forEach((loc) => {
      if (loc.id) locMap.set(loc.id, loc);
      if (loc.place) locMap.set(loc.place.toLowerCase(), loc);
      if (loc.name) locMap.set(loc.name.toLowerCase(), loc);
    });
  }

  return (
    <div className="relative mx-auto mt-4 w-full">
      {/* Accommodation Context Cards */}
      {hasAccommodations && (
        <div className="mb-6 flex flex-col gap-3">
          {accommodations.map((acc, idx) => (
            <div
              key={idx}
              className="relative z-10 flex items-center gap-4 rounded-2xl border border-teal-100 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-4 shadow-2xs"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-300">
                <FiHome className="text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-teal-200 dark:bg-teal-800/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-teal-900 dark:text-teal-200">
                    {acc.status}
                  </span>
                  {acc.segmentLocation && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                      <FiMapPin className="shrink-0" /> {acc.segmentLocation}
                    </span>
                  )}
                </div>
                <h4 className="mt-1 text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                  {acc.name}
                </h4>
                {acc.status === "Check-in" && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FiMoon /> {acc.nights} Night{acc.nights !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Central Guide Line */}
      <div className="absolute left-[39px] top-6 bottom-6 w-[2px] rounded-full bg-slate-200 dark:bg-slate-700/60 pointer-events-none" />

      {/* Activity Timeline Cards */}
      <div className="flex flex-col gap-3.5">
        {hasPlan &&
          plan.map((activity, index) => {
            const actId =
              activity.id ||
              activity._id ||
              `d${dayNumber}-act-${index}`;

            const mapLocation =
              locMap.get(actId) ||
              locMap.get((activity.place || "").toLowerCase()) ||
              locMap.get((activity.activity || "").toLowerCase()) ||
              null;

            const isSelected = selectedActivityId === actId || selectedActivityId === mapLocation?.id;

            return (
              <TimelineCard
                key={actId}
                activity={activity}
                destination={destination}
                index={index}
                viewOnly={viewOnly}
                activityId={actId}
                isSelected={isSelected}
                onSelect={onSelectActivity}
                mapLocation={mapLocation}
              />
            );
          })}
      </div>
    </div>
  );
}
