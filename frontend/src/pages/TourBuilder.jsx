import { Link, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiCompass, FiPlus, FiArrowRight } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import AvailableOptionsPanel from "../components/builder/AvailableOptionsPanel";
import ItineraryBoard from "../components/builder/ItineraryBoard";
import TripSummaryPanel from "../components/builder/TripSummaryPanel";
import FinalizeModal from "../components/builder/FinalizeModal";

export default function TourBuilder() {
  const { trip, setTrip, initializeTrip } = useTripBuilder();
  const [searchParams] = useSearchParams();
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

  // If URL has source/destination params but no trip is currently in context
  useEffect(() => {
    const src = searchParams.get("source");
    const dst = searchParams.get("destination");
    if (!trip && src && dst && initializeTrip) {
      initializeTrip(src, dst, 5);
    }
  }, [searchParams, trip, initializeTrip]);

  if (!trip) {
    return (
      <DashboardLayout trip={null} setTrip={setTrip}>
        <div className="flex min-h-[65vh] flex-col items-center justify-center rounded-2xl border border-[#e7e5e4] bg-white p-8 sm:p-12 text-center shadow-xs max-w-xl mx-auto my-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#034F46]/10 text-2xl text-[#034F46] shadow-xs mb-4">
            <FiCompass />
          </div>
          <h2
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="text-2xl sm:text-3xl font-[400] text-[#0c0a09] leading-tight"
          >
            No Active Tour Selected
          </h2>
          <p className="mt-2 max-w-md text-xs sm:text-sm text-[#777169] leading-relaxed">
            Generate an intelligent AI journey masterplan, explore train routes, or start structuring a custom itinerary from scratch.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 rounded-full bg-[#0c0a09] px-6 py-3 text-xs font-semibold text-white shadow-xs transition hover:bg-[#292524] active:scale-98"
            >
              <FiPlus className="text-sm" />
              <span>Plan New Trip</span>
            </Link>
            <Link
              to="/trains"
              className="flex items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-5 py-3 text-xs font-semibold text-[#57534e] transition hover:bg-[#fafaf9] hover:text-[#0c0a09]"
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

          {/* MAIN ITINERARY CANVAS (Expands to 8 cols when catalog closed, 5 cols when open) */}
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

          {/* LIVE TRIP SUMMARY & BUDGET ENGINE (3 cols when open, 4 cols when closed) */}
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
      </div>
    </DashboardLayout>
  );
}
