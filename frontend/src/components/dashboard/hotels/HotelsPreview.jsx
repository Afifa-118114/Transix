import { useNavigate } from "react-router-dom";
import { FiMapPin, FiMoon, FiArrowRight, FiCheckCircle } from "react-icons/fi";
import { FaStar } from "react-icons/fa";

const FALLBACK_HOTEL_PHOTOS = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80"
];

export default function HotelsPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip || !trip.staySegments || trip.staySegments.length === 0) {
    return null;
  }

  const staySegments = trip.staySegments;
  const totalNights = staySegments.reduce((acc, seg) => acc + (seg.nights || 0), 0);
  const selectedCount = staySegments.filter((s) => s.selectedHotel).length;

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stay Plan</h2>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-300">
              {staySegments.length} Segment{staySegments.length > 1 ? "s" : ""}
            </span>
            {selectedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                <span>⚡</span> {selectedCount} Auto-Selected
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {totalNights} nights total across {staySegments.length} location{staySegments.length > 1 ? "s" : ""}. Pre-selected and verified for automated booking.
          </p>
        </div>

        <button
          onClick={() => navigate(`/itinerary/${trip._id || "draft"}/stays`)}
          className="group flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
        >
          <span>Plan &amp; Customize Stays</span>
          <FiArrowRight className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-none">
        {staySegments.map((segment, idx) => {
          const hotel = segment.selectedHotel;
          const photo =
            hotel?.image ||
            FALLBACK_HOTEL_PHOTOS[idx % FALLBACK_HOTEL_PHOTOS.length];
          const nightly =
            hotel?.nightlyPrice || hotel?.pricePerNight || hotel?.price || 2800;
          const nights = segment.nights || 1;
          const totalCost = nightly * nights;

          return (
            <div
              key={segment.id || idx}
              onClick={() => navigate(`/itinerary/${trip._id || "draft"}/stays`)}
              className="group w-72 sm:w-80 shrink-0 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#1a233a] overflow-hidden shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer flex flex-col"
            >
              {/* Hotel Photo Header */}
              <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={photo}
                  alt={hotel?.name || segment.location}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                {/* Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                  <span>⚡</span> Auto-Selected Stay
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                  <FaStar className="text-[9px]" />
                  <span>{hotel?.rating || 4.7}</span>
                </div>

                {/* Location and Nights on Bottom of Photo */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-xs font-bold drop-shadow-sm">
                  <span className="flex items-center gap-1">
                    <FiMapPin className="text-emerald-400" />
                    {segment.location}
                  </span>
                  <span className="flex items-center gap-1 bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px]">
                    <FiMoon className="text-indigo-300" />
                    {nights} Night{nights !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {hotel?.name || `${segment.location} Grand Resort & Spa`}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {hotel?.roomType || "Deluxe King Room"} • Free Breakfast &amp; WiFi
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                      ₹{nightly.toLocaleString()}
                      <span className="text-[10px] font-normal text-slate-400"> / night</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      ₹{totalCost.toLocaleString()} ({nights}N total)
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    <FiCheckCircle className="text-[11px]" />
                    Auto-Book Ready
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
