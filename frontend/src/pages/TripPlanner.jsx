import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";
import { useTripBuilder } from "../context/TripBuilderContext";

const TripPlanner = ({ trip: propTrip, setTrip: propSetTrip }) => {
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;

  if (!trip) {
    return <TripForm setTrip={setTrip} />;
  }

  return <TripDashboard trip={trip} setTrip={setTrip} />;
};

export default TripPlanner;
