import { FaStar } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";
import { useEffect, useState } from "react";
import { getPlaceImage } from "../../../services/imageService";

export default function ExperienceCard({ experience }) {
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!experience?.place && !experience?.title) return;

    async function load() {
      const img = await getPlaceImage(experience.title || experience.place);
      setImage(img);
    }

    load();
  }, [experience.place, experience.title]);

  return (
    <div className="group w-52 shrink-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md">
      <div>
        <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {image ? (
            <img
              src={image}
              alt={experience.title}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full animate-pulse bg-slate-200 dark:bg-slate-700" />
          )}

          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
            <FaStar className="fill-white text-white text-[9px]" />
            <span>{experience.rating}</span>
          </div>
        </div>

        <div className="p-3.5">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {experience.title}
          </h4>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <FiMapPin className="shrink-0 text-rose-500 text-[10px]" />
            <span className="truncate">{experience.place}</span>
          </div>
        </div>
      </div>

      <div className="p-3.5 pt-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            import("../../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
              addItemToTourBuilder(
                {
                  name: experience.title,
                  activity: experience.place || experience.title,
                  place: experience.place,
                  category: "experience",
                  categoryLabel: "Experiences",
                  icon: "🌿",
                  price: experience.price || 800,
                  rating: experience.rating,
                  image: image,
                },
                0
              );
            });
          }}
          className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 py-2 text-center text-xs font-semibold text-white shadow-xs transition hover:shadow-md cursor-pointer"
        >
          + Add to Tour
        </button>
      </div>
    </div>
  );
}
