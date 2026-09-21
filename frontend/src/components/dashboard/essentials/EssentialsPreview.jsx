import { useNavigate } from "react-router-dom";
import {
  FaHospital,
  FaPills,
  FaMoneyBillWave,
  FaGasPump,
  FaShieldHalved,
  FaWrench,
} from "react-icons/fa6";

export default function EssentialsPreview({ trip }) {
  const navigate = useNavigate();

  if (!trip) return null;

  const items = [
    {
      icon: <FaHospital className="text-xl text-rose-600 dark:text-rose-400" />,
      name: "Hospitals",
      bg: "bg-rose-50/90 dark:bg-rose-950/30",
      border: "border-rose-200/80 dark:border-rose-800/50 hover:border-rose-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaPills className="text-xl text-teal-600 dark:text-teal-400" />,
      name: "Pharmacy",
      bg: "bg-teal-50/90 dark:bg-teal-950/30",
      border: "border-teal-200/80 dark:border-teal-800/50 hover:border-teal-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaMoneyBillWave className="text-xl text-emerald-600 dark:text-emerald-400" />,
      name: "ATM",
      bg: "bg-emerald-50/90 dark:bg-emerald-950/30",
      border: "border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaGasPump className="text-xl text-amber-600 dark:text-amber-400" />,
      name: "Petrol Pump",
      bg: "bg-amber-50/90 dark:bg-amber-950/30",
      border: "border-amber-200/80 dark:border-amber-800/50 hover:border-amber-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaShieldHalved className="text-xl text-indigo-600 dark:text-indigo-400" />,
      name: "Police",
      bg: "bg-indigo-50/90 dark:bg-indigo-950/30",
      border: "border-indigo-200/80 dark:border-indigo-800/50 hover:border-indigo-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
    {
      icon: <FaWrench className="text-xl text-violet-600 dark:text-violet-400" />,
      name: "Mechanic",
      bg: "bg-violet-50/90 dark:bg-violet-950/30",
      border: "border-violet-200/80 dark:border-violet-800/50 hover:border-violet-400",
      iconBg: "bg-white dark:bg-stone-900 shadow-xs",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-colors">
      <div className="mb-5">
        <h2 className="text-xl font-serif font-light text-slate-900">Essentials &amp; Emergency Services</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Emergency contacts, medical, ATMs &amp; fuel stations in {trip.destination}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        {items.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              navigate("/essentials", {
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
