import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SAMPLE_TRIPS } from "../../data/sampleTripsData";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import {
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiMapPin,
  FiInfo,
  FiClock,
  FiHome,
  FiShield,
  FiCheck
} from "react-icons/fi";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function SampleItineraryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const trip = useMemo(() => {
    return (
      SAMPLE_TRIPS.find((t) => t.id === id || t._id === id) || SAMPLE_TRIPS[0]
    );
  }, [id]);

  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const handleGenerateSimilar = () => {
    // Clear any stale trip state so TripPlanner opens the fresh questionnaire
    try {
      localStorage.removeItem("currentTrip");
      localStorage.removeItem("transix_builder_trip");
    } catch (_) {}

    const planIntent = {
      destination: trip.destination,
      duration: `${trip.durationDays || 7} days`,
      travelers: `${trip.travelers || 2} people`,
      budget: trip.budget || 50000,
      travelMode: trip.travelMode || "Train",
      timestamp: Date.now(),
      autoGenerate: false, // User enters & refines their preferences in the existing planner!
    };

    sessionStorage.setItem("transix_pending_plan", JSON.stringify(planIntent));
    navigate("/planner");
  };

  const currentDay = trip.itinerary[selectedDayIdx] || trip.itinerary[0];

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col justify-between">
      <PublicNavbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        {/* Top Back Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/#sample-trips"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition"
          >
            <FiArrowLeft className="text-base" />
            <span>Back to All Sample Trips</span>
          </Link>

          {/* Generate Similar Trip Button */}
          <button
            onClick={handleGenerateSimilar}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/25 active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Generate Similar Trip</span>
          </button>
        </div>

        {/* Clear Sample / Demo Notice Banner */}
        <div className="mb-8 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
          <div className="h-8 w-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <FiInfo className="text-lg" />
          </div>
          <div className="flex-1 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            <p className="font-bold mb-0.5">PUBLIC SAMPLE ITINERARY — DEMONSTRATION RECORD</p>
            <p className="text-amber-800/90 dark:text-amber-300/80 text-xs leading-relaxed">
              This is a read-only showcase itinerary created to illustrate Transix day-by-day scheduling, stay allocation, and activity mapping. No actual booking, inventory hold, or financial transaction is tied to this record.
            </p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] mb-10">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <img
              src={trip.heroImage}
              alt={trip.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>

            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-bold text-slate-800 dark:text-white">
                {trip.tag}
              </span>
            </div>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 mb-1">
                <FiMapPin className="text-sm" />
                <span>{trip.source} → {trip.destination}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2">
                {trip.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-light">
                {trip.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 text-center">
            <div className="pt-2 sm:pt-0">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{trip.duration}</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Travelers</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{trip.travelers} Guests</span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Budget</span>
              <span className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                {trip.currency}{trip.budget?.toLocaleString()}
              </span>
            </div>
            <div className="pt-2 sm:pt-0 sm:pl-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Travel Mode</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{trip.travelMode}</span>
            </div>
          </div>
        </div>

        {/* Day-Wise Navigation Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
              Day-by-Day Itinerary Schedule
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing Day {selectedDayIdx + 1} of {trip.itinerary.length}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {trip.itinerary.map((dayItem, index) => (
              <button
                key={index}
                onClick={() => setSelectedDayIdx(index)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedDayIdx === index
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-102"
                    : "bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-400"
                }`}
              >
                Day {dayItem.day}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Activities for Selected Day */}
        <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs mb-10">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Day {currentDay.day}
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {currentDay.title}
            </h3>
          </div>

          <div className="relative pl-6 sm:pl-8 border-l-2 border-indigo-100 dark:border-indigo-900/50 space-y-8">
            {currentDay.plan.map((act, i) => (
              <div key={i} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-[31px] sm:-left-[39px] top-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] shadow-sm">
                  <FiClock className="text-xs" />
                </div>

                <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {act.time}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/60">
                      {act.category || "Activity"}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {act.activity}
                  </p>
                  {act.location && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <FiMapPin className="text-xs text-indigo-500" />
                      <span>{act.location}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accommodation & Stays Overview */}
        {trip.staySegments && trip.staySegments.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FiHome className="text-indigo-600 dark:text-indigo-400" />
              Sample Accommodations & Stays
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {trip.staySegments.map((seg, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{seg.location}</span>
                      <span>{seg.nights} Nights</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                      {seg.selectedHotel?.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Rating: ⭐ {seg.selectedHotel?.rating} · Approx ₹{seg.selectedHotel?.pricePerNight?.toLocaleString()}/night
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-medium">
                    Sample accommodation recommendation
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom CTA to generate similar trip */}
        <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white text-center flex flex-col items-center">
          <h3 className="text-2xl font-bold mb-2">Like this style of journey?</h3>
          <p className="text-sm text-indigo-200/80 max-w-md mb-6">
            Generate your own customized itinerary for {trip.destination} with personal dates, budgets, and guest preferences.
          </p>
          <button
            onClick={handleGenerateSimilar}
            className="px-6 py-3.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-sm shadow-lg active:scale-95 transition cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Generate Similar Trip</span>
          </button>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
