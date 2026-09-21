import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiCompass, FiPlus, FiArrowRight } from "react-icons/fi";
import { getTripDetails } from "../api/tripApi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import AvailableOptionsPanel from "../components/builder/AvailableOptionsPanel";
import ItineraryBoard from "../components/builder/ItineraryBoard";
import TripSummaryPanel from "../components/builder/TripSummaryPanel";
import FinalizeModal from "../components/builder/FinalizeModal";
import ConflictResolutionModal from "../components/builder/ConflictResolutionModal";

export default function TourBuilder() {
  const {
    trip,
    setTrip,
    initializeTrip,
    pendingAlternatives,
    setPendingAlternatives,
    applyAlternative,
  } = useTripBuilder();
  const [searchParams] = useSearchParams();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch the latest persisted trip when Builder opens or tripId is in URL
  useEffect(() => {
    let isMounted = true;
    const fetchLatestTrip = async () => {
      const urlTripId = searchParams.get("tripId");
      const targetId = urlTripId || (trip && trip._id);

      if (targetId) {
        setIsInitializing(true);
        try {
          const token = localStorage.getItem("token");
          if (token) {
            const res = await getTripDetails(targetId, token);
            if (res.success && res.trip && isMounted) {
              setTrip(res.trip);
            }
          }
        } catch (e) {
          console.error("Failed to load latest trip for builder", e);
        } finally {
          if (isMounted) setIsInitializing(false);
        }
      }
    };
    fetchLatestTrip();
  }, [searchParams]);

  // If URL has source/destination params but no trip is currently in context
  useEffect(() => {
    const src = searchParams.get("src") || searchParams.get("source");
    const dest = searchParams.get("dest") || searchParams.get("destination");
    if ((src || dest) && !trip) {
      initializeTrip(src || "Origin", dest || "Destination");
    }
  }, [searchParams, trip, initializeTrip]);

  if (!trip && !isInitializing) {
    return (
      <DashboardLayout trip={null} setTrip={setTrip}>
        <div className="flex min-h-[65vh] flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-8 transition-colors">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-2xl text-indigo-600 dark:text-indigo-400 shadow-xs mb-4">
            <FiCompass />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
            No Active Tour Selected
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate an intelligent AI journey masterplan, explore train routes, or start structuring a custom itinerary from scratch.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-xs font-bold shadow-xs transition active:scale-98"
            >
              <FiPlus className="text-sm" />
              <span>Plan New Trip</span>
            </Link>
            <Link
              to="/trains"
              className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a233a] px-5 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <span>Explore Routes</span>
              <FiArrowRight className="text-xs" />
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-[calc(100vh-120px)] w-full">
        {/* Dynamic Responsive Grid Layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 transition-all">
          {/* OPTIONAL / COLLAPSIBLE CATALOG PANEL */}
          {isCatalogOpen && (
            <div className="xl:col-span-4 h-[calc(100vh-130px)] sticky top-4 transition-all">
              <AvailableOptionsPanel onClose={() => setIsCatalogOpen(false)} />
            </div>
          )}

          {/* MAIN ITINERARY CANVAS */}
          <div
            className={`transition-all ${
              isCatalogOpen ? "xl:col-span-5" : "xl:col-span-8"
            } h-[calc(100vh-130px)]`}
          >
            <ItineraryBoard
              isCatalogOpen={isCatalogOpen}
              onToggleCatalog={() => setIsCatalogOpen(!isCatalogOpen)}
            />
          </div>

          {/* LIVE TRIP SUMMARY & BUDGET ENGINE */}
          <div
            className={`transition-all ${
              isCatalogOpen ? "xl:col-span-3" : "xl:col-span-4"
            } h-[calc(100vh-130px)] sticky top-4`}
          >
            <TripSummaryPanel />
          </div>
        </div>

        {/* Finalize Confirmation Modal */}
        <FinalizeModal />

        {/* Conflict Resolution Modal */}
        <ConflictResolutionModal
          pendingAlternatives={pendingAlternatives}
          onApply={applyAlternative}
          onCancel={() => setPendingAlternatives(null)}
        />
      </div>
    </DashboardLayout>
  );
}
