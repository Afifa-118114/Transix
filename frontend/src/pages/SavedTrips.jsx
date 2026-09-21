import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiSearch,
  FiTrash2,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiUsers,
  FiMapPin,
  FiShare2,
  FiLayers,
  FiSliders,
  FiCheckCircle,
} from "react-icons/fi";
import {
  FaTrainSubway,
  FaPlaneDeparture,
  FaCompass,
  FaRoute,
  FaHotel,
  FaWandMagicSparkles,
} from "react-icons/fa6";
import toast from "react-hot-toast";

import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import { getAllTrips, deleteTrip as apiDeleteTrip } from "../api/tripApi";

// Curated starter journeys for instant exploration
const STARTER_JOURNEYS = [
  {
    _id: "curated-konkan-01",
    id: "curated-konkan-01",
    source: "Mumbai",
    destination: "Goa & Kanyakumari",
    tripName: "Konkan Coastal Rail Expedition",
    startDate: "2026-10-15",
    endDate: "2026-10-21",
    duration: 6,
    travelers: 2,
    budget: 42000,
    travelMode: "Train",
    hotelType: "Heritage & Boutique",
    coverImage:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80",
    highlights: [
      "Vande Bharat scenic transit through Western Ghats",
      "Sunset heritage walk along Old Goa cathedrals",
      "Private backwater cruise & spice plantation",
    ],
    status: "Curated Route",
  },
  {
    _id: "curated-rajasthan-02",
    id: "curated-rajasthan-02",
    source: "Delhi",
    destination: "Jaipur & Udaipur",
    tripName: "Royal Rajputana Heritage Odyssey",
    startDate: "2026-11-04",
    endDate: "2026-11-09",
    duration: 5,
    travelers: 2,
    budget: 58000,
    travelMode: "Train",
    hotelType: "Palace Luxury",
    coverImage:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=80",
    highlights: [
      "Shatabdi Express morning transit to Pink City",
      "Amber Fort private evening light & sound tour",
      "Lake Pichola boat voyage & City Palace visit",
    ],
    status: "Curated Route",
  },
];

