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

    // Keep only text before "-"
    let shortName = name.split("-")[0];

    // Then keep only text before ","
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
    <div className="relative flex items-center mb-8  translate-y-4">
      {/* Left Arrow */}

      <button
        onClick={() => scroll("left")}
        className="z-20 mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100 "
      >
        <FiChevronLeft size={20} />
      </button>

      {/* Tabs */}

      <div
        ref={scrollRef}
        className="flex flex-1 gap-3 overflow-x-hidden scroll-smooth"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {hotels.map((hotel, index) => (
          <button
            key={hotel.id}
            onClick={() => {
              setActiveHotel(index);
              setActivePhoto(0);
            }}
            className={`min-w-[200px] rounded-2xl border-2 p-4 text-left transition-all duration-300 translate-x-2

              ${
                activeHotel === index
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                  : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md"
              }`}
          >
            <p className="mb-1 text-xs opacity-70 translate-x-2">
              Hotel {index + 1}
            </p>

            <p className="line-clamp-2 text-sm font-semibold">
              {getShortHotelName(hotel.name)}
            </p>
          </button>
        ))}
      </div>

      {/* Right Arrow */}

      <button
        onClick={() => scroll("right")}
        className="z-20 ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-lg hover:bg-gray-100"
      >
        <FiChevronRight size={20} />
      </button>
    </div>
  );
}
