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
        icon={<FiCalendar className="text-sky-600 text-lg" />}
        title="Duration"
        value={getDuration(trip)}
        iconBg="bg-sky-100"
        cardBg="bg-sky-50/80"
        border="border-sky-200/80"
      />
      <StatCard
        icon={<FiNavigation className="text-indigo-600 text-lg" />}
        title="Transit Mode"
        value={trip.travelMode}
        iconBg="bg-indigo-100"
        cardBg="bg-indigo-50/80"
        border="border-indigo-200/80"
      />
      <StatCard
        icon={<FiDollarSign className="text-emerald-600 text-lg" />}
        title="Estimated Budget"
        value={formatBudget(trip.budget)}
        iconBg="bg-emerald-100"
        cardBg="bg-emerald-50/80"
        border="border-emerald-200/80"
      />
      <StatCard
        icon={<FiCompass className="text-amber-600 text-lg" />}
        title="Travel Style"
        value={trip.tripType}
        iconBg="bg-amber-100"
        cardBg="bg-amber-50/80"
        border="border-amber-200/80"
      />
    </div>
  );
}

function StatCard({ icon, title, value, iconBg, cardBg, border }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border ${border} ${cardBg} p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg} shadow-xs`}>
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[#777169] dark:text-stone-400 uppercase tracking-wider truncate">{title}</p>
        <h4 className="text-sm font-bold text-[#0c0a09] dark:text-white truncate mt-0.5">{value}</h4>
      </div>
    </div>
  );
}
