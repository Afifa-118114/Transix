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
      className="group flex h-full flex-col justify-between cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl"
    >
      <div>
        <div className="relative h-36 w-full overflow-hidden bg-slate-100">
          <img
            src={hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
            alt={hotel.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Rating */}
          {hotel.rating && (
            <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
              <FaStar className="fill-white text-white text-[10px]" />
              <span>{hotel.rating}</span>
            </div>
          )}
        </div>

        <div className="p-3.5">
          <h4 className="text-sm font-bold text-[#0c0a09] dark:text-white line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            {hotel.name}
          </h4>

          <div className="mt-1 flex items-center gap-1 text-xs text-[#777169] dark:text-stone-400">
            <FiMapPin className="shrink-0 text-rose-500 text-xs" />
            <span className="line-clamp-1">
              {hotel.address
                ? hotel.address.split(",")[1]?.trim() || hotel.address
                : hotel.location || "Central Destination"}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3.5 pt-0">
        <div className="flex items-center justify-between border-t border-[#f0efed] dark:border-stone-800 pt-3">
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
            className="flex items-center gap-1 rounded-full bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:shadow-md cursor-pointer"
          >
            <span>+ Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
