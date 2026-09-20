import { FiArrowLeft, FiArrowRight, FiCalendar, FiUsers, FiDownload } from "react-icons/fi";
import { FaRupeeSign } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatBudget, getDuration } from "../../utils/formatTrip";

export default function ItineraryHero({ trip, onDownloadPdf, isGeneratingPdf = false }) {
  const navigate = useNavigate();

  const isCampus = trip?.tripCategory === "CAMPUS" || Boolean(trip?.campusConfig?.expectedParticipants);

  // Dynamic values
  const durationText = getDuration(trip) || (trip?.duration ? (typeof trip.duration === "number" ? `${trip.duration} Days` : trip.duration) : null);
  const budgetVal = trip?.campusConfig?.budgetPerStudent || trip?.budget;
  const budgetText = budgetVal ? formatBudget(budgetVal) : null;
  const travelersCount = trip?.campusConfig?.expectedParticipants || trip?.registrationSettings?.capacity || trip?.travelers;

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-5 shadow-xs transition-colors">
      {/* Top Controls: Back Button & Download Itinerary Button */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <FiArrowLeft className="text-xs" />
          <span>Back to Dashboard</span>
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
                <span>Download Itinerary</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Route */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold capitalize text-slate-900 dark:text-white">
          {trip?.source || "Origin"}
        </h1>
        <FiArrowRight className="text-xl text-indigo-600" />
        <h1 className="text-2xl font-bold capitalize text-indigo-600">
          {trip?.destination || "Destination"}
        </h1>
      </div>

      {/* Meta */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
        {durationText && (
          <div className="flex items-center gap-1.5">
            <FiCalendar className="text-indigo-600" />
            <span>{durationText}</span>
          </div>
        )}

        {budgetText && (
          <div className="flex items-center gap-1.5">
            <FaRupeeSign className="text-indigo-600" />
            <span>{budgetText}</span>
          </div>
        )}

        {travelersCount ? (
          <div className="flex items-center gap-1.5">
            <FiUsers className="text-indigo-600" />
            <span>
              {travelersCount} Travelers{!isCampus && trip?.tripType ? ` (${trip.tripType})` : ""}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
