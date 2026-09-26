import {
  FiCalendar,
  FiCompass,
  FiDollarSign,
  FiNavigation,
} from "react-icons/fi";
import { getDuration, formatBudget } from "../../../utils/formatTrip";

export default function TripStats({ trip }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
      <StatCard
        icon={<FiCalendar className="text-[#006CE4] dark:text-sky-400 text-lg" />}
        title="Duration"
        value={getDuration(trip)}
        iconBg="bg-blue-50 dark:bg-sky-950/60 border border-blue-100 dark:border-sky-800/60"
      />
      <StatCard
        icon={<FiNavigation className="text-[#006CE4] dark:text-sky-400 text-lg" />}
        title="Transit Mode"
        value={trip.travelMode}
        iconBg="bg-blue-50 dark:bg-sky-950/60 border border-blue-100 dark:border-sky-800/60"
      />
      <StatCard
        icon={<FiDollarSign className="text-[#00A65E] dark:text-emerald-400 text-lg" />}
        title="Estimated Budget"
        value={formatBudget(trip.budget)}
        isPrice={true}
        iconBg="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60"
      />
      <StatCard
        icon={<FiCompass className="text-[#FFB400] dark:text-amber-400 text-lg" />}
        title="Travel Style"
        value={trip.tripType}
        iconBg="bg-amber-50 dark:bg-amber-950/60 border border-amber-100 dark:border-amber-800/60"
      />
    </div>
  );
}

function StatCard({ icon, title, value, iconBg, isPrice }) {
  return (
    <div className="flex items-center gap-3 sm:gap-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-3.5 sm:p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#006CE4] dark:hover:border-sky-500 hover:shadow-sm">
      <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg ${iconBg} shadow-2xs`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">{title}</p>
        <h4 className={`truncate mt-0.5 ${isPrice ? 'text-base font-extrabold text-[#1A1A1A] dark:text-white' : 'text-sm font-bold text-[#1A1A1A] dark:text-white'}`}>{value}</h4>
      </div>
    </div>
  );
}
