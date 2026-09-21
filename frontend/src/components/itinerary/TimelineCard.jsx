import { useEffect, useState } from "react";
import { FiClock, FiMapPin, FiNavigation, FiDollarSign } from "react-icons/fi";
import { getPlaceImage } from "../../services/imageService";

export default function TimelineCard({ activity, destination, index }) {
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

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${activity.place} ${destination || ""}`
  )}`;

  return (
    <div className="relative flex items-start gap-4">
      {/* Time & Dot Marker */}
      <div className="flex w-20 shrink-0 flex-col items-center pt-3">
        <span className="rounded-full bg-[#fafaf9] border border-[#e7e5e4] px-2.5 py-0.5 text-[10px] font-bold text-[#0c0a09]">
          {activity.time || "Scheduled"}
        </span>
        <div className="mt-2.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#034F46] shadow-xs" />
      </div>

      {/* Card Body */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-[#e7e5e4] bg-white p-4 sm:p-5 shadow-2xs transition-all duration-200 hover:border-[#0c0a09] hover:shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <div className="h-32 sm:h-28 w-full sm:w-36 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f4] border border-[#e7e5e4]">
            {image ? (
              <img
                src={image}
                alt={activity.place}
                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-[#e7e5e4]" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-1 flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#0c0a09]">
                  {activity.activity}
                </h3>
                {activity.estimatedCost && (
                  <span className="text-xs font-bold text-[#034F46]">
                    {activity.estimatedCost}
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-1 text-xs text-[#777169]">
                <FiMapPin className="text-[#a8a29e] text-xs shrink-0" />
                <span className="truncate">{activity.place}</span>
              </div>

              {activity.notes && (
                <p className="mt-2 text-xs text-[#57534e] leading-relaxed rounded-lg bg-[#fafaf9] p-2.5 border border-[#f0efed]">
                  <span className="font-semibold text-[#0c0a09]">Tip: </span>
                  {activity.notes}
                </p>
              )}
            </div>

            {/* Chips & Directions Link */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e7e5e4] pt-2.5">
              <div className="flex items-center gap-2">
                {activity.duration && (
                  <span className="flex items-center gap-1 rounded-md bg-[#fafaf9] border border-[#e7e5e4] px-2 py-0.5 text-[10px] font-medium text-[#57534e]">
                    <FiClock className="text-[10px] text-[#034F46]" />
                    {activity.duration}
                  </span>
                )}
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#034F46] hover:underline"
              >
                <span>Navigate</span>
                <FiNavigation className="text-[10px]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
