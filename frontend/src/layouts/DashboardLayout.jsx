import Sidebar from "../components/common/Sidebar";
import Navbar from "../components/common/Navbar";

export default function DashboardLayout({ trip, setTrip, children }) {
  return (
    <div className="flex min-h-screen gap-4 bg-[#f8faff] p-4">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <Navbar trip={trip} setTrip={setTrip} />

        <div className="mt-4 flex-1 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
