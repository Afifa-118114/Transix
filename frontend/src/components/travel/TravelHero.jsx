import {
  FaTrain,
  FaPlane,
  FaBus,
  FaCar,
  FaStar,
  FaClock,
  FaMapMarkerAlt,
  FaWallet,
} from "react-icons/fa";

import trainImg from "../../assets/travel/train.jpg";
import flightImg from "../../assets/travel/flight.jpg";
import busImg from "../../assets/travel/bus.jpg";
import cabImg from "../../assets/travel/cab.jpg";

const images = {
  Train: trainImg,
  Flight: flightImg,
  Bus: busImg,
  Cab: cabImg,
};

const icons = {
  Train: <FaTrain />,
  Flight: <FaPlane />,
  Bus: <FaBus />,
  Cab: <FaCar />,
};

export default function TravelHero({ transport, mode }) {
  if (!transport) return null;

  // Normalize mode (train -> Train, TRAIN -> Train)
  const normalizedMode = mode
    ? mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase()
    : "Train";

  const heroImage = images[normalizedMode] || trainImg;
  const heroIcon = icons[normalizedMode] || <FaTrain />;

  console.log("Mode:", mode);
  console.log("Normalized:", normalizedMode);
  console.log("Image:", heroImage);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
      <div className="grid grid-cols-[40%_60%] gap-4">
        {/* Left Image */}
        <div className="relative h-[180px] lg:h-[240px]">
          <img
            src={heroImage}
            alt={normalizedMode}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

          <div className="absolute bottom-8 left-8 text-white">
            <div className="mb-4 inline-flex items-center gap-3 rounded-full bg-white/20 px-5 py-2 backdrop-blur">
              <span className="text-xl">{heroIcon}</span>
              <span className="font-semibold">{normalizedMode}</span>
            </div>

            <h1 className="text-4xl font-bold">
              {transport.provider || transport.operator}
            </h1>

            <p className="mt-3 text-lg opacity-90">
              {transport.from} → {transport.to}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col justify-center p-10">
          <div className="grid grid-cols-2 gap-6">
            <div className="rounded-lg bg-indigo-50 p-3">
              <FaClock className="mb-3 text-3xl text-indigo-600" />
              <p className="text-sm text-gray-500">Duration</p>
              <h3 className="mt-2 text-2xl font-bold">{transport.duration}</h3>
            </div>

            <div className="rounded-2xl bg-green-50 p-6">
              <FaWallet className="mb-3 text-3xl text-green-600" />
              <p className="text-sm text-gray-500">Estimated Fare</p>
              <h3 className="mt-2 text-2xl font-bold">
                {transport.estimatedFare || transport.price}
              </h3>
            </div>

            <div className="rounded-2xl bg-orange-50 p-6">
              <FaMapMarkerAlt className="mb-3 text-3xl text-orange-600" />
              <p className="text-sm text-gray-500">Route</p>
              <h3 className="mt-2 font-semibold">
                {transport.from} → {transport.to}
              </h3>
            </div>

            <div className="rounded-2xl bg-yellow-50 p-6">
              <FaStar className="mb-3 text-3xl text-yellow-500" />
              <p className="text-sm text-gray-500">Rating</p>
              <h3 className="mt-2 text-2xl font-bold">
                {transport.rating || "4.5"} ⭐
              </h3>
            </div>
          </div>

          <div className="mt-10 flex gap-6">
            <a
              href={transport.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 font-semibold text-white transition hover:scale-105 translate-x-3"
            >
              Book Now
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
