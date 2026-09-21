import { useLocation, useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { FiCompass, FiPlus, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import ItineraryHero from "../components/itinerary/ItineraryHero";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";
import { getTripById, regenerateDay } from "../api/tripApi";

export default function DetailedItinerary() {
  const { tripId } = useParams();
  const { state } = useLocation();
  const { token } = useAuth();
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();

  const [trip, setTrip] = useState(state?.trip || contextTrip || null);
  const [selectedDay, setSelectedDay] = useState(state?.dayIndex ?? 0);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [loading, setLoading] = useState(!trip);
  const [regenerating, setRegenerating] = useState(false);

  // If trip is not available in state/context, fetch from API or local storage
  useEffect(() => {
    if (trip) {
      setItinerary(trip.itinerary || []);
      return;
    }

    let isMounted = true;
    const fetchTrip = async () => {
      setLoading(true);
      try {
        // Try local storage first for instant load
        const saved = localStorage.getItem("currentTrip") || localStorage.getItem("transix_builder_trip");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed._id === tripId || !tripId)) {
            if (isMounted) {
              setTrip(parsed);
              setItinerary(parsed.itinerary || []);
              setLoading(false);
              return;
            }
          }
        }

        // Fetch from API
        if (tripId && tripId !== "active-trip") {
          const res = await getTripById(tripId, token);
          if (res?.trip && isMounted) {
            setTrip(res.trip);
            setItinerary(res.trip.itinerary || []);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch trip by ID:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrip();
    return () => {
      isMounted = false;
    };
  }, [tripId, trip, token]);

  const handleRegenerate = async () => {
    if (!trip?._id) return;
    try {
      setRegenerating(true);
      const res = await regenerateDay(trip._id, selectedDay + 1, token);

      const updated = [...itinerary];
      updated[selectedDay] = res.day;

      setItinerary(updated);
      toast.success(`Day ${selectedDay + 1} regenerated with AI!`);
    } catch (err) {
      console.error(err);
      toast.error("Could not regenerate this day.");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout trip={trip} setTrip={setTrip}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-8">
          <FiRefreshCw className="text-2xl text-[#034F46] animate-spin mb-3" />
          <p className="text-xs font-semibold text-[#777169]">Loading itinerary details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!trip) {
    return (
      <DashboardLayout trip={null} setTrip={contextSetTrip}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-[#e7e5e4] bg-white p-8 sm:p-12 text-center shadow-xs max-w-lg mx-auto my-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#034F46]/10 text-2xl text-[#034F46] shadow-xs mb-4">
            <FiCompass />
          </div>
          <h2
            style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
            className="text-2xl font-[400] text-[#0c0a09]"
          >
            Itinerary Not Found
          </h2>
          <p className="mt-2 text-xs text-[#777169] leading-relaxed max-w-xs">
            We couldn&apos;t load the requested journey plan. You can create a new travel itinerary with our AI planner.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/home"
              className="flex items-center gap-2 rounded-full bg-[#0c0a09] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#292524]"
            >
              <FiPlus className="text-sm" />
              <span>Plan New Trip</span>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentDay = itinerary[selectedDay] || itinerary[0] || { plan: [] };

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="mx-auto flex max-w-4xl flex-col items-center space-y-6 px-2 sm:px-4 py-4">
        <ItineraryHero trip={trip} />

        <DayTabs
          itinerary={itinerary}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
        />

        <Timeline plan={currentDay.plan} destination={trip.destination} />

        <BottomNav
          selectedDay={selectedDay}
          totalDays={itinerary.length}
          setSelectedDay={setSelectedDay}
          onRegenerate={handleRegenerate}
          loading={regenerating}
        />
      </div>
    </DashboardLayout>
  );
}
