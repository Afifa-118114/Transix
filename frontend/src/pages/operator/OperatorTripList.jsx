import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { getOperatorTrips, getDashboardStats } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiArrowRight, FiUsers, FiCalendar, FiArrowLeft, 
  FiBriefcase, FiMenu, FiX, FiClock, FiCheckCircle, FiCompass
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";

export default function OperatorTripList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterType = searchParams.get("type"); // "personal" | "campus" | null

  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const fetchData = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const token = localStorage.getItem("token");
        const [tripsData, statsData] = await Promise.all([
          getOperatorTrips(token),
          getDashboardStats(token)
        ]);
        if (tripsData?.success) {
          setTrips(tripsData.trips || []);
        }
        if (statsData?.success) {
          setStats(statsData.stats);
        }
        lastFetchRef.current = Date.now();
      } catch (err) {
        console.error("Failed to load operator trips", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 25000);
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 15000) {
        fetchData();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Loading Trips...</div>
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
                <div className="flex items-center gap-2 mb-0.5">
                  <Link to="/operator/dashboard" className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:underline flex items-center gap-1">
                    <FiArrowLeft size={10} /> Dashboard
                  </Link>
                  <span className="text-slate-600 text-xs">/</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Trips
                  </span>
                </div>
                <h1 className="text-lg font-black text-white">{pageTitle}</h1>
                <p className="text-xs text-slate-400">{pageSubtitle}</p>
              </div>
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSearchParams({})}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  !filterType 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({trips.length})
              </button>
              <button
                onClick={() => setSearchParams({ type: "personal" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterType === "personal" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FiCompass size={12} /> Personal ({stats?.personalTrips || 0})
              </button>
              <button
                onClick={() => setSearchParams({ type: "campus" })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  filterType === "campus" 
                    ? "bg-indigo-600 text-white shadow-xs" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap size={14} /> Campus ({stats?.campusTrips || 0})
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {filteredTrips.length === 0 ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
              <FiBriefcase className="mx-auto text-slate-700 mb-3" size={36} />
              <h2 className="text-sm font-bold text-white mb-1">No trips found</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No finalized {filterType || ""} trips have been shared with this operator account yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrips.map((trip) => (
                <div 
                  key={trip._id} 
                  className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xs hover:border-slate-700/80 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
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

                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          trip.timingStatus === "ACTIVE"
                            ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                            : trip.timingStatus === "UPCOMING"
                            ? "bg-blue-950/60 text-blue-400 border-blue-800/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {trip.timingStatus === "ACTIVE" ? "● Active Now" : trip.timingStatus}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="text-base font-black text-white flex items-center gap-2">
                        <span>{trip.source}</span>
                        <FiArrowRight className="text-indigo-400" />
                        <span>{trip.destination}</span>
                      </div>

                      {/* Meta Information */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                        <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                        <span>•</span>
                        <span>
                          {trip.travelers} {trip.tripCategory === 'CAMPUS' ? 'Students' : 'Travelers'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-300">
                          {trip.user?.name || trip.coordinatorId?.name || "Shared"} ({trip.user?.email || trip.coordinatorId?.email || ""})
                        </span>
                      </div>

                      {/* Operational Progress Counts */}
                      <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          Accommodation: <span className="text-white font-black">{trip.readiness?.accommodation?.confirmed || 0}/{trip.readiness?.accommodation?.total || 0}</span>
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          Transport: <span className="text-white font-black">{trip.readiness?.transport?.confirmed || 0}/{trip.readiness?.transport?.total || 0}</span>
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                          {trip.tripCategory === 'CAMPUS' ? 'Visits' : 'Activities'}: <span className="text-white font-black">{trip.readiness?.visits?.confirmed || 0}/{trip.readiness?.visits?.total || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right Status & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Operational Status</span>
                        <span className={`text-xs font-bold ${
                          trip.operationalStatus === "Action Required" ? "text-amber-400" :
                          trip.operationalStatus === "Confirmed" ? "text-emerald-400" : "text-slate-300"
                        }`}>
                          {trip.operationalStatus}
                        </span>
                      </div>
                      <Link 
                        to={`/operator/trips/${trip._id}`}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
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
