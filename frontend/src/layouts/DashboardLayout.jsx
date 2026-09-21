import { useLocation } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import TripMapModal from "../components/map/TripMapModal";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function DashboardLayout({ trip, setTrip, children }) {
  const { isMapModalOpen, closeMapModal } = useTripBuilder();
  const location = useLocation();

  // Hide sidebar when answering the wizard questionnaire
  const isWizard =
    (location.pathname === "/home" || location.pathname === "/planner") && !trip;

  return (
    <div className="relative flex min-h-screen bg-[#ffffff] font-sans antialiased text-[#0c0a09]">
      {/* Show sidebar only when NOT in wizard */}
      {!isWizard && <Sidebar trip={trip} setTrip={setTrip} />}

      {/* Main Content Area */}
      <main
        className={`relative z-10 flex-1 min-w-0 min-h-screen overflow-y-auto bg-[#ffffff] ${
          isWizard
            ? "flex flex-col items-center justify-center p-6 sm:p-10"
            : "p-6 sm:p-8 lg:p-12"
        }`}
      >
        <div className={`w-full ${isWizard ? "max-w-[420px]" : "max-w-[1200px]"} mx-auto`}>
          {children}
        </div>
      </main>

      {/* Premium Map Modal — rendered globally over DashboardLayout */}
      <TripMapModal isOpen={isMapModalOpen} onClose={closeMapModal} />
    </div>
  );
}
