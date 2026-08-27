import { useState } from "react";
import ModeTabs from "./ModeTabs";
import TrainList from "./TrainList";
import SelectedTrain from "./SelectedTrain";

function TravelOptions() {
  const [selectedMode, setSelectedMode] = useState("train");

  // Temporary data
  const [trains] = useState([]);

  const [selectedTrain, setSelectedTrain] = useState(null);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <ModeTabs selectedMode={selectedMode} setSelectedMode={setSelectedMode} />

      <div className="mt-6 grid grid-cols-12 gap-8">
        {/* Left */}
        <div className="col-span-3 min-w-0">
          <TrainList
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={setSelectedTrain}
          />
        </div>

        {/* Right */}
        <div className="col-span-9 min-w-0">
          <SelectedTrain train={selectedTrain} />
        </div>
      </div>
    </section>
  );
}

export default TravelOptions;
