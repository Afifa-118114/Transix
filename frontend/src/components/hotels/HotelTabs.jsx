import { useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

export default function HotelTabs({
  hotels,
  activeHotel,
  setActiveHotel,
  setActivePhoto,
}) {
  const scrollRef = useRef(null);

  const getShortHotelName = (name) => {
    if (!name) return "";
    let shortName = name.split("-")[0];
    shortName = shortName.split(",")[0];
    return shortName.trim();
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -250 : 250,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex items-center mb-4">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="z-10 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition"
      >
        <FiChevronLeft size={16} />
      </button>

      {/* Tabs */}
      <div
        ref={scrollRef}
        className="flex flex-1 gap-2.5 overflow-x-auto scroll-smooth scrollbar-none pb-1"
      >
        {hotels.map((hotel, index) => (
          <button
            key={hotel.id || index}
            onClick={() => {
              setActiveHotel(index);
              setActivePhoto(0);
            }}
            className={`min-w-[180px] rounded-xl border p-3 text-left transition-all duration-200 ${
              activeHotel === index
                ? "border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-xs ring-1 ring-indigo-200"
                : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:shadow-xs"
            }`}
          >
            <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400">
              Option {index + 1}
            </p>
            <p className="line-clamp-1 text-xs font-bold">
              {getShortHotelName(hotel.name)}
            </p>
          </button>
        ))}
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="z-10 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 transition"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
