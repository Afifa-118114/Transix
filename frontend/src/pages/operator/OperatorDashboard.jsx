import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardStats, getOperatorTrips } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import { useAuth } from "../../context/AuthContext";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiActivity, FiCalendar, FiClock, FiAlertCircle, FiCheckCircle, 
  FiArrowRight, FiShield, FiBriefcase, FiUsers,
  FiZap, FiMenu, FiX, FiCheck, FiUser,
  FiAlertTriangle, FiCompass
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [statsData, tripsData] = await Promise.all([
          getDashboardStats(token),
          getOperatorTrips(token)
        ]);
        
        if (statsData?.success) {
          setStats(statsData.stats);
          setActionItems(statsData.actionItems || []);
          setRecentUpdates(statsData.recentUpdates || []);
        }
        if (tripsData?.success) {
          setTrips(tripsData.trips || []);
        }
      } catch (err) {
        console.error("Failed to load operator dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Real operator display name
  const operatorDisplayName = user?.name ? user.name.split(" ")[0] : "Operator";

  // Data-driven classification of trips
  const activeTrips = useMemo(() => {
    return trips.filter(t => t.timingStatus === "ACTIVE");
  }, [trips]);

  const upcomingTrips = useMemo(() => {
    return trips.filter(t => t.timingStatus === "UPCOMING");
  }, [trips]);

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Connecting to Tour Operations Center...</div>
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

      {/* Main Content Area */}
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
                  Operator Dashboard
                </div>
                <h1 className="text-lg font-black text-white">
                  {greeting}, {operatorDisplayName}
                </h1>
                <p className="text-xs text-slate-400">
                  Here's what needs attention today.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>System Operational</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-md ring-2 ring-indigo-500/20">
                {operatorDisplayName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Top Operational Summary (4 compact cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Personal Trips */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Personal Trips
                </div>
                <div className="text-2xl font-black text-white">{stats?.personalTrips || 0}</div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Shared with Operator</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 text-indigo-400">
                <FiCompass size={22} />
              </div>
            </div>

            {/* 2. Campus Trips */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Campus Trips
                </div>
                <div className="text-2xl font-black text-white">{stats?.campusTrips || 0}</div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">Educational & IV</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/60 text-indigo-400">
                <GraduationCap size={22} />
              </div>
            </div>

            {/* 3. Pending Bookings */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Pending Bookings
                </div>
                <div className="text-2xl font-black text-amber-400">{stats?.pendingBookings || 0}</div>
                <div className="text-[10px] font-semibold text-slate-500 mt-1">
                  {stats?.bookingReadiness?.actionRequired || 0} action required
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/40 text-amber-400">
                <FiClock size={22} />
              </div>
            </div>

            {/* 4. Active Disruptions */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Active Disruptions
                </div>
                <div className="text-2xl font-black text-emerald-400">{stats?.activeDisruptions || 0}</div>
                <div className="text-[10px] font-semibold text-emerald-500 mt-1">Routes on schedule</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-400">
                <FiCheckCircle size={22} />
              </div>
            </div>
          </div>

          {/* Main 2-Column Operational Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column (2 Cols): Action Required + Active Trips + Upcoming Trips */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* 1. ACTION REQUIRED — MOST IMPORTANT */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <FiAlertCircle size={16} />
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-white">
                        Action Required
                      </h2>
                      <p className="text-[11px] font-medium text-slate-400">
                        Operational work needing immediate coordination or booking
                      </p>
                    </div>
                  </div>
                  {actionItems.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60">
                      {actionItems.length} Urgent
                    </span>
                  )}
                </div>

                <div className="p-4">
                  {actionItems.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">
                      <FiCheckCircle className="mx-auto text-emerald-400 mb-2" size={24} />
                      No operational work requires attention right now.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {actionItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="p-3.5 bg-slate-950/70 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl flex items-center justify-between gap-3 transition group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-white line-clamp-1 transition">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="truncate">{item.subtitle}</span>
                              {item.severity === "HIGH" && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-rose-950 text-rose-400 border border-rose-900/50 uppercase">
                                  Urgent
                                </span>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/operator/trips/${item.tripId}`}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition shrink-0"
                          >
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* 2. ACTIVE TRIPS (Data-Driven: current date between start and end date) */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Active Trips ({activeTrips.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Currently executing in field
                  </span>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {activeTrips.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      No trips currently active in the field.
                    </div>
                  ) : (
                    activeTrips.map(trip => (
                      <div key={trip._id} className="p-5 hover:bg-slate-850/40 transition">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                trip.tripCategory === 'CAMPUS'
                                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {trip.tripCategory === 'CAMPUS' ? 'Campus Trip' : 'Personal Trip'}
                              </span>

                              {trip.organizationDetails?.name && (
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">
                                  {trip.organizationDetails.name}
                                </span>
                              )}
                              
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase">
                                ● In Progress
                              </span>
                            </div>

                            <div className="text-sm font-black text-white flex items-center gap-2">
                              <span>{trip.source}</span>
                              <FiArrowRight className="text-indigo-400" />
                              <span>{trip.destination}</span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                              <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                              <span>•</span>
                              <span>
                                {trip.travelers} {trip.tripCategory === 'CAMPUS' ? 'Students' : 'Travelers'}
                              </span>
                            </div>

                            {/* Operational Readiness Breakdown */}
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                Accommodation: <span className="text-white font-black">{trip.readiness?.accommodation?.confirmed || 0}/{trip.readiness?.accommodation?.total || 0}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                Transport: <span className="text-white font-black">{trip.readiness?.transport?.confirmed || 0}/{trip.readiness?.transport?.total || 0}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                {trip.tripCategory === 'CAMPUS' ? 'Visits' : 'Activities'}: <span className="text-white font-black">{trip.readiness?.visits?.confirmed || 0}/{trip.readiness?.visits?.total || 0}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                              <span className={`text-xs font-bold ${
                                trip.operationalStatus === "Action Required" ? "text-amber-400" :
                                trip.operationalStatus === "Confirmed" ? "text-emerald-400" : "text-slate-300"
                              }`}>
                                {trip.operationalStatus}
                              </span>
                            </div>
                            <Link 
                              to={`/operator/trips/${trip._id}`}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              Open Trip
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* 3. UPCOMING TRIPS (Data-Driven: start date in future) */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="text-indigo-400" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Upcoming Trips ({upcomingTrips.length})
                    </h2>
                  </div>
                  <Link to="/operator/trips" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    All Trips <FiArrowRight />
                  </Link>
                </div>

                <div className="divide-y divide-slate-800/60">
                  {upcomingTrips.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      No upcoming trips scheduled.
                    </div>
                  ) : (
                    upcomingTrips.map(trip => (
                      <div key={trip._id} className="p-5 hover:bg-slate-850/40 transition">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                trip.tripCategory === 'CAMPUS'
                                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {trip.tripCategory === 'CAMPUS' ? 'Campus Trip' : 'Personal Trip'}
                              </span>

                              {trip.organizationDetails?.name && (
                                <span className="text-xs font-bold text-slate-300 uppercase tracking-tight">
                                  {trip.organizationDetails.name}
                                </span>
                              )}
                            </div>

                            <div className="text-sm font-black text-white flex items-center gap-2">
                              <span>{trip.source}</span>
                              <FiArrowRight className="text-indigo-400" />
                              <span>{trip.destination}</span>
                            </div>

                            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                              <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                              <span>•</span>
                              <span>
                                {trip.travelers} {trip.tripCategory === 'CAMPUS' ? 'Students' : 'Travelers'}
                              </span>
                            </div>

                            {/* Operational Readiness Breakdown */}
                            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                Accommodation: <span className="text-white font-black">{trip.readiness?.accommodation?.confirmed || 0}/{trip.readiness?.accommodation?.total || 0}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                Transport: <span className="text-white font-black">{trip.readiness?.transport?.confirmed || 0}/{trip.readiness?.transport?.total || 0}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300">
                                {trip.tripCategory === 'CAMPUS' ? 'Visits' : 'Activities'}: <span className="text-white font-black">{trip.readiness?.visits?.confirmed || 0}/{trip.readiness?.visits?.total || 0}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                              <span className={`text-xs font-bold ${
                                trip.operationalStatus === "Action Required" ? "text-amber-400" :
                                trip.operationalStatus === "Confirmed" ? "text-emerald-400" : "text-slate-300"
                              }`}>
                                {trip.operationalStatus}
                              </span>
                            </div>
                            <Link 
                              to={`/operator/trips/${trip._id}`}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                            >
                              Open Trip
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

            </div>

            {/* Right Column (1 Col): Disruptions + Booking Readiness + Recent Updates + SmartShift */}
            <div className="space-y-6">
              
              {/* 1. ACTIVE DISRUPTIONS */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiAlertTriangle className={stats?.activeDisruptions > 0 ? "text-rose-400" : "text-emerald-400"} />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">
                      Active Disruptions
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {stats?.activeDisruptions || 0} Active
                  </span>
                </div>
                
                <div className="p-4">
                  {stats?.activeDisruptions > 0 ? (
                    <div className="p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-xl space-y-2">
                      <div className="text-xs font-black text-rose-400 uppercase tracking-wide">
                        Disruption Reported
                      </div>
                      <div className="text-xs text-slate-300 font-semibold">
                        Delay detected on corridor. Cascade impact calculations available.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center gap-3.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base border border-emerald-500/20 shrink-0">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">No active disruptions</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          All transit legs and stay schedules operating normally.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. BOOKING READINESS */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-400" /> Booking Readiness
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                    <span className="font-bold text-slate-300">Confirmed</span>
                    <span className="font-black text-emerald-400">{stats?.bookingReadiness?.confirmed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                    <span className="font-bold text-slate-300">Processing</span>
                    <span className="font-black text-blue-400">{stats?.bookingReadiness?.processing || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60">
                    <span className="font-bold text-slate-300">Not Booked</span>
                    <span className="font-black text-slate-400">{stats?.bookingReadiness?.notBooked || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <FiAlertCircle className="text-amber-400" /> Action Required
                    </span>
                    <span className="font-black text-amber-400">{stats?.bookingReadiness?.actionRequired || 0}</span>
                  </div>
                </div>
              </section>

              {/* 3. RECENT OPERATIONAL UPDATES (Persisted records only) */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiClock className="text-indigo-400" /> Recent Operational Updates
                  </h2>
                </div>
                <div className="p-4">
                  {recentUpdates.length === 0 ? (
                    <div className="py-4 text-center text-slate-500 text-xs font-medium">
                      No recent operational updates.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentUpdates.map((update, idx) => (
                        <div key={update.id || idx} className="flex items-start gap-3 text-xs">
                          <span className="text-indigo-400 mt-0.5">•</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-200 capitalize truncate">
                              {update.title}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                              <span className="truncate">{update.subtitle}</span>
                              <span className="shrink-0 text-slate-400 ml-2">{getRelativeTime(update.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* 4. SMARTSHIFT CENTER */}
              <section className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800 bg-slate-900/80">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <FiZap className="text-amber-400" /> SmartShift Center
                  </h2>
                  <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Validated alternatives for itinerary disruptions.
                  </div>
                </div>
                <div className="p-5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 text-amber-400 border border-slate-700 flex items-center justify-center mx-auto mb-3">
                    <FiZap size={20} />
                  </div>
                  <div className="text-xs font-bold text-white mb-1">SmartShift ready</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Simulate a disruption from a trip to generate validated alternatives.
                  </div>
                </div>
              </section>

            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
