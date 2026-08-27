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
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => setSelectedMode(mode.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200
            ${
              selectedMode === mode.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
