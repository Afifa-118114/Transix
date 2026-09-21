import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiUsers,
  FiDownload,
  FiLayers,
  FiShare2,
} from "react-icons/fi";
import { FaTrainSubway, FaPlaneDeparture, FaBus, FaCar } from "react-icons/fa6";
import { FaRupeeSign } from "react-icons/fa";
import toast from "react-hot-toast";
import { formatBudget, getDuration } from "../../utils/formatTrip";

export default function ItineraryHero({ trip, onDownloadPdf, isGeneratingPdf = false }) {
  const navigate = useNavigate();

  const isCampus = trip?.tripCategory === "CAMPUS" || Boolean(trip?.campusConfig?.expectedParticipants);

  // Dynamic values
  const durationText = getDuration(trip) || (trip?.duration ? (typeof trip.duration === "number" ? `${trip.duration} Days` : trip.duration) : `${trip?.itinerary?.length || 5} Days`);
  const budgetVal = trip?.campusConfig?.budgetPerStudent || trip?.budget;
  const budgetText = budgetVal ? formatBudget(budgetVal) : null;
  const travelersCount = trip?.campusConfig?.expectedParticipants || trip?.registrationSettings?.capacity || trip?.travelers || 2;

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
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 sm:p-6 shadow-xs transition-colors">
      {/* Top Controls: Back Button & Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
        >
          <FiArrowLeft className="text-xs" />
          <span>Back</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-2xs"
          >
            <FiShare2 className="text-xs" />
            <span>Share</span>
          </button>

          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              disabled={isGeneratingPdf}
              id="download-itinerary-pdf-btn"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {isGeneratingPdf ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FiDownload className="text-xs" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}

          <Link
            to="/builder"
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-xs"
          >
            <FiLayers className="text-xs" />
            <span>Customize in Builder</span>
          </Link>
        </div>
      </div>

      {/* Main Route */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-white">
          {trip?.source || "Origin"}
        </h1>
        <FiArrowRight className="text-xl text-indigo-600" />
        <h1 className="text-2xl font-bold capitalize text-indigo-600 dark:text-indigo-400">
          {trip?.destination || "Destination"}
        </h1>
      </div>

      {/* Meta Strip */}
      <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
        {durationText && (
          <div className="flex items-center gap-1.5">
            <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
            <span>{durationText}</span>
          </div>
        )}

        {budgetText && (
          <div className="flex items-center gap-1.5">
            <FaRupeeSign className="text-indigo-600 dark:text-indigo-400" />
            <span>{budgetText}</span>
          </div>
        )}

        {travelersCount ? (
          <div className="flex items-center gap-1.5">
            <FiUsers className="text-indigo-600 dark:text-indigo-400" />
            <span>
              {travelersCount} Travelers{!isCampus && trip?.tripType ? ` (${trip.tripType})` : ""}
            </span>
          </div>
        ) : null}

        {trip?.travelMode && (
          <div className="flex items-center gap-1.5">
            <span className="text-indigo-600 dark:text-indigo-400">{getTransitIcon(trip.travelMode)}</span>
            <span>{trip.travelMode}</span>
          </div>
        )}
      </div>
    </section>
  );
}
