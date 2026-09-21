import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiSearch,
  FiTrash2,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiUsers,
  FiMapPin,
  FiDollarSign,
  FiLayers,
} from "react-icons/fi";
import {
  FaTrainSubway,
  FaPlaneDeparture,
  FaCompass,
  FaRoute,
} from "react-icons/fa6";
import toast from "react-hot-toast";

import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import { getUserTrips, getAllTrips, deleteTrip as apiDeleteTrip } from "../api/tripApi";
import { formatDate } from "../utils/formatTrip";

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
    heroImage:
      "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=1200&auto=format&fit=crop&q=80",
    status: "Curated Route",
    tripCategory: "PERSONAL",
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
    heroImage:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&auto=format&fit=crop&q=80",
    status: "Curated Route",
    tripCategory: "PERSONAL",
  },
];

export default function SavedTrips() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { trip, setTrip } = useTripBuilder();

  const [personalTrips, setPersonalTrips] = useState([]);
  const [campusTrips, setCampusTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [modeFilter, setModeFilter] = useState("all"); // all, Train, Flight
  const [sortBy, setSortBy] = useState("newest"); // newest, duration, budget

  useEffect(() => {
    async function loadTrips() {
      try {
        setLoading(true);
        setError(null);
        const authToken = token || localStorage.getItem("token");

        let fetchedPersonal = [];
        let fetchedCampus = [];

        if (authToken) {
          const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
          const apiBase = API.replace(/\/api$/, "");

          try {
            const [tripsRes, campusRes] = await Promise.all([
              getUserTrips(authToken).catch(() => getAllTrips(authToken)).catch(() => ({ success: false })),
              fetch(`${apiBase}/api/campus-trips`, {
                headers: { Authorization: `Bearer ${authToken}` },
              }).then((res) => res.json()).catch(() => ({ success: false })),
            ]);

            let allTrips = [];
            let partTrips = [];

            if (tripsRes?.success && Array.isArray(tripsRes.trips)) {
              allTrips = tripsRes.trips;
            } else if (Array.isArray(tripsRes?.trips)) {
              allTrips = tripsRes.trips;
            }

            if (campusRes?.success) {
              partTrips = campusRes.participatedTrips || [];
            }

            const pTrips = allTrips.filter((t) => t.tripCategory !== "CAMPUS");
            const cTrips = allTrips.filter((t) => t.tripCategory === "CAMPUS");

            const combinedCampusMap = new Map();
            cTrips.forEach((t) => {
              t._relation = "COORDINATOR";
              combinedCampusMap.set(t._id, t);
            });
            partTrips.forEach((t) => {
              if (!combinedCampusMap.has(t._id)) {
                t._relation = "PARTICIPANT";
                combinedCampusMap.set(t._id, t);
              }
            });

            fetchedPersonal = pTrips;
            fetchedCampus = Array.from(combinedCampusMap.values());
          } catch (err) {
            console.warn("Backend trips fetch error:", err);
          }
        }

        // LocalStorage fallback for personal trips
        const stored = localStorage.getItem("transix_saved_trips");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const existingIds = new Set(fetchedPersonal.map((t) => t._id || t.id));
              parsed.forEach((t) => {
                const tid = t._id || t.id;
                if (!existingIds.has(tid)) {
                  fetchedPersonal.push(t);
                  existingIds.add(tid);
                }
              });
            }
          } catch (e) {
            console.warn("Failed to parse local stored trips:", e);
          }
        }

        // Include current active context trip if not already present
        if (trip && (trip.destination || trip.source)) {
          const tripId = trip._id || trip.id || "active-current-trip";
          const alreadyPresent =
            fetchedPersonal.some((t) => (t._id || t.id) === tripId) ||
            fetchedCampus.some((t) => (t._id || t.id) === tripId);

          if (!alreadyPresent) {
            if (trip.tripCategory === "CAMPUS") {
              fetchedCampus.unshift({ ...trip, _id: tripId, _relation: "COORDINATOR", status: "Current Active IV" });
            } else {
              fetchedPersonal.unshift({ ...trip, _id: tripId, status: "Current Active Tour" });
            }
          }
        }

        // If still completely empty, supply curated starter journeys
        if (fetchedPersonal.length === 0 && fetchedCampus.length === 0) {
          fetchedPersonal = [...STARTER_JOURNEYS];
        }

        setPersonalTrips(fetchedPersonal);
        setCampusTrips(fetchedCampus);
      } catch (err) {
        console.error("Failed to fetch saved trips:", err);
        setError("Failed to load your trips. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, [token, trip]);

  const handleOpenTrip = (tripId, tripCategory, relation, selectedTrip) => {
    if (selectedTrip) {
      setTrip(selectedTrip);
    }
    if (tripCategory === "CAMPUS") {
      if (relation === "COORDINATOR") {
        navigate(`/campus/${tripId}/dashboard`);
      } else {
        navigate(`/campus/${tripId}/participant`);
      }
      return;
    }
    navigate(`/itinerary/${tripId}`);
  };

  const handleOpenInBuilder = (selectedTrip, e) => {
    e.stopPropagation();
    setTrip(selectedTrip);
    navigate("/builder");
  };

  const handleDeleteTrip = async (tripToDelete, e) => {
    e.stopPropagation();
    const id = tripToDelete._id || tripToDelete.id;
    if (!window.confirm(`Delete "${tripToDelete.destination || tripToDelete.tripName || "this trip"}"?`)) {
      return;
    }

    const authToken = token || localStorage.getItem("token");
    try {
      if (authToken && tripToDelete._id && !tripToDelete._id.startsWith("curated-")) {
        await apiDeleteTrip(tripToDelete._id, authToken);
      }
    } catch (err) {
      console.warn("API delete error:", err);
    }

    setPersonalTrips((prev) => prev.filter((t) => (t._id || t.id) !== id));
    setCampusTrips((prev) => prev.filter((t) => (t._id || t.id) !== id));

    try {
      const stored = localStorage.getItem("transix_saved_trips");
      if (stored) {
        const parsed = JSON.parse(stored).filter((t) => (t._id || t.id) !== id);
        localStorage.setItem("transix_saved_trips", JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }

    toast.success("Trip removed successfully.");
  };

  const filterAndSort = (tripList) => {
    return tripList
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
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
  };

  const filteredPersonal = useMemo(() => filterAndSort(personalTrips), [personalTrips, searchQuery, modeFilter, sortBy]);
  const filteredCampus = useMemo(() => filterAndSort(campusTrips), [campusTrips, searchQuery, modeFilter, sortBy]);

  const allTripsCount = personalTrips.length + campusTrips.length;
  const totalDays = useMemo(() => {
    return [...personalTrips, ...campusTrips].reduce((sum, t) => sum + (t.duration || t.durationDays || 4), 0);
  }, [personalTrips, campusTrips]);
  const totalBudget = useMemo(() => {
    return [...personalTrips, ...campusTrips].reduce((sum, t) => sum + (t.budget || 35000), 0);
  }, [personalTrips, campusTrips]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Draft":
        return "bg-slate-800 text-slate-300 border-slate-700";
      case "Generated":
        return "bg-indigo-900/50 text-indigo-300 border-indigo-500/30";
      case "Booked":
        return "bg-blue-900/50 text-blue-300 border-blue-500/30";
      case "Finalized":
        return "bg-emerald-900/50 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const renderTripCard = (t) => {
    const isCurated = String(t._id || "").startsWith("curated-");
    const displayImg =
      t.heroImage ||
      t.coverImage ||
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&auto=format&fit=crop&q=80";

    return (
      <div
        key={t._id || t.id}
        onClick={() => handleOpenTrip(t._id || t.id, t.tripCategory, t._relation, t)}
        className="group cursor-pointer bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/80 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all duration-300 flex flex-col"
      >
        {/* Image Header */}
        <div className="h-44 relative bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <img
            src={displayImg}
            alt={t.destination || t.tripName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {t.status && (
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border backdrop-blur-md ${getStatusBadge(t.status)}`}>
                {t.status}
              </span>
            )}
            {t.operatorAccess?.enabled && (
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-500/50 bg-emerald-900/60 text-emerald-300 backdrop-blur-md">
                Shared
              </span>
            )}
            {t.tripCategory === "CAMPUS" && t.campusConfig?.ivCode && (
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border border-amber-500/50 bg-amber-900/60 text-amber-300 backdrop-blur-md">
                CODE: {t.campusConfig.ivCode}
              </span>
            )}
          </div>

          {/* Delete Action (only if not curated) */}
          {!isCurated && (
            <button
              onClick={(e) => handleDeleteTrip(t, e)}
              title="Delete trip"
              className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-lg bg-black/40 text-slate-300 backdrop-blur-md hover:bg-rose-600 hover:text-white transition"
            >
              <FiTrash2 size={13} />
            </button>
          )}

          {/* Title & Dest overlay */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-lg font-black text-white leading-tight mb-0.5 truncate">
              {t.destination || t.tripName}
            </h3>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <span>{t.source || "Departure"}</span>
              <FiArrowRight size={10} />
              <span>{t.destination}</span>
            </div>
          </div>
        </div>

        {/* Body details */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-2 gap-y-3 gap-x-2 mb-3">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <FiCalendar className="text-indigo-500 shrink-0" />
              <span className="truncate">{formatDate(t.startDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <FiClock className="text-indigo-500 shrink-0" />
              <span>{t.duration || `${t.itinerary?.length || 0} Days`}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <FiUsers className="text-indigo-500 shrink-0" />
              <span>
                {t.tripCategory === "CAMPUS"
                  ? t.campusConfig?.expectedParticipants || t.travelers
                  : t.travelers || 2}{" "}
                Travelers
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <FiDollarSign className="text-indigo-500 shrink-0" />
              <span>
                {t.currency || "INR"} {(t.budget || 35000).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t.tripCategory === "CAMPUS"
                  ? t._relation === "COORDINATOR"
                    ? "Coordinator"
                    : "Participant"
                  : isCurated
                  ? "Curated"
                  : `Saved`}
              </span>
              {t.tripCategory !== "CAMPUS" && (
                <button
                  onClick={(e) => handleOpenInBuilder(t, e)}
                  className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition flex items-center gap-1"
                >
                  <FiLayers size={11} /> Builder
                </button>
              )}
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open <FiArrowRight />
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-screen bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-white pb-20 -m-6 sm:-m-8 lg:-m-12 p-6 sm:p-8 lg:p-12 transition-colors duration-200">
        <div className="mx-auto max-w-7xl">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <FaCompass className="text-base" />
                </span>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Saved Trips
                </h1>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                Access and manage all your generated itineraries, Campus IVs, and active plans.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setTrip(null);
                  navigate("/planner");
                }}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <FiPlus className="text-sm" />
                <span>Plan New Trip</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Total Expeditions
                </span>
                <FaRoute className="text-slate-400 text-sm" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {allTripsCount}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {personalTrips.length} Personal · {campusTrips.length} Campus
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Days Planned
                </span>
                <FiCalendar className="text-slate-400 text-sm" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {totalDays} Days
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Across verified corridors</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Transit
                </span>
                <FaTrainSubway className="text-slate-400 text-sm" />
              </div>
              <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
                Multi-Modal
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Rail, Air & Road</p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Estimated Outlay
                </span>
                <span className="text-xs font-bold text-slate-400">INR</span>
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                ₹{totalBudget.toLocaleString()}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Includes stays & transit</p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-3 shadow-xs">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by destination or city..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-1">
                <button
                  onClick={() => setModeFilter("all")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    modeFilter === "all"
                      ? "bg-white dark:bg-[#1a233a] text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Modes
                </button>
                <button
                  onClick={() => setModeFilter("Train")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    modeFilter === "Train"
                      ? "bg-white dark:bg-[#1a233a] text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FaTrainSubway className="text-[10px]" />
                  <span>Train</span>
                </button>
                <button
                  onClick={() => setModeFilter("Flight")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                    modeFilter === "Flight"
                      ? "bg-white dark:bg-[#1a233a] text-indigo-600 dark:text-indigo-400 shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FaPlaneDeparture className="text-[10px]" />
                  <span>Flight</span>
                </button>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="duration">Longest Duration</option>
                <option value="budget">Highest Budget</option>
              </select>
            </div>
          </div>

          {/* Content Lists */}
          <div className="mt-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-2xl border border-red-200 dark:border-red-800/30 text-center font-medium">
                {error}
              </div>
            ) : filteredPersonal.length === 0 && filteredCampus.length === 0 ? (
              <div className="bg-white dark:bg-[#131b2e] rounded-3xl border border-slate-200 dark:border-slate-800/80 p-12 text-center shadow-xs">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiMapPin className="text-3xl text-indigo-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Saved Trips Yet</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
                  You haven&apos;t generated any itineraries matching your query yet. Start planning your next adventure to see it here!
                </p>
                <Link
                  to="/home"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-500/20"
                >
                  Start Planning <FiArrowRight />
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                {filteredCampus.length > 0 && (
                  <div>
                    <h2 className="text-lg font-black tracking-wider uppercase text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      Campus IVs ({filteredCampus.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredCampus.map(renderTripCard)}
                    </div>
                  </div>
                )}

                {filteredPersonal.length > 0 && (
                  <div>
                    <h2 className="text-lg font-black tracking-wider uppercase text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                      Personal Expeditions ({filteredPersonal.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredPersonal.map(renderTripCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
