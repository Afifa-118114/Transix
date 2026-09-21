import TimelineCard from "./TimelineCard";
import { FiHome, FiMapPin, FiMoon } from "react-icons/fi";

export default function Timeline({ plan, destination, accommodations = [], viewOnly = false }) {
  const hasPlan = Array.isArray(plan) && plan.length > 0;
  const hasAccommodations = Array.isArray(accommodations) && accommodations.length > 0;

  if (!hasPlan && !hasAccommodations) {
    return (
      <div className="relative mx-auto mt-6 w-full max-w-3xl rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#131b2e] p-8 text-center">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No activities scheduled for this day</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Customize in the Tour Builder to add or reorder items</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto mt-6 w-full max-w-3xl">
      {/* Accommodation Context Cards */}
      {hasAccommodations && (
        <div className="mb-8 flex flex-col gap-4">
          {accommodations.map((acc, idx) => (
            <div key={idx} className="relative z-10 flex items-center gap-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-900/20 p-4 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300">
                <FiHome className="text-xl" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-indigo-200 dark:bg-indigo-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-200">
                    {acc.status}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <FiMapPin /> {acc.segmentLocation}
                  </span>
                </div>
                <h4 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                  {acc.name}
                </h4>
                {acc.status === "Check-in" && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <FiMoon /> {acc.nights} Night{acc.nights !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Central Guide Line */}
      <div className="absolute left-[39px] top-6 bottom-6 w-[2px] rounded-full bg-slate-200 dark:bg-slate-700/60" />

      <div className="flex flex-col gap-4">
        {hasPlan && plan.map((activity, index) => (
          <TimelineCard
            key={activity.id || activity._id || `${activity.category || 'act'}-${activity.time || index}-${activity.activity || activity.place || 'item'}-${index}`}
            activity={activity}
            destination={destination}
            index={index}
            viewOnly={viewOnly}
          />
        ))}
      </div>
    </div>
  );
}
