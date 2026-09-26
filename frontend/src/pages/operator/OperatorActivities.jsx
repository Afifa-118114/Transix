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
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-[#666666] gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          Loading Activities...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex font-sans">
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
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
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
        <header className="bg-white border-b border-[#EBEBEB] sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 rounded-lg border border-[#EBEBEB] text-[#1A1A1A] hover:bg-[#F5F7FA]"
              >
                <FiMenu size={18} />
              </button>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4] mb-0.5">
                  TRANSIX • OPERATIONS
                </div>
                <h1 className="text-lg font-bold text-[#1A1A1A]">
                  Activities & Tickets
                </h1>
                <p className="text-xs text-[#666666]">
                  Operational coordination for trip activities, attractions, and educational visits
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl w-full mx-auto">
          
          {/* Sub-Filters: [ Not Booked ] [ Booked ] */}
          <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubFilter("not-booked")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  subFilter === "not-booked"
                    ? "bg-[#FFF4ED] text-[#F5330F] border border-[#FFD0B8] shadow-xs"
                    : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
                }`}
              >
                <FiClock size={13} />
                <span>Not Booked</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]">
                  {notBookedCount}
                </span>
              </button>
              <button
                onClick={() => setSubFilter("booked")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  subFilter === "booked"
                    ? "bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7] shadow-xs"
                    : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
                }`}
              >
                <FiCheckCircle size={13} />
                <span>Booked</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]">
                  {bookedCount}
                </span>
              </button>
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {displayedActivities.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-12 text-center text-[#666666] text-xs shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <FiCheckCircle className="mx-auto text-[#00A65E] mb-3" size={28} />
                {subFilter === "not-booked" ? (
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      No unbooked activities.
                    </div>
                    <div className="text-[#666666] mt-1">
                      All trip activities are confirmed.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      No booked activities yet.
                    </div>
                    <div className="text-[#666666] mt-1">
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
                      className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-[#1A1A1A] truncate">
                              {b.title}
                            </h3>
                            <div className="text-[11px] font-medium text-[#666666] mt-0.5 truncate">
                              {orgName || `${trip?.source || "Trip"} → ${trip?.destination || ""}`}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            b.status === "CONFIRMED"
                              ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                              : "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                          }`}>
                            {b.status === "CONFIRMED" ? "Booked" : "Not Booked"}
                          </span>
                        </div>

                        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs text-[#666666]">
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Location:</span>
                            <span className="font-medium text-[#1A1A1A] truncate ml-2">{b.location || trip?.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Date:</span>
                            <span className="font-medium text-[#1A1A1A]">{dateLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Travelers:</span>
                            <span className="font-medium text-[#1A1A1A]">{travelersLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end border-t border-[#EBEBEB]">
                        <Link
                          to={`/operator/trips/${b.tripId || b.trip?._id}?tab=activities&activityId=${b._id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
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
