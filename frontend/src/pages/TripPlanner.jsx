import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";
import { useTripBuilder } from "../context/TripBuilderContext";

const Planner = ({ trip: propTrip, setTrip: propSetTrip }) => {
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;

  return (
    <div className="p-6">
      {!trip ? (
        <TripForm setTrip={setTrip} />
      ) : (
        <TripDashboard trip={trip} setTrip={setTrip} />
      )}
    </div>
  );
};

export default Planner;
