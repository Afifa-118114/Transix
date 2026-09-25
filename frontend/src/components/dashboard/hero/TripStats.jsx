import {
  FiCalendar,
  FiCompass,
  FiDollarSign,
  FiNavigation,
} from "react-icons/fi";
import { getDuration, formatBudget } from "../../../utils/formatTrip";

export default function TripStats({ trip }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      <StatCard
        icon={<FiCalendar className="text-sky-600 dark:text-sky-400 text-lg" />}
        title="Duration"
        value={getDuration(trip)}
        iconBg="bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-800/60"
      />
      <StatCard
        icon={<FiNavigation className="text-indigo-600 dark:text-indigo-400 text-lg" />}
        title="Transit Mode"
        value={trip.travelMode}
        iconBg="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60"
      />
      <StatCard
        icon={<FiDollarSign className="text-blue-600 dark:text-blue-400 text-lg" />}
        title="Estimated Budget"
        value={formatBudget(trip.budget)}
        iconBg="bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-800/60"
      />
      <StatCard
        icon={<FiCompass className="text-amber-600 dark:text-amber-400 text-lg" />}
        title="Travel Style"
        value={trip.tripType}
        iconBg="bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60"
      />
    </div>
  );
}

function StatCard({ icon, title, value, iconBg }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-2xs`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</p>
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-0.5">{value}</h4>
      </div>
    </div>
  );
}
