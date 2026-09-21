import { useNavigate } from "react-router-dom";
import {
  FaUtensils,
  FaMugHot,
  FaBurger,
  FaBreadSlice,
  FaPizzaSlice,
  FaBowlFood,
} from "react-icons/fa6";

export default function FoodPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip) return null;

  const items = [
    {
      icon: <FaUtensils className="text-xl text-amber-600 dark:text-amber-400" />,
      name: "Restaurants",
      bg: "bg-amber-50/90 dark:bg-amber-950/30",
      border: "border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaMugHot className="text-xl text-rose-600 dark:text-rose-400" />,
      name: "Cafe",
      bg: "bg-rose-50/90 dark:bg-rose-950/30",
      border: "border-rose-200/80 dark:border-rose-800/50 hover:border-rose-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaBurger className="text-xl text-orange-600 dark:text-orange-400" />,
      name: "Fast Food",
      bg: "bg-orange-50/90 dark:bg-orange-950/30",
      border: "border-orange-200/80 dark:border-orange-800/50 hover:border-orange-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaBreadSlice className="text-xl text-yellow-600 dark:text-yellow-400" />,
      name: "Bakery",
      bg: "bg-yellow-50/90 dark:bg-yellow-950/30",
      border: "border-yellow-200/80 dark:border-yellow-800/50 hover:border-yellow-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaPizzaSlice className="text-xl text-red-600 dark:text-red-400" />,
      name: "Pizza",
      bg: "bg-red-50/90 dark:bg-red-950/30",
      border: "border-red-200/80 dark:border-red-800/50 hover:border-red-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaBowlFood className="text-xl text-emerald-600 dark:text-emerald-400" />,
      name: "Street Food",
      bg: "bg-emerald-50/90 dark:bg-emerald-950/30",
      border: "border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-light text-slate-900">Food &amp; Dining</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Top curated culinary spots around {trip.destination}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              navigate("/food", {
                state: {
                  destination: trip.destination,
                  category: item.name,
                },
              })
            }
            className={`group flex flex-col items-center justify-center rounded-2xl border ${item.border} ${item.bg} p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconBg} transition group-hover:scale-110`}>
              {item.icon}
            </div>
            <span className="mt-2.5 text-xs font-semibold text-[#0c0a09] dark:text-stone-100">{item.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
