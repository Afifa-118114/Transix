export default function HotelActionButtons({ hotel }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div>
        <h2 className="text-base font-bold text-slate-900">
          Ready to reserve your room?
        </h2>
        <p className="text-xs text-slate-500">
          Add directly to your custom tour itinerary or book via provider
        </p>
      </div>

      <div className="flex items-center gap-2.5">
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
          className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
        >
          + Add to Tour Builder
        </button>

        <a
          href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
            hotel.name,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
        >
          Book on Booking.com
        </a>
      </div>
    </div>
  );
}
