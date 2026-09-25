import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import TripForm from "../components/planner/TripForm";
import TripDashboard from "../components/planner/TripDashboard";
import { useTripBuilder } from "../context/TripBuilderContext";
import { useAuth } from "../context/AuthContext";
import PublicNavbar from "../components/public/PublicNavbar";

const TripPlanner = ({ trip: propTrip, setTrip: propSetTrip }) => {
  const { trip: contextTrip, setTrip: contextSetTrip } = useTripBuilder();
  const { isAuthenticated } = useAuth();
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

  // If unauthenticated guest visiting /planner, provide clean PublicNavbar and container
  if (!isAuthenticated && !propTrip) {
    return (
      <div className="relative min-h-screen bg-[#f8faff] text-slate-900 overflow-hidden">
        {/* Atmospheric ambient glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
          <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/[0.05] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-1/4 w-[500px] h-[300px] bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        </div>
        <PublicNavbar />
        <div className="relative z-10 pt-24 max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] dark:border-[#2e2a27] bg-white/80 dark:bg-[#1a1816]/80 backdrop-blur-md px-3.5 py-1.5 text-xs font-medium text-[#4e4e4e] dark:text-[#a8a29e] hover:text-[#0c0a09] dark:hover:text-white hover:border-[#0c0a09] dark:hover:border-white transition-all shadow-2xs"
            >
              <FiArrowLeft className="text-sm" />
              <span>Back to Overview</span>
            </Link>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default TripPlanner;
