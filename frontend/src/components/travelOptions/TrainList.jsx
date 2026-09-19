import TrainCard from "./TrainCard";

function TrainList({ trains, selectedTrain, savedTrain, pendingTrain, onSelectTrain }) {
  if (!trains || !trains.length) {
    return (
      <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] p-6 text-center shadow-xs transition-colors">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No direct trains found for this route.</p>
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
            key={train.trainNumber}
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
