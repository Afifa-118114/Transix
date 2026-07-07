import { FiArrowLeft, FiArrowRight, FiCalendar, FiUsers } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatBudget, getDuration } from "../../utils/formatTrip";

function ItineraryHero({ trip }) {
  const navigate = useNavigate();

  return (
    <section className=" translate-x-12 mx-auto w-full max-w-2xl rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-indigo-600 translate-x-5"
      >
        <FiArrowLeft />
        Back to Dashboard
      </button>

      {/* Route */}
      <div className="flex items-center gap-5  translate-x-42">
        <h1 className="text-4xl font-bold capitalize text-gray-900">
          {trip.source}
        </h1>

        <FiArrowRight className="text-3xl text-indigo-600" />

        <h1 className="text-4xl font-bold capitalize text-indigo-600">
          {trip.destination}
        </h1>
      </div>

      {/* Subtitle */}
      <div className="  translate-x-45 mt-6 flex flex-wrap items-center gap-6 text-gray-600">
        <div className="flex items-center gap-2">
          <FiCalendar className="text-indigo-600" />
          <span>{getDuration(trip)}</span>
        </div>

        <div className="flex items-center gap-2">
          <FaRupeeSign className="text-indigo-600" />
          <span>{formatBudget(trip.budget)}</span>
        </div>

        <div className="flex items-center gap-2">
          <FiUsers className="text-indigo-600" />
          <span>
            {trip.travelers} {trip.tripType}
          </span>
        </div>
      </div>
    </section>
  );
}

export default ItineraryHero;
