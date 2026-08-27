import { FiArrowLeft, FiArrowRight, FiCalendar, FiUsers } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatBudget, getDuration } from "../../utils/formatTrip";

export default function ItineraryHero({ trip }) {
  const navigate = useNavigate();

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-indigo-600"
      >
        <FiArrowLeft className="text-xs" />
        <span>Back to Dashboard</span>
      </button>

      {/* Route */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold capitalize text-slate-900">
          {trip.source}
        </h1>
        <FiArrowRight className="text-xl text-indigo-600" />
        <h1 className="text-2xl font-bold capitalize text-indigo-600">
          {trip.destination}
        </h1>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5">
          <FiCalendar className="text-indigo-600" />
          <span>{getDuration(trip)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FaRupeeSign className="text-indigo-600" />
          <span>{formatBudget(trip.budget)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <FiUsers className="text-indigo-600" />
          <span>
            {trip.travelers || 2} Travelers ({trip.tripType || "Leisure"})
          </span>
        </div>
      </div>
    </section>
  );
}
