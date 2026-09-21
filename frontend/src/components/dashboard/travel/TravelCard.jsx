import { FaArrowRight, FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function TravelCard({ option, source, destination }) {
  const navigate = useNavigate();

  const getModeTheme = (type) => {
    switch (type?.toLowerCase()) {
      case "train":
        return {
          iconBg: "bg-indigo-100/90 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
          badge: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300",
        };
      case "flight":
        return {
          iconBg: "bg-sky-100/90 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400",
          badge: "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300",
        };
      case "bus":
        return {
          iconBg: "bg-amber-100/90 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
          badge: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
        };
      default:
        return {
          iconBg: "bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
          badge: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
        };
    }
  };

  const theme = getModeTheme(option.type);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl">
      {/* Top Row: Icon, Title & Recommended Badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.iconBg} text-xl shadow-xs transition group-hover:scale-105`}>
              {option.icon}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{option.type}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{option.operator || option.company}</p>
            </div>
          </div>

          {option.recommended && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Recommended
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/80 p-2.5 text-center border border-slate-100">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Duration</p>
            <p className="mt-0.5 text-xs font-bold text-slate-900">{option.duration}</p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Est. Fare</p>
            <p className="mt-0.5 text-xs font-extrabold text-emerald-600">
              {typeof option.price === "number"
                ? `₹${option.price.toLocaleString()}`
                : option.price?.startsWith("₹")
                ? option.price
                : `₹${option.price || 1500}`}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Rating</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-900">
              <FaStar className="text-amber-500 text-[10px]" />
              <span>{option.rating || "4.8"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-[#f0efed] dark:border-stone-800 pt-3">
        <button
          onClick={() => {
            import("../../../utils/tourBuilderHelper").then(({ addItemToTourBuilder }) => {
              const isTrain = option.type?.toLowerCase() === "train";
              addItemToTourBuilder(
                {
                  id: option.id || (isTrain && option.trainNumber ? `train-${option.trainNumber}` : undefined),
                  trainNumber: option.trainNumber,
                  trainName: option.trainName || option.operator,
                  departure: option.departure,
                  arrival: option.arrival,
                  stops: option.stops,
                  route: option.route,
                  fares: option.fares,
                  name: isTrain
                    ? `${option.trainName || option.operator} (#${option.trainNumber || ""})`
                    : `${option.operator || option.company || option.type} (${source} → ${destination})`,
                  activity: `${option.type} Journey: ${source} → ${destination}`,
                  category: (option.type || "train").toLowerCase(),
                  categoryLabel: option.type,
                  icon: option.type === "Flight" ? "✈️" : option.type === "Train" ? "🚆" : "🚌",
                  price: typeof option.price === "number" ? option.price : 1500,
                  displayPrice: typeof option.price === "number" ? `₹${option.price.toLocaleString()}` : option.price,
                  duration: option.duration,
                  location: `${source} → ${destination}`,
                  notes: option.departure && option.arrival ? `Departs ${option.departure} • Arrives ${option.arrival} (${option.duration})` : undefined,
                },
                0
              );
            });
          }}
          className="flex-1 rounded-full bg-indigo-600 hover:bg-indigo-700 py-2.5 text-center text-xs font-semibold text-white shadow-xs transition hover:shadow-md cursor-pointer"
        >
          + Add to Tour
        </button>

        <button
          onClick={() =>
            navigate("/travel-options", {
              state: {
                source,
                destination,
                travelMode: (option.type || "train").toLowerCase(),
              },
            })
          }
          className="flex items-center justify-center gap-1.5 rounded-full border border-indigo-200 dark:border-stone-700 bg-indigo-50/70 dark:bg-stone-800 px-3.5 py-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition hover:bg-indigo-100 dark:hover:bg-stone-700 cursor-pointer"
        >
          <span>Explore</span>
          <FaArrowRight className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}
