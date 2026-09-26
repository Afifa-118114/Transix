import { useLocation, useNavigate } from "react-router-dom";
import { useState, useMemo, useRef } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import HotelTabs from "../components/hotels/HotelTabs.jsx";
import HotelGallery from "../components/hotels/HotelGallery";
import HotelInfo from "../components/hotels/HotelInfo";
import HotelActionButtons from "../components/hotels/HotelActionButtons";
import HotelBookingModal from "../components/hotels/HotelBookingModal";
import { FiArrowLeft, FiInfo, FiTrendingDown, FiMapPin, FiStar, FiCheck } from "react-icons/fi";
import { calculatePriceIntelligence } from "../utils/priceIntelligence";
import { calculateStayAccommodation } from "../utils/campusBudgetUtils";

export default function HotelDetails() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { trip, setTrip, selectHotelForSegment } = useTripBuilder();
  const { user, token } = useAuth();
  const detailSectionRef = useRef(null);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingHotel, setBookingHotel] = useState(null);

  // Extract stay context if present
  const stayContext = state?.stayContext;
  const isStaySelection = !!stayContext;

  const hotelsList = state?.hotels?.length
    ? state.hotels
    : state?.hotel
    ? [state.hotel]
    : [];

  const initialIndex = state?.activeIndex !== undefined
    ? state.activeIndex
    : state?.hotelId
    ? Math.max(0, hotelsList.findIndex((h) => h.id === state.hotelId))
    : 0;

  const [activeHotel, setActiveHotel] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [activePhoto, setActivePhoto] = useState(0);
  const [showScoreInfo, setShowScoreInfo] = useState(null);

  const numNights = useMemo(() => {
    if (stayContext?.nights) return stayContext.nights;
    if (!trip?.startDate || !trip?.endDate) return null;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    if (!isNaN(start) && !isNaN(end)) {
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return null;
  }, [trip, stayContext]);

  const { recommendations: topRecommendations, metadata: piMetadata } = useMemo(() => {
    return calculatePriceIntelligence(hotelsList, trip);
  }, [hotelsList, trip]);

  const handleViewHotel = (originalIndex) => {
    setActiveHotel(originalIndex);
    setActivePhoto(0);
    if (detailSectionRef.current) {
      detailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleReserve = (hotelData) => {
    setBookingHotel(hotelData);
    setShowBookingModal(true);
  };

  const handleSelectForStay = (hotelData) => {
    if (!stayContext) return;
    selectHotelForSegment(stayContext.staySegmentId, hotelData);
    if (Array.isArray(state?.draftStaySegments)) {
      const updatedDraft = state.draftStaySegments.map((seg, idx) => {
        if (seg.id === stayContext.staySegmentId || seg.location === stayContext.staySegmentId || idx === stayContext.segmentIndex) {
          const dummySeg = { ...seg, selectedHotel: hotelData };
          const stayPricing = calculateStayAccommodation(dummySeg, trip);
          const updatedHotel = {
            ...hotelData,
            price: stayPricing.groupCost,
            groupPrice: stayPricing.groupCost,
            perStudentPrice: stayPricing.perStudentCost,
            rooms: stayPricing.rooms,
            nightlyPrice: stayPricing.nightlyRate,
            isEstimatedPrice: stayPricing.isEstimated,
          };
          return { ...seg, selectedHotel: updatedHotel };
        }
        return seg;
      });
      navigate(`/itinerary/${trip._id || 'draft'}/stays`, { state: { draftStaySegments: updatedDraft } });
      return;
    }
    navigate(-1); // Go back to Stay Plan
  };

  if (hotelsList.length === 0) {
    return (
      <DashboardLayout trip={trip} setTrip={setTrip}>
        <div className="flex h-96 flex-col items-center justify-center gap-3 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No hotel information selected.</p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const hotel = hotelsList[activeHotel] || hotelsList[0];

  return (
    <>
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="flex flex-col gap-6 pb-12">
        {/* Page Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back to Dashboard</span>
          </button>

          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Hotels & Stays</h1>
          
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-indigo-700 dark:text-indigo-300 font-bold">
              {hotelsList.length} options
            </span>
            {isStaySelection ? (
              <>
                <span>•</span>
                <span>{stayContext.location}</span>
                <span>•</span>
                <span>{new Date(stayContext.checkIn).toLocaleDateString()} {stayContext.checkOut && `- ${new Date(stayContext.checkOut).toLocaleDateString()}`}</span>
                <span>•</span>
                <span>{stayContext.nights} Nights</span>
                <span>•</span>
                <span>{stayContext.travelers || trip?.travelers || 2} Travelers</span>
              </>
            ) : (
              <>
                {trip?.source && trip?.destination && (
                  <>
                    <span>•</span>
                    <span>{trip.source} → {trip.destination}</span>
                  </>
                )}
                {trip?.startDate && (
                  <>
                    <span>•</span>
                    <span>{new Date(trip.startDate).toLocaleDateString()} {trip.endDate && `- ${new Date(trip.endDate).toLocaleDateString()}`}</span>
                  </>
                )}
                {trip?.travelers && (
                  <>
                    <span>•</span>
                    <span>{trip.travelers} Travelers</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Price Intelligence Hero */}
        {topRecommendations.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50 to-white dark:from-[#131b2e] dark:to-[#1a233a] p-6 shadow-xs">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-indigo-900 dark:text-indigo-100">
                  <span className="text-indigo-600 dark:text-indigo-400">✦</span> Price Intelligence
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {piMetadata?.message || "Find the best stay for your trip by comparing price, quality and your preferences."}
                </p>
              </div>
              <div className="flex flex-col items-end rounded-xl border border-indigo-100 dark:border-indigo-800/60 bg-white/60 dark:bg-slate-800/50 px-3 py-2 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Price Source</span>
                {piMetadata?.isDemoMode ? (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Hackathon demo pricing</span>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Verified live prices</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {topRecommendations.map((rec, i) => (
                <div key={rec.id || i} className={`relative flex flex-col rounded-2xl border bg-white dark:bg-[#131b2e] p-4 shadow-xs transition-transform hover:-translate-y-1 ${i === 0 ? 'border-indigo-300 dark:border-indigo-600 shadow-indigo-100/50 dark:shadow-indigo-900/20 md:scale-[1.02]' : 'border-slate-200 dark:border-slate-700/80'}`}>
                  {/* Category Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black tracking-wide ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      <span>{rec.icon}</span>
                      {rec.category.toUpperCase()}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={() => setShowScoreInfo(showScoreInfo === i ? null : i)}
                        className="flex flex-col items-end group"
                      >
                        <span className={`text-lg font-black ${i === 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {rec.intelligenceScore}<span className="text-[10px] font-bold text-slate-400">/100</span>
                        </span>
                        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-500 transition">
                          Transix Score <FiInfo />
                        </span>
                      </button>
                      
                      {/* Score Explanation Popover */}
                      {showScoreInfo === i && (
                        <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-xl">
                          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">How we scored it</h4>
                          <div className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <div className="flex justify-between"><span>Price Fit</span><span className="text-slate-500">40%</span></div>
                            <div className="flex justify-between"><span>Quality</span><span className="text-slate-500">40%</span></div>
                            <div className="flex justify-between"><span>Preference</span><span className="text-slate-500">20%</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hotel Identity */}
                  <div className="mb-4">
                    <h3 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-white" title={rec.name}>{rec.name}</h3>
                    <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {rec.rating > 0 && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <FiStar className="fill-amber-500" />
                          {rec.rating} {rec.reviews && `· ${rec.reviews} reviews`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4 flex-1">
                    {rec.nuitee?.livePriceAvailable ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-slate-900 dark:text-white">₹{rec.nuitee.totalPrice.toLocaleString()}</span>
                          <span className="text-xs font-semibold text-slate-500">total</span>
                        </div>
                        {rec.nuitee.nightlyPrice && (
                          <div className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {numNights ? `${numNights} nights ` : ''}(<strong className="text-slate-700 dark:text-slate-300">₹{rec.nuitee.nightlyPrice.toLocaleString()}/night</strong>)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm font-bold text-slate-500">Live price unavailable</span>
                        <div className="mt-0.5 text-[11px] font-medium text-slate-400">
                          Check provider for rates
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reasons */}
                  <div className="mb-4 flex-1 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Why this is recommended?</p>
                    {rec.reasons.map((r, idx) => (
                      <p key={idx} className="flex items-start gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                        <span className="mt-0.5 text-indigo-500">✓</span>
                        <span className="line-clamp-2">{r}</span>
                      </p>
                    ))}
                  </div>

                  {/* Action */}
                  <button
                    onClick={() => handleViewHotel(rec.originalIndex)}
                    className={`mt-auto w-full rounded-xl py-2 text-xs font-bold transition ${i === 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                  >
                    View Hotel →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* All Available Hotels Selector */}
        <section ref={detailSectionRef} className="scroll-mt-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-6 shadow-xs">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">All Available Hotels</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Explore all {hotelsList.length} options for your trip</p>
          </div>

          {hotelsList.length > 1 && (
            <HotelTabs
              hotels={hotelsList}
              activeHotel={activeHotel}
              setActiveHotel={setActiveHotel}
              setActivePhoto={setActivePhoto}
            />
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <HotelGallery
              hotel={hotel}
              activePhoto={activePhoto}
              setActivePhoto={setActivePhoto}
            />
            <HotelInfo hotel={hotel} />
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <HotelActionButtons hotel={hotel} onReserve={() => handleReserve(hotel)} />
            
            {isStaySelection && (
              <div className="flex justify-end p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/40">
                <button
                  onClick={() => handleSelectForStay(hotel)}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200/50 dark:shadow-indigo-900/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <FiCheck className="text-lg" />
                  Select for {stayContext.location} Stay
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>

    {/* Hotel Booking Modal */}
    <HotelBookingModal
      isOpen={showBookingModal}
      onClose={() => setShowBookingModal(false)}
      hotel={bookingHotel}
      stayContext={{
        tripId: trip?._id,
        staySegmentId: stayContext?.staySegmentId,
        checkIn: stayContext?.checkIn,
        checkOut: stayContext?.checkOut,
        location: stayContext?.location,
        nights: stayContext?.nights,
        travelers: stayContext?.travelers || trip?.travelers,
      }}
      token={token}
      user={user}
      onBookingSuccess={(data) => {
        // Optionally update trip state or navigate away after booking
        setTimeout(() => setShowBookingModal(false), 3000);
      }}
    />
    </>
  );
}
