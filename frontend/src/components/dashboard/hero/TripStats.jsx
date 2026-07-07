import {
  FiCalendar,
  FiCompass,
  FiDollarSign,
  FiNavigation,
} from "react-icons/fi";
import { getDuration, formatBudget } from "../../../utils/formatTrip";

export default function TripStats({ trip }) {
  console.log("Trip object:", trip);
  console.log("Budget value:", trip.budget);
  console.log("Formatted:", formatBudget(trip.budget));
  return (
    <div className="absolute left-1/2 -bottom-1 z-20 flex w-max -translate-x-1/2 rounded-3xl bg-white px-8 py-4 shadow-2xl">
      <Stat icon={<FiCalendar />} title="Duration" value={getDuration(trip)} />
      <Stat icon={<FiNavigation />} title="Travel" value={trip.travelMode} />
      <Stat
        icon={<FiDollarSign />}
        title="Budget"
        value={formatBudget(trip.budget)}
      />
      <Stat icon={<FiCompass />} title="Trip Type" value={trip.tripType} />{" "}
    </div>
  );
}

function Stat({ icon, title, value }) {
  return (
    <div className="flex items-center gap-12 px-5">
      <div className=" rounded-2xl bg-indigo-100 p-2 text-lg text-indigo-600 translate-x-6">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold -translate-x-1/6">{value}</h3>
        <p className="text-sm text-gray-500 -translate-x-1/8">{title}</p>
      </div>
    </div>
  );
}
