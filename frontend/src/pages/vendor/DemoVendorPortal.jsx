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
  getDashboardStats,
} from "../../api/operatorApi";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
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
  FiMenu,
  FiChevronRight,
  FiCompass,
} from "react-icons/fi";
import { FaBus } from "react-icons/fa";
import toast from "react-hot-toast";

export default function DemoVendorPortal() {
  // Sidebar & Layout State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarStats, setSidebarStats] = useState(null);

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
    // Optionally fetch dashboard stats to populate sidebar counts if operator is logged in
    const token = localStorage.getItem("token");
    if (token) {
      getDashboardStats(token)
        .then((res) => {
          if (res?.success && res.stats) {
            setSidebarStats(res.stats);
          }
        })
        .catch(() => {});
    }

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
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex font-sans">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (FIX: PREVENTS SIDEBAR FROM DISAPPEARING ON VENDOR PAGE)  */}
      {/* ========================================================================= */}
      <aside className="w-64 flex-shrink-0 hidden lg:block h-screen sticky top-0">
        <OperatorSidebar pendingCount={sidebarStats?.pendingBookings} />
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER SIDEBAR                                                     */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative w-64 max-w-[80%] h-full z-10 flex flex-col bg-white">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#666666] hover:text-[#1A1A1A] z-20"
              aria-label="Close sidebar"
            >
              <FiX size={20} />
            </button>
            <OperatorSidebar pendingCount={sidebarStats?.pendingBookings} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F7FA]">
        {/* Mobile Header Only */}
        <header className="lg:hidden bg-white border-b border-[#EBEBEB] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-[#EBEBEB] text-[#1A1A1A] hover:bg-[#F5F7FA]"
              aria-label="Open sidebar"
            >
              <FiMenu size={18} />
            </button>
            <span className="text-sm font-bold text-[#1A1A1A]">Vendor Portal</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF3FF] text-[#0064D2]">
            {currentVendor ? currentVendor.name.split(" ")[0] : "Fleet Network"}
          </span>
        </header>

        {/* Dashboard Main Scroll Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* TOP BANNER / NAVIGATION (TRIP.COM DEEP BLUE GRADIENT HERO)               */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-[#1A56DB] via-[#1447B8] to-[#0F3D91] text-white p-5 sm:p-6 rounded-xl shadow-xs relative overflow-hidden">
            {/* Ambient background visual accent */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
              <FiBriefcase size={130} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Link
                    to="/operator/dashboard"
                    className="text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white flex items-center gap-1 bg-white/10 px-2.5 py-0.5 rounded-full transition"
                  >
                    <FiArrowLeft size={10} /> Operator Dashboard
                  </Link>
                  <span className="text-white/40">•</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Connected Vendor Network
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <span>TRANSIX Vendor Portal</span>
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                  Charter fleet dispatch, instant operator quotation submission, and vehicle allocation.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center shrink-0">
                <button
                  onClick={() => {
                    setShowSearchModal(true);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center gap-2 border border-white/20 backdrop-blur-xs shadow-xs"
                >
                  <FiSearch size={13} className="text-white/90" />
                  <span>Search 100 Vendors</span>
                </button>

                {vendorToken ? (
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                  >
                    <FiLogOut size={13} />
                    <span>Exit Session</span>
                  </button>
                ) : null}

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse"></span>
                  Live Network
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CASE A: NOT LOGGED IN — VENDOR PORTAL DASHBOARD (ACTIVE REQUESTS ONLY)   */}
          {/* ========================================================================= */}
          {!vendorToken ? (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBEBEB]">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2]">
                      VENDOR PORTAL
                    </div>
                    <h2 className="text-lg font-bold text-[#1A1A1A] mt-0.5">
                      Requests Received
                    </h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      Displaying vendors that currently have active or received group fleet requests. Vendors with no pending requests do not appear here.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        setShowSearchModal(true);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#EBF3FF] hover:bg-[#D8E8FE] text-[#0064D2] text-xs font-semibold transition flex items-center gap-1.5 border border-[#BFDBFE]"
                    >
                      <FiSearch size={12} />
                      <span>Search All Vendors</span>
                    </button>

                    <button
                      onClick={loadActiveVendors}
                      disabled={loadingActiveVendors}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#666666] hover:text-[#1A1A1A] text-xs font-semibold transition flex items-center gap-1.5 border border-[#EBEBEB]"
                    >
                      <FiRefreshCw size={12} className={loadingActiveVendors ? "animate-spin" : ""} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {loadingActiveVendors ? (
                  <div className="py-16 text-center text-[#666666] text-xs">
                    <div className="w-7 h-7 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                    Loading received vendor requests...
                  </div>
                ) : activeVendorsWithRequests.length === 0 ? (
                  <div className="py-14 text-center text-[#666666] text-xs bg-[#F8FAFC] rounded-xl border border-dashed border-[#D1D5DB] p-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center mx-auto">
                      <FiBriefcase size={22} />
                    </div>
                    <div className="font-bold text-[#1A1A1A] text-sm">No Active Vendor Requests Dispatched Yet</div>
                    <p className="max-w-md mx-auto text-[#666666] text-xs">
                      Dispatch a request from Operator Campus Group Fleet, or use the <strong>"Search 100 Vendors"</strong> tool above to test and log in as any connected vendor partner.
                    </p>
                    <button
                      onClick={() => {
                        setShowSearchModal(true);
                        setSearchQuery("");
                        setSearchResults([]);
                      }}
                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition shadow-xs"
                    >
                      <FiSearch size={13} />
                      <span>Browse All Connected Vendors</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeVendorsWithRequests.map((v) => (
                      <div
                        key={v.vendorId}
                        className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/60 hover:shadow-md rounded-xl p-5 space-y-4 transition flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-[#1A1A1A] text-sm group-hover:text-[#0064D2] transition leading-snug">
                                {v.name}
                              </h3>
                              <span className="text-[11px] text-[#666666]">
                                Connected Fleet Partner
                              </span>
                            </div>
                            {v.newRequestsCount > 0 && (
                              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7] flex items-center gap-1">
                                🔔 {v.newRequestsCount} New
                              </span>
                            )}
                          </div>

                          {v.latestRequest && (
                            <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#EBEBEB] text-xs space-y-1.5">
                              <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                <span>{v.latestRequest.originCity}</span>
                                <span className="text-[#9CA3AF]">→</span>
                                <span>{v.latestRequest.destinationCity}</span>
                              </div>
                              <div className="text-[#666666] text-[11px] flex items-center gap-2">
                                <span>{v.latestRequest.travelers} Travelers</span>
                                <span>•</span>
                                <span>{v.latestRequest.vehicleSummary}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenLogin(v)}
                          className="w-full py-2.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs mt-2"
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
            /* ========================================================================= */
            /* CASE B: LOGGED IN AS VENDOR (AUTHENTICATED SESSION CONTEXT)               */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Vendor Profile Context Header */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#00A65E] border border-[#CEEAD6]">
                      Connected Partner
                    </span>
                    <span className="text-xs text-[#666666] font-mono">
                      {currentVendor?.email || ""}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#1A1A1A]">
                    {currentVendor?.name}
                  </h2>
                  <p className="text-xs text-[#666666]">
                    Fleet Inventory: {currentVendor?.fleet?.length || 0} vehicle configurations registered
                  </p>
                </div>

                {/* Stat Counters for THIS vendor only */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] text-center min-w-[100px]">
                    <span className="text-[10px] text-[#666666] uppercase font-semibold block">New Requests</span>
                    <span className="text-lg font-bold text-[#F5330F]">{vendorStats.newRequests}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] text-center min-w-[100px]">
                    <span className="text-[10px] text-[#666666] uppercase font-semibold block">Awaiting</span>
                    <span className="text-lg font-bold text-[#0064D2]">{vendorStats.awaitingResponse}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] text-center min-w-[100px]">
                    <span className="text-[10px] text-[#666666] uppercase font-semibold block">Responses</span>
                    <span className="text-lg font-bold text-[#1A1A1A]">{vendorStats.responsesSubmitted}</span>
                  </div>
                  <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] text-center min-w-[100px]">
                    <span className="text-[10px] text-[#666666] uppercase font-semibold block">Confirmed</span>
                    <span className="text-lg font-bold text-[#00A65E]">{vendorStats.confirmedWork}</span>
                  </div>
                </div>
              </div>

              {/* Requests Management Table / Card Area */}
              <div className="bg-white rounded-xl border border-[#EBEBEB] p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBEBEB]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === "all"
                          ? "bg-[#0064D2] text-white shadow-xs"
                          : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                      }`}
                    >
                      All ({requests.length})
                    </button>
                    <button
                      onClick={() => setActiveTab("awaiting")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === "awaiting"
                          ? "bg-[#0064D2] text-white shadow-xs"
                          : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                      }`}
                    >
                      Awaiting Response ({vendorStats.awaitingResponse})
                    </button>
                    <button
                      onClick={() => setActiveTab("responded")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === "responded"
                          ? "bg-[#0064D2] text-white shadow-xs"
                          : "bg-white text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA] border border-[#EBEBEB]"
                      }`}
                    >
                      Responses ({vendorStats.responsesSubmitted})
                    </button>
                  </div>

                  <button
                    onClick={loadVendorDataAndRequests}
                    disabled={loadingRequests}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#666666] hover:text-[#1A1A1A] text-xs font-semibold transition flex items-center gap-1.5 border border-[#EBEBEB] self-end sm:self-auto"
                  >
                    <FiRefreshCw size={12} className={loadingRequests ? "animate-spin" : ""} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingRequests ? (
                  <div className="py-16 text-center text-[#666666] text-xs">
                    <div className="w-7 h-7 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                    Loading your vendor requests...
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="py-12 text-center text-[#666666] text-xs italic bg-[#F8FAFC] rounded-xl border border-dashed border-[#EBEBEB]">
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
                      const isConfirmed = req.status === "CONFIRMED";

                      return (
                        <div
                          key={req._id}
                          className="bg-white border border-[#EBEBEB] hover:border-[#0064D2]/40 rounded-xl p-4 transition shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#1A1A1A] text-sm">
                                {req.route?.originCity || req.requestSnapshot?.originCity || "Origin"} → {req.route?.destinationCity || req.requestSnapshot?.destinationCity || "Destination"}
                              </span>
                              {isNew && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]">
                                  🔔 New Request
                                </span>
                              )}
                              {isViewed && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
                                  Viewed
                                </span>
                              )}
                              {isAccepted && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#EBF3FF] text-[#0064D2] border border-[#BFDBFE]">
                                  Accepted • Quote Pending
                                </span>
                              )}
                              {isResponded && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#00A65E] border border-[#CEEAD6]">
                                  ✓ Response Submitted
                                </span>
                              )}
                              {isConfirmed && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#00A65E] border border-[#CEEAD6]">
                                  ✓ Confirmed Booking
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]">
                                  ✕ Rejected
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-[#666666] flex items-center gap-2 flex-wrap">
                              <span>
                                <strong className="text-[#1A1A1A]">
                                  {req.travelers?.total || req.requestSnapshot?.totalTravelers || 20} Travelers
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                {req.fleetRequirement?.vehicleCount || req.requestSnapshot?.vehiclesRequired || 1} × {req.fleetRequirement?.vehicleCategory || req.requestSnapshot?.vehicleType || "Coach"}
                              </span>
                            </div>

                            {req.response?.quotation?.totalAmount > 0 && (
                              <div className="text-xs font-bold text-[#00A65E]">
                                Quotation Submitted: ₹{req.response.quotation.totalAmount.toLocaleString("en-IN")}
                              </div>
                            )}
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            <button
                              onClick={() => handleOpenRequestDetail(req)}
                              className="px-4 py-2 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white font-semibold text-xs shadow-xs transition"
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

          {/* ========================================================================= */}
          {/* MODAL: SEARCH VENDORS (100 CONNECTED VENDORS)                             */}
          {/* ========================================================================= */}
          {showSearchModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white border border-[#EBEBEB] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
                  <div>
                    <h3 className="text-base font-bold text-[#1A1A1A]">
                      Search Connected Vendors
                    </h3>
                    <p className="text-[#666666] text-xs mt-0.5">
                      Search canonical fleet partners from the 100 connected vendor network.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(false)}
                    className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
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
                    className="flex-1 bg-white border border-[#D1D5DB] rounded-lg px-3.5 py-2.5 text-xs text-[#1A1A1A] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2] transition"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-4 py-2.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white font-semibold text-xs transition disabled:opacity-50"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>

                <div className="max-h-60 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="py-6 text-center text-[#666666] text-xs font-medium">
                      Searching connected vendors...
                    </div>
                  ) : searchResults.length === 0 && searchQuery && hasSearched ? (
                    <div className="py-6 text-center text-[#666666] italic text-xs">
                      No connected vendors match "{searchQuery}"
                    </div>
                  ) : (
                    searchResults.map((v) => (
                      <div
                        key={v._id}
                        className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#EBEBEB] flex items-center justify-between gap-3 hover:border-[#0064D2]/50 transition"
                      >
                        <div>
                          <div className="font-bold text-[#1A1A1A] text-xs">{v.name}</div>
                          <div className="text-[11px] text-[#666666]">
                            Connected Partner • {v.fleet?.length || 0} vehicle configurations
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            handleOpenLogin(v);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white font-semibold text-xs transition shadow-xs"
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

          {/* ========================================================================= */}
          {/* MODAL: VENDOR LOGIN                                                      */}
          {/* ========================================================================= */}
          {loginModalVendor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white border border-[#EBEBEB] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2]">
                      VENDOR LOGIN
                    </div>
                    <h3 className="text-base font-bold text-[#1A1A1A]">
                      {loginModalVendor.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setLoginModalVendor(null)}
                    className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                <form onSubmit={handleExecuteLogin} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] text-[#666666] font-semibold block mb-1">Email</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#666666] font-semibold block mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                      required
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loggingIn}
                      className="w-full py-2.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition"
                    >
                      {loggingIn ? "Authenticating..." : "Login"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODAL: VENDOR REQUEST DETAILS, ACCEPT/REJECT & MESSAGING                 */}
          {/* ========================================================================= */}
          {activeRequestDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white border border-[#EBEBEB] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-xs flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB] shrink-0">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2]">
                      GROUP TRANSPORT REQUEST
                    </div>
                    <h3 className="text-base font-bold text-[#1A1A1A]">
                      {activeRequestDetail.route?.originCity || activeRequestDetail.requestSnapshot?.originCity} → {activeRequestDetail.route?.destinationCity || activeRequestDetail.requestSnapshot?.destinationCity}
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveRequestDetail(null)}
                    className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-[#EBEBEB] pb-2 shrink-0">
                  <button
                    onClick={() => setDetailTab("details")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                      detailTab === "details"
                        ? "bg-[#0064D2] text-white shadow-xs"
                        : "text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA]"
                    }`}
                  >
                    Trip Details
                  </button>
                  {activeRequestDetail.status !== "REJECTED" && (
                    <button
                      onClick={() => setDetailTab("response")}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                        detailTab === "response"
                          ? "bg-[#0064D2] text-white shadow-xs"
                          : "text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA]"
                      }`}
                    >
                      Quotation / Allocation Form
                    </button>
                  )}
                  <button
                    onClick={() => setDetailTab("messages")}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition flex items-center gap-1.5 ${
                      detailTab === "messages"
                        ? "bg-[#0064D2] text-white shadow-xs"
                        : "text-[#666666] hover:text-[#1A1A1A] hover:bg-[#F5F7FA]"
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
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Trip Details
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[#666666]">
                        <div>Travelers: <strong className="text-[#1A1A1A]">{activeRequestDetail.travelers?.total || activeRequestDetail.requestSnapshot?.totalTravelers}</strong></div>
                        <div>Trip Type: <strong className="text-[#1A1A1A]">Campus Group</strong></div>
                        <div>Duration: <strong className="text-[#1A1A1A]">Multi-day Charter</strong></div>
                      </div>
                    </div>

                    {/* Fleet Requirement */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Fleet Requirement
                      </span>
                      <div className="text-[#1A1A1A] font-bold text-sm">
                        {activeRequestDetail.fleetRequirement?.vehicleCount || activeRequestDetail.requestSnapshot?.vehiclesRequired} × {activeRequestDetail.fleetRequirement?.vehicleCategory || activeRequestDetail.requestSnapshot?.vehicleType || "Coach"}
                      </div>
                      <div className="text-[#666666]">
                        Minimum capacity: <strong className="text-[#1A1A1A]">{activeRequestDetail.fleetRequirement?.minimumCapacityPerVehicle || 25} seats</strong> • Driver included
                      </div>
                    </div>

                    {/* Preferences */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Preferences &amp; Amenities
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[#666666]">
                        <div className="flex items-center gap-1.5"><FiCheck className="text-[#00A65E]" /> Air Conditioned (AC)</div>
                        <div className="flex items-center gap-1.5"><FiCheck className="text-[#00A65E]" /> Tourist Coach</div>
                        <div className="flex items-center gap-1.5"><FiCheck className="text-[#00A65E]" /> Dedicated Group Transport</div>
                        <div className="flex items-center gap-1.5"><FiCheck className="text-[#00A65E]" /> Professional Driver Included</div>
                        <div className="flex items-center gap-1.5 col-span-2"><FiCheck className="text-[#00A65E]" /> Multi-day Itinerary Support</div>
                      </div>
                    </div>

                    {/* Response Summary if responded */}
                    {activeRequestDetail.status === "RESPONDED" && (
                      <div className="bg-[#E6F4EA] p-4 rounded-xl border border-[#CEEAD6] space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#00A65E] block">
                          ✓ Response Submitted
                        </span>
                        <div className="text-[#1A1A1A] font-bold text-sm">
                          Quotation Total: ₹{activeRequestDetail.response?.quotation?.totalAmount?.toLocaleString("en-IN") || activeRequestDetail.response?.quote}
                        </div>
                        <div className="text-[#666666] text-[11px]">
                          Availability: {activeRequestDetail.response?.availability || "Confirmed"}
                        </div>
                      </div>
                    )}

                    {/* Rejection if rejected */}
                    {activeRequestDetail.status === "REJECTED" && (
                      <div className="bg-[#FEECE8] p-4 rounded-xl border border-[#FDCFC7] space-y-1 text-[#F5330F]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5330F] block">
                          ✕ Rejected by You
                        </span>
                        <div>Reason: {activeRequestDetail.response?.rejectionReason}</div>
                        {activeRequestDetail.response?.rejectionMessage && (
                          <div className="italic text-[11px]">"{activeRequestDetail.response.rejectionMessage}"</div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons for New or Viewed Request */}
                    {["SENT", "VIEWED"].includes(activeRequestDetail.status) && (
                      <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#EBEBEB]">
                        <span className="text-[#1A1A1A] font-semibold">Are you available for this charter?</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowRejectModal(true)}
                            className="px-4 py-2 rounded-lg bg-white hover:bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7] font-semibold text-xs transition"
                          >
                            Reject Request
                          </button>
                          <button
                            onClick={handleAcceptRequest}
                            className="px-5 py-2 rounded-lg bg-[#00A65E] hover:bg-[#00874c] text-white font-semibold text-xs shadow-xs transition"
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
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Availability Status
                      </span>
                      <div className="text-[#00A65E] font-semibold flex items-center gap-1.5 text-xs">
                        <FiCheckCircle />
                        <span>Confirmed Available</span>
                      </div>
                    </div>

                    {/* Vehicle Allocation - Master Fleet Validated */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Vehicle Allocation
                      </span>
                      <div className="space-y-1.5">
                        <label className="text-[11px] text-[#666666] font-semibold block">Select Vehicle from Master Fleet</label>
                        <select
                          value={selectedFleetIndex}
                          onChange={(e) => setSelectedFleetIndex(Number(e.target.value))}
                          className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
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
                          <label className="text-[11px] text-[#666666] font-semibold block mb-1">Number of vehicles</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={allocatedCount}
                            onChange={(e) => setAllocatedCount(e.target.value)}
                            className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#666666] font-semibold block mb-1">Seats per vehicle</label>
                          <div className="bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] font-semibold">
                            {currentVendor?.fleet?.[selectedFleetIndex]?.capacity || 45} seats
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quotation */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2] block">
                        Quotation Breakdown
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#666666] font-semibold block mb-1">Base amount (₹)</label>
                          <input
                            type="number"
                            value={quoteBaseAmount}
                            onChange={(e) => setQuoteBaseAmount(e.target.value)}
                            className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#666666] font-semibold block mb-1">Additional charges (₹)</label>
                          <input
                            type="number"
                            value={quoteAdditionalCharges}
                            onChange={(e) => setQuoteAdditionalCharges(e.target.value)}
                            className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between border-t border-[#EBEBEB] pt-2 text-sm font-bold">
                        <span className="text-[#1A1A1A]">Total Quotation Amount:</span>
                        <span className="text-[#00A65E] text-base">
                          ₹{(Number(quoteBaseAmount) + Number(quoteAdditionalCharges)).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>

                    {/* Driver & Notes */}
                    <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#EBEBEB] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[#1A1A1A] font-semibold">Driver included?</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={driverIncluded}
                            onChange={(e) => setDriverIncluded(e.target.checked)}
                            className="rounded text-[#0064D2] focus:ring-[#0064D2]"
                          />
                          <span className="text-[#1A1A1A] text-xs font-medium">Yes, certified driver</span>
                        </label>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#666666] font-semibold block mb-1">Notes / Terms</label>
                        <textarea
                          rows="2"
                          value={responseNotes}
                          onChange={(e) => setResponseNotes(e.target.value)}
                          className="w-full bg-white border border-[#D1D5DB] rounded-lg p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                          placeholder="Tolls separate, interstate permit included, etc."
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={submittingResponse}
                        className="px-6 py-2.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition"
                      >
                        {submittingResponse ? "Submitting Quote..." : "Submit Quotation & Vehicle Allocation"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Tab 3: One-to-One Messaging */}
                {detailTab === "messages" && (
                  <div className="flex-1 overflow-y-auto space-y-3 flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-2.5 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#EBEBEB]">
                      {loadingMessages ? (
                        <div className="text-center text-[#666666] py-6">Loading conversation...</div>
                      ) : messages.length === 0 ? (
                        <div className="text-center text-[#666666] py-6 italic">
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
                              <div className="text-[10px] text-[#666666] mb-0.5 font-medium">
                                {isVendor ? "You (Vendor)" : (m.senderName || "Operator")}
                              </div>
                              <div
                                className={`p-2.5 rounded-2xl max-w-[85%] text-xs shadow-xs ${
                                  isVendor
                                    ? "bg-[#0064D2] text-white rounded-br-xs"
                                    : "bg-white text-[#1A1A1A] rounded-bl-xs border border-[#EBEBEB]"
                                }`}
                              >
                                {m.message}
                              </div>
                              <div className="text-[9px] text-[#9CA3AF] mt-0.5">
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
                        className="flex-1 bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                      />
                      <button
                        type="submit"
                        disabled={sendingMessage || !messageInput.trim()}
                        className="px-4 py-2 bg-[#0064D2] hover:bg-[#0052B4] disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
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

          {/* ========================================================================= */}
          {/* MODAL: REJECT FORM                                                        */}
          {/* ========================================================================= */}
          {showRejectModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="bg-white border border-[#EBEBEB] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
                  <h3 className="text-base font-bold text-[#1A1A1A]">
                    Reject Group Request
                  </h3>
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
                  >
                    <FiX size={18} />
                  </button>
                </div>

                <form onSubmit={handleRejectRequest} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] text-[#666666] font-semibold block mb-1">Reason</label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                    >
                      <option value="No vehicles available">No vehicles available</option>
                      <option value="Route not covered">Route not covered</option>
                      <option value="Schedule conflict">Schedule conflict</option>
                      <option value="Capacity unavailable">Capacity unavailable</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#666666] font-semibold block mb-1">Optional Message</label>
                    <textarea
                      rows="3"
                      value={rejectionMessage}
                      onChange={(e) => setRejectionMessage(e.target.value)}
                      placeholder="Provide additional context for the tour operator..."
                      className="w-full bg-white border border-[#D1D5DB] rounded-lg p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(false)}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F7FA] text-[#666666] border border-[#EBEBEB] font-semibold text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReject}
                      className="px-5 py-2 rounded-lg bg-[#F5330F] hover:bg-[#d62808] disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition"
                    >
                      {submittingReject ? "Rejecting..." : "Submit Rejection"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
