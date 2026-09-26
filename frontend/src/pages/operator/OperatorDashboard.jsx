import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  getDashboardStats, 
  getOperatorTrips, 
  getOperatorAllVendorRequests 
} from "../../api/operatorApi";
import { formatDate, formatBudget } from "../../utils/formatTrip";
import { useAuth } from "../../context/AuthContext";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiActivity, FiCalendar, FiClock, FiAlertCircle, FiCheckCircle, 
  FiArrowRight, FiShield, FiBriefcase, FiUsers,
  FiZap, FiMenu, FiX, FiCheck, FiUser,
  FiAlertTriangle, FiCompass, FiSend, FiChevronDown, FiChevronUp,
  FiSearch, FiExternalLink, FiFilter
} from "react-icons/fi";
import { GraduationCap, Bus, Hotel, MapPin } from "lucide-react";

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
  
  // Active table view controlled by clicking KPI cards:
  // "actions" | "personal" | "campus" | "vendor-requests" | "confirmations"
  const [activeTable, setActiveTable] = useState("actions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showRecentActivity, setShowRecentActivity] = useState(false);

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

  // Operational attention metrics
  const tripsRequiringActionCount = useMemo(() => {
    return stats?.actionRequired ?? actionItems.length;
  }, [stats, actionItems]);

  const vendorRequestsCount = useMemo(() => {
    return stats?.vendorRequests ?? vendorRequests.length;
  }, [stats, vendorRequests]);

  const pendingConfirmationsCount = useMemo(() => {
    if (stats?.pendingConfirmations !== undefined) return stats.pendingConfirmations;
    const processingBookings = stats?.bookingReadiness?.processing || 0;
    const confirmationReqs = vendorRequests.filter(r => r.status === "CONFIRMATION_REQUESTED").length;
    return processingBookings + confirmationReqs;
  }, [stats, vendorRequests]);

  // Map trips by ID for lookup
  const tripMap = useMemo(() => {
    const map = new Map();
    trips.forEach(t => map.set(t._id?.toString(), t));
    return map;
  }, [trips]);

  // Enriched action items with trip details
  const enrichedActions = useMemo(() => {
    return actionItems.map(item => {
      const trip = tripMap.get(item.tripId?.toString());
      return {
        ...item,
        trip,
        category: trip?.tripCategory === "CAMPUS" ? "Campus Trip" : "Personal Trip",
        route: trip ? `${trip.source} → ${trip.destination}` : item.subtitle || "Active Journey",
        travelers: trip?.tripCategory === "CAMPUS" 
          ? `${trip.travelers || 20} Students` 
          : `${trip?.travelers || 2} Travelers`,
        orgName: trip?.organizationDetails?.name,
      };
    });
  }, [actionItems, tripMap]);

  // Pending Confirmations synthesized list
  const pendingConfirmationsList = useMemo(() => {
    const list = [];
    trips.forEach(t => {
      const isCampus = t.tripCategory === "CAMPUS";
      const org = t.organizationDetails?.name;
      const route = `${t.source} → ${t.destination}`;

      // Check accommodations
      if (t.staySegments?.some(s => !s.selectedHotel || s.bookingStatus !== "CONFIRMED")) {
        list.push({
          id: `stay-${t._id}`,
          tripId: t._id,
          tripRoute: route,
          orgName: org,
          category: isCampus ? "Campus Trip" : "Personal Trip",
          type: "Accommodation",
          requirement: "Hotel Room Allocation & Block Confirmation",
          provider: t.staySegments?.[0]?.selectedHotel?.name || "Pre-selected Hotel Partner",
          status: "Pending Confirmation",
          travelers: isCampus ? `${t.travelers || 20} Students` : `${t.travelers || 2} Travelers`,
        });
      }

      // Check transport
      if (t.travelLegs?.some(l => l.bookingStatus !== "CONFIRMED")) {
        list.push({
          id: `transport-${t._id}`,
          tripId: t._id,
          tripRoute: route,
          orgName: org,
          category: isCampus ? "Campus Trip" : "Personal Trip",
          type: "Transport",
          requirement: isCampus ? "Campus Group Fleet Bus Reservation" : "Train / Transit Seat Reservation",
          provider: isCampus ? "Connected Transix Fleet Partner" : "Transit Schedule Network",
          status: "Pending Confirmation",
          travelers: isCampus ? `${t.travelers || 20} Students` : `${t.travelers || 2} Travelers`,
        });
      }
    });

    // Also include vendor requests awaiting confirmation
    vendorRequests
      .filter(r => r.status === "CONFIRMATION_REQUESTED")
      .forEach(r => {
        list.push({
          id: `vconf-${r._id}`,
          tripId: r.tripId,
          tripRoute: r.trip ? `${r.trip.source} → ${r.trip.destination}` : "Campus Fleet Route",
          orgName: r.trip?.organizationDetails?.name,
          category: "Campus Fleet",
          type: "Vendor Dispatch",
          requirement: "Vendor Fleet Booking Confirmation",
          provider: r.vendorId?.name || "Charter Bus Operator",
          status: "Confirmation Requested",
          travelers: "Group Fleet",
        });
      });

    return list;
  }, [trips, vendorRequests]);

  // Relative time helper
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

  // Helper to switch active KPI card and table
  const handleSelectTable = (key) => {
    setActiveTable(key);
    setSearchQuery("");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-[#666666] gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#006CE4] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">
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
          actionCount={tripsRequiringActionCount}
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
              actionCount={tripsRequiringActionCount}
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
          <div className="h-7 w-7 rounded-full bg-[#006CE4] flex items-center justify-center text-xs font-bold text-white">
            {operatorDisplayName.slice(0, 2).toUpperCase()}
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* TOP WELCOME & LIVE OPERATIONAL BAR (TRIP.COM DEEP BLUE GRADIENT HERO)    */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-[#1A56DB] via-[#1447B8] to-[#0F3D91] text-white p-5 sm:p-6 rounded-xl shadow-xs relative overflow-hidden">
            {/* Ambient background visual accent */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
              <FiCompass size={130} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full text-white/95 backdrop-blur-xs">
                    Tour Operation Center
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-xs text-white/80">{formattedToday}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Operator Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                  Real-time operational dispatch, vendor quote coordination, and traveler itinerary confirmation.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-xs shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse"></span>
                  Operations Live
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 1. INTERACTIVE KPI CARDS GRID (CLICK TO VIEW TABLE)                       */}
          {/* ========================================================================= */}
          <section className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#666666] px-1 font-semibold uppercase tracking-wider">
              <span>Operational Domains &amp; KPI Cards</span>
              <span className="text-[11px] text-[#0064D2] normal-case font-medium">
                Click any card to display its column-wise data table
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
              
              {/* KPI 1: Action Required */}
              <button
                type="button"
                onClick={() => handleSelectTable("actions")}
                className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                  activeTable === "actions"
                    ? "bg-[#FFF9F5] border-[#F5330F] ring-2 ring-[#F5330F]/20 shadow-xs"
                    : "bg-white border-[#EBEBEB] hover:border-[#F5330F]/50 hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Action Required
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#FFF4ED] border border-[#FFD0B8] text-[#F5330F] flex items-center justify-center">
                    <FiAlertCircle size={15} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#F5330F]">
                    {tripsRequiringActionCount}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                    Trips needing review
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={activeTable === "actions" ? "text-[#F5330F]" : "text-slate-400"}>
                    {activeTable === "actions" ? "● Active Table" : "Click to view"}
                  </span>
                  <FiArrowRight size={11} className={activeTable === "actions" ? "text-[#F5330F]" : "text-slate-300"} />
                </div>
              </button>

              {/* KPI 2: Personal Trips */}
              <button
                type="button"
                onClick={() => handleSelectTable("personal")}
                className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                  activeTable === "personal"
                    ? "bg-[#EFF6FF] border-[#0064D2] ring-2 ring-[#0064D2]/25 shadow-xs"
                    : "bg-white border-[#EBEBEB] hover:border-[#0064D2]/50 hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Personal Trips
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#0064D2] flex items-center justify-center">
                    <FiCompass size={15} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
                    {personalTrips.length}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                    Traveler journeys
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={activeTable === "personal" ? "text-[#0064D2]" : "text-slate-400"}>
                    {activeTable === "personal" ? "● Active Table" : "Click to view"}
                  </span>
                  <FiArrowRight size={11} className={activeTable === "personal" ? "text-[#0064D2]" : "text-slate-300"} />
                </div>
              </button>

              {/* KPI 3: Campus Tours */}
              <button
                type="button"
                onClick={() => handleSelectTable("campus")}
                className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                  activeTable === "campus"
                    ? "bg-[#F5F3FF] border-[#6366F1] ring-2 ring-[#6366F1]/25 shadow-xs"
                    : "bg-white border-[#EBEBEB] hover:border-[#6366F1]/50 hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Campus Tours
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE] text-[#6366F1] flex items-center justify-center">
                    <GraduationCap size={16} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
                    {campusTrips.length}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                    Institutional IVs
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={activeTable === "campus" ? "text-[#6366F1]" : "text-slate-400"}>
                    {activeTable === "campus" ? "● Active Table" : "Click to view"}
                  </span>
                  <FiArrowRight size={11} className={activeTable === "campus" ? "text-[#6366F1]" : "text-slate-300"} />
                </div>
              </button>

              {/* KPI 4: Vendor Requests */}
              <button
                type="button"
                onClick={() => handleSelectTable("vendor-requests")}
                className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                  activeTable === "vendor-requests"
                    ? "bg-[#EFF6FF] border-[#0064D2] ring-2 ring-[#0064D2]/25 shadow-xs"
                    : "bg-white border-[#EBEBEB] hover:border-[#0064D2]/50 hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Vendor Requests
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#0064D2] flex items-center justify-center">
                    <FiSend size={15} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A]">
                    {vendorRequestsCount}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                    Quotes &amp; dispatches
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={activeTable === "vendor-requests" ? "text-[#0064D2]" : "text-slate-400"}>
                    {activeTable === "vendor-requests" ? "● Active Table" : "Click to view"}
                  </span>
                  <FiArrowRight size={11} className={activeTable === "vendor-requests" ? "text-[#0064D2]" : "text-slate-300"} />
                </div>
              </button>

              {/* KPI 5: Pending Confirmations */}
              <button
                type="button"
                onClick={() => handleSelectTable("confirmations")}
                className={`text-left p-4 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between relative ${
                  activeTable === "confirmations"
                    ? "bg-[#FFFBEB] border-[#D97706] ring-2 ring-[#D97706]/25 shadow-xs"
                    : "bg-white border-[#EBEBEB] hover:border-[#D97706]/50 hover:-translate-y-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                    Confirmations
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] flex items-center justify-center">
                    <FiClock size={15} />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-[#D97706]">
                    {pendingConfirmationsCount}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5 truncate">
                    Awaiting verification
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
                  <span className={activeTable === "confirmations" ? "text-[#D97706]" : "text-slate-400"}>
                    {activeTable === "confirmations" ? "● Active Table" : "Click to view"}
                  </span>
                  <FiArrowRight size={11} className={activeTable === "confirmations" ? "text-[#D97706]" : "text-slate-300"} />
                </div>
              </button>

            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. DEDICATED COLUMN-WISE TABLE VIEW FOR THE SELECTED KPI DOMAIN           */}
          {/* ========================================================================= */}
          <section className="bg-white rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            
            {/* Table Control Bar */}
            <div className="p-4 sm:p-5 border-b border-[#EBEBEB] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold text-[#1A1A1A]">
                    {activeTable === "actions" && "Immediate Action Items"}
                    {activeTable === "personal" && "Personal Traveler Trips"}
                    {activeTable === "campus" && "Campus Tour Operations"}
                    {activeTable === "vendor-requests" && "Vendor Requests & Dispatches"}
                    {activeTable === "confirmations" && "Pending Booking Confirmations"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#006CE4] border border-[#BFDBFE]">
                    {activeTable === "actions" && enrichedActions.length}
                    {activeTable === "personal" && personalTrips.length}
                    {activeTable === "campus" && campusTrips.length}
                    {activeTable === "vendor-requests" && vendorRequests.length}
                    {activeTable === "confirmations" && pendingConfirmationsList.length} Records
                  </span>
                </div>
                <p className="text-xs text-[#666666] mt-0.5">
                  {activeTable === "actions" && "Urgent coordination requests, stays, and transport pending operator attention"}
                  {activeTable === "personal" && "Individual traveler masterplans shared with operator for itinerary support"}
                  {activeTable === "campus" && "College & student educational group tours requiring bus charters and visit approvals"}
                  {activeTable === "vendor-requests" && "Vendor quote requests, availability confirmations, and fleet booking records"}
                  {activeTable === "confirmations" && "Bookings awaiting operator confirmation with suppliers and transport providers"}
                </p>
              </div>

              {/* Right: Search & Link to Full Dedicated Page */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative min-w-[220px]">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F5F7FA] border border-[#EBEBEB] rounded-lg text-xs text-[#1A1A1A] placeholder-slate-400 outline-none focus:border-[#006CE4] focus:bg-white transition"
                  />
                </div>

                {/* Direct Link to Standalone Respective Page */}
                {activeTable === "vendor-requests" && (
                  <Link
                    to="/vendor/requests"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBEBEB] bg-white hover:bg-[#F5F7FA] text-xs font-semibold text-[#006CE4] transition shadow-2xs whitespace-nowrap"
                  >
                    <span>Open Vendor Portal</span>
                    <FiExternalLink size={12} />
                  </Link>
                )}
                {activeTable === "confirmations" && (
                  <Link
                    to="/operator/bookings"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EBEBEB] bg-white hover:bg-[#F5F7FA] text-xs font-semibold text-[#D97706] transition shadow-2xs whitespace-nowrap"
                  >
                    <span>Full Bookings Page</span>
                    <FiExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* =================================================================== */}
            {/* TABLE 1: IMMEDIATE ACTIONS (COLUMN-WISE TABLE)                       */}
            {/* =================================================================== */}
            {activeTable === "actions" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Action Item &amp; Details</th>
                      <th className="py-3 px-4">Associated Trip</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Travelers</th>
                      <th className="py-3 px-4 text-right">Operational Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEB] text-xs">
                    {enrichedActions
                      .filter(item => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          item.title?.toLowerCase().includes(q) ||
                          item.subtitle?.toLowerCase().includes(q) ||
                          item.route?.toLowerCase().includes(q) ||
                          item.orgName?.toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {item.severity === "HIGH" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF4ED] text-[#F5330F] border border-[#FFD0B8]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F5330F] animate-pulse"></span>
                                Urgent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#0064D2]"></span>
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1A1A1A] line-clamp-1">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              Requires operator confirmation &amp; review
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1A1A1A] truncate max-w-[200px]">
                              {item.orgName ? item.orgName : item.route}
                            </div>
                            {item.orgName && (
                              <div className="text-[10px] text-[#666666] truncate mt-0.5">
                                {item.route}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              item.category === "Campus Trip"
                                ? "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]"
                                : "bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]"
                            }`}>
                              {item.category === "Campus Trip" ? <GraduationCap size={12} /> : <FiCompass size={11} />}
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#475569]">
                            {item.travelers}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              to={`/operator/trips/${item.tripId}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                            >
                              <span>Coordinate</span>
                              <FiArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {enrichedActions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-xs text-[#666666]">
                          All action items currently resolved!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =================================================================== */}
            {/* =================================================================== */}
            {/* TABLE 2: PERSONAL TRIPS (COLUMN-WISE TABLE)                         */}
            {/* =================================================================== */}
            {activeTable === "personal" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">Trip Route</th>
                      <th className="py-3 px-4">Travelers</th>
                      <th className="py-3 px-4">Dates &amp; Duration</th>
                      <th className="py-3 px-4">Estimated Budget</th>
                      <th className="py-3 px-4">Operational Status</th>
                      <th className="py-3 px-4">Access Granted</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEB] text-xs">
                    {personalTrips
                      .filter(trip => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          trip.source?.toLowerCase().includes(q) ||
                          trip.destination?.toLowerCase().includes(q) ||
                          trip.user?.name?.toLowerCase().includes(q)
                        );
                      })
                      .map((trip) => (
                        <tr key={trip._id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                              <span>{trip.source}</span>
                              <FiArrowRight size={11} className="text-[#0064D2]" />
                              <span>{trip.destination}</span>
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              Traveler: {trip.user?.name || "Shared Itinerary"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#475569]">
                            {trip.travelers || 2} Travelers
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-[#1A1A1A]">
                              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              {trip.duration || `${trip.itinerary?.length || 0} Days`}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#1A1A1A]">
                            {formatBudget(trip.budget)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
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
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap text-[#666666]">
                            {getRelativeTime(trip.operatorAccess?.grantedAt || trip.updatedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              to={`/operator/trips/${trip._id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                            >
                              <span>Open Trip</span>
                              <FiArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {personalTrips.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-[#666666]">
                          No personal trips currently shared.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =================================================================== */}
            {/* TABLE 3: CAMPUS TOURS (COLUMN-WISE TABLE)                           */}
            {/* =================================================================== */}
            {activeTable === "campus" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">Institution / College</th>
                      <th className="py-3 px-4">Route &amp; Destination</th>
                      <th className="py-3 px-4">Batch Size</th>
                      <th className="py-3 px-4">Dates &amp; Duration</th>
                      <th className="py-3 px-4">Bus / Fleet Status</th>
                      <th className="py-3 px-4">Operational Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEB] text-xs">
                    {campusTrips
                      .filter(trip => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          trip.organizationDetails?.name?.toLowerCase().includes(q) ||
                          trip.source?.toLowerCase().includes(q) ||
                          trip.destination?.toLowerCase().includes(q)
                        );
                      })
                      .map((trip) => (
                        <tr key={trip._id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                              <GraduationCap size={15} className="text-[#6366F1]" />
                              <span>{trip.organizationDetails?.name || "Campus Institution"}</span>
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              Coord: {trip.coordinatorId?.name || "Coordinator"}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                              <span>{trip.source}</span>
                              <FiArrowRight size={11} className="text-[#0064D2]" />
                              <span>{trip.destination}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#1A1A1A]">
                            {trip.travelers || 20} Students
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-[#1A1A1A]">
                              {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              {trip.duration || `${trip.itinerary?.length || 0} Days`}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F3FF] text-[#6366F1] border border-[#DDD6FE]">
                              <Bus size={11} /> Group Fleet Required
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
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
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              to={`/operator/trips/${trip._id}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                            >
                              <span>Manage</span>
                              <FiArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {campusTrips.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-[#666666]">
                          No campus tours currently shared.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =================================================================== */}
            {/* TABLE 4: VENDOR REQUESTS (COLUMN-WISE TABLE)                        */}
            {/* =================================================================== */}
            {activeTable === "vendor-requests" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">Vendor Partner</th>
                      <th className="py-3 px-4">Trip Route / Context</th>
                      <th className="py-3 px-4">Requested Service</th>
                      <th className="py-3 px-4">Quote / Rate</th>
                      <th className="py-3 px-4">Dispatch Status</th>
                      <th className="py-3 px-4">Dispatched</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEB] text-xs">
                    {vendorRequests
                      .filter(req => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        const vName = req.vendorId?.name || "";
                        const route = req.trip ? `${req.trip.source} ${req.trip.destination}` : "";
                        return vName.toLowerCase().includes(q) || route.toLowerCase().includes(q);
                      })
                      .map((req) => {
                        const vendorName = req.vendorId?.name || "Connected Partner";
                        const routeLabel = req.trip 
                          ? `${req.trip.source} → ${req.trip.destination}`
                          : req.route
                          ? `${req.route.originCity || "Origin"} → ${req.route.destinationCity || "Destination"}`
                          : "Campus Route";

                        const isResponded = req.status === "RESPONDED" || Boolean(req.response?.availability);
                        const isConfReq = req.status === "CONFIRMATION_REQUESTED";

                        return (
                          <tr key={req._id} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-[#1A1A1A]">
                                {vendorName}
                              </div>
                              <div className="text-[11px] text-[#666666] mt-0.5">
                                {req.vendorId?.city || "Network Verified"}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#1A1A1A]">
                              {routeLabel}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                                <Bus size={11} /> Group Charter Fleet
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-bold text-[#1A1A1A]">
                              {req.response?.quoteTotal 
                                ? `₹${Number(req.response.quoteTotal).toLocaleString()}` 
                                : "Awaiting Quote"}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isResponded ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7]">
                                  <FiCheck size={11} /> Quote Received
                                </span>
                              ) : isConfReq ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#0064D2] border border-[#BFDBFE]">
                                  <FiClock size={11} /> Confirmation Req
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F7FA] text-[#666666] border border-[#EBEBEB]">
                                  {req.status === "SENT" ? "Awaiting Vendor" : req.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap text-[#666666]">
                              {getRelativeTime(req.createdAt)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <Link
                                to={req.tripId ? `/operator/trips/${req.tripId}?tab=transport` : `/vendor/requests`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0064D2] hover:bg-[#0052B4] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                              >
                                <span>Review</span>
                                <FiArrowRight size={12} />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    }
                    {vendorRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-[#666666]">
                          No vendor requests dispatched.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* =================================================================== */}
            {/* TABLE 5: PENDING CONFIRMATIONS (COLUMN-WISE TABLE)                  */}
            {/* =================================================================== */}
            {activeTable === "confirmations" && (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#EBEBEB] text-[10px] font-semibold text-[#666666] uppercase tracking-wider">
                      <th className="py-3 px-4">Booking Requirement</th>
                      <th className="py-3 px-4">Trip Route / Organization</th>
                      <th className="py-3 px-4">Service Type</th>
                      <th className="py-3 px-4">Provider / Supplier</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBEBEB] text-xs">
                    {pendingConfirmationsList
                      .filter(item => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          item.requirement?.toLowerCase().includes(q) ||
                          item.tripRoute?.toLowerCase().includes(q) ||
                          item.provider?.toLowerCase().includes(q)
                        );
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1A1A1A]">
                              {item.requirement}
                            </div>
                            <div className="text-[11px] text-[#666666] mt-0.5">
                              {item.category} • {item.travelers}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-[#1A1A1A]">
                              {item.orgName ? item.orgName : item.tripRoute}
                            </div>
                            {item.orgName && (
                              <div className="text-[10px] text-[#666666] mt-0.5">
                                {item.tripRoute}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F7FA] text-[#475569] border border-[#E2E8F0]">
                              {item.type === "Accommodation" && <Hotel size={11} />}
                              {item.type === "Transport" && <Bus size={11} />}
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-medium text-[#1A1A1A]">
                            {item.provider}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                              <FiClock size={11} /> {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Link
                              to={`/operator/trips/${item.tripId}`}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00A65E] hover:bg-[#008f51] text-white rounded-lg text-xs font-semibold transition shadow-2xs"
                            >
                              <span>Confirm Booking</span>
                              <FiArrowRight size={12} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    {pendingConfirmationsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-xs text-[#666666]">
                          No bookings awaiting confirmation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            <div className="bg-[#F8FAFC] border-t border-[#EBEBEB] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#666666]">
              <div>
                Showing records for <strong>
                  {activeTable === "actions" && "Action Required"}
                  {activeTable === "personal" && "Personal Trips"}
                  {activeTable === "campus" && "Campus Tours"}
                  {activeTable === "vendor-requests" && "Vendor Requests"}
                  {activeTable === "confirmations" && "Confirmations"}
                </strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#999999]">Click any other KPI card to switch view</span>
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 3. OPTIONAL COLLAPSIBLE RECENT ACTIVITY DRAWER                            */}
          {/* ========================================================================= */}
          {recentUpdates.length > 0 && (
            <section className="bg-white rounded-xl border border-[#EBEBEB] shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRecentActivity(!showRecentActivity)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] text-[#006CE4] border border-[#BFDBFE] flex items-center justify-center">
                    <FiClock size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A]">
                      Live Operational Telemetry &amp; Recent Activity ({recentUpdates.length})
                    </h3>
                    <p className="text-[11px] text-[#666666]">
                      Real-time events stream from trip builder and booking dispatches
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#006CE4]">
                  <span>{showRecentActivity ? "Hide activity log" : "View activity log"}</span>
                  {showRecentActivity ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                </div>
              </button>

              {showRecentActivity && (
                <div className="border-t border-[#EBEBEB] p-4 divide-y divide-[#F5F7FA]">
                  {recentUpdates.slice(0, 10).map((update, idx) => {
                    const isConfirmed = update.status === "CONFIRMED";
                    const isActionReq = update.status === "ACTION_REQUIRED";
                    
                    return (
                      <div key={update.id || idx} className="flex items-start gap-2.5 text-xs py-2.5 first:pt-0 last:pb-0">
                        <span className={`mt-0.5 text-xs font-black shrink-0 ${
                          isConfirmed ? "text-[#00A65E]" : isActionReq ? "text-[#F5330F]" : "text-[#006CE4]"
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
                  })}
                </div>
              )}
            </section>
          )}

        </main>
      </div>
    </div>
  );
}
