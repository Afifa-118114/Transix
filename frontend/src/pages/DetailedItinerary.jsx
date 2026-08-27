import { useLocation, Navigate } from "react-router-dom";
import { useState } from "react";
import { useTripBuilder } from "../context/TripBuilderContext";

import ItineraryHero from "../components/itinerary/ItineraryHero";
import DayTabs from "../components/itinerary/DayTabs";
import Timeline from "../components/itinerary/Timeline";
import BottomNav from "../components/itinerary/BottomNav";

import { regenerateDay } from "../api/tripApi";

export default function DetailedItinerary() {
  const { state } = useLocation();
  const { trip: contextTrip } = useTripBuilder();

  // Prepare values before hooks
  const trip = state?.trip || contextTrip;
  const initialDay = state?.dayIndex ?? 0;

  // Hooks (must always be called)
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [itinerary, setItinerary] = useState(trip?.itinerary || []);
  const [loading, setLoading] = useState(false);

  // Redirect only if absolutely no trip exists in context or storage
  if (!trip) {
    return <Navigate to="/planner" replace />;
  }

  const currentDay = itinerary[selectedDay];

  const handleRegenerate = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const res = await regenerateDay(trip._id, selectedDay + 1, token);

      const updated = [...itinerary];
      updated[selectedDay] = res.day;

      setItinerary(updated);
    } catch (err) {
      console.error(err);
      alert("Couldn't regenerate this day.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl flex-col items-center space-y-8 px-6 py-8 gap-4">
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
          loading={loading}
        />
      </div>
    </div>
  );
}
