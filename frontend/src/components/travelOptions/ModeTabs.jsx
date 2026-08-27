import { FaTrain, FaPlane, FaBus } from "react-icons/fa";

const modes = [
  {
    id: "train",
    name: "Train",
    icon: <FaTrain className="text-xs" />,
  },
  {
    id: "flight",
    name: "Flight",
    icon: <FaPlane className="text-xs" />,
  },
  {
    id: "bus",
    name: "Bus",
    icon: <FaBus className="text-xs" />,
  },
];

function ModeTabs({ selectedMode, setSelectedMode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#131b2e] p-1 shadow-2xs">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSelectedMode(mode.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200
            ${
              selectedMode === mode.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            }`}
        >
          {mode.icon}
          <span>{mode.name}</span>
        </button>
      ))}
    </div>
  );
}


export default ModeTabs;