export default function SavedTrips() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { trip, setTrip } = useTripBuilder();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all"); // all, Train, Flight
  const [sortBy, setSortBy] = useState("newest"); // newest, duration, budget

  useEffect(() => {
    async function loadTrips() {
      try {
        setLoading(true);
        let loadedTrips = [];

        // 1. Fetch from backend if token present
        if (token) {
          try {
            const data = await getAllTrips(token);
            if (data?.trips && Array.isArray(data.trips) && data.trips.length > 0) {
              loadedTrips = data.trips;
            }
          } catch (err) {
            console.warn("Backend trips fetch error, falling back to local storage:", err);
          }
        }

        // 2. Load from localStorage
        const stored = localStorage.getItem("transix_saved_trips");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Merge avoiding duplicates by id/_id
              const existingIds = new Set(loadedTrips.map((t) => t._id || t.id));
              parsed.forEach((t) => {
                const tid = t._id || t.id;
                if (!existingIds.has(tid)) {
                  loadedTrips.push(t);
                  existingIds.add(tid);
                }
              });
            }
          } catch (e) {
            console.warn("Failed to parse local stored trips:", e);
          }
        }

        // 3. Include current active context trip if not already in list
        if (trip && (trip.destination || trip.source)) {
          const tripId = trip._id || trip.id || "active-current-trip";
          const alreadyPresent = loadedTrips.some((t) => (t._id || t.id) === tripId);
          if (!alreadyPresent) {
            loadedTrips.unshift({
              ...trip,
              _id: tripId,
              id: tripId,
              status: "Current Active Tour",
            });
          }
        }

        // 4. If still empty, supply curated starter journeys
        if (loadedTrips.length === 0) {
          loadedTrips = [...STARTER_JOURNEYS];
        }

        setTrips(loadedTrips);
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [token, trip]);

  // Delete trip handler
  const handleDeleteTrip = async (tripToDelete, e) => {
    e.stopPropagation();
    const id = tripToDelete._id || tripToDelete.id;

    if (!window.confirm(`Delete "${tripToDelete.destination || tripToDelete.tripName || "this trip"}"?`)) {
      return;
    }

    try {
      if (token && tripToDelete._id && !tripToDelete._id.startsWith("curated-")) {
        await apiDeleteTrip(tripToDelete._id, token);
      }
    } catch (err) {
      console.warn("API delete error:", err);
    }

    // Update local state
    const updated = trips.filter((t) => (t._id || t.id) !== id);
    setTrips(updated);

    // Update localStorage
    try {
      localStorage.setItem("transix_saved_trips", JSON.stringify(updated));
    } catch (e) {
      // ignore
    }

    toast.success("Trip removed from saved expeditions.");
  };

  // Open in Tour Builder
  const handleOpenInBuilder = (selectedTrip) => {
    setTrip(selectedTrip);
    navigate("/builder");
  };

  // Open Detailed Itinerary
  const handleOpenItinerary = (selectedTrip) => {
    setTrip(selectedTrip);
    const id = selectedTrip._id || selectedTrip.id || "view";
    navigate(`/itinerary/${id}`);
  };

  // Filtered & Sorted trips
  const filteredTrips = useMemo(() => {
    return trips
      .filter((t) => {
        const dest = (t.destination || t.tripName || "").toLowerCase();
        const src = (t.source || "").toLowerCase();
        const matchesQuery =
          dest.includes(searchQuery.toLowerCase()) || src.includes(searchQuery.toLowerCase());

        const matchesMode =
          modeFilter === "all" ||
          (t.travelMode || "").toLowerCase() === modeFilter.toLowerCase();

        return matchesQuery && matchesMode;
      })
      .sort((a, b) => {
        if (sortBy === "duration") {
          return (b.duration || b.durationDays || 0) - (a.duration || a.durationDays || 0);
        }
        if (sortBy === "budget") {
          return (b.budget || 0) - (a.budget || 0);
        }
        return 0; // Default newest
      });
  }, [trips, searchQuery, modeFilter, sortBy]);

  // Overall Statistics
  const totalDays = useMemo(() => {
    return trips.reduce((sum, t) => sum + (t.duration || t.durationDays || 4), 0);
  }, [trips]);

  const totalBudget = useMemo(() => {
    return trips.reduce((sum, t) => sum + (t.budget || 35000), 0);
  }, [trips]);

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-screen bg-white text-stone-900 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#034F46]/10 text-[#034F46]">
                  <FaCompass className="text-sm" />
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                  Saved Expeditions
                </h1>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Manage your saved multi-modal itineraries, scenic rail corridors, and custom tour packages
              </p>
            </div>

            {/* Plan New Journey CTA */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTrip(null);
                  navigate("/planner");
                }}
                className="flex items-center gap-2 rounded-xl bg-[#034F46] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#023c35]"
              >
                <FiPlus className="text-sm" />
                <span>Plan New Journey</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Saved Trips
                </span>
                <FaRoute className="text-stone-400 text-sm" />
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-stone-900">
                {trips.length}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Ready for execution</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Days Planned
                </span>
                <FiCalendar className="text-stone-400 text-sm" />
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-stone-900">
                {totalDays} Days
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Across verified corridors</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Primary Mode
                </span>
                <FaTrainSubway className="text-stone-400 text-sm" />
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-[#034F46]">
                Rail Express
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Zero carbon transit</p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Estimated Outlay
                </span>
                <span className="text-xs font-bold text-stone-400">INR</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-stone-900">
                ₹{totalBudget.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">Includes stays & transit</p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by destination or city..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50/60 pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-[#034F46] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Filter Buttons & Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">
                <button
                  onClick={() => setModeFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    modeFilter === "all"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  All Modes
                </button>
                <button
                  onClick={() => setModeFilter("Train")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    modeFilter === "Train"
                      ? "bg-white text-[#034F46] shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <FaTrainSubway className="text-[10px]" />
                  <span>Rail</span>
                </button>
                <button
                  onClick={() => setModeFilter("Flight")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    modeFilter === "Flight"
                      ? "bg-white text-stone-900 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <FaPlaneDeparture className="text-[10px]" />
                  <span>Air</span>
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-1.5 text-xs font-semibold text-stone-700 focus:border-[#034F46] focus:outline-none"
              >
                <option value="newest">Latest Added</option>
                <option value="duration">Longest Duration</option>
                <option value="budget">Highest Budget</option>
              </select>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="mt-12 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#034F46] border-t-transparent mb-3" />
              <p className="text-xs text-stone-500">Loading your saved journeys...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredTrips.length === 0 && (
            <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-stone-50/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-200 text-stone-500 mb-3">
                <FaCompass className="text-xl" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800">
                No expeditions match your criteria
              </h3>
              <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                No saved trips found with your search filters. Clear your filters or generate a fresh multi-modal itinerary.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setModeFilter("all");
                }}
                className="mt-4 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Reset Search Filters
              </button>
            </div>
          )}

          {/* Cards Grid */}
          {!loading && filteredTrips.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((savedTrip, index) => {
                const tripId = savedTrip._id || savedTrip.id || `trip-${index}`;
                const title =
                  savedTrip.tripName ||
                  `${savedTrip.destination || "Scenic Expedition"} Route`;
                const routeString = `${savedTrip.source || "Origin"} → ${savedTrip.destination || "Destination"}`;
                const durationDays = savedTrip.duration || savedTrip.durationDays || 4;
                const travelers = savedTrip.travelers || 2;
                const budget = savedTrip.budget || 35000;
                const image =
                  savedTrip.coverImage ||
                  "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={tripId}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:border-stone-300 hover:shadow-md"
                  >
                    {/* Top Image Banner */}
                    <div className="relative h-44 w-full overflow-hidden bg-stone-900">
                      <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                      {/* Badges */}
                      <div className="absolute left-3 top-3 flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-semibold text-stone-900 shadow-2xs">
                          <FaTrainSubway className="text-[10px] text-[#034F46]" />
                          <span>{savedTrip.travelMode || "Rail"}</span>
                        </span>
                        {savedTrip.status && (
                          <span className="rounded-full bg-[#034F46] px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                            {savedTrip.status}
                          </span>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDeleteTrip(savedTrip, e)}
                        className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-xs text-white/80 transition hover:bg-rose-600 hover:text-white"
                        title="Delete Journey"
                      >
                        <FiTrash2 className="text-xs" />
                      </button>

                      {/* Bottom Banner Info */}
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <p className="text-[10px] font-medium text-stone-300 flex items-center gap-1">
                          <FiMapPin className="text-[10px] text-stone-300" />
                          <span>{routeString}</span>
                        </p>
                        <h3 className="font-serif text-base font-bold text-white line-clamp-1">
                          {title}
                        </h3>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      {/* Meta Tags */}
                      <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-3">
                        <div className="flex items-center gap-1.5">
                          <FiClock className="text-stone-400 text-xs" />
                          <span>{durationDays} Days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FiUsers className="text-stone-400 text-xs" />
                          <span>{travelers} Travelers</span>
                        </div>
                        <div className="font-bold text-[#034F46]">
                          ₹{budget.toLocaleString()}
                        </div>
                      </div>

                      {/* Highlights */}
                      {savedTrip.highlights && savedTrip.highlights.length > 0 && (
                        <div className="space-y-1 text-xs text-stone-600">
                          {savedTrip.highlights.slice(0, 2).map((hl, i) => (
                            <div key={i} className="flex items-start gap-1.5 line-clamp-1">
                              <span className="text-[#034F46] text-xs mt-0.5">•</span>
                              <span className="truncate">{hl}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenItinerary(savedTrip)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
                        >
                          <span>Itinerary</span>
                          <FiArrowRight className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleOpenInBuilder(savedTrip)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#034F46]/30 bg-[#034F46]/[0.05] py-2 text-xs font-semibold text-[#034F46] transition hover:bg-[#034F46] hover:text-white"
                        >
                          <FiLayers className="text-xs" />
                          <span>Tour Builder</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
