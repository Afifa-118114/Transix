import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getOperatorBookings, getDashboardStats } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiCheckCircle, FiClock, FiAlertCircle, FiArrowRight, 
  FiMapPin, FiCalendar, FiUsers, FiMenu, FiX, FiCheck,
  FiBriefcase, FiCompass
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import { GraduationCap } from "lucide-react";

export default function OperatorBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "hotels"; // "hotels" | "transport" | "activities"
  const initialSubFilter = searchParams.get("status") || "not-booked"; // "not-booked" | "booked"

  const [activeTab, setActiveTab] = useState(initialTab);
  const [subFilter, setSubFilter] = useState(initialSubFilter); // "not-booked" | "booked"

  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const fetchBookings = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
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
        lastFetchRef.current = Date.now();
      } catch (err) {
        console.error("Failed to load operator bookings", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    };
    fetchBookings();

    const interval = setInterval(fetchBookings, 25000);
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 15000) {
        fetchBookings();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Update query params when tabs change
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab, status: subFilter });
  };

  const handleSubFilterChange = (newFilter) => {
    setSubFilter(newFilter);
    setSearchParams({ tab: activeTab, status: newFilter });
  };

  // Filter bookings by category
  const hotelBookings = useMemo(() => {
    return bookings.filter(b => b.type === "ACCOMMODATION");
  }, [bookings]);

  const transportBookings = useMemo(() => {
    return bookings.filter(b => b.type === "TRANSPORT");
  }, [bookings]);

  const activityBookings = useMemo(() => {
    return bookings.filter(b => b.type === "ACTIVITY" || b.type === "VISIT" || b.type === "PERMISSION");
  }, [bookings]);

  // Current category list
  const currentCategoryBookings = useMemo(() => {
    if (activeTab === "hotels") return hotelBookings;
    if (activeTab === "transport") return transportBookings;
    return activityBookings;
  }, [activeTab, hotelBookings, transportBookings, activityBookings]);

  // Sub-filter: Booked (CONFIRMED) vs Not Booked (NOT_BOOKED, PROCESSING, ACTION_REQUIRED, PENDING)
  const displayedBookings = useMemo(() => {
    if (subFilter === "booked") {
      return currentCategoryBookings.filter(b => b.status === "CONFIRMED");
    }
    return currentCategoryBookings.filter(b => b.status !== "CONFIRMED" && b.status !== "CANCELLED");
  }, [currentCategoryBookings, subFilter]);

  // Counts for tabs
  const hotelCounts = useMemo(() => {
    const booked = hotelBookings.filter(b => b.status === "CONFIRMED").length;
    return { booked, notBooked: hotelBookings.length - booked };
  }, [hotelBookings]);

  const transportCounts = useMemo(() => {
    const booked = transportBookings.filter(b => b.status === "CONFIRMED").length;
    return { booked, notBooked: transportBookings.length - booked };
  }, [transportBookings]);

  const activityCounts = useMemo(() => {
    const booked = activityBookings.filter(b => b.status === "CONFIRMED").length;
    return { booked, notBooked: activityBookings.length - booked };
  }, [activityBookings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Tour Operation Bookings...
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
                  Operational Bookings Workspace
                </h1>
                <p className="text-xs text-slate-400">
                  Unified operational tracking for Hotels, Transport, and Activities across active trips
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Top Category Tabs: [ Hotels ] [ Transport ] [ Activities ] */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* 1. Hotels */}
              <button
                onClick={() => handleTabChange("hotels")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "hotels"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <FiMapPin size={14} />
                <span>Hotels</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "hotels" ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {subFilter === "booked" ? hotelCounts.booked : hotelCounts.notBooked}
                </span>
              </button>

              {/* 2. Transport */}
              <button
                onClick={() => handleTabChange("transport")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "transport"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <FaBus size={13} />
                <span>Transport</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "transport" ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {subFilter === "booked" ? transportCounts.booked : transportCounts.notBooked}
                </span>
              </button>

              {/* 3. Activities */}
              <button
                onClick={() => handleTabChange("activities")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "activities"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <FiCalendar size={14} />
                <span>Activities</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "activities" ? "bg-indigo-700 text-white" : "bg-slate-800 text-slate-400"
                }`}>
                  {subFilter === "booked" ? activityCounts.booked : activityCounts.notBooked}
                </span>
              </button>
            </div>

            {/* Sub-Filters: [ Not Booked ] [ Booked ] */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
              <button
                onClick={() => handleSubFilterChange("not-booked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  subFilter === "not-booked"
                    ? "bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FiClock size={12} />
                <span>Not Booked</span>
              </button>
              <button
                onClick={() => handleSubFilterChange("booked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  subFilter === "booked"
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FiCheckCircle size={12} />
                <span>Booked</span>
              </button>
            </div>
          </div>

          {/* Booking Cards Grid */}
          <div className="space-y-4">
            {displayedBookings.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                <FiCheckCircle className="mx-auto text-emerald-400 mb-3" size={28} />
                {subFilter === "not-booked" ? (
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      No unbooked {activeTab} requirements.
                    </div>
                    <div className="text-slate-500 mt-1">
                      All current {activeTab} operational requirements are booked.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-slate-200">
                      No confirmed {activeTab} requirements yet.
                    </div>
                    <div className="text-slate-500 mt-1">
                      Requirements will appear here once bookings are confirmed.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedBookings.map((b) => {
                  const trip = b.trip;
                  const isCampus = trip?.tripCategory === "CAMPUS";
                  const orgName = trip?.organizationDetails?.name;

                  // -------------------------------------------------------------
                  // 1. HOTEL BOOKING CARD
                  // -------------------------------------------------------------
                  if (activeTab === "hotels") {
                    const checkIn = trip?.startDate ? formatDate(trip.startDate) : "Arrival";
                    const checkOut = trip?.endDate ? formatDate(trip.endDate) : "Departure";
                    const travelersLabel = isCampus 
                      ? `${trip?.travelers || 20} Students` 
                      : `${trip?.travelers || 2} Travelers`;

                    return (
                      <div 
                        key={b._id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xs transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                              {isCampus ? "Campus Trip" : "Personal Trip"} • {trip?.source} → {trip?.destination}
                            </div>
                            {orgName && (
                              <div className="text-xs font-bold text-slate-300 mt-0.5">
                                {orgName}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                          }`}>
                            {b.status === "CONFIRMED" ? "Booked" : "Not Booked"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                          {b.status === "CONFIRMED" && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Hotel:</span>
                              <span className="font-bold text-white">{b.title || b.vendorName || "Confirmed Hotel"}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">Location:</span>
                            <span className="font-semibold text-slate-200">{b.location || trip?.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Check-in:</span>
                            <span className="font-semibold text-slate-200">{checkIn}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Check-out:</span>
                            <span className="font-semibold text-slate-200">{checkOut}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Travelers:</span>
                            <span className="font-semibold text-slate-200">{travelersLabel}</span>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-end">
                          <Link
                            to={`/operator/trips/${b.tripId}?tab=accommodation`}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                          >
                            {b.status === "CONFIRMED" ? "View Trip" : "View Details"}
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  // -------------------------------------------------------------
                  // 2. TRANSPORT BOOKING CARD (With VIEW & BOOK flow)
                  // -------------------------------------------------------------
                  if (activeTab === "transport") {
                    const travelDate = trip?.startDate ? formatDate(trip.startDate) : "Day of Travel";
                    const isGroupFleet = b.itemId === "campus-group-fleet" || b.transportDetails?.requirementType === "GROUP_TRANSPORT";
                    
                    const fleetPlan = trip?.campusTransportPlan || {};
                    const vehiclesReq = fleetPlan.vehiclesRequired || 8;
                    const vComfort = fleetPlan.comfort || "AC";
                    const vCategory = fleetPlan.vehicleType || "Coach";
                    const fleetTitle = `${vehiclesReq} × ${vComfort} ${vCategory}`;
                    const travelersCount = trip?.travelers || fleetPlan.totalTravelers || 200;
                    const travelerLabel = isCampus ? `${travelersCount} Students` : `${travelersCount} Travelers`;

                    return (
                      <div 
                        key={b._id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xs transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                              {isCampus ? "Campus Trip" : "Personal Trip"} • {trip?.source} → {trip?.destination}
                            </div>
                            {orgName && (
                              <div className="text-xs font-bold text-slate-300 mt-0.5">
                                {orgName}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            b.status === "CONFIRMED"
                              ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                              : "bg-amber-950/60 text-amber-400 border border-amber-800/40"
                          }`}>
                            {b.status === "CONFIRMED" ? "Confirmed" : "Not Booked"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Requirement:</span>
                            <span className="font-bold text-white">{isGroupFleet ? fleetTitle : b.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Travelers:</span>
                            <span className="font-semibold text-slate-200">{travelerLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Travel Date:</span>
                            <span className="font-semibold text-slate-200">{travelDate}</span>
                          </div>
                          {b.status === "CONFIRMED" && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Vendor:</span>
                              <span className="font-bold text-emerald-400">{b.vendorName || "Confirmed Vendor"}</span>
                            </div>
                          )}
                        </div>

                        {/* VIEW & BOOK flow: Opens originating trip & relevant transport leg */}
                        <div className="pt-1 flex items-center justify-end">
                          <Link
                            to={`/operator/trips/${b.tripId}?tab=transport`}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                              b.status === "CONFIRMED"
                                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                            }`}
                          >
                            {b.status === "CONFIRMED" ? "View Trip" : "View & Book"}
                            <FiArrowRight size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  }

                  // -------------------------------------------------------------
                  // 3. ACTIVITIES BOOKING CARD
                  // -------------------------------------------------------------
                  const dateLabel = trip?.startDate ? formatDate(trip.startDate) : "Scheduled Date";
                  const participantLabel = isCampus 
                    ? `${trip?.travelers || 20} Students` 
                    : `${trip?.travelers || 2} Travelers`;

                  return (
                    <div 
                      key={b._id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                            {isCampus ? "Campus Visit" : "Personal Activity"} • {trip?.source} → {trip?.destination}
                          </div>
                          <h3 className="text-sm font-black text-white mt-1">
                            {b.title}
                          </h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
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
                          <span className="font-semibold text-slate-200">{b.location || trip?.destination}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Date:</span>
                          <span className="font-semibold text-slate-200">{dateLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Traveler / Org:</span>
                          <span className="font-semibold text-slate-200">{orgName || participantLabel}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-end">
                        <Link
                          to={`/operator/trips/${b.tripId}?tab=itinerary`}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                        >
                          View Trip
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
