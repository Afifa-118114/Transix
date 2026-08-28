import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";
import TripMapModal from "../components/map/TripMapModal";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function DashboardLayout({ trip, setTrip, children }) {
  const { isMapModalOpen, closeMapModal } = useTripBuilder();

  return (
    <div className="flex min-h-screen gap-4 bg-[#f8faff] dark:bg-[#0b0f19] p-4 transition-colors duration-200">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Navbar trip={trip} setTrip={setTrip} />

        <div className="mt-4 flex-1 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>

      {/* Premium Map Modal — rendered globally over DashboardLayout */}
      <TripMapModal isOpen={isMapModalOpen} onClose={closeMapModal} />
    </div>
  );
}
