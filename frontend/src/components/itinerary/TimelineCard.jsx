import { useEffect, useState } from "react";
import { FiClock, FiMapPin, FiNavigation } from "react-icons/fi";
import { getPlaceImage } from "../../services/imageService";

export default function TimelineCard({ activity, destination, index }) {
  const [image, setImage] = useState("");

  useEffect(() => {
    async function load() {
      const query = `${activity.place} ${destination || ""}`;
      const img = await getPlaceImage(query);
      setImage(img);
    }

    load();
  }, [activity.place, destination]);

  return (
    <div className="relative flex items-start gap-4">
      {/* Time & Dot Marker */}
      <div className="flex w-20 shrink-0 flex-col items-center pt-3">
        <span className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
          {activity.time || "Morning"}
        </span>
        <div className="mt-2 h-3.5 w-3.5 rounded-full border-2 border-indigo-600 bg-white shadow-xs" />
      </div>

      {/* Card Body */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:border-indigo-300 hover:shadow-md">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="h-32 sm:h-28 w-full sm:w-36 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {image ? (
              <img
                src={image}
                alt={activity.place}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-slate-200" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {activity.activity}
              </h3>

              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <FiMapPin className="text-indigo-500 text-xs shrink-0" />
                <span>{activity.place}</span>
              </div>

              {activity.notes && (
                <p className="mt-2 text-xs text-slate-600 leading-relaxed rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                  {activity.notes}
                </p>
              )}
            </div>

            {/* Chips & Navigation CTA */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex items-center gap-2">
                {activity.duration && (
                  <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    <FiClock className="text-[10px]" />
                    {activity.duration}
                  </span>
                )}

                {activity.estimatedCost && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {activity.estimatedCost}
                  </span>
                )}
              </div>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  activity.place
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
              >
                <FiNavigation className="text-xs" />
                <span>Directions</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
