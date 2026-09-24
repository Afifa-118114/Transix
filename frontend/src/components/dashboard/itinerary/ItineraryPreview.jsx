import DayCard from "./DayCard";
import { Link } from "react-router-dom";

export default function ItineraryPreview({ trip }) {
  if (!trip) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-5 md:p-6 shadow-xs transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Trip Itinerary</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Day-by-day plan of your journey</p>
        </div>

        <Link
          to="/builder"
          className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition"
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
