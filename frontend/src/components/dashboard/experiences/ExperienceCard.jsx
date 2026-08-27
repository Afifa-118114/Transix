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
    <div className="group w-48 shrink-0 flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-md">
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

          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs">
            <FaStar className="fill-amber-400 text-amber-400 text-[9px]" />
            <span>{experience.rating}</span>
          </div>
        </div>

        <div className="p-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {experience.title}
          </h4>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <FiMapPin className="shrink-0 text-indigo-500 text-[10px]" />
            <span className="truncate">{experience.place}</span>
          </div>
        </div>
      </div>

      <div className="p-3 pt-0">
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
          className="w-full rounded-xl bg-indigo-50 dark:bg-indigo-950/40 py-1.5 text-center text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white"
        >
          + Add to Tour
        </button>
      </div>
    </div>
  );
}
