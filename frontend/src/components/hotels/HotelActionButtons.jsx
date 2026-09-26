export default function HotelActionButtons({ hotel, onReserve }) {
  const hasLiveBooking = !!hotel?.nuitee?.offerId;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {hasLiveBooking ? "Ready to reserve your room?" : "Interested in this hotel?"}
        </h2>
        <p className="text-xs text-slate-500">
          {hasLiveBooking
            ? "Book instantly via Transix — live price, real confirmation"
            : "Add to your itinerary or check availability on Booking.com"}
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => {
            import("../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
              addItemToTourBuilder(
                {
                  ...hotel,
                  category: "hotel",
                  categoryLabel: "Hotels",
                  icon: "🏨",
                  price: hotel.price,
                },
                0
              );
            });
          }}
          className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white"
        >
          + Add to Tour
        </button>

        {hasLiveBooking ? (
          <button
            id="hotel-reserve-now-btn"
            onClick={onReserve}
            className="relative rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <span className="flex items-center gap-1.5">
              🔒 Reserve Now
            </span>
            {/* Live badge */}
            <span className="absolute -top-1.5 -right-1.5 flex h-4 items-center rounded-full bg-emerald-500 px-1.5 text-[9px] font-black uppercase tracking-wide text-white shadow">
              Live
            </span>
          </button>
        ) : (
          <a
            href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-slate-700 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98]"
          >
            Check on Booking.com ↗
          </a>
        )}
      </div>
    </div>
  );
}
