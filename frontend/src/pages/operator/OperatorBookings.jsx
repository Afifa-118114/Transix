import React, { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const fetchBookings = async () => {
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
        console.error("Failed to load operator bookings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();

    const interval = setInterval(fetchBookings, 10000);
    const onFocus = () => fetchBookings();
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
    return { total: hotelBookings.length, booked, notBooked: hotelBookings.length - booked };
  }, [hotelBookings]);

  const transportCounts = useMemo(() => {
    const booked = transportBookings.filter(b => b.status === "CONFIRMED").length;
    return { total: transportBookings.length, booked, notBooked: transportBookings.length - booked };
  }, [transportBookings]);

  const activityCounts = useMemo(() => {
    const booked = activityBookings.filter(b => b.status === "CONFIRMED").length;
    return { total: activityBookings.length, booked, notBooked: activityBookings.length - booked };
  }, [activityBookings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-[#666666] gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">Loading Bookings...</div>
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
                  Operational Bookings Workspace
                </h1>
                <p className="text-xs text-[#666666]">
                  Unified operational tracking for Hotels, Transport, and Activities across active trips
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl w-full mx-auto">
          
          {/* Top Category Tabs: [ Hotels ] [ Transport ] [ Activities ] */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBEBEB] pb-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* 1. Hotels */}
              <button
                onClick={() => handleTabChange("hotels")}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "hotels"
                    ? "bg-[#0064D2] text-white shadow-xs"
                    : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                }`}
              >
                <FiMapPin size={14} />
                <span>Hotels</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "hotels" ? "bg-white/20 text-white font-bold" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"
                }`}>
                  {subFilter === "booked" ? hotelCounts.booked : hotelCounts.notBooked}
                </span>
              </button>

              {/* 2. Transport */}
              <button
                onClick={() => handleTabChange("transport")}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "transport"
                    ? "bg-[#0064D2] text-white shadow-xs"
                    : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                }`}
              >
                <FaBus size={13} />
                <span>Transport</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "transport" ? "bg-white/20 text-white font-bold" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"
                }`}>
                  {subFilter === "booked" ? transportCounts.booked : transportCounts.notBooked}
                </span>
              </button>

              {/* 3. Activities */}
              <button
                onClick={() => handleTabChange("activities")}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                  activeTab === "activities"
                    ? "bg-[#0064D2] text-white shadow-xs"
                    : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                }`}
              >
                <FiCalendar size={14} />
                <span>Activities</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  activeTab === "activities" ? "bg-white/20 text-white font-bold" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"
                }`}>
                  {subFilter === "booked" ? activityCounts.booked : activityCounts.notBooked}
                </span>
              </button>
            </div>

            {/* Sub-Filters: [ Not Booked ] [ Booked ] */}
            <div className="flex items-center gap-1.5 bg-[#F1F5F9] p-1 rounded-xl border border-[#E2E8F0] self-start sm:self-auto">
              <button
                onClick={() => handleSubFilterChange("not-booked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  subFilter === "not-booked"
                    ? "bg-[#FFF4ED] text-[#F5330F] border border-[#FFD0B8] shadow-xs"
                    : "text-[#666666] hover:text-[#1A1A1A]"
                }`}
              >
                <FiClock size={12} />
                <span>Not Booked</span>
              </button>
              <button
                onClick={() => handleSubFilterChange("booked")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                  subFilter === "booked"
                    ? "bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7] shadow-xs"
                    : "text-[#666666] hover:text-[#1A1A1A]"
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
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-12 text-center text-[#666666] text-xs shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <FiCheckCircle className="mx-auto text-[#00A65E] mb-3" size={28} />
                {subFilter === "not-booked" ? (
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      No unbooked {activeTab} requirements.
                    </div>
                    <div className="text-[#666666] mt-1">
                      All current {activeTab} operational requirements are booked.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">
                      No confirmed {activeTab} requirements yet.
                    </div>
                    <div className="text-[#666666] mt-1">
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
                        className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4]">
                                {isCampus ? "Campus Trip" : "Personal Trip"} • {trip?.source} → {trip?.destination}
                              </div>
                              {orgName && (
                                <div className="text-xs font-semibold text-[#1A1A1A] mt-0.5">
                                  {orgName}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              b.status === "CONFIRMED"
                                ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                                : "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                            }`}>
                              {b.status === "CONFIRMED" ? "Booked" : "Not Booked"}
                            </span>
                          </div>

                          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs text-[#666666]">
                            {b.status === "CONFIRMED" && (
                              <div className="flex justify-between">
                                <span className="text-[#666666]">Hotel:</span>
                                <span className="font-bold text-[#1A1A1A]">{b.title || b.vendorName || "Confirmed Hotel"}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Location:</span>
                              <span className="font-medium text-[#1A1A1A]">{b.location || trip?.destination}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Check-in:</span>
                              <span className="font-medium text-[#1A1A1A]">{checkIn}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Check-out:</span>
                              <span className="font-medium text-[#1A1A1A]">{checkOut}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Travelers:</span>
                              <span className="font-medium text-[#1A1A1A]">{travelersLabel}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end border-t border-[#EBEBEB]">
                          <Link
                            to={`/operator/trips/${b.tripId}?tab=accommodation`}
                            className="px-3.5 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition shadow-xs"
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
                        className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4]">
                                {isCampus ? "Campus Trip" : "Personal Trip"} • {trip?.source} → {trip?.destination}
                              </div>
                              {orgName && (
                                <div className="text-xs font-semibold text-[#1A1A1A] mt-0.5">
                                  {orgName}
                                </div>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              b.status === "CONFIRMED"
                                ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                                : "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                            }`}>
                              {b.status === "CONFIRMED" ? "Confirmed" : "Not Booked"}
                            </span>
                          </div>

                          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs text-[#666666]">
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Requirement:</span>
                              <span className="font-bold text-[#1A1A1A]">{isGroupFleet ? fleetTitle : b.title}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Travelers:</span>
                              <span className="font-medium text-[#1A1A1A]">{travelerLabel}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#666666]">Travel Date:</span>
                              <span className="font-medium text-[#1A1A1A]">{travelDate}</span>
                            </div>
                            {b.status === "CONFIRMED" && (
                              <div className="flex justify-between">
                                <span className="text-[#666666]">Vendor:</span>
                                <span className="font-bold text-[#00A65E]">{b.vendorName || "Confirmed Vendor"}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* VIEW & BOOK flow: Opens originating trip & relevant transport leg */}
                        <div className="pt-2 flex items-center justify-end border-t border-[#EBEBEB]">
                          <Link
                            to={`/operator/trips/${b.tripId}?tab=transport`}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-xs ${
                              b.status === "CONFIRMED"
                                ? "bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1A1A1A] border border-[#E2E8F0]"
                                : "bg-[#0064D2] hover:bg-[#0052B4] text-white"
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
                      className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-[#006CE4]">
                              {isCampus ? "Campus Visit" : "Personal Activity"} • {trip?.source} → {trip?.destination}
                            </div>
                            <h3 className="text-sm font-bold text-[#1A1A1A] mt-1">
                              {b.title}
                            </h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
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
                            <span className="font-medium text-[#1A1A1A]">{b.location || trip?.destination}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Date:</span>
                            <span className="font-medium text-[#1A1A1A]">{dateLabel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#666666]">Traveler / Org:</span>
                            <span className="font-medium text-[#1A1A1A]">{orgName || participantLabel}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end border-t border-[#EBEBEB]">
                        <Link
                          to={`/operator/trips/${b.tripId}?tab=itinerary`}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition shadow-xs"
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
