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
      icon: <FaHospital className="text-lg" />,
      name: "Hospitals",
      desc: "Emergency Care",
    },
    {
      icon: <FaPills className="text-lg" />,
      name: "Pharmacy",
      desc: "24/7 Med Stores",
    },
    {
      icon: <FaMoneyBillWave className="text-lg" />,
      name: "ATM",
      desc: "Cash & Banks",
    },
    {
      icon: <FaGasPump className="text-lg" />,
      name: "Petrol Pump",
      desc: "Fuel & EV Station",
    },
    {
      icon: <FaShieldHalved className="text-lg" />,
      name: "Police",
      desc: "Help & Security",
    },
    {
      icon: <FaWrench className="text-lg" />,
      name: "Mechanic",
      desc: "Roadside Assist",
    },
  ];

  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-5 md:p-6 shadow-xs transition-colors">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Essentials &amp; Emergency Services</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
            className="group flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-sm cursor-pointer"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-600 dark:group-hover:text-white transition-all duration-200 shadow-2xs">
              {item.icon}
            </div>
            <span className="mt-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {item.name}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium truncate max-w-full">
              {item.desc}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
