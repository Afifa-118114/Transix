import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  vendorLogin,
  getVendorMe,
  searchConnectedVendors,
  getActiveRequestVendors,
  getVendorPortalRequests,
  getVendorRequestDetails,
  acceptVendorRequest,
  rejectVendorRequest,
  submitVendorResponse,
  getVendorRequestMessages,
  sendVendorRequestMessage,
} from "../../api/operatorApi";
import {
  FiBriefcase,
  FiArrowLeft,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCheck,
  FiSend,
  FiUsers,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiRefreshCw,
  FiSearch,
  FiLock,
  FiLogOut,
  FiMessageSquare,
  FiX,
  FiShield,
  FiTruck,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import toast from "react-hot-toast";

export default function DemoVendorPortal() {
  // Session & Authentication State
  const [vendorToken, setVendorToken] = useState(localStorage.getItem("vendorToken") || "");
  const [currentVendor, setCurrentVendor] = useState(() => {
    const saved = localStorage.getItem("vendorProfile");
    return saved ? JSON.parse(saved) : null;
  });

  // Portal Dashboard State (When Not Logged In)
  const [activeVendorsWithRequests, setActiveVendorsWithRequests] = useState([]);
  const [loadingActiveVendors, setLoadingActiveVendors] = useState(false);

  // Search Vendors State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Login Modal State
  const [loginModalVendor, setLoginModalVendor] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("vendor123");
  const [loggingIn, setLoggingIn] = useState(false);

  // Authenticated Vendor Dashboard State
  const [requests, setRequests] = useState([]);
  const [vendorStats, setVendorStats] = useState({
    newRequests: 0,
    awaitingResponse: 0,
    responsesSubmitted: 0,
    confirmedWork: 0,
  });
  const [activeTab, setActiveTab] = useState("all"); // all | awaiting | responded | confirmed
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Request Details & Action Modals State
  const [activeRequestDetail, setActiveRequestDetail] = useState(null);
  const [detailTab, setDetailTab] = useState("details"); // details | response | messages

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("No vehicles available");
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // Response Form State
  const [selectedFleetIndex, setSelectedFleetIndex] = useState(0);
  const [allocatedCount, setAllocatedCount] = useState(1);
  const [quoteBaseAmount, setQuoteBaseAmount] = useState(200000);
  const [quoteAdditionalCharges, setQuoteAdditionalCharges] = useState(15000);
  const [driverIncluded, setDriverIncluded] = useState(true);
  const [responseNotes, setResponseNotes] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Messages State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // 1. Initial Data Fetching
  useEffect(() => {
    if (!vendorToken) {
      loadActiveVendors();
    } else {
      loadVendorDataAndRequests();
    }
  }, [vendorToken]);

  const loadActiveVendors = async () => {
    setLoadingActiveVendors(true);
    try {
      const res = await getActiveRequestVendors();
      if (res?.success) {
        setActiveVendorsWithRequests(res.vendors || []);
      }
    } catch (err) {
      console.error("Failed to load active vendors", err);
    } finally {
      setLoadingActiveVendors(false);
    }
  };

  const loadVendorDataAndRequests = async () => {
    if (!vendorToken) return;
    setLoadingRequests(true);
    try {
      const [meRes, reqsRes] = await Promise.all([
        getVendorMe(vendorToken).catch(() => null),
        getVendorPortalRequests({}, vendorToken).catch(() => null),
      ]);

      if (meRes?.success && meRes.vendor) {
        setCurrentVendor(meRes.vendor);
        localStorage.setItem("vendorProfile", JSON.stringify(meRes.vendor));
      }
      if (reqsRes?.success) {
        setRequests(reqsRes.requests || []);
        if (reqsRes.stats) setVendorStats(reqsRes.stats);
      }
    } catch (err) {
      console.error("Failed to load vendor requests", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoadingRequests(false);
    }
  };

  // 2. Search Canonical Connected Vendors (Debounced Live Search & Form Submit)
  useEffect(() => {
    if (!showSearchModal) {
      setSearchQuery("");
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchConnectedVendors(searchQuery.trim());
        if (res?.success) {
          setSearchResults(res.vendors || []);
        }
      } catch (err) {
        console.error("Vendor search failed", err);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, showSearchModal]);

  const handleSearchVendors = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await searchConnectedVendors(searchQuery.trim());
      if (res?.success) {
        setSearchResults(res.vendors || []);
      }
    } catch (err) {
      console.error("Vendor search failed", err);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  // 3. Login Flow
  const handleOpenLogin = (vendor) => {
    setLoginModalVendor(vendor);
    const slug = vendor.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
    setLoginEmail(`${slug}@transix-fleet.in`);
    setLoginPassword("vendor123");
  };

  const handleExecuteLogin = async (e) => {
    e?.preventDefault();
    if (!loginModalVendor) return;
    setLoggingIn(true);
    try {
      const res = await vendorLogin({
        vendorId: loginModalVendor._id || loginModalVendor.vendorId,
        email: loginEmail,
        password: loginPassword,
      });

      if (res?.success && res.token) {
        setVendorToken(res.token);
        setCurrentVendor(res.vendor);
        localStorage.setItem("vendorToken", res.token);
        localStorage.setItem("vendorProfile", JSON.stringify(res.vendor));
        setLoginModalVendor(null);
        setShowSearchModal(false);
        toast.success(`Logged in as ${res.vendor.name}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Vendor login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setVendorToken("");
    setCurrentVendor(null);
    localStorage.removeItem("vendorToken");
    localStorage.removeItem("vendorProfile");
    setActiveRequestDetail(null);
    loadActiveVendors();
    toast.success("Logged out from Vendor Portal");
  };

  // 4. Request Details & Actions
  const handleOpenRequestDetail = async (req) => {
    setActiveRequestDetail(req);
    setDetailTab("details");
    // Pre-seed response form based on request and vendor master fleet
    const neededVehicles = req.fleetRequirement?.vehicleCount || req.requestSnapshot?.vehiclesRequired || 1;
    setAllocatedCount(neededVehicles);
    setQuoteBaseAmount(neededVehicles * 28000);
    setQuoteAdditionalCharges(neededVehicles * 2500);
    setDriverIncluded(true);
    setResponseNotes(`Can provide ${neededVehicles} sanitized coach(es) with dedicated experienced drivers.`);

    // If status was SENT, reload list to reflect VIEWED
    if (req.status === "SENT") {
      try {
        await getVendorRequestDetails(req._id, vendorToken);
        loadVendorDataAndRequests();
      } catch (e) {}
    }
  };

  const handleAcceptRequest = async () => {
    if (!activeRequestDetail) return;
    try {
      const res = await acceptVendorRequest(activeRequestDetail._id, vendorToken);
      if (res?.success) {
        toast.success("Request accepted. Please submit your quotation & vehicle allocation.");
        setActiveRequestDetail(res.request);
        setDetailTab("response");
        loadVendorDataAndRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (e) => {
    e.preventDefault();
    if (!activeRequestDetail) return;
    setSubmittingReject(true);
    try {
      const res = await rejectVendorRequest(
        activeRequestDetail._id,
        {
          rejectionReason,
          rejectionMessage,
        },
        vendorToken
      );
      if (res?.success) {
        toast.success("Request rejection submitted to operator");
        setShowRejectModal(false);
        setActiveRequestDetail(res.request);
        loadVendorDataAndRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleSubmitResponseForm = async (e) => {
    e.preventDefault();
    if (!activeRequestDetail || !currentVendor?.fleet) return;
    setSubmittingResponse(true);

    try {
      const fleetItem = currentVendor.fleet[selectedFleetIndex] || currentVendor.fleet[0];
      const vehicles = [
        {
          category: fleetItem.category,
          count: Number(allocatedCount),
          seatsPerVehicle: Number(fleetItem.capacity),
        },
      ];

      const quotation = {
        baseAmount: Number(quoteBaseAmount),
        additionalCharges: Number(quoteAdditionalCharges),
        totalAmount: Number(quoteBaseAmount) + Number(quoteAdditionalCharges),
        currency: "INR",
      };

      const res = await submitVendorResponse(
        activeRequestDetail._id,
        {
          vehicles,
          quotation,
          driverIncluded,
          notes: responseNotes,
        },
        vendorToken
      );

      if (res?.success) {
        toast.success("Response and quotation submitted to Operator!");
        setActiveRequestDetail(res.request);
        setDetailTab("details");
        loadVendorDataAndRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit response");
    } finally {
      setSubmittingResponse(false);
    }
  };

  // 5. Messages
  const loadMessages = async (requestId) => {
    if (!requestId || !vendorToken) return;
    setLoadingMessages(true);
    try {
      const res = await getVendorRequestMessages(requestId, vendorToken);
      if (res?.success) {
        setMessages(res.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeRequestDetail && detailTab === "messages") {
      loadMessages(activeRequestDetail._id);
    }
  }, [activeRequestDetail, detailTab]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!activeRequestDetail || !messageInput.trim()) return;
    setSendingMessage(true);
    try {
      const res = await sendVendorRequestMessage(activeRequestDetail._id, messageInput.trim(), vendorToken);
      if (res?.success) {
        setMessages((prev) => [...prev, res.message]);
        setMessageInput("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter requests for authenticated vendor
  const filteredRequests = requests.filter((r) => {
    if (activeTab === "awaiting") return ["SENT", "VIEWED", "ACCEPTED"].includes(r.status);
    if (activeTab === "responded") return ["RESPONDED", "SELECTED", "CONFIRMATION_REQUESTED"].includes(r.status);
    if (activeTab === "confirmed") return r.status === "CONFIRMED";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* TOP BAR / NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                to="/operator/dashboard"
                className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:underline flex items-center gap-1"
              >
                <FiArrowLeft size={10} /> Operator Dashboard
              </Link>
              <span className="text-slate-600 text-xs">/</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Connected Vendor Network
              </span>
            </div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <span className="p-2 bg-indigo-600 rounded-xl text-white">
                <FiBriefcase size={18} />
              </span>
              <span>TRANSIX Vendor Portal</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setShowSearchModal(true);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition flex items-center gap-2 border border-slate-700 shadow-xs"
            >
              <FiSearch size={13} className="text-indigo-400" />
              <span>🔎 Search Vendors</span>
            </button>

            {vendorToken ? (
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 border border-rose-800/60"
              >
                <FiLogOut size={13} />
                <span>Logout</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CASE A: NOT LOGGED IN — VENDOR PORTAL DASHBOARD (ACTIVE REQUESTS ONLY) */}
        {/* ========================================================= */}
        {!vendorToken ? (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                    VENDOR PORTAL
                  </div>
                  <h2 className="text-base font-extrabold text-white mt-0.5">
                    Requests Received
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Displaying vendors that currently have active/received group fleet requests. Vendors with no requests do not appear here.
                  </p>
                </div>
                <button
                  onClick={loadActiveVendors}
                  disabled={loadingActiveVendors}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <FiRefreshCw size={12} className={loadingActiveVendors ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingActiveVendors ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading received requests...
                </div>
              ) : activeVendorsWithRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800 p-8 space-y-3">
                  <FiBriefcase className="mx-auto text-slate-600" size={28} />
                  <div className="font-bold text-white text-sm">No Active Vendor Requests Dispatched Yet</div>
                  <p className="max-w-md mx-auto text-slate-400 text-xs">
                    Dispatch a request from Operator Campus Group Fleet, or use the <strong>"Search Vendors"</strong> tool above to log in as any connected vendor.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeVendorsWithRequests.map((v) => (
                    <div
                      key={v.vendorId}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition shadow-md flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-black text-white text-sm leading-snug">
                            {v.name}
                          </h3>
                          {v.newRequestsCount > 0 && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              🔔 {v.newRequestsCount} New
                            </span>
                          )}
                        </div>

                        {v.latestRequest && (
                          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800/80 text-xs space-y-1">
                            <div className="font-extrabold text-white flex items-center gap-1.5">
                              <span>{v.latestRequest.originCity}</span>
                              <span className="text-slate-500">→</span>
                              <span>{v.latestRequest.destinationCity}</span>
                            </div>
                            <div className="text-slate-300 text-[11px]">
                              {v.latestRequest.travelers} Travelers • {v.latestRequest.vehicleSummary}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenLogin(v)}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md"
                      >
                        <FiLock size={12} />
                        <span>Login as {v.name.split(" ")[0]}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CASE B: LOGGED IN AS VENDOR (AUTHENTICATED SESSION CONTEXT) */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Vendor Profile Context Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                    CONNECTED VENDOR
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentVendor?.email || ""}
                  </span>
                </div>
                <h2 className="text-xl font-black text-white mt-1">
                  {currentVendor?.name}
                </h2>
              </div>

              {/* Stat Counters for THIS vendor only */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">New Requests</span>
                  <span className="text-base font-black text-amber-400">{vendorStats.newRequests}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Awaiting Response</span>
                  <span className="text-base font-black text-indigo-400">{vendorStats.awaitingResponse}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Responses</span>
                  <span className="text-base font-black text-purple-400">{vendorStats.responsesSubmitted}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Confirmed</span>
                  <span className="text-base font-black text-emerald-400">{vendorStats.confirmedWork}</span>
                </div>
              </div>
            </div>

            {/* Requests Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === "all" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    All ({requests.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("awaiting")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === "awaiting" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Awaiting Response ({vendorStats.awaitingResponse})
                  </button>
                  <button
                    onClick={() => setActiveTab("responded")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      activeTab === "responded" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Responses ({vendorStats.responsesSubmitted})
                  </button>
                </div>

                <button
                  onClick={loadVendorDataAndRequests}
                  disabled={loadingRequests}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 self-end sm:self-auto"
                >
                  <FiRefreshCw size={12} className={loadingRequests ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingRequests ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading your vendor requests...
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs italic">
                  No requests found matching this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const isNew = req.status === "SENT";
                    const isViewed = req.status === "VIEWED";
                    const isAccepted = req.status === "ACCEPTED";
                    const isResponded = req.status === "RESPONDED";
                    const isRejected = req.status === "REJECTED";

                    return (
                      <div
                        key={req._id}
                        className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-white text-sm">
                              {req.route?.originCity || req.requestSnapshot?.originCity || "Origin"} → {req.route?.destinationCity || req.requestSnapshot?.destinationCity || "Destination"}
                            </span>
                            {isNew && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                🔔 New Request
                              </span>
                            )}
                            {isViewed && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                Viewed
                              </span>
                            )}
                            {isAccepted && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                                Accepted • Quote Pending
                              </span>
                            )}
                            {isResponded && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                                ✓ Response Submitted
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800/60">
                                ✕ Rejected
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-300">
                            <strong>{req.travelers?.total || req.requestSnapshot?.totalTravelers || 20} Travelers</strong> • {req.fleetRequirement?.vehicleCount || req.requestSnapshot?.vehiclesRequired || 1} × {req.fleetRequirement?.vehicleCategory || req.requestSnapshot?.vehicleType || "Coach"}
                          </div>

                          {req.response?.quotation?.totalAmount > 0 && (
                            <div className="text-xs font-extrabold text-emerald-400">
                              Quotation: ₹{req.response.quotation.totalAmount.toLocaleString("en-IN")}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() => handleOpenRequestDetail(req)}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: SEARCH VENDORS (100 CONNECTED VENDORS) */}
        {/* ========================================================= */}
        {showSearchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    🔎 Search Connected Vendors
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Search canonical vendors from the 100 connected demo vendor database.
                  </p>
                </div>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleSearchVendors} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by vendor name (e.g. Sabarmati, Royal)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </form>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {isSearching ? (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium">
                    Searching connected vendors...
                  </div>
                ) : searchResults.length === 0 && searchQuery && hasSearched ? (
                  <div className="py-6 text-center text-slate-500 italic text-xs">
                    No connected vendors match "{searchQuery}"
                  </div>
                ) : (
                  searchResults.map((v) => (
                    <div
                      key={v._id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-extrabold text-white text-xs">{v.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Connected Vendor • {v.fleet?.length || 0} vehicle configurations
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleOpenLogin(v);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                      >
                        Login
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: VENDOR LOGIN */}
        {/* ========================================================= */}
        {loginModalVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                    VENDOR LOGIN
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {loginModalVendor.name}
                  </h3>
                </div>
                <button
                  onClick={() => setLoginModalVendor(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleExecuteLogin} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
                  >
                    {loggingIn ? "Authenticating..." : "Login"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: VENDOR REQUEST DETAILS, ACCEPT/REJECT & MESSAGING */}
        {/* ========================================================= */}
        {activeRequestDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                    GROUP TRANSPORT REQUEST
                  </div>
                  <h3 className="text-base font-extrabold text-white">
                    {activeRequestDetail.route?.originCity || activeRequestDetail.requestSnapshot?.originCity} → {activeRequestDetail.route?.destinationCity || activeRequestDetail.requestSnapshot?.destinationCity}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveRequestDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-2 border-b border-slate-800 pb-2 shrink-0">
                <button
                  onClick={() => setDetailTab("details")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                    detailTab === "details" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Trip Details
                </button>
                {activeRequestDetail.status !== "REJECTED" && (
                  <button
                    onClick={() => setDetailTab("response")}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      detailTab === "response" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Quotation / Allocation Form
                  </button>
                )}
                <button
                  onClick={() => setDetailTab("messages")}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 ${
                    detailTab === "messages" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FiMessageSquare size={12} />
                  <span>Messages with Operator</span>
                </button>
              </div>

              {/* Tab 1: Request Details */}
              {detailTab === "details" && (
                <div className="overflow-y-auto space-y-4 pr-1">
                  {/* Trip Details */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Trip Details</span>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>Travelers: <strong className="text-white">{activeRequestDetail.travelers?.total || activeRequestDetail.requestSnapshot?.totalTravelers}</strong></div>
                      <div>Trip Type: <strong className="text-white">Campus</strong></div>
                      <div>Duration: <strong className="text-white">Multi-day</strong></div>
                    </div>
                  </div>

                  {/* Fleet Requirement */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Fleet Requirement</span>
                    <div className="text-white font-bold text-sm">
                      {activeRequestDetail.fleetRequirement?.vehicleCount || activeRequestDetail.requestSnapshot?.vehiclesRequired} × {activeRequestDetail.fleetRequirement?.vehicleCategory || activeRequestDetail.requestSnapshot?.vehicleType || "Coach"}
                    </div>
                    <div className="text-slate-300">
                      Minimum capacity: <strong className="text-white">{activeRequestDetail.fleetRequirement?.minimumCapacityPerVehicle || 25} seats</strong> • Driver included
                    </div>
                  </div>

                  {/* Preferences */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Preferences</span>
                    <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                      <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> AC</div>
                      <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> Coach</div>
                      <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> Group transport</div>
                      <div className="flex items-center gap-1.5"><FiCheck className="text-emerald-400" /> Driver included</div>
                      <div className="flex items-center gap-1.5 col-span-2"><FiCheck className="text-emerald-400" /> Multi-day</div>
                    </div>
                  </div>

                  {/* Response Summary if responded */}
                  {activeRequestDetail.status === "RESPONDED" && (
                    <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-900/50 space-y-1.5">
                      <span className="text-[10px] font-black uppercase text-emerald-400 block">✓ Response Submitted</span>
                      <div className="text-white font-extrabold text-sm">
                        Quotation Total: ₹{activeRequestDetail.response?.quotation?.totalAmount?.toLocaleString("en-IN") || activeRequestDetail.response?.quote}
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        Status: {activeRequestDetail.response?.availability}
                      </div>
                    </div>
                  )}

                  {/* Rejection if rejected */}
                  {activeRequestDetail.status === "REJECTED" && (
                    <div className="bg-rose-950/30 p-4 rounded-xl border border-rose-900/50 space-y-1 text-rose-300">
                      <span className="text-[10px] font-black uppercase text-rose-400 block">✕ Rejected by You</span>
                      <div>Reason: {activeRequestDetail.response?.rejectionReason}</div>
                      {activeRequestDetail.response?.rejectionMessage && (
                        <div className="italic text-[11px]">"{activeRequestDetail.response.rejectionMessage}"</div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for New or Viewed Request */}
                  {["SENT", "VIEWED"].includes(activeRequestDetail.status) && (
                    <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                      <span className="text-slate-300 font-bold">Are you available?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowRejectModal(true)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-rose-400 border border-rose-900/40 font-bold text-xs transition"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={handleAcceptRequest}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
                        >
                          Accept Request
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Response & Quotation Form */}
              {detailTab === "response" && (
                <form onSubmit={handleSubmitResponseForm} className="overflow-y-auto space-y-4 pr-1">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Availability</span>
                    <div className="text-emerald-400 font-bold flex items-center gap-1.5 text-xs">
                      <FiCheckCircle />
                      <span>Available</span>
                    </div>
                  </div>

                  {/* Vehicle Allocation - Master Fleet Validated */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Vehicle Allocation</span>
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-400 block">Select Vehicle from Your Master Fleet</label>
                      <select
                        value={selectedFleetIndex}
                        onChange={(e) => setSelectedFleetIndex(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      >
                        {(currentVendor?.fleet || []).map((f, i) => (
                          <option key={i} value={i}>
                            {f.category} ({f.capacity} seats, {f.ac ? "AC" : "Non-AC"}, {f.comfort})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Number of vehicles</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={allocatedCount}
                          onChange={(e) => setAllocatedCount(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Seats per vehicle</label>
                        <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-bold">
                          {currentVendor?.fleet?.[selectedFleetIndex]?.capacity || 45} seats
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quotation */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Quotation</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Base amount (₹)</label>
                        <input
                          type="number"
                          value={quoteBaseAmount}
                          onChange={(e) => setQuoteBaseAmount(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Additional charges (₹)</label>
                        <input
                          type="number"
                          value={quoteAdditionalCharges}
                          onChange={(e) => setQuoteAdditionalCharges(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-extrabold">
                      <span className="text-slate-300">Total Quotation Amount:</span>
                      <span className="text-emerald-400">
                        ₹{(Number(quoteBaseAmount) + Number(quoteAdditionalCharges)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Driver & Notes */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-bold">Driver included?</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={driverIncluded}
                          onChange={(e) => setDriverIncluded(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-white text-xs">Yes</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Notes / Conditions</label>
                      <textarea
                        rows="2"
                        value={responseNotes}
                        onChange={(e) => setResponseNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Tolls separate, permit included, etc."
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingResponse}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition"
                    >
                      {submittingResponse ? "Submitting..." : "Submit Response"}
                    </button>
                  </div>
                </form>
              )}

              {/* Tab 3: One-to-One Messaging */}
              {detailTab === "messages" && (
                <div className="flex-1 overflow-y-auto space-y-3 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    {loadingMessages ? (
                      <div className="text-center text-slate-500 py-6">Loading conversation...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-slate-500 py-6 italic">
                        No messages exchanged with Tour Operations yet.
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isVendor = m.senderRole === "vendor";
                        return (
                          <div
                            key={m._id || Math.random()}
                            className={`flex flex-col ${isVendor ? "items-end" : "items-start"}`}
                          >
                            <div className="text-[10px] text-slate-400 mb-0.5">
                              {isVendor ? "You (Vendor)" : (m.senderName || "Operator")}
                            </div>
                            <div
                              className={`p-2.5 rounded-xl max-w-[85%] text-xs ${
                                isVendor
                                  ? "bg-indigo-600 text-white rounded-br-xs"
                                  : "bg-slate-800 text-slate-200 rounded-bl-xs border border-slate-700"
                              }`}
                            >
                              {m.message}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              {new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2 pt-1 shrink-0">
                    <input
                      type="text"
                      placeholder="Type message to Tour Operations..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={sendingMessage || !messageInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Send</span>
                      <FiSend size={12} />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: REJECT FORM */}
        {/* ========================================================= */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-extrabold text-white">
                  Reject Group Request
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              <form onSubmit={handleRejectRequest} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">Reason</label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="No vehicles available">No vehicles available</option>
                    <option value="Route not covered">Route not covered</option>
                    <option value="Schedule conflict">Schedule conflict</option>
                    <option value="Capacity unavailable">Capacity unavailable</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-bold block mb-1">Optional Message</label>
                  <textarea
                    rows="3"
                    value={rejectionMessage}
                    onChange={(e) => setRejectionMessage(e.target.value)}
                    placeholder="Provide additional context for the tour operator..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReject}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
                  >
                    {submittingReject ? "Rejecting..." : "Submit Rejection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
