import React, { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const fetchDashboardData = async () => {
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
      } catch (err) {
        console.error("Failed to load Tour Operation Center data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 10000);
    const onFocus = () => fetchDashboardData();
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

  // Formatted date string (e.g. Saturday, Sep 26, 2026)
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }, []);

  // Operator display name
  const operatorDisplayName = user?.name ? user.name.split(" ")[0] : "Operator";

  // Data-driven categorization of trips - newest shared/updated always first
  const personalTrips = useMemo(() => {
    return trips
      .filter(t => t.tripCategory !== "CAMPUS")
      .sort((a, b) => new Date(b.operatorAccess?.grantedAt || b.updatedAt) - new Date(a.operatorAccess?.grantedAt || a.updatedAt));
  }, [trips]);

  const campusTrips = useMemo(() => {
    return trips
      .filter(t => t.tripCategory === "CAMPUS")
      .sort((a, b) => new Date(b.operatorAccess?.grantedAt || b.updatedAt) - new Date(a.operatorAccess?.grantedAt || a.updatedAt));
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
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-slate-500 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Connecting to Tour Operation Center...
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        {/* Mobile Header Only */}
        <header className="lg:hidden bg-white border-b border-[#E5E7EB] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-[#E5E7EB] text-[#1A1A1A] hover:bg-[#F5F7FA]"
            >
              <FiMenu size={18} />
            </button>
            <span className="text-sm font-bold text-[#1A1A1A]">Tour Operation Center</span>
          </div>
          <div className="h-7 w-7 rounded-full bg-[#0064D2] flex items-center justify-center text-xs font-bold text-white">
            {operatorDisplayName.slice(0, 2).toUpperCase()}
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* TOP WELCOME & LIVE OPERATIONAL BAR                                        */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] tracking-tight">
                {greeting}, {operatorDisplayName}
              </h1>
              <p className="text-xs sm:text-sm text-[#666666] mt-0.5">
                Overview of current traveler journeys, vendor responses, and operations
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7]">
                <span className="w-2 h-2 rounded-full bg-[#00A65E] animate-pulse"></span>
                Operations Live
              </span>
              <span className="text-xs text-[#666666] bg-[#F5F7FA] border border-[#EBEBEB] px-3 py-1 rounded-full font-medium">
                {formattedToday}
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. ATTENTION METRICS CARDS (Trip.com Scan-First Metric Pattern)            */}
          {/* ========================================================================= */}
          <section className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Metric 1: Trips Requiring Action */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Action Required
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#FFF4ED] border border-[#FFD0B8] text-[#F5330F] flex items-center justify-center">
                    <FiAlertCircle size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#F5330F]">
                    {tripsRequiringActionCount}
                  </div>
                  <div className="text-xs text-[#666666] mt-1">
                    Trips needing booking review
                  </div>
                </div>
              </div>

              {/* Metric 2: Vendor Requests */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Vendor Requests
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#0064D2] flex items-center justify-center">
                    <FiSend size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
                    {vendorRequestsCount}
                  </div>
                  <div className="text-xs text-[#666666] mt-1">
                    Dispatched across network
                  </div>
                </div>
              </div>

              {/* Metric 3: Pending Confirmations */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Pending Confirmations
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#0064D2] flex items-center justify-center">
                    <FiClock size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#0064D2]">
                    {pendingConfirmationsCount}
                  </div>
                  <div className="text-xs text-[#666666] mt-1">
                    In processing or review
                  </div>
                </div>
              </div>

              {/* Metric 4: Active Disruptions */}
              <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Active Disruptions
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-[#E6F7EF] border border-[#A3E9C7] text-[#00A65E] flex items-center justify-center">
                    <FiCheckCircle size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#00A65E]">
                    {activeDisruptionsCount}
                  </div>
                  <div className="text-xs text-[#00A65E] font-medium mt-1">
                    All itineraries on schedule
                  </div>
                </div>
              </div>

            </div>

            {/* Action Items List (Urgency banner if any urgent operational work) */}
            {actionItems.length > 0 && (
              <div className="bg-[#FFF9F5] rounded-xl border border-[#FFD0B8] p-4 sm:p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between border-b border-[#FFD0B8]/60 pb-2.5">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#F5330F]">
                    <FiAlertCircle size={15} /> Immediate Action Items ({actionItems.length})
                  </span>
                  <span className="text-[11px] text-[#666666]">Requires operator confirmation</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {actionItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-3 bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-lg flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-150"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1A1A1A] line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                      <Link
                        to={`/operator/trips/${item.tripId}`}
                        className="px-3 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition shrink-0"
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
                <h2 className="text-lg font-bold text-[#1A1A1A]">
                  Traveler Trips
                </h2>
                <p className="text-xs text-[#666666]">
                  Active itineraries submitted and coordinated through Transix
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Personal Trips Column */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 sm:p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE] flex items-center justify-center">
                      <FiCompass size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1A]">
                        Personal Trips
                      </h3>
                      <p className="text-[11px] text-[#666666]">
                        {personalTrips.length} traveler journeys
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/operator/trips?type=personal"
                    className="text-xs font-semibold text-[#0064D2] hover:underline flex items-center gap-1"
                  >
                    View all <FiArrowRight size={13} />
                  </Link>
                </div>

                <div className="space-y-3">
                  {personalTrips.length === 0 ? (
                    <div className="p-8 text-center text-[#666666] text-xs bg-[#F5F7FA] rounded-lg border border-[#EBEBEB]">
                      No personal trips currently shared.
                    </div>
                  ) : (
                    personalTrips.map(trip => (
                      <div 
                        key={trip._id}
                        className="p-4 bg-white border border-[#EBEBEB] rounded-xl flex items-center justify-between gap-4 hover:border-[#0064D2]/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <span>{trip.source}</span>
                            <FiArrowRight className="text-[#0064D2]" size={13} />
                            <span>{trip.destination}</span>
                          </div>
                          <div className="text-xs text-[#666666] mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[#1A1A1A] font-medium">Traveler Journey</span>
                            <span>•</span>
                            <span>{trip.duration || "Multi-day"}</span>
                            <span>•</span>
                            <span>{trip.travelers || 2} Travelers</span>
                          </div>
                          <div className="mt-2.5 flex items-center flex-wrap gap-2">
                            {trip.operatorAccess?.grantedAt && (new Date() - new Date(trip.operatorAccess.grantedAt)) < 24 * 60 * 60 * 1000 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0064D2] animate-pulse"></span>
                                Newly Shared
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              trip.operationalStatus === "Confirmed" 
                                ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                                : trip.operationalStatus === "Action Required"
                                ? "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                                : "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]"
                            }`}>
                              {trip.operationalStatus === "Confirmed" && <FiCheck size={11} />}
                              {trip.operationalStatus === "Action Required" && <FiAlertCircle size={11} />}
                              {trip.operationalStatus || "Processing"}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${trip._id}`}
                          className="px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shrink-0 shadow-xs"
                        >
                          Open trip
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Campus Trips Column */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 sm:p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE] flex items-center justify-center">
                      <GraduationCap size={15} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1A1A]">
                        Campus Trips
                      </h3>
                      <p className="text-[11px] text-[#666666]">
                        {campusTrips.length} institutional visits & IV tours
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/operator/trips?type=campus"
                    className="text-xs font-semibold text-[#0064D2] hover:underline flex items-center gap-1"
                  >
                    View all <FiArrowRight size={13} />
                  </Link>
                </div>

                <div className="space-y-3">
                  {campusTrips.length === 0 ? (
                    <div className="p-8 text-center text-[#666666] text-xs bg-[#F5F7FA] rounded-lg border border-[#EBEBEB]">
                      No campus trips currently shared.
                    </div>
                  ) : (
                    campusTrips.map(trip => (
                      <div 
                        key={trip._id}
                        className="p-4 bg-white border border-[#EBEBEB] rounded-xl flex items-center justify-between gap-4 hover:border-[#0064D2]/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <span>{trip.source}</span>
                            <FiArrowRight className="text-[#0064D2]" size={13} />
                            <span>{trip.destination}</span>
                          </div>
                          <div className="text-xs font-semibold text-[#1A1A1A] mt-0.5">
                            {trip.organizationDetails?.name || "Campus Institution"}
                          </div>
                          <div className="text-xs text-[#666666] mt-1 flex flex-wrap items-center gap-2">
                            <span>{trip.duration || "Multi-day"}</span>
                            <span>•</span>
                            <span>{trip.travelers || 20} Students</span>
                          </div>
                          <div className="mt-2.5 flex items-center flex-wrap gap-2">
                            {trip.operatorAccess?.grantedAt && (new Date() - new Date(trip.operatorAccess.grantedAt)) < 24 * 60 * 60 * 1000 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0064D2] animate-pulse"></span>
                                Newly Shared
                              </span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              trip.operationalStatus === "Confirmed" 
                                ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                                : trip.operationalStatus === "Action Required"
                                ? "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                                : "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]"
                            }`}>
                              {trip.operationalStatus === "Confirmed" && <FiCheck size={11} />}
                              {trip.operationalStatus === "Action Required" && <FiAlertCircle size={11} />}
                              {trip.operationalStatus || "Processing"}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${trip._id}`}
                          className="px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shrink-0 shadow-xs"
                        >
                          Open trip
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* VENDOR ACTIVITY (2 Columns on large screens) */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#EBEBEB] p-4 sm:p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE] flex items-center justify-center">
                    <FiBriefcase size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      Vendor Activity
                    </h3>
                    <p className="text-[11px] text-[#666666]">
                      Dispatches, quote responses, and confirmations requiring review
                    </p>
                  </div>
                </div>
                <Link
                  to="/operator/vendor-requests"
                  className="text-xs font-semibold text-[#0064D2] hover:underline flex items-center gap-1"
                >
                  All requests <FiArrowRight size={13} />
                </Link>
              </div>

              <div className="space-y-3">
                {activeVendorActivity.length === 0 ? (
                  <div className="p-8 text-center text-[#666666] text-xs bg-[#F5F7FA] rounded-lg border border-[#EBEBEB]">
                    <FiCheckCircle className="mx-auto text-[#00A65E] mb-2" size={22} />
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
                        className="p-4 bg-white border border-[#EBEBEB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#0064D2]/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <span>{vendorName}</span>
                          </div>
                          <div className="text-xs text-[#666666] mt-0.5">
                            {routeLabel}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {isResponded ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7]">
                                <FiCheck size={11} /> Quote received
                                {req.response?.quoteTotal ? ` (₹${Number(req.response.quoteTotal).toLocaleString()})` : ""}
                              </span>
                            ) : isConfReq ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE]">
                                <FiClock size={11} /> Confirmation requested
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7FA] text-[#666666] border border-[#EBEBEB]">
                                {req.status === "SENT" ? "Awaiting response" : req.status}
                              </span>
                            )}
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${req.tripId}?tab=transport`}
                          className="px-3.5 py-1.5 bg-white hover:bg-[#0064D2] text-[#0064D2] hover:text-white border border-[#0064D2] rounded-lg text-xs font-semibold transition text-center shrink-0"
                        >
                          Review request
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RECENT OPERATIONAL ACTIVITY (1 Column) */}
            <div className="bg-white rounded-xl border border-[#EBEBEB] p-4 sm:p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between border-b border-[#EBEBEB] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE] flex items-center justify-center">
                    <FiClock size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      Recent Activity
                    </h3>
                    <p className="text-[11px] text-[#666666]">
                      Real-time operational events
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {recentUpdates.length === 0 ? (
                  <div className="p-6 text-center text-[#666666] text-xs bg-[#F5F7FA] rounded-lg border border-[#EBEBEB]">
                    No recent operational activity.
                  </div>
                ) : (
                  recentUpdates.slice(0, 6).map((update, idx) => {
                    const isConfirmed = update.status === "CONFIRMED";
                    const isActionReq = update.status === "ACTION_REQUIRED";
                    
                    return (
                      <div key={update.id || idx} className="flex items-start gap-2.5 text-xs py-2.5 border-b border-[#F5F7FA] last:border-0">
                        <span className={`mt-0.5 text-xs font-black shrink-0 ${
                          isConfirmed ? "text-[#00A65E]" : isActionReq ? "text-[#F5330F]" : "text-[#0064D2]"
                        }`}>
                          {isConfirmed ? "✓" : isActionReq ? "⚠" : "•"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[#1A1A1A] truncate capitalize">
                            {update.title}
                          </div>
                          <div className="text-[11px] text-[#666666] flex items-center justify-between mt-0.5">
                            <span className="truncate">{update.subtitle}</span>
                            <span className="shrink-0 text-[#999999] ml-2">{getRelativeTime(update.timestamp)}</span>
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
