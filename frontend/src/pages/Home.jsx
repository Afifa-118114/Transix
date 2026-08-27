import DashboardLayout from "../layouts/DashboardLayout";
import Planner from "./TripPlanner";
import { useTripBuilder } from "../context/TripBuilderContext";

function Home() {
  const { trip, setTrip } = useTripBuilder();

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <Planner trip={trip} setTrip={setTrip} />
    </DashboardLayout>
  );
}

export default Home;
