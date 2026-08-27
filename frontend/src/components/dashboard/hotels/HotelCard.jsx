import { FaStar } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";

export default function HotelCard({ hotel, onClick }) {
  // Format real price or show availability status
  const renderPrice = () => {
    if (typeof hotel.price === "number" && hotel.price > 0) {
      return (
        <div>
          <span className="text-sm font-extrabold text-indigo-600">
            ₹{hotel.price.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 font-medium"> / night</span>
        </div>
      );
    }

    if (hotel.displayPrice && hotel.displayPrice !== "Price unavailable") {
      return (
        <span className="rounded-md bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
          {hotel.displayPrice}
        </span>
      );
    }

    return (
      <span className="text-xs font-semibold text-slate-500">
        Check availability
      </span>
    );
  };

  return (
    <div
      onClick={() => onClick(hotel)}
      className="group flex h-full flex-col justify-between cursor-pointer overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-md"
    >
      <div>
        <div className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Rating */}
          {hotel.rating && (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs">
              <FaStar className="fill-amber-400 text-amber-400 text-[10px]" />
              <span>{hotel.rating}</span>
            </div>
          )}
        </div>

        <div className="p-3.5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {hotel.name}
          </h4>

          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <FiMapPin className="shrink-0 text-indigo-500 text-xs" />
            <span className="line-clamp-1">
              {hotel.address
                ? hotel.address.split(",")[1]?.trim() || hotel.address
                : hotel.location || "Central Destination"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3.5 pt-0">
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700/60 pt-3">
          {renderPrice()}

          <button
            onClick={(e) => {
              e.stopPropagation();
              import("../../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
                addItemToTourBuilder({
                  ...hotel,
                  category: "hotel",
                  categoryLabel: "Hotels",
                  icon: "🏨",
                  price: hotel.price || 0,
                  displayPrice: hotel.displayPrice,
                });
              });
            }}
            className="flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white"
          >
            <span>+ Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
