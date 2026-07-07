import { FaTrain, FaPlane, FaBus, FaCarSide } from "react-icons/fa";

const travelModes = [
  {
    name: "Train",
    icon: <FaTrain />,
    color: "text-indigo-600",
  },
  {
    name: "Flight",
    icon: <FaPlane />,
    color: "text-sky-500",
  },
  {
    name: "Bus",
    icon: <FaBus />,
    color: "text-orange-500",
  },
  {
    name: "Cab",
    icon: <FaCarSide />,
    color: "text-green-600",
  },
];

export default function TravelTabs({
  activeMode,
  setActiveMode,
  setActiveTransport,
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {travelModes.map((mode) => {
          const active = activeMode === mode.name;

          return (
            <button
              key={mode.name}
              onClick={() => {
                setActiveMode(mode.name);
                setActiveTransport(0);
              }}
              className={`group rounded-2xl border px-6 py-5 transition-all duration-300

                ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                    : "border-transparent bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
            >
              <div className="flex flex-col items-center gap-3">
                <div
                  className={`text-3xl transition

                    ${active ? "text-white" : mode.color}`}
                >
                  {mode.icon}
                </div>

                <div>
                  <p
                    className={`text-lg font-semibold

                      ${active ? "text-white" : "text-gray-800"}`}
                  >
                    {mode.name}
                  </p>

                  <p
                    className={`mt-1 text-xs

                      ${active ? "text-indigo-100" : "text-gray-500"}`}
                  >
                    Compare Options
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
