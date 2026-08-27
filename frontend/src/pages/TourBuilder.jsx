import { Link, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { FiCompass, FiPlus } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import AvailableOptionsPanel from "../components/builder/AvailableOptionsPanel";
import ItineraryBoard from "../components/builder/ItineraryBoard";
import TripSummaryPanel from "../components/builder/TripSummaryPanel";
import FinalizeModal from "../components/builder/FinalizeModal";

export default function TourBuilder() {
  const { trip, setTrip, initializeTrip } = useTripBuilder();
  const [searchParams] = useSearchParams();

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
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 shadow-xs mb-4">
            <FiCompass />
          </div>
          <h2 className="text-xl font-bold text-slate-900">No Active Trip Selected</h2>
          <p className="mt-1.5 max-w-md text-xs text-slate-500">
            Select or generate an AI trip, search train routes, or start building an itinerary from scratch.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98"
            >
              <FiPlus className="text-sm" />
              <span>Plan New Trip</span>
            </Link>
            <Link
              to="/travel-options?source=Mumbai&destination=Kanyakumari"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
            >
              Explore Train Routes
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-[calc(100vh-120px)] w-full">
        {/* 3-Section Grid Layout */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* LEFT — AVAILABLE OPTIONS CATALOG (3 cols) */}
          <div className="xl:col-span-3 h-[calc(100vh-130px)] sticky top-4">
            <AvailableOptionsPanel />
          </div>

          {/* CENTER — INTERACTIVE ITINERARY BOARD (6 cols) */}
          <div className="xl:col-span-6 h-[calc(100vh-130px)]">
            <ItineraryBoard />
          </div>

          {/* RIGHT — LIVE TRIP SUMMARY & BUDGET ENGINE (3 cols) */}
          <div className="xl:col-span-3 h-[calc(100vh-130px)] sticky top-4">
            <TripSummaryPanel />
          </div>
        </div>

        {/* Finalize Confirmation Modal */}
        <FinalizeModal />
      </div>
    </DashboardLayout>
  );
}
