import TrainCard from "./TrainCard";
import { FaTrainSubway } from "react-icons/fa6";

function TrainList({ trains, selectedTrain, onSelectTrain }) {
  if (!trains || !trains.length) {
    return (
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-500 mb-3">
          <FaTrainSubway className="text-base" />
        </div>
        <h4 className="text-sm font-semibold text-stone-900">No Direct Trains Found</h4>
        <p className="mt-1 text-xs text-stone-500 max-w-xs mx-auto">
          No scheduled trains found matching this route in the verified railway timetable.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {trains.map((train) => (
        <TrainCard
          key={train.trainNumber || train.trainName}
          train={train}
          selected={selectedTrain?.trainNumber === train.trainNumber}
          onClick={() => onSelectTrain(train)}
        />
      ))}
    </div>
  );
}

export default TrainList;
