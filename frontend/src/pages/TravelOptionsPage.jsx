import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { FaTrain } from "react-icons/fa";

import { searchTrains } from "../services/trainService";

import ModeTabs from "../components/travelOptions/ModeTabs";
import TrainList from "../components/travelOptions/TrainList";
import SelectedTrain from "../components/travelOptions/SelectedTrain";

import { useTripBuilder } from "../context/TripBuilderContext";

export default function TravelOptionsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [searchParams] = useSearchParams();
  const { trip } = useTripBuilder();

  const source = state?.source || searchParams.get("source") || trip?.source || "Mumbai";
  const destination = state?.destination || searchParams.get("destination") || trip?.destination || "Kanyakumari";
  const travelDate = state?.date || state?.startDate || searchParams.get("date") || trip?.startDate || null;

  const [selectedMode, setSelectedMode] = useState(
    state?.travelMode || searchParams.get("mode") || "train"
  );

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-8 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Searching verified train routes...</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Querying Indian Railways Kaggle dataset</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8faff] dark:bg-[#0b0f19] p-4 transition-colors duration-200">
        <div className="max-w-md rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-white dark:bg-[#131b2e] p-6 shadow-sm text-center">
          <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">{error}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Unable to locate train schedules between {source} and {destination}.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Top Bar: Back & Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131b2e] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <FiArrowLeft className="text-sm" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
                <FaTrain className="text-sm" />
              </span>
              <div>
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">Travel Options</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Official Indian Railways Verified Dataset</p>
              </div>
            </div>
          </div>

          {/* Center Route Bubble */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{source}</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">→</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{destination}</span>
            <span className="ml-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
              {trains.length} Trains Available
            </span>
          </div>


          {/* Mode Selector */}
          <ModeTabs
            selectedMode={selectedMode}
            setSelectedMode={setSelectedMode}
          />
        </div>

        {/* ================= MAIN LAYOUT ================= */}
        <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 items-start gap-4">
          {/* Left Panel: Trains List */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Available Trains ({trains.length})
              </span>
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Sorted by Duration
              </span>
            </div>
            <div className="max-h-[calc(100vh-125px)] overflow-y-auto pr-1">
              <TrainList
                trains={trains}
                selectedTrain={selectedTrain}
                onSelectTrain={setSelectedTrain}
              />
            </div>
          </div>

          {/* Right Panel: Selected Train Details */}
          <div className="lg:col-span-7 xl:col-span-8">
            <SelectedTrain train={selectedTrain} />
          </div>
        </div>
      </div>
    </div>
  );
}
