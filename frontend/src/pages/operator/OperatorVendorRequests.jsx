import React, { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
        console.error("Failed to load vendor requests", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const interval = setInterval(fetchData, 10000);
    const onFocus = () => fetchData();
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
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center text-[#666666] gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#999999]">
          Loading Vendor Requests Work Queue...
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
                  TRANSIX • COMMUNICATION
                </div>
                <h1 className="text-lg font-bold text-[#1A1A1A]">
                  Vendor Requests Work Queue
                </h1>
                <p className="text-xs text-[#666666]">
                  Operational status and review for requests dispatched to connected vendors
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl w-full mx-auto">
          
          {/* Trip-Level Group Summary Cards */}
          {groupedByTrip.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-[#666666]">
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
                      className="bg-white border border-[#EBEBEB] rounded-xl p-5 space-y-3 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-[#0064D2]/40 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                            <span>{trip?.source || "Origin"}</span>
                            <FiArrowRight className="text-[#006CE4]" size={13} />
                            <span>{trip?.destination || "Destination"}</span>
                          </div>
                          {orgName && (
                            <div className="text-xs font-semibold text-[#1A1A1A] mt-0.5">
                              {orgName}
                            </div>
                          )}
                          <div className="text-xs text-[#666666] mt-1 flex items-center gap-2">
                            <span className="font-medium text-[#1A1A1A]">{vehicleText}</span>
                            <span>•</span>
                            <span>{travelersText}</span>
                          </div>
                        </div>

                        <Link
                          to={`/operator/trips/${group.tripId}?tab=transport`}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition shrink-0 shadow-xs"
                        >
                          View Requests
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-[#EBEBEB] flex flex-wrap items-center gap-2 text-[11px] font-medium">
                        <span className="px-2 py-0.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569]">
                          {reqs.length} Vendors Contacted
                        </span>
                        {awaitingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#0064D2]">
                            {awaitingCount} Awaiting Response
                          </span>
                        )}
                        {respCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#E6F7EF] text-[#00A65E] border border-[#A3E9C7]">
                            {respCount} Responses Received
                          </span>
                        )}
                        {rejCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
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
          <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-3 overflow-x-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "all"
                  ? "bg-[#0064D2] text-white shadow-xs"
                  : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
              }`}
            >
              <span>All Requests</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === "all" ? "bg-white/20 text-white" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"}`}>
                {counts.all}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("SENT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "SENT"
                  ? "bg-[#0064D2] text-white shadow-xs"
                  : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
              }`}
            >
              <span>Awaiting Response</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === "SENT" ? "bg-white/20 text-white" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"}`}>
                {counts.sent}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("RESPONDED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "RESPONDED"
                  ? "bg-[#0064D2] text-white shadow-xs"
                  : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
              }`}
            >
              <span>Responses Received</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === "RESPONDED" ? "bg-white/20 text-white" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"}`}>
                {counts.responded}
              </span>
            </button>
            <button
              onClick={() => setStatusFilter("REJECTED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
                statusFilter === "REJECTED"
                  ? "bg-[#0064D2] text-white shadow-xs"
                  : "bg-white text-[#666666] hover:text-[#1A1A1A] border border-[#EBEBEB] hover:bg-[#F5F7FA]"
              }`}
            >
              <span>Rejected</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] ${statusFilter === "REJECTED" ? "bg-white/20 text-white" : "bg-[#F5F7FA] text-[#666666] border border-[#E2E8F0]"}`}>
                {counts.rejected}
              </span>
            </button>
          </div>

          {/* Individual Vendor Requests List */}
          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-12 text-center text-[#666666] text-xs shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <FiBriefcase className="mx-auto text-[#A0AEC0] mb-2" size={24} />
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
                    className="p-4 bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-150"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1A1A1A]">
                          {vendor?.name || "Connected Vendor"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isResponded
                            ? "bg-[#E6F7EF] text-[#00A65E] border-[#A3E9C7]"
                            : isRejected
                            ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]"
                            : isConfReq
                            ? "bg-[#FFF4ED] text-[#F5330F] border-[#FFD0B8]"
                            : "bg-[#EFF6FF] text-[#0064D2] border-[#BFDBFE]"
                        }`}>
                          {isResponded ? "Response Received" : isRejected ? "Rejected" : isConfReq ? "Confirmation Requested" : "Awaiting Response"}
                        </span>
                      </div>

                      <div className="text-xs text-[#666666] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>Trip: {trip?.source || "Origin"} → {trip?.destination || "Destination"}</span>
                        {trip?.organizationDetails?.name && (
                          <span>({trip.organizationDetails.name})</span>
                        )}
                        <span>•</span>
                        <span>Requested: {formatDate(req.createdAt)}</span>
                      </div>

                      {req.response && req.response.quoteTotal && (
                        <div className="mt-2 text-xs text-[#00A65E] font-bold">
                          Quotation: ₹{Number(req.response.quoteTotal).toLocaleString()} ({req.response.allocatedVehiclesCount || 1} vehicle allocated)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/operator/trips/${req.tripId}?tab=transport`}
                        className="px-3.5 py-1.5 rounded-lg bg-[#EFF6FF] hover:bg-[#0064D2] text-[#0064D2] hover:text-white border border-[#BFDBFE] text-xs font-semibold transition shadow-xs"
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
