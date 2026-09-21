import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/public/PublicNavbar";

const Planner = ({ trip: propTrip, setTrip: propSetTrip }) => {
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();
  const { isAuthenticated } = useAuth();
  const trip = propTrip !== undefined ? propTrip : contextTrip;
  const setTrip = propSetTrip || contextSetTrip;

  const content = (
    <div className="p-4 sm:p-6">
      {!trip ? (
        <TripForm setTrip={setTrip} />
      ) : (
        <TripDashboard trip={trip} setTrip={setTrip} />
      )}
    </div>
  );

  // If unauthenticated guest visiting /planner, provide clean PublicNavbar and container
  if (!isAuthenticated && !propTrip) {
    return (
      <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors">
        <PublicNavbar />
        <div className="pt-24 max-w-4xl mx-auto px-4">
          <div className="mb-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition"
            >
              <FiArrowLeft />
              <span>Back to Home</span>
            </Link>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default Planner;
