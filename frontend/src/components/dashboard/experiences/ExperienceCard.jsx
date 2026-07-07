import { FaStar } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";
import { useEffect, useState } from "react";
import { getPlaceImage } from "../../../services/imageService";

function ExperienceCard({ experience }) {
  const [image, setImage] = useState("");

  useEffect(() => {
    if (!experience?.place) return;

    async function load() {
      const img = await getPlaceImage(experience.place);
      setImage(img);
    }

    load();
  }, [experience.place]);

  return (
    <div className="min-w-[185px] flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-300 bg-white p-3 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      {image ? (
        <img
          src={image}
          alt={experience.title}
          className="h-28 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="h-28 w-full rounded-lg animate-pulse bg-indigo-100" />
      )}

      <div className="p-3">
        <h3 className="mt-1 text-center text-sm font-semibold text-indigo-600">
          {experience.title}
        </h3>

        <div className="p-3">
          <span className="mt-2 flex items-center justify-center text-xs text-gray-600 font-semibold gap-1 ">
            <FiMapPin className="text-indigo-500" />
            {experience.place}
          </span>

          <span className="flex items-center justify-center gap-1 text-black-500 text-sm ">
            <FaStar className="text-[12px] text-yellow-500" />
            {experience.rating}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ExperienceCard;
