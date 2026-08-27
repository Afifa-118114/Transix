import { FaArrowRight, FaStar } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function TravelCard({ option, source, destination }) {
  const navigate = useNavigate();

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:border-indigo-300 hover:shadow-md">
      {/* Top Row: Icon, Title & Recommended Badge */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl text-indigo-600">
              {option.icon}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">{option.type}</h3>
              <p className="text-xs text-slate-500 line-clamp-1">{option.operator || option.company}</p>
            </div>
          </div>

          {option.recommended && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Best Match
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Duration</p>
            <p className="mt-0.5 text-xs font-bold text-slate-800">{option.duration}</p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Est. Fare</p>
            <p className="mt-0.5 text-xs font-extrabold text-indigo-600">
              {typeof option.price === "number"
                ? `₹${option.price.toLocaleString()}`
                : option.price?.startsWith("₹")
                ? option.price
                : `₹${option.price || 1500}`}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Rating</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-bold text-slate-800">
              <FaStar className="text-amber-400 text-[10px]" />
              <span>{option.rating || "4.8"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
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
          className="flex-1 rounded-xl bg-indigo-50 py-2 text-center text-xs font-bold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
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
          className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <span>Explore</span>
          <FaArrowRight className="text-[10px]" />
        </button>
      </div>
    </div>
  );
}
