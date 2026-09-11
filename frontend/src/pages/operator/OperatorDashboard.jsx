import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardStats, getOperatorTrips } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import { 
  FiActivity, FiCalendar, FiClock, FiAlertCircle, FiCheckCircle, 
  FiArrowRight, FiShield, FiBriefcase, FiUsers, FiMap,
  FiZap, FiTrendingUp, FiSettings, FiBell, FiMenu, FiX, FiLayers
} from "react-icons/fi";
import { Sparkles } from "lucide-react";

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
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
        
        if (statsData.success) setStats(statsData.stats);
        if (tripsData.success) setTrips(tripsData.trips.slice(0, 5)); // Just take 5 most recent for dashboard
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const Sidebar = () => (
    <div className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 hidden lg:block h-screen sticky top-0 overflow-y-auto custom-scrollbar">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2 text-white">
          <Sparkles className="text-indigo-500" size={24} />
          <span className="text-xl font-black tracking-tight">TRANSIX</span>
        </Link>
      </div>

      <div className="px-4 pb-6 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">Operations</div>
          <div className="space-y-1 text-sm font-bold">
            <Link to="/operator/dashboard" className="flex items-center gap-3 px-3 py-2 text-white bg-slate-800 rounded-lg">
              <FiActivity /> Dashboard
            </Link>
            <Link to="/operator/trips" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition">
              <FiBriefcase /> Trips
            </Link>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiCheckCircle /> Bookings</span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Soon</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiMap /> Transports</span>
              <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase tracking-widest">Soon</span>
            </div>
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">Intelligence</div>
          <div className="space-y-1 text-sm font-bold">
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiZap /> SmartShift</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiLayers /> Cascade Impact</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiAlertCircle /> Risk & Alerts</span>
            </div>
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">Analytics</div>
          <div className="space-y-1 text-sm font-bold">
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiTrendingUp /> Performance</span>
            </div>
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-black tracking-widest text-slate-500 uppercase">Settings</div>
          <div className="space-y-1 text-sm font-bold">
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiUsers /> Team</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-slate-500">
              <span className="flex items-center gap-3"><FiSettings /> System Settings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Control Center...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                <FiShield className="text-indigo-500" />
                Tour Operations Center
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Monitor trips, booking readiness and operational risks from one shared view.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-400 hover:text-white transition">
                <FiBell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-slate-900"></span>
              </button>
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-indigo-900">
                OP
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/60 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Active Trips</div>
              <div className="text-3xl font-black text-white">{stats?.activeTrips || 0}</div>
              <FiBriefcase className="absolute right-3 bottom-3 text-slate-800" size={32} />
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/60 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Upcoming</div>
              <div className="text-3xl font-black text-white">{stats?.upcomingTrips || 0}</div>
              <FiCalendar className="absolute right-3 bottom-3 text-slate-800" size={32} />
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/60 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Bookings Pending</div>
              <div className="text-3xl font-black text-white">{stats?.bookingsPending || 0}</div>
              <FiClock className="absolute right-3 bottom-3 text-slate-800" size={32} />
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/60 shadow-sm flex flex-col justify-between h-full relative overflow-hidden ring-1 ring-amber-500/20 bg-amber-950/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Action Required</div>
              <div className="text-3xl font-black text-amber-400">{stats?.actionRequired || 0}</div>
              <FiAlertCircle className="absolute right-3 bottom-3 text-amber-900/40" size={32} />
            </div>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/60 shadow-sm flex flex-col justify-between h-full relative overflow-hidden ring-1 ring-emerald-500/20 bg-emerald-950/10">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-1">Confirmed</div>
              <div className="text-3xl font-black text-emerald-400">{stats?.confirmed || 0}</div>
              <FiCheckCircle className="absolute right-3 bottom-3 text-emerald-900/40" size={32} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Center / Left Panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Active Trips Box */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FiBriefcase className="text-indigo-400" /> Active Trips
                  </h2>
                  <Link to="/operator/trips" className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    View All <FiArrowRight />
                  </Link>
                </div>
                
                <div className="divide-y divide-slate-800/60">
                  {trips.length === 0 ? (
                    <div className="p-8 text-center">
                      <FiShield className="mx-auto text-slate-700 mb-3" size={32} />
                      <div className="text-sm font-bold text-white mb-1">No shared trips yet</div>
                      <div className="text-xs text-slate-500">Trips will appear here when travelers give the operator access.</div>
                    </div>
                  ) : (
                    trips.map(trip => (
                      <div key={trip._id} className="p-4 hover:bg-slate-800/40 transition group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-black text-white">{trip.source} <FiArrowRight className="inline text-slate-500 mx-0.5" /> {trip.destination}</span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">{trip.status}</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                              <span className="text-slate-300">{trip.user?.name}</span>
                              <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                              <span>{trip.travelers} Travelers</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <div className="text-xs font-bold text-white mb-0.5">Booking Progress</div>
                              <div className="text-[11px] font-semibold text-slate-400">
                                {trip.bookingProgress?.confirmed || 0} / {trip.bookingProgress?.total || 0} confirmed
                              </div>
                              {trip.bookingProgress?.actionRequired > 0 && (
                                <div className="text-[10px] font-bold text-amber-400 mt-0.5 flex items-center justify-end gap-1">
                                  <FiAlertCircle /> {trip.bookingProgress.actionRequired} action required
                                </div>
                              )}
                            </div>
                            <Link 
                              to={`/operator/trips/${trip._id}`}
                              className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 hover:text-white border border-slate-700 hover:border-indigo-500 rounded-lg text-xs font-bold text-slate-300 transition shrink-0"
                            >
                              Manage
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SmartShift Center */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FiZap className="text-amber-400" /> SmartShift Center
                    </h2>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Validated alternatives for itinerary disruptions.</div>
                  </div>
                </div>
                <div className="p-8 text-center">
                  <FiZap className="mx-auto text-slate-700 mb-3" size={32} />
                  <div className="text-sm font-bold text-white mb-1">SmartShift ready</div>
                  <div className="text-xs text-slate-500">Simulate a disruption from a trip to generate validated alternatives.</div>
                </div>
              </div>

            </div>

            {/* Right Panel */}
            <div className="space-y-6">
              
              {/* Operational Alerts */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FiAlertCircle className="text-rose-400" /> Operational Alerts
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {stats?.actionRequired > 0 ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-900/50 rounded-xl flex items-start gap-3">
                      <div className="bg-amber-900/50 text-amber-400 p-1.5 rounded-lg shrink-0 mt-0.5">
                        <FiAlertCircle size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-400 uppercase tracking-wider mb-0.5">MEDIUM</div>
                        <div className="text-sm font-bold text-slate-200">Hotel booking action required</div>
                        <div className="text-xs text-slate-400 mt-1">{stats.actionRequired} requirements need operator attention.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-xs font-semibold text-slate-500">No operational alerts</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Readiness */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-400" /> Booking Readiness
                  </h2>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-300">Confirmed</span>
                      <span className="font-black text-emerald-400">{stats?.confirmed || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-300">Processing</span>
                      <span className="font-black text-blue-400">0</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-300">Not Booked</span>
                      <span className="font-black text-slate-400">{stats?.bookingsPending || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-800/60">
                      <span className="font-bold text-slate-300 flex items-center gap-2"><FiAlertCircle className="text-amber-500" /> Action Required</span>
                      <span className="font-black text-amber-400">{stats?.actionRequired || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operations Overview */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FiActivity className="text-blue-400" /> Operations Overview
                  </h2>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Shared Trips</div>
                    <div className="text-2xl font-black text-white">{stats?.activeTrips || 0}</div>
                  </div>
                  <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 text-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Requirements</div>
                    <div className="text-2xl font-black text-white">{(stats?.confirmed || 0) + (stats?.bookingsPending || 0) + (stats?.actionRequired || 0)}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
