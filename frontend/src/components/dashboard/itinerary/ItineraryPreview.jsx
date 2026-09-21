import DayCard from "./DayCard";
import { Link } from "react-router-dom";

export default function ItineraryPreview({ trip }) {
  if (!trip) return null;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-light text-slate-900">Trip Itinerary</h2>
          <p className="text-xs text-slate-500 mt-0.5">Day-by-day plan of your journey</p>
        </div>

        <Link
          to="/builder"
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-xs transition"
        >
          Customize in Builder →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
        {trip.itinerary?.map((day) => (
          <DayCard key={day.day} day={day} trip={trip} />
        ))}
      </div>
    </section>
  );
}
