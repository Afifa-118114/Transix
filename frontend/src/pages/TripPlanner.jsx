import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";

const Planner = ({ trip, setTrip }) => {
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
