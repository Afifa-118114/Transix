import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";
import { useTripBuilder } from "../context/TripBuilderContext";
import DashboardLayout from "../layouts/DashboardLayout";

const TripPlanner = ({ trip: propTrip, setTrip: propSetTrip }) => {
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;

  const content = (
    <div className="w-full">
      {!trip ? (
        <TripForm setTrip={setTrip} />
      ) : (
        <TripDashboard trip={trip} setTrip={setTrip} />
      )}
    </div>
  );

  // If already rendered inside an outer DashboardLayout (e.g. Home.jsx), return content directly
  if (propTrip !== undefined || propSetTrip !== undefined) {
    return content;
  }

  // Standalone route (e.g. /planner) rendered with DashboardLayout & Sidebar
  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      {content}
    </DashboardLayout>
  );
};

export default TripPlanner;
