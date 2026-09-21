import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiRepeat,
  FiSearch,
  FiFilter,
  FiSliders,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiMapPin,
  FiChevronRight,
} from "react-icons/fi";
import { FaTrainSubway } from "react-icons/fa6";

import { searchTrains } from "../services/trainService";
import ModeTabs from "../components/travelOptions/ModeTabs";
import TrainList from "../components/travelOptions/TrainList";
import SelectedTrain from "../components/travelOptions/SelectedTrain";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function TravelOptionsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trip, setTrip } = useTripBuilder();

  const initialSource = state?.source || searchParams.get("source") || trip?.source || "Mumbai";
  const initialDestination = state?.destination || searchParams.get("destination") || trip?.destination || "Kanyakumari";
  const travelDate = state?.date || state?.startDate || searchParams.get("date") || trip?.startDate || null;

  const [source, setSource] = useState(initialSource);
  const [destination, setDestination] = useState(initialDestination);
  const [searchInputSource, setSearchInputSource] = useState(initialSource);
  const [searchInputDestination, setSearchInputDestination] = useState(initialDestination);

  const [selectedMode, setSelectedMode] = useState(
    state?.travelMode || searchParams.get("mode") || "train"
  );

  const [sortBy, setSortBy] = useState("duration"); // duration, price, departure
  const [trains, setTrains] = useState([]);
  const [selectedTrain, setSelectedTrain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchTrains() {
      try {
        setLoading(true);
        setError("");

        const data = await searchTrains(source, destination, travelDate);
        const trainList = data?.trains || (Array.isArray(data) ? data : []);

        setTrains(trainList);

        if (trainList.length > 0) {
          setSelectedTrain(trainList[0]);
        } else {
          setSelectedTrain(null);
        }
      } catch (err) {
        console.error("Fetch Trains Error:", err);
        setError("Unable to fetch trains from dataset.");
      } finally {
        setLoading(false);
      }
    }

    if (selectedMode === "train") {
      fetchTrains();
    } else {
      setLoading(false);
    }
  }, [source, destination, travelDate, selectedMode]);

  // Handle route swap
  const handleSwapRoute = () => {
    const temp = source;
    setSource(destination);
    setDestination(temp);
    setSearchInputSource(destination);
    setSearchInputDestination(temp);
  };

  // Handle route search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInputSource.trim() && searchInputDestination.trim()) {
      setSource(searchInputSource.trim());
      setDestination(searchInputDestination.trim());
    }
  };

  // Sort trains
  const sortedTrains = useMemo(() => {
    if (!trains) return [];
    return [...trains].sort((a, b) => {
      if (sortBy === "duration") {
        const getMinutes = (t) => {
          if (t.durationMinutes) return t.durationMinutes;
          const match = (t.duration || "").match(/(\d+)\s*h\s*(\d*)/i);
          if (match) return parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
          return 9999;
        };
        return getMinutes(a) - getMinutes(b);
      }
      if (sortBy === "price") {
        return (a.price || 99999) - (b.price || 99999);
      }
      if (sortBy === "departure") {
        return (a.departure || "").localeCompare(b.departure || "");
      }
      return 0;
    });
  }, [trains, sortBy]);

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-screen bg-white text-stone-900 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Navigation & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => navigate(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                title="Go back"
              >
                <FiArrowLeft className="text-sm" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#034F46]/10 text-[#034F46]">
                    <FaTrainSubway className="text-xs" />
                  </span>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                    Rail Routes &amp; Transit Options
                  </h1>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  Direct schedules, halts, and class availability queried from verified Indian Railways timetable
                </p>
              </div>
            </div>

            {/* Travel Mode Switcher */}
            <div className="shrink-0">
              <ModeTabs
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
              />
            </div>
          </div>

          {/* Search & Route Control Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-5 rounded-2xl border border-stone-200 bg-stone-50/60 p-3.5 sm:p-4 shadow-xs"
          >
            <div className="flex flex-col lg:flex-row items-center gap-3">
              {/* Origin City */}
              <div className="relative w-full lg:w-1/3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Origin City / Station
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
                  <input
                    type="text"
                    value={searchInputSource}
                    onChange={(e) => setSearchInputSource(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-stone-800 placeholder-stone-400 focus:border-[#034F46] focus:outline-none"
                  />
                </div>
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapRoute}
                className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                title="Swap Origin and Destination"
              >
                <FiRepeat className="text-xs" />
              </button>

              {/* Destination City */}
              <div className="relative w-full lg:w-1/3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Destination City / Station
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs" />
                  <input
                    type="text"
                    value={searchInputDestination}
                    onChange={(e) => setSearchInputDestination(e.target.value)}
                    placeholder="e.g. Kanyakumari"
                    className="w-full rounded-xl border border-stone-200 bg-white pl-8 pr-3 py-2 text-xs font-semibold text-stone-800 placeholder-stone-400 focus:border-[#034F46] focus:outline-none"
                  />
                </div>
              </div>

              {/* Search CTA */}
              <div className="w-full lg:w-auto lg:self-end">
                <button
                  type="submit"
                  className="flex w-full lg:w-auto items-center justify-center gap-2 rounded-xl bg-[#034F46] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#023c35]"
                >
                  <FiSearch className="text-xs" />
                  <span>Update Route</span>
                </button>
              </div>

              {/* Active Route Pill */}
              <div className="hidden xl:flex items-center gap-2 ml-auto rounded-xl bg-white border border-stone-200/90 px-3 py-1.5 self-end">
                <span className="text-xs font-semibold text-stone-700">{source}</span>
                <span className="text-xs font-bold text-[#034F46]">→</span>
                <span className="text-xs font-semibold text-stone-700">{destination}</span>
                <span className="ml-1.5 rounded-md bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
                  {trains.length} Trains
                </span>
              </div>
            </div>
          </form>

          {/* Loading State */}
          {loading && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-stone-200 bg-stone-50/40 p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#034F46] border-t-transparent mb-3" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Searching verified train routes...
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                Cross-referencing Indian Railways network timetable for {source} to {destination}
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50/40 p-8 text-center max-w-lg mx-auto">
              <h3 className="font-serif text-base font-bold text-rose-800">{error}</h3>
              <p className="mt-1 text-xs text-rose-600 mb-4">
                Unable to locate direct train schedules between {source} and {destination}.
              </p>
              <button
                onClick={() => navigate(-1)}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
              >
                Go Back
              </button>
            </div>
          )}

          {/* Content Layout */}
          {!loading && !error && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 items-start gap-6">
              {/* Left Column: Train List with Sorting Bar */}
              <div className="lg:col-span-5 xl:col-span-4">
                {/* List Header & Sorting */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Available Trains ({sortedTrains.length})
                  </span>

                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[11px] text-stone-400 mr-1">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 focus:border-[#034F46] focus:outline-none"
                    >
                      <option value="duration">Fastest Duration</option>
                      <option value="price">Lowest Fare</option>
                      <option value="departure">Earliest Departure</option>
                    </select>
                  </div>
                </div>

                {/* Train List */}
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                  <TrainList
                    trains={sortedTrains}
                    selectedTrain={selectedTrain}
                    onSelectTrain={setSelectedTrain}
                  />
                </div>
              </div>

              {/* Right Column: Selected Train Details */}
              <div className="lg:col-span-7 xl:col-span-8">
                <SelectedTrain train={selectedTrain} />
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
