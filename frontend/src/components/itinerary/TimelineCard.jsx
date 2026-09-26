import { useEffect, useState } from "react";
import { FiClock, FiMapPin, FiNavigation, FiZap, FiCheck } from "react-icons/fi";
import { resolveActivityImage } from "../../services/imageService";
import { useTripBuilder } from "../../context/TripBuilderContext";
import SmartShiftModal from "./SmartShiftModal";

export default function TimelineCard({
  activity,
  destination,
  index,
  viewOnly = false,
  activityId,
  isSelected = false,
  onSelect,
  mapLocation,
}) {
  const [imageInfo, setImageInfo] = useState({ url: "", attribution: null });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const res = await resolveActivityImage(activity, destination);
      if (isMounted && res?.url) {
        setImageInfo(res);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [activity, destination]);

  const { trip } = useTripBuilder();
  const [isSmartShiftOpen, setIsSmartShiftOpen] = useState(false);

  const cat = (activity.category || activity.type || "").toLowerCase();
  const actName = (activity.activity || activity.name || "").toLowerCase();
  const isMandatory =
    cat.includes("hotel") ||
    cat.includes("flight") ||
    cat.includes("train") ||
    cat.includes("bus") ||
    actName.includes("check") ||
    actName.includes("arrival") ||
    actName.includes("departure") ||
    activity.isStaySegmentHotel;

  const placeName = activity.place || activity.location || activity.name || "";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${placeName} ${destination || ""}`
  )}`;

  const isMappable = Boolean(mapLocation?.isMappable);

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(activity, activityId, mapLocation);
    }
  };

  return (
    <div
      id={`itinerary-item-${activityId}`}
      onClick={handleCardClick}
      className={`relative flex items-start gap-4 transition-all duration-200 cursor-pointer rounded-2xl p-1 ${
        isSelected
          ? "ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
          : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
      }`}
    >
      {/* Time & Dot Marker */}
      <div className="flex w-20 shrink-0 flex-col items-center pt-3">
        <span className="rounded-full bg-[#fafaf9] dark:bg-slate-800 border border-[#e7e5e4] dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 dark:text-slate-200">
          {activity.time || "Scheduled"}
        </span>
        <div
          className={`mt-2.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs transition-all ${
            isSelected
              ? "bg-indigo-600 dark:bg-indigo-400 scale-125 ring-4 ring-indigo-300 dark:ring-indigo-700"
              : "bg-indigo-600 dark:bg-indigo-500"
          }`}
        />
      </div>

      {/* Card Body */}
      <div
        className={`flex-1 min-w-0 overflow-hidden rounded-2xl border transition-all duration-200 p-2.5 sm:p-3 shadow-2xs ${
          isSelected
            ? "border-indigo-500 bg-white dark:bg-[#131b2e] shadow-md"
            : "border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          {/* Compact Thumbnail */}
          <div className="h-28 sm:h-24 w-full sm:w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative">
            {imageInfo.url ? (
              <img
                src={imageInfo.url}
                alt={placeName}
                className="h-full w-full object-cover transition duration-300 hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
            )}

            {/* Sequence / Map status badge */}
            {isMappable ? (
              <span
                style={{
                  backgroundColor: mapLocation?.isFirstInDay
                    ? "#059669"
                    : mapLocation?.isLastInDay
                    ? "#7c3aed"
                    : mapLocation?.dayColor?.hex || "#4f46e5",
                }}
                className="absolute top-1.5 left-1.5 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5"
              >
                <span>📍</span>
                <span>
                  {mapLocation?.isFirstInDay
                    ? `1 START`
                    : mapLocation?.isLastInDay
                    ? `${mapLocation?.sequenceNumber} END`
                    : `#${mapLocation?.sequenceNumber || "•"}`}
                </span>
              </span>
            ) : (
              <span className="absolute top-1.5 left-1.5 bg-slate-800/80 backdrop-blur-xs text-slate-300 text-[8px] font-bold px-1.5 py-0.5 rounded">
                Unpinned
              </span>
            )}

            {/* Google Photo Attribution Badge */}
            {imageInfo.attribution && (
              <div
                title={`Photo by ${imageInfo.attribution.author || "Google Contributor"}`}
                className="absolute bottom-1 right-1 max-w-[85%] truncate rounded bg-slate-950/75 backdrop-blur-xs px-1 py-0.5 text-[7px] font-medium text-slate-300 pointer-events-none"
              >
                © {imageInfo.attribution.author || "Google"}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-1 min-w-0 flex-col justify-between w-full">
            <div>
              <div className="flex items-start justify-between gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                  {activity.activity || activity.name}
                </h3>
                {activity.estimatedCost && (
                  <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    {activity.estimatedCost}
                  </span>
                )}
              </div>

              {placeName && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <FiMapPin className="text-indigo-500 text-[10px] shrink-0" />
                  <span className="truncate">{placeName}</span>
                </div>
              )}

              {activity.notes && (
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-snug rounded-lg bg-slate-50 dark:bg-slate-800/50 p-1.5 border border-slate-100 dark:border-slate-800 break-words">
                  <span className="font-semibold text-slate-900 dark:text-white">Tip: </span>
                  {activity.notes}
                </p>
              )}
            </div>

            {/* Chips & Action Buttons Row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                {activity.duration && (
                  <span className="flex items-center gap-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:text-slate-400">
                    <FiClock className="text-[9px] text-indigo-500" />
                    {activity.duration}
                  </span>
                )}
                {isMappable && (
                  <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Interactive Map
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!isMandatory && !viewOnly && (
                  <button
                    type="button"
                    onClick={() => setIsSmartShiftOpen(true)}
                    title="Simulate travel delay or schedule disruption"
                    className="flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer"
                  >
                    <FiZap className="text-[9px]" />
                    <span className="hidden xs:inline sm:inline">Disruption</span>
                    <span className="inline xs:hidden sm:hidden">Shift</span>
                  </button>
                )}

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-1 text-[10px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white cursor-pointer"
                >
                  <FiNavigation className="text-[10px]" />
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
