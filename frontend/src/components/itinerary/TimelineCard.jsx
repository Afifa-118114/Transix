import { useEffect, useState } from "react";
import { FiClock, FiMapPin, FiNavigation, FiZap } from "react-icons/fi";
import { getPlaceImage } from "../../services/imageService";
import { useTripBuilder } from "../../context/TripBuilderContext";
import SmartShiftModal from "./SmartShiftModal";

export default function TimelineCard({ activity, destination, index, viewOnly = false }) {
  const [image, setImage] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const query = `${activity.place} ${destination || ""}`;
      const img = await getPlaceImage(query);
      if (isMounted) setImage(img);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [activity.place, destination]);

  const { trip } = useTripBuilder();
  const [isSmartShiftOpen, setIsSmartShiftOpen] = useState(false);

  const cat = (activity.category || "").toLowerCase();
  const actName = (activity.activity || "").toLowerCase();
  const isMandatory = cat.includes("hotel") || cat.includes("flight") || cat.includes("train") || cat.includes("bus") || actName.includes("check") || actName.includes("arrival") || actName.includes("departure") || activity.isStaySegmentHotel;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${activity.place} ${destination || ""}`
  )}`;

  return (
    <div className="relative flex items-start gap-4">
      {/* Time & Dot Marker */}
      <div className="flex w-20 shrink-0 flex-col items-center pt-3">
        <span className="rounded-full bg-[#fafaf9] dark:bg-slate-800 border border-[#e7e5e4] dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 dark:text-slate-200">
          {activity.time || "Scheduled"}
        </span>
        <div className="mt-2.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-indigo-600 dark:bg-indigo-500 shadow-xs" />
      </div>

      {/* Card Body */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="h-32 sm:h-28 w-full sm:w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {image ? (
              <img
                src={image}
                alt={activity.place}
                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {activity.activity}
                </h3>
                {activity.estimatedCost && (
                  <span className="rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    {activity.estimatedCost}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <FiMapPin className="text-indigo-500 text-xs shrink-0" />
                <span className="truncate">{activity.place}</span>
              </div>

              {activity.notes && (
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed rounded-lg bg-slate-50 dark:bg-slate-800/60 p-2.5 border border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-900 dark:text-white">Tip: </span>
                  {activity.notes}
                </p>
              )}
            </div>

            {/* Chips & Actions */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
              <div className="flex items-center gap-2">
                {activity.duration && (
                  <span className="flex items-center gap-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                    <FiClock className="text-[10px] text-indigo-500" />
                    {activity.duration}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isMandatory && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => setIsSmartShiftOpen(true)}
                    className="flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                  >
                    <FiZap className="text-[10px]" />
                    <span>Simulate Disruption</span>
                  </button>
                )}

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white cursor-pointer"
                >
                  <FiNavigation className="text-xs" />
                  <span>Directions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SmartShiftModal
        isOpen={isSmartShiftOpen}
        onClose={() => setIsSmartShiftOpen(false)}
        item={activity}
        trip={trip}
      />
    </div>
  );
}
