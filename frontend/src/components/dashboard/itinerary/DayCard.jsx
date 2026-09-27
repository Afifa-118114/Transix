import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getItineraryDayImage } from "../../../services/imageService";

export default function DayCard({ day, trip }) {
  const [image, setImage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const img = await getItineraryDayImage(day, trip);
      setImage(img);
    }

    load();
  }, [day, trip]);

  const highlights = useMemo(() => {
    if (!day?.plan) return [];

    const tags = [];
    day.plan.forEach((item) => {
      const text = `${item.activity || ""} ${item.place || ""}`.toLowerCase();
      if (text.includes("train") || text.includes("flight") || text.includes("bus") || text.includes("travel")) {
        tags.push("Travel");
      }
      if (text.includes("restaurant") || text.includes("cafe") || text.includes("food") || text.includes("dining")) {
        tags.push("Dining");
      }
      if (text.includes("market") || text.includes("shopping") || text.includes("mall")) {
        tags.push("Shopping");
      }
      if (text.includes("lake") || text.includes("garden") || text.includes("temple") || text.includes("museum") || text.includes("park")) {
        tags.push("Sightseeing");
      }
      if (text.includes("safari") || text.includes("trek") || text.includes("rafting") || text.includes("adventure")) {
        tags.push("Adventure");
      }
    });

    return [...new Set(tags)].slice(0, 2);
  }, [day]);

  return (
    <div
      onClick={() =>
        navigate(`/itinerary/${trip._id || "active-trip"}`, {
          state: {
            trip,
            dayIndex: day.day - 1,
          },
        })
      }
      className="group w-52 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#006CE4] dark:hover:border-sky-500 hover:shadow-sm"
    >
      <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={day.title || `Day ${day.day}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              e.target.onerror = null;
              const fallback = "https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg";
              e.target.src = fallback;
              setImage(fallback);
              // Clear stale cache
              const cacheKey = `transix_activity_img_v1_itinerary_img_${trip._id}_${day.day - 1}`;
              try {
                localStorage.setItem(cacheKey, JSON.stringify(fallback));
              } catch (_) {}
            }}
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-md bg-[#006CE4] px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
          Day {day.day}
        </span>
      </div>

      <div className="p-3.5">
        <h4 className="text-xs font-bold text-[#1A1A1A] dark:text-white line-clamp-1 group-hover:text-[#006CE4] dark:group-hover:text-sky-400 transition">
          {day.title || `Day ${day.day} Exploration`}
        </h4>

        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
          {highlights.length > 0
            ? highlights.join(" • ")
            : "Sightseeing • Dining"}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          <span>{day.plan?.length || 0} Activities</span>
          <span className="text-[#006CE4] dark:text-sky-400 font-semibold group-hover:underline">Timeline →</span>
        </div>
      </div>
    </div>
  );
}
