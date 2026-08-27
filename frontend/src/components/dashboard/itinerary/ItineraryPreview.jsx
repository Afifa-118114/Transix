import DayCard from "./DayCard";
import { Link } from "react-router-dom";

export default function ItineraryPreview({ trip }) {
  if (!trip) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Trip Itinerary</h2>
          <p className="text-xs text-slate-500">Day-by-day plan of your journey</p>
        </div>

        <Link
          to="/builder"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
        >
          Customize in Builder →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {trip.itinerary.map((day) => (
          <DayCard key={day.day} day={day} trip={trip} />
        ))}
      </div>
    </section>
  );
}
