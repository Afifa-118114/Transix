import { FiGlobe, FiPhone, FiMapPin } from "react-icons/fi";

import { FaStar } from "react-icons/fa";

function InfoCard({ icon, title, value, link }) {
  return (
    <div className=" translate-y-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ">
      <div className="flex gap-4">
        <div className="mt-1 text-xl text-indigo-600">{icon}</div>

        <div>
          <p className=" text-sm text-gray-500">{title}</p>

          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 hover:underline break-all"
            >
              {value}
            </a>
          ) : (
            <p className="font-medium break-words">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HotelInfo({ hotel }) {
  return (
    <div>
      <h1 className="text-2xl font-bold leading-tight translate-y-8">
        {hotel.name}
      </h1>

      <div className="mt-4 flex items-center gap-6 translate-y-8">
        <div className="flex items-center gap-2">
          <FaStar className="text-yellow-500 " />

          <span className="font-semibold">{hotel.rating}</span>

          <span className="text-gray-500">({hotel.reviews} reviews)</span>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          Verified
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <InfoCard icon={<FiMapPin />} title="Location" value={hotel.address} />

        <InfoCard
          icon={<FaStar />}
          title="Rating"
          value={`${hotel.rating} / 5`}
        />

        <InfoCard
          icon={<FiGlobe />}
          title="Website"
          value={hotel.website || "Not Available"}
          link={hotel.website}
        />

        <InfoCard
          icon={<FiPhone />}
          title="Phone"
          value={hotel.phone || "Not Available"}
          link={hotel.phone ? `tel:${hotel.phone}` : null}
        />

        <InfoCard
          icon={<FiMapPin />}
          title="Google Maps"
          value="Open in Google Maps"
          link={hotel.mapsUrl}
        />
      </div>
    </div>
  );
}
