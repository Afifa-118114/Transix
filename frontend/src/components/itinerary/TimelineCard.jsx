import { useEffect, useState } from "react";
import { FiClock, FiMapPin, FiNavigation, FiStar } from "react-icons/fi";
import { getPlaceImage } from "../../services/imageService";

function TimelineCard({ activity, destination }) {
  console.log("TimelineCard Render:", activity.place);
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
    <div className="translate-x-10 relative flex items-start gap-6 pl-12">
      {/* Timeline */}
      <div className="flex w-14 shrink-0 flex-col items-center">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
          {activity.time}
        </span>

        <div className="mt-3 h-5 w-5 rounded-full border-4 border-indigo-600 bg-white" />

        <div className="mt-2 flex-1 w-[3px] bg-indigo-200" />
      </div>

      {/* Card */}
      <div className="mb-12 w-full max-w-5xl mx-auto overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:shadow-xl">
        {" "}
        <div className="flex flex-col md:flex-row gap-1">
          {/* LEFT IMAGE */}

          <div className="w-full md:w-[200px] shrink-0">
            {image ? (
              <img
                src={image}
                alt={activity.place}
                className="h-[170px] w-full  object-cover"
              />
            ) : (
              <div className="h-[200px] animate-pulse bg-gray-200" />
            )}
          </div>

          {/* RIGHT INFO */}

          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {activity.activity}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-gray-500 text-sm">
                <FiMapPin className="text-indigo-600" />

                <span>{activity.place}</span>
              </div>

              <p className="mt-5 leading-8 text-gray-800 text-sm">
                {activity.notes}
              </p>
            </div>

            {/* Chips */}

            <div className="mt-4 flex flex-wrap gap-8">
              {activity.duration && (
                <div className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 flex  gap-1">
                  <FiClock />
                  {activity.duration}
                </div>
              )}

              {activity.estimatedCost && (
                <div className=" rounded-full bg-green-50  text-sm font-medium text-green-700 flex items-center gap-2">
                  {activity.estimatedCost}
                </div>
              )}

              {activity.rating && (
                <div className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 flex items-center gap-2">
                  <FiStar />
                  {activity.rating}
                </div>
              )}
            </div>

            {/* Buttons */}

            <div className="mt-7 flex gap-10">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.place)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-gradient-to-br from-indigo-400 via-white to-blue-700 px-10 py-5 text-sm font-medium transition hover:bg-indigo-50 translate-x-4"
              >
                Google Maps
              </a>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activity.place)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-400 via-white to-blue-700 px-8 py-4 text-sm font-medium text-black transition hover:bg-indigo-700"
              >
                <FiNavigation className="text-lg" />
                Navigate
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TimelineCard;
