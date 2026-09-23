import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getOperatorAllVendorRequests, getDashboardStats } from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import { 
  FiBriefcase, FiClock, FiCheckCircle, FiXCircle, 
  FiArrowRight, FiMenu, FiX, FiCheck, FiSend, FiUsers
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";

export default function OperatorVendorRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "SENT" | "RESPONDED" | "REJECTED" | "CONFIRMATION_REQUESTED"
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
        const [requestsData, statsData] = await Promise.all([
          getOperatorAllVendorRequests(token),
          getDashboardStats(token).catch(() => null),
        ]);

        if (requestsData?.success) {
          setRequests(requestsData.requests || []);
        }
        if (statsData?.success) {
          setStats(statsData.stats);
        }
        lastFetchRef.current = Date.now();
      } catch (err) {
        console.error("Failed to load vendor requests", err);
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

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    if (statusFilter === "RESPONDED") {
      return requests.filter(r => r.status === "RESPONDED" || (r.response && r.response.availability));
    }
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  // Group requests by trip for high-level operational overview
  const groupedByTrip = useMemo(() => {
    const map = new Map();
    requests.forEach(req => {
      const tripId = req.tripId?.toString() || "other";
      if (!map.has(tripId)) {
        map.set(tripId, {
          trip: req.trip,
          tripId: req.tripId,
          fleetRequirement: req.fleetRequirement,
          requests: [],
        });
      }
      map.get(tripId).requests.push(req);
    });
    return Array.from(map.values());
  }, [requests]);

  const counts = useMemo(() => {
    const sent = requests.filter(r => r.status === "SENT").length;
    const responded = requests.filter(r => r.status === "RESPONDED" || (r.response && r.response.availability)).length;
    const rejected = requests.filter(r => r.status === "REJECTED" || r.response?.availability === "UNAVAILABLE").length;
    const confirmed = requests.filter(r => r.status === "CONFIRMED" || r.status === "SELECTED").length;
    return { all: requests.length, sent, responded, rejected, confirmed };
  }, [requests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Vendor Requests Work Queue...
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
                  TRANSIX • COMMUNICATION
                </div>
                <h1 className="text-lg font-black text-white">
                  Vendor Requests Work Queue
                </h1>
                <p className="text-xs text-slate-400">
                  Operational status and review for requests dispatched to connected vendors
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Trip-Level Group Summary Cards */}
          {groupedByTrip.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                Active Trips With Dispatched Requests
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedByTrip.map(group => {
                  const trip = group.trip;
                  const reqs = group.requests;
                  const awaitingCount = reqs.filter(r => r.status === "SENT").length;
                  const respCount = reqs.filter(r => r.status === "RESPONDED" || (r.response && r.response.availability === "AVAILABLE")).length;
                  const rejCount = reqs.filter(r => r.status === "REJECTED" || r.response?.availability === "UNAVAILABLE").length;
                  const orgName = trip?.organizationDetails?.name;
                  const fleetReq = group.fleetRequirement || {};
                  const vehicleText = `${fleetReq.vehicleCount || 8} × ${fleetReq.ac ? "AC" : "Non-AC"} ${fleetReq.vehicleCategory || "Coach"}`;
                  const travelersText = `${trip?.travelers || fleetReq.totalCapacityRequired || 200} Students`;

                  return (
                    <div 
                      key={group.tripId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-sm font-black text-white flex items-center gap-2">
                            <span>{trip?.source}</span>
                            <FiArrowRight className="text-indigo-400" size={13} />
                            <span>{trip?.destination}</span>
                          </div>
                          {orgName && (
                            <div className="text-xs font-bold text-slate-300 mt-0.5">
                              {orgName}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span className="font-semibold text-slate-300">{vehicleText}</span>
                            <span>•</span>
                            <span>{travelersText}</span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${group.tripId}?tab=transport`}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shrink-0"
                        >
                          View Requests
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {reqs.length} Vendors Contacted
                        </span>
                        {awaitingCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {awaitingCount} Awaiting Response
                          </span>
                        )}
                        {respCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                            {respCount} Responses Received
                          </span>
                        )}
                        {rejCount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/40">
                            {rejCount} Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>All Requests</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                {counts.all}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("SENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "SENT"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>Awaiting Response</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                {counts.sent}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("RESPONDED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "RESPONDED"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>Responses Received</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                {counts.responded}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "REJECTED"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                {counts.rejected}
              </span>
            </button>
          </div>

          {/* Individual Vendor Requests List */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                <FiBriefcase className="mx-auto text-slate-600 mb-2" size={24} />
                No vendor requests match the selected filter.
              </div>
            ) : (
              filteredRequests.map(req => {
                const vendor = req.vendorId;
                const trip = req.trip;
                const isResponded = req.status === "RESPONDED" || Boolean(req.response?.availability);
                const isRejected = req.status === "REJECTED" || req.response?.availability === "UNAVAILABLE";
                const isConfReq = req.status === "CONFIRMATION_REQUESTED";

                return (
                  <div 
                    key={req._id}
                    className="p-4 bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {vendor?.name || "Connected Vendor"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isResponded
                            ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                            : isRejected
                            ? "bg-rose-950/60 text-rose-400 border border-rose-900/40"
                            : isConfReq
                            ? "bg-blue-950/60 text-blue-400 border border-blue-800/40"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}>
                          {isResponded ? "Response Received" : isRejected ? "Rejected" : isConfReq ? "Confirmation Requested" : "Awaiting Response"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Trip: {trip?.source} → {trip?.destination}</span>
                        {trip?.organizationDetails?.name && (
                          <span>({trip.organizationDetails.name})</span>
                        )}
                        <span>•</span>
                        <span>Requested: {formatDate(req.createdAt)}</span>
                      </div>

                      {req.response && req.response.quoteTotal && (
                        <div className="mt-2 text-xs text-emerald-400 font-bold">
                          Quotation: ₹{Number(req.response.quoteTotal).toLocaleString()} ({req.response.allocatedVehiclesCount || 1} vehicle allocated)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/operator/trips/${req.tripId}?tab=transport`}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition"
                      >
                        Review in Trip
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
