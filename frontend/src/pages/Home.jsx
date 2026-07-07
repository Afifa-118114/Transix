import { useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import Planner from "./TripPlanner";

function Home() {
  const [trip, setTrip] = useState(() => {
    const savedTrip = localStorage.getItem("currentTrip");
    return savedTrip ? JSON.parse(savedTrip) : null;
  });

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <Planner trip={trip} setTrip={setTrip} />
    </DashboardLayout>
  );
}

export default Home;
