import TrainCard from "./TrainCard";

function TrainList({ trains, selectedTrain, onSelectTrain }) {
  if (!trains || !trains.length) {
    return (
      <div className="w-full rounded-2xl bg-white p-6 text-center shadow">
        <p className="text-sm text-gray-500">No direct trains found for this route.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {trains.map((train) => (
        <TrainCard
          key={train.trainNumber}
          train={train}
          selected={selectedTrain?.trainNumber === train.trainNumber}
          onClick={() => onSelectTrain(train)}
        />
      ))}
    </div>
  );
}

export default TrainList;
