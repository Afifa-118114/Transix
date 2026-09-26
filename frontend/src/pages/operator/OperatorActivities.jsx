import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOperatorBookings, getDashboardStats } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiActivity, FiCheckCircle, FiClock, FiCalendar, 
  FiMapPin, FiUsers, FiMenu, FiX, FiArrowRight
} from "react-icons/fi";

export default function OperatorActivities() {
  const navigate = useNavigate();
  const [subFilter, setSubFilter] = useState("not-booked"); // "not-booked" | "booked"
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [bookingsData, statsData] = await Promise.all([
          getOperatorBookings(token),
          getDashboardStats(token).catch(() => null),
        ]);

        if (bookingsData?.success) {
          setBookings(bookingsData.bookings || []);
        }
        if (statsData?.success) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error("Failed to load operator activities", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 10000);
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Filter activities only (ACTIVITY, VISIT, PERMISSION)
  const allActivities = useMemo(() => {
    return bookings.filter(b => b.type === "ACTIVITY" || b.type === "VISIT" || b.type === "PERMISSION");
  }, [bookings]);

  const displayedActivities = useMemo(() => {
    if (subFilter === "booked") {
      return allActivities.filter(b => b.status === "CONFIRMED");
    }
    return allActivities.filter(b => b.status !== "CONFIRMED" && b.status !== "CANCELLED");
  }, [allActivities, subFilter]);

  const bookedCount = useMemo(() => {
    return allActivities.filter(b => b.status === "CONFIRMED").length;
  }, [allActivities]);

  const notBookedCount = useMemo(() => {
    return allActivities.length - bookedCount;
  }, [allActivities, bookedCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Activities...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-64 flex-shrink-0 hidden lg:block h-screen sticky top-0">
        <OperatorSidebar 
          personalCount={stats?.personalTrips} 
          campusCount={stats?.campusTrips} 
          pendingCount={stats?.pendingBookings} 
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-64 max-w-[80%] h-full z-10 flex flex-col">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white z-20"
            >
              <FiX size={20} />
            </button>
            <OperatorSidebar 
              personalCount={stats?.personalTrips} 
              campusCount={stats?.campusTrips} 
              pendingCount={stats?.pendingBookings} 
            />
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-slate-400 hover:text-white"
              >
                <FiMenu size={20} />
              </button>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-0.5">
                  TRANSIX • OPERATIONS
                </div>
                <h1 className="text-lg font-black text-white">
                  Activities
                </h1>
                <p className="text-xs text-slate-400">
                  Operational coordination for trip activities, attractions, and educational visits
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Sub-Filters: [ Not Booked ] [ Booked ] */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubFilter("not-booked")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  subFilter === "not-booked"
                    ? "bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FiClock size={13} />
                <span>Not Booked</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                  {notBookedCount}
                </span>
              </button>
              <button
                onClick={() => setSubFilter("booked")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  subFilter === "booked"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FiCheckCircle size={13} />
                <span>Booked</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                  {bookedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {displayedActivities.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                <FiCheckCircle className="mx-auto text-emerald-400 mb-3" size={28} />
                {subFilter === "not-booked" ? (
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      No unbooked activities.
                    </div>
                    <div className="text-slate-500 mt-1">
                      All trip activities are confirmed.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      No booked activities yet.
                    </div>
                    <div className="text-slate-500 mt-1">
                      Confirmed activities will appear here.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedActivities.map((b) => {
                  const trip = b.trip;
                  const isCampus = trip?.tripCategory === "CAMPUS";
                  const orgName = trip?.organizationDetails?.name;
                  const dateLabel = trip?.startDate ? formatDate(trip.startDate) : "Scheduled Date";
                  const travelersLabel = isCampus 
                    ? `${trip?.travelers || 20} Students` 
                    : `${trip?.travelers || 2} Travelers`;

                  return (
                    <div 
                      key={b._id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-white truncate">
                            {b.title}
                          </h3>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 truncate">
                            {orgName || `${trip?.source} → ${trip?.destination}`}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          b.status === "CONFIRMED"
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                            : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                        }`}>
                          {b.status === "CONFIRMED" ? "Booked" : "Not Booked"}
                        </span>
                      </div>

                      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Location:</span>
                          <span className="font-semibold text-slate-200 truncate ml-2">{b.location || trip?.destination}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date:</span>
                          <span className="font-semibold text-slate-200">{dateLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Travelers:</span>
                          <span className="font-semibold text-slate-200">{travelersLabel}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <Link
                          to={`/operator/trips/${b.tripId || b.trip?._id}?tab=activities&activityId=${b._id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <span>View</span>
                          <FiArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
