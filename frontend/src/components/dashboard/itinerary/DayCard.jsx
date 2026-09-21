import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaceImage } from "../../../services/imageService";

export default function DayCard({ day, trip }) {
  const [image, setImage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!day?.title) return;

    async function load() {
      const img = await getPlaceImage(day.title);
      setImage(img);
    }

    load();
  }, [day]);

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
      className="group w-52 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
    >
      <div className="relative h-28 w-full overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={day.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-200" />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
          Day {day.day}
        </span>
      </div>

      <div className="p-3.5">
        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">
          {day.title || `Day ${day.day} Exploration`}
        </h4>

        <p className="mt-1 text-[11px] text-slate-500 font-medium line-clamp-1">
          {highlights.length > 0
            ? highlights.join(" • ")
            : "Sightseeing • Dining"}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500 font-medium">
          <span>{day.plan?.length || 0} Activities</span>
          <span className="text-indigo-600 font-bold group-hover:underline">Timeline →</span>
        </div>
      </div>
    </div>
  );
}
