import { FaTrainSubway, FaPlaneDeparture, FaBusSimple } from "react-icons/fa6";

const modes = [
  {
    id: "train",
    name: "Railways",
    subtext: "IRCTC Verified",
    icon: FaTrainSubway,
  },
  {
    id: "flight",
    name: "Flights",
    subtext: "Connecting Air",
    icon: FaPlaneDeparture,
  },
  {
    id: "bus",
    name: "Buses",
    subtext: "Intercity Road",
    icon: FaBusSimple,
  },
];

function ModeTabs({ selectedMode, setSelectedMode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-stone-50/80 p-1">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => setSelectedMode(mode.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
              isActive
                ? "bg-[#034F46] text-white shadow-sm"
                : "text-stone-600 hover:bg-white hover:text-stone-900"
            }`}
          >
            <Icon className={`text-xs ${isActive ? "text-white" : "text-stone-500"}`} />
            <span>{mode.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ModeTabs;
