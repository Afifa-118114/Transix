import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaStar,
  FaGlobe,
  FaDirections,
} from "react-icons/fa";

export default function PlaceCard({ place }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Image */}

      <img
        src={place.image || "/placeholder.jpg"}
        alt={place.name}
        className="h-36 w-full object-cover"
      />

      <div className="p-3">
        {/* Title */}

        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-[17px] font-bold leading-5 text-gray-900">
            {place.name}
          </h3>

          <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
            <FaStar size={10} />
            {place.rating || "4.5"}
          </div>
        </div>

        {/* Address */}

        <p className="mb-2 flex items-start gap-2 text-[12px] leading-4 text-gray-600 line-clamp-2">
          <FaMapMarkerAlt className="mt-0.5 shrink-0 text-indigo-600" />
          {place.address}
        </p>

        {/* Phone */}

        {place.phone && (
          <p className="mb-3 flex items-center gap-2 text-[12px] text-gray-600">
            <FaPhoneAlt className="text-green-600" size={11} />
            {place.phone}
          </p>
        )}

        {/* Buttons */}

        <div className="flex gap-2">
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              <FaGlobe size={11} />
              Website
            </a>
          )}

          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
          >
            <FaDirections size={11} />
            Maps
          </a>
        </div>
      </div>
    </div>
  );
}
