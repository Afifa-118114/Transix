import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaStar,
  FaGlobe,
  FaDirections,
} from "react-icons/fa";

export default function PlaceCard({ place }) {
  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
      {/* Image & Rating */}
      <div>
        <div className="relative h-36 w-full overflow-hidden bg-slate-100">
          <img
            src={place.image || "https://picsum.photos/400/250"}
            alt={place.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs">
            <FaStar className="fill-amber-400 text-amber-400 text-[9px]" />
            <span>{place.rating || "4.5"}</span>
          </div>
        </div>

        <div className="p-3.5">
          <h3 className="line-clamp-1 text-sm font-bold text-slate-900">
            {place.name}
          </h3>

          <p className="mt-1 flex items-start gap-1 text-xs text-slate-500 line-clamp-2">
            <FaMapMarkerAlt className="mt-0.5 shrink-0 text-indigo-500 text-xs" />
            <span>{place.address}</span>
          </p>

          {place.phone && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <FaPhoneAlt className="text-emerald-600 text-[10px]" />
              <span>{place.phone}</span>
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="p-3.5 pt-0">
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => {
              import("../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
                addItemToTourBuilder(
                  {
                    name: place.name,
                    activity: place.name,
                    place: place.address || place.name,
                    category: "food",
                    categoryLabel: "Food & Dining",
                    icon: "🍴",
                    price: 600,
                    rating: place.rating || "4.5",
                    image: place.image,
                  },
                  0
                );
              });
            }}
            className="w-full rounded-xl bg-indigo-50 py-2 text-center text-xs font-bold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
          >
            + Add to Tour
          </button>

          <div className="flex gap-2">
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FaGlobe size={11} />
                <span>Web</span>
              </a>
            )}

            <a
              href={place.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
            >
              <FaDirections size={11} />
              <span>Maps</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
