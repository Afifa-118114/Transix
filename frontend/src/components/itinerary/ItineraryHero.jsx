import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiUsers,
  FiDollarSign,
  FiLayers,
  FiShare2,
} from "react-icons/fi";
import { FaTrainSubway, FaPlaneDeparture, FaBus, FaCar } from "react-icons/fa6";
import toast from "react-hot-toast";
import { formatBudget, getDuration } from "../../utils/formatTrip";

export default function ItineraryHero({ trip }) {
  const navigate = useNavigate();

  const getTransitIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case "flight":
        return <FaPlaneDeparture className="text-xs" />;
      case "bus":
        return <FaBus className="text-xs" />;
      case "car":
        return <FaCar className="text-xs" />;
      case "train":
      default:
        return <FaTrainSubway className="text-xs" />;
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Itinerary link copied to clipboard!");
    }
  };

  return (
    <section className="w-full rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs">
      {/* Top Action Row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#777169] transition hover:text-[#0c0a09]"
        >
          <FiArrowLeft className="text-xs" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-[#fafaf9] px-3 py-1.5 text-xs font-semibold text-[#57534e] hover:bg-white hover:text-[#0c0a09] transition shadow-2xs"
          >
            <FiShare2 className="text-xs" />
            <span>Share</span>
          </button>

          <Link
            to="/builder"
            className="flex items-center gap-1.5 rounded-full bg-[#0c0a09] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#292524] transition shadow-xs"
          >
            <FiLayers className="text-xs" />
            <span>Customize in Builder</span>
          </Link>
        </div>
      </div>

      {/* Main Route Header */}
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#034F46] block mb-1">
          Confirmed Journey Plan
        </span>
        <h1
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="text-2xl sm:text-4xl font-[400] text-[#0c0a09] leading-tight flex items-center gap-2.5 flex-wrap"
        >
          <span>{trip.source}</span>
          <FiArrowRight className="text-base sm:text-xl text-[#034F46]" />
          <span>{trip.destination}</span>
        </h1>
      </div>

      {/* Metadata Badges Strip */}
      <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#57534e] pt-3 border-t border-[#e7e5e4]">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1 font-medium">
          <FiCalendar className="text-[#034F46]" />
          <span>{getDuration(trip) || `${trip.itinerary?.length || 5} Days`}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1 font-medium">
          <FiDollarSign className="text-[#034F46]" />
          <span>{formatBudget(trip.budget)}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1 font-medium">
          <FiUsers className="text-[#034F46]" />
          <span>
            {trip.travelers || 2} Travelers ({trip.tripType || "Leisure"})
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fafaf9] border border-[#e7e5e4] px-3 py-1 font-medium">
          {getTransitIcon(trip.travelMode)}
          <span>{trip.travelMode || "Train"}</span>
        </div>
      </div>
    </section>
  );
}
