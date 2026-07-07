import { FaTrain, FaPlane, FaBus, FaCarSide, FaStar } from "react-icons/fa";

import { FiClock, FiArrowRight } from "react-icons/fi";

export default function TransportCard({ transport, mode, active, onSelect }) {
  const icon =
    mode === "Train" ? (
      <FaTrain />
    ) : mode === "Flight" ? (
      <FaPlane />
    ) : mode === "Bus" ? (
      <FaBus />
    ) : (
      <FaCarSide />
    );

  return (
    <div
      className={`rounded-3xl border-2 p-6 transition-all duration-300 

      ${
        active
          ? "border-indigo-600 bg-indigo-50 shadow-xl"
          : "border-gray-200 bg-white hover:-translate-y-1 hover:shadow-lg"
      }`}
    >
      {/* Top */}

      <div className="flex items-center justify-between ">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-2xl text-indigo-600">
            {icon}
          </div>

          <div>
            <h3 className="text-lg font-bold">{transport.name}</h3>

            <p className="text-sm text-gray-500">{transport.operator}</p>
          </div>
        </div>

        <div className="rounded-full bg-yellow-100 px-4 py-2 font-semibold text-yellow-600">
          <FaStar className="mr-2 inline" />

          {transport.rating}
        </div>
      </div>

      {/* Route */}

      <div className="mt-8 grid grid-cols-3 items-center">
        <div>
          <h2 className="text-xl font-bold">{transport.departure}</h2>
          <p className="mt-1 text-gray-500">{transport.from}</p>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-indigo-600">
            {transport.duration}
          </p>

          <div className="my-2 flex w-full items-center">
            <div className="h-[2px] flex-1 bg-gray-300"></div>

            <FiArrowRight className="mx-3 text-indigo-600" />

            <div className="h-[2px] flex-1 bg-gray-300"></div>
          </div>

          <p className="text-xs text-gray-500">
            {transport.stops || "Non Stop"}
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xl font-bold">{transport.arrival}</h2>
          <p className="mt-1 text-gray-500">{transport.to}</p>
        </div>
      </div>

      {/* Bottom */}

      <div className="mt-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Starting From</p>

          <h2 className="text-xl font-bold text-indigo-700">
            {transport.price || transport.estimatedFare}
          </h2>
        </div>

        <div className="flex gap-3">
          <a
            href={transport.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            Book Now
          </a>
        </div>
      </div>
    </div>
  );
}
