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
        className="z-10 mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
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
                ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 shadow-xs ring-1 ring-indigo-200 dark:ring-indigo-700"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-xs"
            }`}
          >
            <p className="mb-0.5 text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
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
        className="z-10 ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
