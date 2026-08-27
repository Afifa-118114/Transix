import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import HotelCard from "./HotelCard";

export default function HotelsPreview(props) {
  const { hotels = [], loading } = props;
  const navigate = useNavigate();
  const scrollContainerRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = direction === "left" ? -400 : 400;
    scrollContainerRef.current.scrollBy({
      left: scrollAmount,
      behavior: "smooth",
    });
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Stays & Accommodations</h2>
            <p className="text-xs text-slate-500">
              Loading verified hotels near your destination...
            </p>
          </div>
        </div>

        <div className="flex gap-4 overflow-hidden pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 w-60 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Stays & Accommodations</h2>
            {hotels.length > 0 && (
              <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {hotels.length} verified stays
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Swipe or scroll to explore curated accommodations near your destination
          </p>
        </div>

        {/* Horizontal Navigation Controls */}
        {hotels.length > 4 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              title="Scroll Left"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <FiChevronLeft className="text-base" />
            </button>
            <button
              onClick={() => scroll("right")}
              title="Scroll Right"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <FiChevronRight className="text-base" />
            </button>
          </div>
        )}
      </div>

      {hotels.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 font-medium">
          No hotel recommendations available for this destination.
        </div>
      ) : (
        /* Horizontal Carousel with 4-5 visible items */
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth scrollbar-none"
        >
          {hotels.map((hotel, idx) => (
            <div key={hotel.id || idx} className="w-64 sm:w-72 shrink-0">
              <HotelCard
                hotel={hotel}
                onClick={() =>
                  navigate("/hotel-details", {
                    state: {
                      hotels,
                      activeIndex: idx,
                      hotelId: hotel.id,
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
