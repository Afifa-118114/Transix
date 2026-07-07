import { FaStar } from "react-icons/fa";
import { FiMapPin } from "react-icons/fi";

function HotelCard({ hotel, onClick }) {
  return (
    <div
      onClick={() => onClick(hotel)}
      className="group min-w-[190px] max-w-[300px] cursor-pointer overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:scale-[1.02]"
    >
      <img
        src={hotel.image || "https://picsum.photos/600/400"}
        alt={hotel.name}
        className="h-30 w-full object-cover"
      />

      <div className="p-5">
        {/* Rating & Price */}
        <h3 className="mt-5 min-h-[56px] line-clamp-2 text-[15px] font-semibold leading-6">
          {hotel.name}
        </h3>

        {/* Address */}
        <div className="mt-2 flex items-center gap-2 text-gray-500 text-sm">
          <FiMapPin className="shrink-0 text-indigo-600" />

          <span className="line-clamp-1">
            {hotel.address
              ? hotel.address.split(",")[1]?.trim()
              : "Address unavailable"}
          </span>
        </div>

        <div className="fle-col items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FaStar className="text-yellow-500" />

              <span className="font-semibold">{hotel.rating}</span>

              <span className="text-sm text-gray-500">({hotel.reviews})</span>

              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 ">
                Verified
              </span>
            </div>
          </div>
        </div>

        <div className="text-center flex">
          <p className=" translate-x-2 text-xl font-bold text-indigo-600">
            {hotel.price}
          </p>

          <p className=" translate-x-3 translate-y-1 text-xs text-gray-600 text-right">
            / night
          </p>
        </div>

        {/* Hotel Name */}
      </div>
    </div>
  );
}

export default HotelCard;
