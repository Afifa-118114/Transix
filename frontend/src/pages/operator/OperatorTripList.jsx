import React, { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getOperatorTrips, getDashboardStats, claimOperatorTrip, releaseOperatorTrip } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import toast from "react-hot-toast";
import { 
  FiArrowRight, FiUsers, FiCalendar, FiArrowLeft, 
  FiBriefcase, FiMenu, FiX, FiClock, FiCheckCircle, FiCompass,
  FiZap, FiLock, FiUnlock
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";

export default function OperatorTripList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get("type"); // "personal" | "campus" | null
  const scopeFilter = searchParams.get("scope") || "all"; // "all" | "my" | "unassigned"

  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [tripsData, statsData] = await Promise.all([
        getOperatorTrips(token, scopeFilter, filterType),
        getDashboardStats(token)
      ]);
      if (tripsData?.success) {
        setTrips(tripsData.trips || []);
      }
      if (statsData?.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error("Failed to load operator trips", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const interval = setInterval(fetchData, 10000);
    const onFocus = () => fetchData();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [scopeFilter, filterType]);

  const handleClaim = async (tripId) => {
    try {
      setActionLoadingId(tripId);
      const token = localStorage.getItem("token");
      const res = await claimOperatorTrip(tripId, token);
      toast.success(res.message || "Tour claimed successfully! You are now managing this trip.");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to claim tour.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRelease = async (tripId) => {
    if (!window.confirm("Are you sure you want to release this tour back to the open marketplace?")) return;
    try {
      setActionLoadingId(tripId);
      const token = localStorage.getItem("token");
      const res = await releaseOperatorTrip(tripId, token);
      toast.success(res.message || "Tour released back to the open pool.");
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to release tour.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter trips according to ?type=
  const filteredTrips = useMemo(() => {
    if (filterType === "personal") {
      return trips.filter(t => t.tripCategory !== "CAMPUS");
    }
    if (filterType === "campus") {
      return trips.filter(t => t.tripCategory === "CAMPUS");
    }
    return trips;
  }, [trips, filterType]);

  const pageTitle = filterType === "personal" 
    ? "Personal Trips" 
    : filterType === "campus" 
    ? "Campus Trips" 
    : "All Operations Trips";

  const pageSubtitle = filterType === "personal"
    ? "Finalized personal journeys shared with Tour Operations"
    : filterType === "campus"
    ? "Finalized institutional & student visits shared with Tour Operations"
    : "Operational view of all finalized shared journeys";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-[#666666] gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">Loading Trips...</div>
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
                <div className="flex items-center gap-2 mb-0.5">
                  <Link to="/operator/dashboard" className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4] hover:underline flex items-center gap-1">
                    <FiArrowLeft size={10} /> Dashboard
                  </Link>
                  <span className="text-[#A0AEC0] text-xs">/</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">
                    Trips
                  </span>
                </div>
                <h1 className="text-lg font-bold text-[#1A1A1A]">{pageTitle}</h1>
                <p className="text-xs text-[#666666]">{pageSubtitle}</p>
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filters */}
              <div className="flex items-center gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0]">
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.delete("type");
                    setSearchParams(next);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    !filterType 
                      ? "bg-[#0064D2] text-white shadow-xs" 
                      : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white/60"
                  }`}
                >
                  All ({trips.length})
                </button>
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("type", "personal");
                    setSearchParams(next);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterType === "personal" 
                      ? "bg-[#0064D2] text-white shadow-xs" 
                      : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white/60"
                  }`}
                >
                  <FiCompass size={12} /> Personal ({stats?.personalTrips || 0})
                </button>
                <button
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    next.set("type", "campus");
                    setSearchParams(next);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    filterType === "campus" 
                      ? "bg-[#0064D2] text-white shadow-xs" 
                      : "text-[#666666] hover:text-[#1A1A1A] hover:bg-white/60"
                  }`}
                >
                  <GraduationCap size={14} /> Campus ({stats?.campusTrips || 0})
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 custom-scrollbar max-w-7xl w-full mx-auto">
          {filteredTrips.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#EBEBEB] p-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <FiBriefcase className="mx-auto text-[#A0AEC0] mb-3" size={36} />
              <h2 className="text-sm font-bold text-[#1A1A1A] mb-1">No trips found</h2>
              <p className="text-xs text-[#666666] max-w-sm mx-auto">
                {scopeFilter === "unassigned" 
                  ? "There are currently no unclaimed trips in the Open Marketplace pool."
                  : scopeFilter === "my"
                  ? "You have not claimed any tours yet. Switch to 'Open Pool' to claim tours!"
                  : "No finalized trips match the selected criteria."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => (
                <div 
                  key={trip._id} 
                  className="bg-white rounded-xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#0064D2]/40 hover:-translate-y-0.5 transition-all duration-150"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          trip.tripCategory === 'CAMPUS'
                            ? 'bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]'
                            : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                        }`}>
                          {trip.tripCategory === 'CAMPUS' ? 'Campus Trip' : 'Personal Trip'}
                        </span>

                        {trip.organizationDetails?.name && (
                          <span className="text-xs font-bold text-[#1A1A1A]">
                            {trip.organizationDetails.name}
                          </span>
                        )}

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          trip.timingStatus === "ACTIVE"
                            ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                            : trip.timingStatus === "UPCOMING"
                            ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]"
                            : "bg-[#F1F5F9] text-[#666666] border-[#E2E8F0]"
                        }`}>
                          {trip.timingStatus === "ACTIVE" ? "● Active Now" : trip.timingStatus}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                        <span>{trip.source}</span>
                        <FiArrowRight className="text-[#006CE4]" />
                        <span>{trip.destination}</span>
                      </div>

                      {/* Meta Information */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-[#666666]">
                        <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                        <span>•</span>
                        <span>
                          {trip.travelers} {trip.tripCategory === 'CAMPUS' ? 'Students' : 'Travelers'}
                        </span>
                        <span>•</span>
                        <span className="text-[#1A1A1A]">
                          {trip.user?.name || trip.coordinatorId?.name || "Shared"} ({trip.user?.email || trip.coordinatorId?.email || ""})
                        </span>
                      </div>

                      {/* Operational Progress Counts */}
                      <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] font-semibold">
                        <span className="px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#666666]">
                          Accommodation: <span className="text-[#1A1A1A] font-bold">{trip.readiness?.accommodation?.confirmed || 0}/{trip.readiness?.accommodation?.total || 0}</span>
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#666666]">
                          Transport: <span className="text-[#1A1A1A] font-bold">{trip.readiness?.transport?.confirmed || 0}/{trip.readiness?.transport?.total || 0}</span>
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-[#666666]">
                          {trip.tripCategory === 'CAMPUS' ? 'Visits' : 'Activities'}: <span className="text-[#1A1A1A] font-bold">{trip.readiness?.visits?.confirmed || 0}/{trip.readiness?.visits?.total || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right Status & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#EBEBEB]">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Operational Status</span>
                        <span className={`text-xs font-bold ${
                          trip.operationalStatus === "Action Required" ? "text-[#F5330F]" :
                          trip.operationalStatus === "Confirmed" ? "text-[#00A65E]" : "text-[#0064D2]"
                        }`}>
                          {trip.operationalStatus}
                        </span>
                      </div>

                      <Link 
                        to={`/operator/trips/${trip._id}`}
                        className="px-4 py-2 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
                      >
                        <span>Manage</span>
                        <FiArrowRight size={13} />
                      </Link>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}
