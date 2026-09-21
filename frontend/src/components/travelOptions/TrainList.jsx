import TrainCard from "./TrainCard";
import { FaTrainSubway } from "react-icons/fa6";

function TrainList({ trains, selectedTrain, savedTrain, pendingTrain, onSelectTrain }) {
  if (!trains || !trains.length) {
    return (
      <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-8 text-center shadow-xs transition-colors">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
          <FaTrainSubway className="text-base" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">No Direct Trains Found</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          No scheduled trains found matching this route in the verified railway timetable.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {trains.map((train) => {
        const isSelected = selectedTrain && String(selectedTrain.trainNumber) === String(train.trainNumber);
        const isSaved = savedTrain && String(savedTrain.trainNumber) === String(train.trainNumber);
        const isPending = pendingTrain && String(pendingTrain.trainNumber) === String(train.trainNumber);

        return (
          <TrainCard
            key={train.trainNumber || train.trainName}
            train={train}
            selected={isSelected}
            isSaved={isSaved}
            isPending={isPending}
            onClick={() => onSelectTrain(train)}
          />
        );
      })}
    </div>
  );
}

export default TrainList;
