function HotelActionButtons({ hotel }) {
  return (
    <div className="translate-y-16 translate-x-4 mt-10 flex items-center justify-between rounded-3xl bg-white p-8 shadow">
      <div>
        <h2 className="text-2xl font-bold translate-x-4 ">
          Ready to book your stay?
        </h2>

        <p className="mt-2 text-gray-500 translate-x-4 ">
          You will be redirected securely to Booking.com
        </p>
      </div>

      <a
        href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
          hotel.name,
        )}`}
        target="_blank"
        rel="noreferrer"
        className="-translate-x-6 rounded-xl bg-gradient-to-br from-indigo-400 via-white to-blue-700 px-8 py-4 font-semibold text-black transition hover:bg-indigo-700"
      >
        Book on Booking.com
      </a>
    </div>
  );
}

export default HotelActionButtons;
