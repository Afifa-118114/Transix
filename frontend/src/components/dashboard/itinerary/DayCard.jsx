import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPlaceImage } from "../../../services/imageService";

function DayCard({ day, trip }) {
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
      const text = `${item.activity} ${item.place}`.toLowerCase();

      if (
        text.includes("train") ||
        text.includes("flight") ||
        text.includes("bus") ||
        text.includes("taxi") ||
        text.includes("travel")
      ) {
        tags.push("Travel");
      }

      if (
        text.includes("restaurant") ||
        text.includes("cafe") ||
        text.includes("breakfast") ||
        text.includes("lunch") ||
        text.includes("dinner") ||
        text.includes("food")
      ) {
        tags.push("Cafe");
      }

      if (
        text.includes("market") ||
        text.includes("mall") ||
        text.includes("bazaar") ||
        text.includes("shopping")
      ) {
        tags.push("Shopping");
      }

      if (
        text.includes("lake") ||
        text.includes("garden") ||
        text.includes("view") ||
        text.includes("zoo") ||
        text.includes("temple") ||
        text.includes("museum") ||
        text.includes("park")
      ) {
        tags.push("Sightseeing");
      }

      if (
        text.includes("boat") ||
        text.includes("trek") ||
        text.includes("ropeway")
      ) {
        tags.push("Adventure");
      }
    });

    return [...new Set(tags)].slice(0, 3);
  }, [day]);

  return (
    <div
      onClick={() =>
        navigate(`/itinerary/${trip._id}`, {
          state: {
            trip,
            dayIndex: day.day - 1,
          },
        })
      }
      className="h-[185px] w-[170px] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {image ? (
        <img src={image} alt={day.title} className="h-24 w-full object-cover" />
      ) : (
        <div className="h-24 w-full animate-pulse bg-gray-200" />
      )}

      <div className="flex h-[89px] flex-col items-center justify-center px-3 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[2px] text-indigo-600">
          Day {day.day}
        </p>

        <p className="mt-1 text-sm font-semibold leading-5 text-gray-800">
          {highlights.length
            ? highlights.join(" • ")
            : "Explore • Relax • Discover"}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          {day.plan?.length || 0} Activities
        </p>
      </div>
    </div>
  );
}

export default DayCard;
