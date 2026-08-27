import {
  FiCalendar,
  FiCompass,
  FiDollarSign,
  FiNavigation,
} from "react-icons/fi";
import { getDuration, formatBudget } from "../../../utils/formatTrip";

export default function TripStats({ trip }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<FiCalendar className="text-indigo-600" />}
        title="Duration"
        value={getDuration(trip)}
      />
      <StatCard
        icon={<FiNavigation className="text-indigo-600" />}
        title="Transit Mode"
        value={trip.travelMode}
      />
      <StatCard
        icon={<FiDollarSign className="text-indigo-600" />}
        title="Estimated Budget"
        value={formatBudget(trip.budget)}
      />
      <StatCard
        icon={<FiCompass className="text-indigo-600" />}
        title="Travel Style"
        value={trip.tripType}
      />
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] p-3.5 shadow-xs transition hover:shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-base">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-500 truncate">{title}</p>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{value}</h4>
      </div>
    </div>
  );
}
