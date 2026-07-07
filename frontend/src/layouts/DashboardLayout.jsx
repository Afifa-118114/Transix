import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

function DashboardLayout({ trip, setTrip, children }) {
  return (
    <div className="flex min-h-screen gap-3 bg-[#F5F7FF] p-4">
      <Sidebar />

      <main className="flex-1">
        <Navbar trip={trip} setTrip={setTrip} />

        <div className="mx-auto mt-6 max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

export default DashboardLayout;
