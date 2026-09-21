import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiMapPin,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiUsers,
  FiLayers,
  FiPlus,
  FiArrowRight,
  FiCheck,
  FiCopy,
  FiShare2,
  FiInfo,
  FiCompass,
  FiUser,
  FiCheckCircle,
  FiMap,
  FiStar,
} from "react-icons/fi";
import {
  FaWandMagicSparkles,
  FaTrainSubway,
  FaPlaneDeparture,
  FaHotel,
  FaUtensils,
  FaCar,
  FaBus,
} from "react-icons/fa6";
import { useTripBuilder } from "../../context/TripBuilderContext";
import { useAuth } from "../../context/AuthContext";
import { getDestinationInventory } from "../../services/inventoryService";
import { searchTrains } from "../../services/trainService";
import { formatDate, getDuration } from "../../utils/formatTrip";

export default function AITripResult({ trip, setTrip }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openMapModal } = useTripBuilder();

  const [selectedDay, setSelectedDay] = useState("all");
  const [copied, setCopied] = useState(false);
  const [inventory, setInventory] = useState({
    hotels: [],
    trainOption: null,
    transports: [],
  });
  const [loadingInventory, setLoadingInventory] = useState(true);

  // Load destination inventory (real trains, real hotels)
  useEffect(() => {
    if (!trip?.destination) return;

    let isMounted = true;
    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const data = await getDestinationInventory(trip.destination, trip);
        if (isMounted) {
          setInventory({
            hotels: data.hotels || [],
            trainOption: data.trainOption || null,
            transports: data.transports || [],
          });
        }
      } catch (err) {
        console.warn("Could not load inventory:", err);
      } finally {
        if (isMounted) setLoadingInventory(false);
      }
    };

    fetchInventory();
    return () => {
      isMounted = false;
    };
  }, [trip?.destination, trip]);

  if (!trip) return null;

  const itinerary = trip.itinerary || [];
  const durationText = trip.duration || getDuration(trip) || `${itinerary.length} Days`;

  const handleCopyItinerary = () => {
    try {
      let text = `AI TRAVEL PLAN: ${trip.source} → ${trip.destination}\n`;
      text += `Duration: ${durationText} | Travelers: ${trip.travelers} | Budget: ${trip.currency || "₹"} ${Number(trip.budget).toLocaleString()}\n\n`;
      if (trip.summary) {
        text += `Overview:\n${trip.summary}\n\n`;
      }
      itinerary.forEach((d) => {
        text += `\n--- Day ${d.day}: ${d.title} ---\n`;
        (d.plan || []).forEach((act) => {
          text += `• [${act.time}] ${act.activity} at ${act.place} (${act.duration || "1h"}) - ${act.notes || ""}\n`;
        });
      });
      navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Itinerary copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy text.");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Trip to ${trip.destination}`,
          text: `Check out our AI travel plan from ${trip.source} to ${trip.destination}!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      handleCopyItinerary();
    }
  };

  const handlePlanAnother = () => {
    if (window.confirm("Plan another trip? This will clear the current itinerary view.")) {
      try {
        localStorage.removeItem("currentTrip");
        localStorage.removeItem("transix_builder_trip");
      } catch {}
      if (setTrip) setTrip(null);
      navigate("/home");
    }
  };

  // Get transit icon
  const getTransitIcon = (mode) => {
    switch (mode?.toLowerCase()) {
      case "flight":
        return <FaPlaneDeparture className="text-sm" />;
      case "bus":
        return <FaBus className="text-sm" />;
      case "car":
      case "cab":
        return <FaCar className="text-sm" />;
      case "train":
      default:
        return <FaTrainSubway className="text-sm" />;
    }
  };

  // Default fallback curated images for days if needed
  const fallbackImages = [
    "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80",
    "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800&q=80",
    "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?w=800&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80",
  ];

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-4xl mx-auto">
      {/* 1. USER PROMPT ECHO (ChatGPT / Claude style) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-5 sm:p-6 shadow-xs"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0c0a09] text-white text-xs font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : <FiUser className="text-sm" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777169]">
                User Request
              </span>
              <span className="text-[11px] text-[#a8a29e]">
                Prompt submitted
              </span>
            </div>

            <p className="text-sm sm:text-base font-normal text-[#0c0a09] leading-relaxed">
              &ldquo;Plan a customized{" "}
              <span className="font-semibold text-[#034F46]">{durationText}</span> trip from{" "}
              <span className="font-semibold">{trip.source}</span> to{" "}
              <span className="font-semibold">{trip.destination}</span> for{" "}
              <span className="font-semibold">{trip.travelers || 2} travelers</span> with a budget
              of{" "}
              <span className="font-semibold">
                {trip.currency || "INR"} {Number(trip.budget || 0).toLocaleString()}
              </span>
              , traveling by <span className="font-semibold">{trip.travelMode || "Train"}</span>,
              seeking a <span className="font-semibold">{trip.tripType || "Leisure"}</span> journey
              {trip.interests && trip.interests.length > 0
                ? ` focused on ${trip.interests.join(", ")}`
                : ""}.&rdquo;
            </p>

            {/* Quick Pills */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-2 border-t border-[#e7e5e4]/70 text-[11px] text-[#44403c]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                <FiMapPin className="text-[#034F46]" />
                {trip.source} → {trip.destination}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                <FiCalendar className="text-[#034F46]" />
                {durationText}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                <FiUsers className="text-[#034F46]" />
                {trip.travelers || 2} Travelers
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                <FiDollarSign className="text-[#034F46]" />
                {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                {getTransitIcon(trip.travelMode)}
                {trip.travelMode || "Train"}
              </span>
              {trip.hotelType && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e7e5e4] px-2.5 py-1 font-medium shadow-xs">
                  <FaHotel className="text-[#034F46]" />
                  {trip.hotelType}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. AI RESPONSE HEADER (Claude / ChatGPT style) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs"
      >
        {/* AI Assistant Identity Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#e7e5e4]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034F46] text-white shadow-xs">
              <FaWandMagicSparkles className="text-base" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0c0a09]">Transix Travel AI</h2>
                <span className="rounded-full bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
                  Masterplan Synthesized
                </span>
              </div>
              <p className="text-xs text-[#777169]">
                Powered by Gemini 3.6 Flash & Real-Time Transit Data
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyItinerary}
              title="Copy Itinerary text"
              className="flex items-center gap-1.5 rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#44403c] transition hover:bg-[#f5f5f5] active:scale-95"
            >
              {copied ? <FiCheck className="text-emerald-600 text-xs" /> : <FiCopy className="text-xs" />}
              <span>{copied ? "Copied" : "Copy Plan"}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              title="Share Itinerary"
              className="flex items-center gap-1.5 rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#44403c] transition hover:bg-[#f5f5f5] active:scale-95"
            >
              <FiShare2 className="text-xs" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Hero Editorial Narrative */}
        <div className="mt-6">
          <h1
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="text-2xl sm:text-3xl font-[400] tracking-tight text-[#0c0a09] leading-tight"
          >
            A Curated {durationText} Odyssey: {trip.source} to {trip.destination}
          </h1>

          <div className="mt-4 prose max-w-none text-[#292524] text-sm sm:text-base leading-relaxed space-y-3">
            <p>
              {trip.summary ||
                `Welcome to your personalized ${trip.destination} masterplan. We have synthesized an optimal day-by-day route tailored for ${trip.travelers || 2} travelers, harmonizing ${trip.tripType || "balanced exploration"} with ${trip.foodPreference || "authentic"} cuisine, relaxed pacing, and efficient transit from ${trip.source}.`}
            </p>
            <p className="text-xs sm:text-sm text-[#777169]">
              Below you will find your day-by-day sequence of attractions, transit connections,
              curated stays, and essential insider tips for the region.
            </p>
          </div>
        </div>

        {/* Highlight Image Banner (Visual Interlude) */}
        {trip.heroImage && (
          <div className="mt-6 relative h-64 sm:h-80 w-full overflow-hidden rounded-xl border border-[#e7e5e4]">
            <img
              src={trip.heroImage}
              alt={trip.destination}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Featured Destination
                </span>
                <h3 className="text-lg sm:text-xl font-bold">{trip.destination}</h3>
              </div>
              <span className="text-xs font-medium text-white/90 bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
                {trip.source} → {trip.destination}
              </span>
            </div>
          </div>
        )}

        {/* Key Metrics Row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#e7e5e4]">
          <div className="rounded-xl border border-[#f0efed] bg-[#fafaf9] p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169] block mb-1">
              Duration & Dates
            </span>
            <span className="text-sm font-semibold text-[#0c0a09] block">
              {durationText}
            </span>
            <span className="text-[11px] text-[#777169]">
              {trip.startDate ? formatDate(trip.startDate) : "Flexible Start"}
            </span>
          </div>

          <div className="rounded-xl border border-[#f0efed] bg-[#fafaf9] p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169] block mb-1">
              Transit Route
            </span>
            <span className="text-sm font-semibold text-[#0c0a09] flex items-center gap-1.5">
              {getTransitIcon(trip.travelMode)}
              {trip.travelMode || "Train"}
            </span>
            <span className="text-[11px] text-[#777169] truncate">
              {trip.source} to {trip.destination}
            </span>
          </div>

          <div className="rounded-xl border border-[#f0efed] bg-[#fafaf9] p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169] block mb-1">
              Target Budget
            </span>
            <span className="text-sm font-semibold text-[#0c0a09] block">
              {trip.currency || "₹"} {Number(trip.budget || 0).toLocaleString()}
            </span>
            <span className="text-[11px] text-[#777169]">
              {trip.travelers || 2} Travelers
            </span>
          </div>

          <div className="rounded-xl border border-[#f0efed] bg-[#fafaf9] p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169] block mb-1">
              Travel Vibe
            </span>
            <span className="text-sm font-semibold text-[#0c0a09] block">
              {trip.tripType || "Leisure"}
            </span>
            <span className="text-[11px] text-[#777169] truncate">
              {trip.interests && trip.interests.length > 0
                ? trip.interests.slice(0, 2).join(", ")
                : "Sightseeing"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. TRANSIT & LOGISTICS INTELLIGENCE (Text + Transit Card) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#034F46]/10 text-[#034F46]">
            {getTransitIcon(trip.travelMode)}
          </span>
          <h2 className="text-lg font-bold text-[#0c0a09]">
            Transit & Journey Logistics
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-[#57534e] leading-relaxed mb-5">
          For travel between <span className="font-semibold text-[#0c0a09]">{trip.source}</span> and{" "}
          <span className="font-semibold text-[#0c0a09]">{trip.destination}</span>, taking the{" "}
          <span className="font-semibold text-[#0c0a09]">{trip.travelMode || "train"}</span> provides
          the ideal balance of scenic value, group connectivity, and cost optimization.
        </p>

        {/* Transit Card Details */}
        {inventory.trainOption ? (
          <div className="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 mb-1">
                  <FiCheck className="text-xs" /> Top Recommended Transit
                </span>
                <h3 className="text-base font-bold text-[#0c0a09]">
                  {inventory.trainOption.operator || inventory.trainOption.trainName}
                </h3>
              </div>
              {inventory.trainOption.price && (
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[#777169] block">
                    Estimated Fare
                  </span>
                  <span className="text-base font-bold text-[#034F46]">
                    ₹{Number(inventory.trainOption.price).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[#57534e] pt-3 border-t border-[#e7e5e4]">
              <div>
                <span className="text-[10px] text-[#777169] block">Departure</span>
                <span className="font-semibold text-[#0c0a09]">
                  {inventory.trainOption.departure || "06:00 AM"}
                </span>
                <span className="text-[11px] text-[#a8a29e] block truncate">
                  {inventory.trainOption.from || trip.source}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#777169] block">Arrival</span>
                <span className="font-semibold text-[#0c0a09]">
                  {inventory.trainOption.arrival || "10:45 PM"}
                </span>
                <span className="text-[11px] text-[#a8a29e] block truncate">
                  {inventory.trainOption.to || trip.destination}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#777169] block">Duration</span>
                <span className="font-semibold text-[#0c0a09]">
                  {inventory.trainOption.duration || "16h 45m"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#777169] block">Service Rating</span>
                <span className="font-semibold text-[#0c0a09] flex items-center gap-1">
                  <FiStar className="text-amber-500 fill-amber-500 text-xs" /> 4.8 / 5.0
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-[#e7e5e4] text-[#034F46]">
                {getTransitIcon(trip.travelMode)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0c0a09]">
                  Direct {trip.travelMode || "Train"} Route ({trip.source} → {trip.destination})
                </h4>
                <p className="text-xs text-[#777169]">
                  Multiple daily scheduled departures available. Average transit time: 14–18 hours.
                </p>
              </div>
            </div>
            <Link
              to="/trains"
              className="text-xs font-semibold text-[#034F46] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View Schedules</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </div>
        )}
      </motion.div>

      {/* 4. DAY-BY-DAY MASTERPLAN (Hybrid Text Narrative + Inline Images) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        className="rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#034F46]">
              Detailed Masterplan
            </span>
            <h2 className="text-xl font-bold text-[#0c0a09]">
              Day-by-Day Journey Itinerary
            </h2>
            <p className="text-xs text-[#777169] mt-0.5">
              Structured chronological timetable combining cultural landmarks, dining, and scenic views
            </p>
          </div>

          {/* Day Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              type="button"
              onClick={() => setSelectedDay("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                selectedDay === "all"
                  ? "bg-[#0c0a09] text-white shadow-xs"
                  : "bg-[#f5f5f5] text-[#57534e] hover:bg-[#e7e5e4]"
              }`}
            >
              All Days ({itinerary.length})
            </button>
            {itinerary.map((day) => (
              <button
                key={day.day}
                type="button"
                onClick={() => setSelectedDay(day.day)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition shrink-0 ${
                  selectedDay === day.day
                    ? "bg-[#0c0a09] text-white shadow-xs"
                    : "bg-[#f5f5f5] text-[#57534e] hover:bg-[#e7e5e4]"
                }`}
              >
                Day {day.day}
              </button>
            ))}
          </div>
        </div>

        {/* Days List */}
        <div className="space-y-8">
          {itinerary
            .filter((day) => selectedDay === "all" || selectedDay === day.day)
            .map((day, dayIndex) => {
              const dayImg = fallbackImages[dayIndex % fallbackImages.length];

              return (
                <div
                  key={day.day}
                  className="rounded-2xl border border-[#e7e5e4] bg-[#fafaf9] p-5 sm:p-6 transition-all hover:border-[#d6d3d1]"
                >
                  {/* Day Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#e7e5e4]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#034F46] text-white text-xs font-bold shadow-xs">
                        {day.day}
                      </span>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-[#0c0a09]">
                          {day.title || `Day ${day.day}: Exploration of ${trip.destination}`}
                        </h3>
                        <span className="text-[11px] text-[#777169]">
                          {day.plan?.length || 0} Curated Experiences Scheduled
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Day Content: Split Grid (Left: Timeline Activities, Right: Day Image & Notes) */}
                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Activity Timeline (8 Cols) */}
                    <div className="lg:col-span-8 space-y-4">
                      {(day.plan || []).map((activity, actIdx) => (
                        <div
                          key={actIdx}
                          className="relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-0 before:w-px before:bg-[#d6d3d1] last:before:hidden"
                        >
                          {/* Dot */}
                          <div className="absolute left-0.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#034F46] shadow-xs" />

                          <div className="rounded-xl border border-[#e7e5e4] bg-white p-3.5 shadow-2xs">
                            <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#f5f5f4] px-2 py-0.5 text-[10px] font-semibold text-[#57534e]">
                                <FiClock className="text-[10px] text-[#034F46]" />
                                {activity.time || "Scheduled"}
                              </span>

                              {activity.estimatedCost && (
                                <span className="text-[11px] font-semibold text-[#034F46]">
                                  {activity.estimatedCost}
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-[#0c0a09]">
                              {activity.activity}
                            </h4>

                            <p className="text-xs text-[#57534e] flex items-center gap-1 mt-0.5">
                              <FiMapPin className="text-[#a8a29e] text-[11px] shrink-0" />
                              <span className="truncate">{activity.place}</span>
                              {activity.duration && (
                                <span className="text-[#a8a29e]">
                                  • {activity.duration}
                                </span>
                              )}
                            </p>

                            {activity.notes && (
                              <p className="mt-2 text-xs text-[#777169] bg-[#fafaf9] rounded-lg p-2 border border-[#f0efed] leading-relaxed">
                                <span className="font-semibold text-[#44403c]">Insider Tip: </span>
                                {activity.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Day Visual Accent & Summary (4 Cols) */}
                    <div className="lg:col-span-4 flex flex-col gap-3">
                      <div className="relative h-44 w-full overflow-hidden rounded-xl border border-[#e7e5e4] shadow-xs">
                        <img
                          src={dayImg}
                          alt={day.title || `Day ${day.day}`}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-2.5 left-3 right-3 text-white text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Day {day.day} Highlight
                          </span>
                          <p className="font-semibold truncate">
                            {day.plan?.[0]?.place || trip.destination}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#e7e5e4] bg-white p-3 text-xs text-[#57534e]">
                        <div className="flex items-center gap-1.5 font-semibold text-[#0c0a09] mb-1">
                          <FiInfo className="text-[#034F46]" />
                          <span>Day Highlights</span>
                        </div>
                        <p className="text-[11px] text-[#777169] leading-relaxed">
                          Includes {day.plan?.length || 4} stops with optimized 20-30 minute travel
                          buffers between locations.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </motion.div>

      {/* 5. CURATED STAYS & DINING (Text + Cards) */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#034F46]/10 text-[#034F46]">
            <FaHotel className="text-xs" />
          </span>
          <h2 className="text-lg font-bold text-[#0c0a09]">
            Recommended Accommodations in {trip.destination}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#57534e] mb-5 leading-relaxed">
          Based on your <span className="font-semibold text-[#0c0a09]">{trip.hotelType || "Standard"}</span>{" "}
          preference, here are verified options near key sights with top ratings:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(inventory.hotels.length > 0 ? inventory.hotels.slice(0, 3) : [
            {
              name: `The Grand Palace Hotel`,
              location: `Central ${trip.destination}`,
              displayPrice: `₹4,200/night`,
              rating: 4.8,
              image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600",
            },
            {
              name: `${trip.destination} Heritage Residency`,
              location: `Old Town District`,
              displayPrice: `₹3,400/night`,
              rating: 4.6,
              image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600",
            },
            {
              name: `City Center Suites`,
              location: `Near Transit Station`,
              displayPrice: `₹2,800/night`,
              rating: 4.5,
              image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
            },
          ]).map((hotel, idx) => (
            <div
              key={hotel.id || idx}
              className="rounded-xl border border-[#e7e5e4] bg-[#fafaf9] overflow-hidden shadow-2xs hover:border-[#d6d3d1] transition flex flex-col"
            >
              <div className="relative h-36 w-full">
                <img
                  src={hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600"}
                  alt={hotel.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#0c0a09] shadow-xs flex items-center gap-1">
                  <FiStar className="text-amber-500 fill-amber-500 text-[10px]" />
                  {hotel.rating || 4.7}
                </div>
              </div>

              <div className="p-3.5 flex flex-col flex-1 justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#0c0a09] line-clamp-1">
                    {hotel.name}
                  </h4>
                  <p className="text-[11px] text-[#777169] line-clamp-1 mt-0.5 flex items-center gap-1">
                    <FiMapPin className="text-[10px]" />
                    {hotel.location || trip.destination}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#e7e5e4] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#034F46]">
                    {hotel.displayPrice || "₹3,500/night"}
                  </span>
                  <span className="text-[10px] text-[#777169]">
                    Verified Stay
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 6. AI TRAVEL ADVISORY & BUDGET ALLOCATION */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.3 }}
        className="rounded-2xl border border-[#e7e5e4] bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: AI Practical Tips */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#034F46]/10 text-[#034F46]">
                <FiInfo className="text-xs" />
              </span>
              <h3 className="text-base font-bold text-[#0c0a09]">
                AI Travel Advisory & Tips
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-[#57534e]">
              {(trip.tips && trip.tips.length > 0 ? trip.tips : [
                "Book monument and museum tickets online in advance to bypass queues.",
                "Carry cash for local bazaars, street snacks, and auto rickshaws.",
                "Use the local metro during peak hours for reliable navigation.",
                "Stay hydrated and prefer filtered water when trying street delicacies.",
              ]).map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <FiCheckCircle className="text-[#034F46] shrink-0 mt-0.5 text-sm" />
                  <span className="leading-relaxed">{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Budget Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#034F46]/10 text-[#034F46]">
                <FiDollarSign className="text-xs" />
              </span>
              <h3 className="text-base font-bold text-[#0c0a09]">
                Estimated Budget Allocation
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#fafaf9] border border-[#f0efed]">
                <span className="text-[#57534e]">Transit & Commute</span>
                <span className="font-semibold text-[#0c0a09]">
                  {trip.budgetBreakdown?.travel || "~30%"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#fafaf9] border border-[#f0efed]">
                <span className="text-[#57534e]">Hotels & Stays</span>
                <span className="font-semibold text-[#0c0a09]">
                  {trip.budgetBreakdown?.stay || "~35%"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#fafaf9] border border-[#f0efed]">
                <span className="text-[#57534e]">Dining & Local Food</span>
                <span className="font-semibold text-[#0c0a09]">
                  {trip.budgetBreakdown?.food || "~20%"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#fafaf9] border border-[#f0efed]">
                <span className="text-[#57534e]">Activities, Entry Fees & Misc</span>
                <span className="font-semibold text-[#0c0a09]">
                  {trip.budgetBreakdown?.misc || "~15%"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 7. GRAND FINALE ACTION (SHIFTED FROM SIDEBAR TO MAIN PAGE AFTER RESULT) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl border border-[#0c0a09] bg-[#0c0a09] p-8 sm:p-10 text-white shadow-xl text-center flex flex-col items-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-xs border border-white/10 mb-3">
          <FaWandMagicSparkles className="text-xs" />
          Masterplan Complete
        </span>

        <h2
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="text-2xl sm:text-4xl font-[400] tracking-tight max-w-xl text-white leading-tight"
        >
          Ready to Customize and Build Your Tour?
        </h2>

        <p className="mt-3 text-xs sm:text-sm text-stone-300 max-w-lg leading-relaxed">
          Your travel itinerary is ready. Step into the Tour Builder to customize time slots,
          select hotels, adjust activities, and finalize your booking package.
        </p>

        {/* Primary and Secondary CTA Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/builder"
            className="flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-[#0c0a09] shadow-md transition hover:bg-[#fafaf9] hover:scale-[1.02] active:scale-[0.98]"
          >
            <FiLayers className="text-sm" />
            <span>Build My Tour</span>
            <FiArrowRight className="text-sm" />
          </Link>

          <button
            type="button"
            onClick={openMapModal}
            className="flex items-center gap-2 rounded-full border border-stone-700 bg-stone-900/80 px-5 py-3.5 text-xs font-medium text-stone-200 transition hover:bg-stone-800 hover:text-white"
          >
            <FiMap className="text-xs" />
            <span>Explore Map</span>
          </button>

          <button
            type="button"
            onClick={handlePlanAnother}
            className="flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-900/80 px-5 py-3.5 text-xs font-medium text-stone-200 transition hover:bg-stone-800 hover:text-white"
          >
            <FiPlus className="text-xs" />
            <span>Plan Another Trip</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
