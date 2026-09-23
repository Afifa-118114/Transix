import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardStats, getOperatorTrips, getOperatorAllVendorRequests } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import { useAuth } from "../../context/AuthContext";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiActivity, FiCalendar, FiClock, FiAlertCircle, FiCheckCircle, 
  FiArrowRight, FiShield, FiBriefcase, FiUsers,
  FiZap, FiMenu, FiX, FiCheck, FiUser,
  FiAlertTriangle, FiCompass, FiSend
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [actionItems, setActionItems] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vendorRequests, setVendorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const token = localStorage.getItem("token");
        const [statsData, tripsData, vendorRequestsData] = await Promise.all([
          getDashboardStats(token),
          getOperatorTrips(token),
          getOperatorAllVendorRequests(token).catch(() => null),
        ]);
        
        if (statsData?.success) {
          setStats(statsData.stats);
          setActionItems(statsData.actionItems || []);
          setRecentUpdates(statsData.recentUpdates || []);
        }
        if (tripsData?.success) {
          setTrips(tripsData.trips || []);
        }
        if (vendorRequestsData?.success) {
          setVendorRequests(vendorRequestsData.requests || []);
        }
        lastFetchRef.current = Date.now();
      } catch (err) {
        console.error("Failed to load Tour Operation Center data", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    };
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 25000);
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 15000) {
        fetchDashboardData();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Operator display name
  const operatorDisplayName = user?.name ? user.name.split(" ")[0] : "Operator";

  // Data-driven categorization of trips
  const personalTrips = useMemo(() => {
    return trips.filter(t => t.tripCategory !== "CAMPUS");
  }, [trips]);

  const campusTrips = useMemo(() => {
    return trips.filter(t => t.tripCategory === "CAMPUS");
  }, [trips]);

  // Operational attention metrics (computed dynamically from existing data)
  const tripsRequiringActionCount = useMemo(() => {
    const flagTrips = trips.filter(
      t => t.operationalStatus === "Action Required" || (t.bookingProgress && t.bookingProgress.actionRequired > 0)
    );
    return Math.max(flagTrips.length, actionItems.length);
  }, [trips, actionItems]);

  const vendorRequestsCount = useMemo(() => {
    return vendorRequests.length;
  }, [vendorRequests]);

  const pendingConfirmationsCount = useMemo(() => {
    const processingBookings = stats?.bookingReadiness?.processing || 0;
    const confirmationReqs = vendorRequests.filter(r => r.status === "CONFIRMATION_REQUESTED").length;
    return processingBookings + confirmationReqs;
  }, [stats, vendorRequests]);

  const activeDisruptionsCount = useMemo(() => {
    return stats?.activeDisruptions || 0;
  }, [stats]);

  // Meaningful vendor activity (awaiting review, responses received, confirmations)
  const activeVendorActivity = useMemo(() => {
    const active = vendorRequests.filter(
      r => r.status === "RESPONDED" || r.status === "CONFIRMATION_REQUESTED" || (r.response && r.response.availability)
    );
    return active.length > 0 ? active.slice(0, 6) : vendorRequests.slice(0, 4);
  }, [vendorRequests]);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Connecting to Tour Operation Center...
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - TRANSIX Tour Operation Center */}
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
                  TRANSIX
                </div>
                <h1 className="text-lg font-black text-white">
                  Tour Operation Center
                </h1>
                <p className="text-xs text-slate-400">
                  {greeting}, {operatorDisplayName} — What does Transix need to operate today?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Operations Active</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-md ring-2 ring-indigo-500/20">
                {operatorDisplayName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* ========================================================================= */}
          {/* 1. TODAY'S OPERATIONS                                                    */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Today's Operations
                </h2>
                <p className="text-xs font-semibold text-white mt-0.5">
                  Operational attention metrics requiring Transix action
                </p>
              </div>
            </div>

            {/* 4 Attention Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Trips Requiring Action */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Trips Requiring Action
                  </div>
                  <div className="text-2xl font-black text-amber-400">{tripsRequiringActionCount}</div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1">
                    Needing bookings or review
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/40 text-amber-400">
                  <FiAlertCircle size={22} />
                </div>
              </div>

              {/* Metric 2: Vendor Requests */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Vendor Requests
                  </div>
                  <div className="text-2xl font-black text-white">{vendorRequestsCount}</div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1">
                    Dispatched to network
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 text-indigo-400">
                  <FiSend size={22} />
                </div>
              </div>

              {/* Metric 3: Pending Confirmations */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Pending Confirmations
                  </div>
                  <div className="text-2xl font-black text-blue-400">{pendingConfirmationsCount}</div>
                  <div className="text-[10px] font-semibold text-slate-500 mt-1">
                    In processing or review
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/40 text-blue-400">
                  <FiClock size={22} />
                </div>
              </div>

              {/* Metric 4: Active Disruptions */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                    Active Disruptions
                  </div>
                  <div className="text-2xl font-black text-emerald-400">{activeDisruptionsCount}</div>
                  <div className="text-[10px] font-semibold text-emerald-500 mt-1">
                    Routes on schedule
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-400">
                  <FiCheckCircle size={22} />
                </div>
              </div>
            </div>

            {/* Action Items List (if any urgent operational work) */}
            {actionItems.length > 0 && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-2">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <FiAlertCircle /> Action Items Needing Attention ({actionItems.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {actionItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 bg-slate-950/70 border border-slate-800 hover:border-indigo-500/40 rounded-xl flex items-center justify-between gap-3 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-200 line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <Link
                        to={`/operator/trips/${item.tripId}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[11px] font-bold transition shrink-0"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* 2. TRAVELER TRIPS (Personal Trips & Campus Trips)                         */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Traveler Trips
                </h2>
                <p className="text-xs font-semibold text-white mt-0.5">
                  Operational journeys received and coordinated by Transix
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Personal Trips Column */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <FiCompass size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Personal Trips
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {personalTrips.length} journeys shared by travelers
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/operator/trips?type=personal"
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    View All <FiArrowRight size={12} />
                  </Link>
                </div>

                <div className="space-y-3">
                  {personalTrips.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No personal trips shared with Transix.
                    </div>
                  ) : (
                    personalTrips.map(trip => (
                      <div 
                        key={trip._id}
                        className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{trip.source}</span>
                            <FiArrowRight className="text-indigo-400" size={13} />
                            <span>{trip.destination}</span>
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-slate-300">Shared by Traveler</span>
                            <span>•</span>
                            <span>{trip.duration || "Multi-day"}</span>
                            <span>•</span>
                            <span>{trip.travelers || 2} Travelers</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded border ${
                              trip.operationalStatus === "Confirmed" 
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                                : trip.operationalStatus === "Action Required"
                                ? "bg-amber-950/60 text-amber-400 border-amber-800/40"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {trip.operationalStatus || "Processing"}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${trip._id}`}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shrink-0"
                        >
                          Open
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Campus Trips Column */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      <GraduationCap size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Campus Trips
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {campusTrips.length} institutional visits & IV tours
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/operator/trips?type=campus"
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    View All <FiArrowRight size={12} />
                  </Link>
                </div>

                <div className="space-y-3">
                  {campusTrips.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No campus trips shared with Transix.
                    </div>
                  ) : (
                    campusTrips.map(trip => (
                      <div 
                        key={trip._id}
                        className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{trip.source}</span>
                            <FiArrowRight className="text-indigo-400" size={13} />
                            <span>{trip.destination}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-300 mt-0.5">
                            {trip.organizationDetails?.name || "Campus Institution"}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                            <span>{trip.duration || "Multi-day"}</span>
                            <span>•</span>
                            <span>{trip.travelers || 20} Students</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold">
                            <span className={`px-2 py-0.5 rounded border ${
                              trip.operationalStatus === "Confirmed" 
                                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                                : trip.operationalStatus === "Action Required"
                                ? "bg-amber-950/60 text-amber-400 border-amber-800/40"
                                : "bg-slate-800 text-slate-300 border-slate-700"
                            }`}>
                              {trip.operationalStatus || "Processing"}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${trip._id}`}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shrink-0"
                        >
                          Open
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. VENDOR ACTIVITY & 4. RECENT OPERATIONAL ACTIVITY (2 Columns)           */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* VENDOR ACTIVITY (2 Columns on large screens) */}
            <div className="lg:col-span-2 bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FiBriefcase size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Vendor Activity
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Meaningful vendor responses and requests requiring review
                    </p>
                  </div>
                </div>
                <Link
                  to="/operator/vendor-requests"
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  All Requests <FiArrowRight size={12} />
                </Link>
              </div>

              <div className="space-y-3">
                {activeVendorActivity.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs font-medium">
                    <FiCheckCircle className="mx-auto text-emerald-400 mb-2" size={24} />
                    No vendor activity currently awaiting review.
                  </div>
                ) : (
                  activeVendorActivity.map(req => {
                    const vendorName = req.vendorId?.name || "Connected Vendor";
                    const routeLabel = req.trip 
                      ? `${req.trip.source} → ${req.trip.destination} · Group Fleet`
                      : req.route
                      ? `${req.route.originCity || "Origin"} → ${req.route.destinationCity || "Destination"} · Group Fleet`
                      : "Campus Group Fleet";
                    
                    const isResponded = req.status === "RESPONDED" || Boolean(req.response?.availability);
                    const isConfReq = req.status === "CONFIRMATION_REQUESTED";

                    return (
                      <div 
                        key={req._id}
                        className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{vendorName}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {routeLabel}
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            {isResponded ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                                <FiCheck size={11} /> Response received
                                {req.response?.quoteTotal ? ` (₹${Number(req.response.quoteTotal).toLocaleString()})` : ""}
                              </span>
                            ) : isConfReq ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-950/60 text-blue-400 border border-blue-800/40">
                                ◴ Confirmation requested
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
                                {req.status === "SENT" ? "Awaiting response" : req.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${req.tripId}?tab=transport`}
                          className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-bold transition text-center shrink-0"
                        >
                          Review
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RECENT OPERATIONAL ACTIVITY (1 Column) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <FiClock size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Recent Activity
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Real-time operational events
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {recentUpdates.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No recent operational activity.
                  </div>
                ) : (
                  recentUpdates.slice(0, 6).map((update, idx) => {
                    const isConfirmed = update.status === "CONFIRMED";
                    const isActionReq = update.status === "ACTION_REQUIRED";
                    
                    return (
                      <div key={update.id || idx} className="flex items-start gap-2.5 text-xs py-1 border-b border-slate-800/40 last:border-0">
                        <span className={`mt-0.5 text-xs font-black shrink-0 ${
                          isConfirmed ? "text-emerald-400" : isActionReq ? "text-amber-400" : "text-indigo-400"
                        }`}>
                          {isConfirmed ? "✓" : isActionReq ? "⚠" : "•"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-200 truncate capitalize">
                            {update.title}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span className="truncate">{update.subtitle}</span>
                            <span className="shrink-0 text-slate-500 ml-2">{getRelativeTime(update.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
