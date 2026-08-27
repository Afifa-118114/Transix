import { FiGlobe, FiPhone, FiMapPin, FiClock } from "react-icons/fi";
import { FaStar } from "react-icons/fa";

function InfoCard({ icon, title, value, link }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 text-base">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase text-slate-400">{title}</p>
          {link && value !== "Not available" ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-indigo-600 hover:underline truncate block"
            >
              {value}
            </a>
          ) : (
            <p className="text-xs font-semibold text-slate-800 truncate">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HotelInfo({ hotel }) {
  const priceDisplay =
    typeof hotel.price === "number" && hotel.price > 0
      ? `₹${hotel.price.toLocaleString()} / night`
      : hotel.displayPrice && hotel.displayPrice !== "Price unavailable"
      ? hotel.displayPrice
      : "Check availability";

  return (
    <div className="flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            {hotel.name}
          </h1>

          <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
            {hotel.businessStatus === "OPERATIONAL" ? "Operational" : "Verified Stay"}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {hotel.rating ? (
            <div className="flex items-center gap-1">
              <FaStar className="text-amber-400 text-xs" />
              <span className="font-bold text-slate-800">{hotel.rating}</span>
              {hotel.reviews && <span>({hotel.reviews.toLocaleString()} reviews)</span>}
            </div>
          ) : (
            <span className="text-slate-400">Rating unavailable</span>
          )}

          <span>•</span>

          <div className="text-indigo-600 font-extrabold text-sm">
            {priceDisplay}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <InfoCard
            icon={<FiMapPin />}
            title="Location"
            value={hotel.address || hotel.location || "Not available"}
          />
          <InfoCard
            icon={<FaStar />}
            title="Rating & Class"
            value={hotel.rating ? `${hotel.rating} / 5.0 (${hotel.reviews || 0} reviews)` : "Not available"}
          />
          <InfoCard
            icon={<FiGlobe />}
            title="Official Website"
            value={hotel.website ? "Visit Website" : "Not available"}
            link={hotel.website}
          />
          <InfoCard
            icon={<FiPhone />}
            title="Phone Number"
            value={hotel.phone || "Not available"}
            link={hotel.phone ? `tel:${hotel.phone}` : null}
          />
        </div>

        {hotel.openingHours && Array.isArray(hotel.openingHours) && (
          <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1.5">
              <FiClock className="text-indigo-600" />
              <span>Operating Schedule</span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-600">
              {hotel.openingHours.slice(0, 3).map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
