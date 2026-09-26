import { useLocation } from "react-router-dom";
import Sidebar from "../components/common/Sidebar";
import TripMapModal from "../components/map/TripMapModal";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function DashboardLayout({ trip, setTrip, children }) {
  const { isMapModalOpen, closeMapModal } = useTripBuilder();
  const location = useLocation();

  const isPromptWizard =
    (location.pathname === "/home" || location.pathname === "/planner") && !trip;

  return (
    <div className="relative flex min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] font-sans antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Subtle landing-page atmospheric ambient glow layer (no green) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/[0.04] dark:bg-indigo-500/[0.07] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 right-1/4 w-[500px] h-[300px] bg-purple-500/[0.03] dark:bg-purple-500/[0.05] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Persistent Sidebar across all views including prompt page */}
      <Sidebar trip={trip} setTrip={setTrip} />

      {/* Main Content Area */}
      <main
        className={`relative z-10 flex-1 min-w-0 min-h-screen overflow-y-auto ${
          isPromptWizard
            ? "flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8"
            : "p-4 sm:p-6 lg:p-8 bg-[#f8faff] dark:bg-[#0b0f19]"
        }`}
      >
        <div className={`w-full ${isPromptWizard ? "max-w-3xl" : "max-w-[1240px]"} mx-auto`}>
          {children}
        </div>
      </main>

      {/* Premium Map Modal — rendered globally over DashboardLayout */}
      <TripMapModal isOpen={isMapModalOpen} onClose={closeMapModal} />
    </div>
  );
}
