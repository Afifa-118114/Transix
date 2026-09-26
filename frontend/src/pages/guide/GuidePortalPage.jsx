import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  guideLogin,
  getGuideMe,
  getGuidePortalRequests,
  getGuideRequestDetails,
  respondToGuideRequest,
} from "../../api/guideWorkflowApi";
import { getDashboardStats } from "../../api/operatorApi";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import {
  FiCompass,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiCheck,
  FiSend,
  FiMapPin,
  FiCalendar,
  FiDollarSign,
  FiRefreshCw,
  FiLock,
  FiLogOut,
  FiX,
  FiUser,
  FiBriefcase,
  FiGlobe,
  FiPhone,
  FiMail,
  FiMenu,
  FiArrowLeft,
  FiChevronRight,
} from "react-icons/fi";
import toast from "react-hot-toast";

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return String(dateStr);
  }
}

function formatStatus(status) {
  switch ((status || "").toUpperCase()) {
    case "SENT":
      return "Pending Response";
    case "VIEWED":
      return "Viewed by Guide";
    case "ACCEPTED":
      return "Accepted";
    case "REJECTED":
      return "Rejected";
    case "OPERATOR_SELECTED":
      return "Selected by Operator";
    case "CONFIRMED":
      return "Confirmed";
    case "PENDING":
      return "Pending";
    default:
      return status?.replace("_", " ") || "Pending";
  }
}

export default function GuidePortalPage() {
  const [searchParams] = useSearchParams();
  const initialRequestId = searchParams.get("requestId");

  // Layout & Sidebar State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarStats, setSidebarStats] = useState(null);

  // Authentication State
  // /guide-portal starts as public unless the user authenticates in this session
  const [guideToken, setGuideToken] = useState("");
  const [currentGuide, setCurrentGuide] = useState(null);

  // All Public Requests (for STATE 1: PUBLIC GUIDE PORTAL)
  const [allPublicRequests, setAllPublicRequests] = useState([]);
  const [loadingPublicRequests, setLoadingPublicRequests] = useState(false);

  // Authenticated Guide Requests (for STATE 2: RIGHT SIDE — REQUESTS RECEIVED)
  const [myRequests, setMyRequests] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  // Selected request inside authenticated view
  const [selectedRequestId, setSelectedRequestId] = useState(initialRequestId || null);

  // Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [loginGuideId, setLoginGuideId] = useState("");
  const [loginPassword, setLoginPassword] = useState("guide123");
  const [loggingIn, setLoggingIn] = useState(false);

  // Accept & Reject Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [targetRequestForResponse, setTargetRequestForResponse] = useState(null);

  // Accept Form
  const [quoteAmount, setQuoteAmount] = useState(8000);
  const [availabilityChoice, setAvailabilityChoice] = useState("AVAILABLE");
  const [responseNotes, setResponseNotes] = useState("Available for all requested dates and can handle the group.");
  const [submittingAccept, setSubmittingAccept] = useState(false);

  // Reject Form
  const [rejectionReason, setRejectionReason] = useState("Unavailable on requested dates");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  // Fetch operator dashboard stats for sidebar
  useEffect(() => {
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
  }, []);

  // When /guide-portal opens, ensure clean public state
  useEffect(() => {
    localStorage.removeItem("guideToken");
    localStorage.removeItem("guideProfile");
    setGuideToken("");
    setCurrentGuide(null);
    loadPublicRequests();
  }, []);

  // Fetch ALL operator requests for the public marketplace
  const loadPublicRequests = async () => {
    setLoadingPublicRequests(true);
    try {
      const res = await getGuidePortalRequests();
      if (res?.success) {
        setAllPublicRequests(res.requests || []);
      }
    } catch (err) {
      console.error("Failed to load public guide requests", err);
    } finally {
      setLoadingPublicRequests(false);
    }
  };

  // Fetch ONLY requests sent to this authenticated guide
  const loadMyRequests = async (token, guideId) => {
    if (!token || !guideId) return;
    setLoadingMyRequests(true);
    try {
      const res = await getGuidePortalRequests(token, guideId);
      if (res?.success) {
        setMyRequests(res.requests || []);
      }
    } catch (err) {
      console.error("Failed to load guide's received requests", err);
    } finally {
      setLoadingMyRequests(false);
    }
  };

  /**
   * Handle Click on "View Request" from Public Portal
   */
  const handleViewRequestClick = (reqItem) => {
    const targetGuideId = reqItem.guideId?.guideId || reqItem.matchedGuideSnapshot?.guideId || "GUIDE001";
    setLoginGuideId(targetGuideId);
    setLoginPassword("guide123");
    setPendingRequestId(reqItem._id);
    setShowLoginModal(true);
  };

  /**
   * Handle Login Submit
   */
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginGuideId.trim()) {
      toast.error("Please enter a Guide ID");
      return;
    }

    setLoggingIn(true);
    try {
      const res = await guideLogin(loginGuideId.trim(), loginPassword);
      if (res?.success && res.token) {
        setGuideToken(res.token);
        setCurrentGuide(res.guide);
        localStorage.setItem("guideToken", res.token);
        localStorage.setItem("guideProfile", JSON.stringify(res.guide));
        setShowLoginModal(false);
        toast.success(`Welcome, ${res.guide.fullName}!`);

        // Load this guide's personalized requests
        loadMyRequests(res.token, res.guide.guideId);

        // If user came via specific request, focus it
        if (pendingRequestId) {
          setSelectedRequestId(pendingRequestId);
          setPendingRequestId(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Guide authentication failed");
    } finally {
      setLoggingIn(false);
    }
  };

  /**
   * Handle Logout
   */
  const handleLogout = () => {
    setGuideToken("");
    setCurrentGuide(null);
    localStorage.removeItem("guideToken");
    localStorage.removeItem("guideProfile");
    setMyRequests([]);
    setSelectedRequestId(null);
    loadPublicRequests();
    toast.success("Logged out. Returned to Public Guide Portal.");
  };

  /**
   * Open Accept Modal
   */
  const handleOpenAcceptModal = (reqItem) => {
    setTargetRequestForResponse(reqItem);
    setQuoteAmount(8000);
    setAvailabilityChoice("AVAILABLE");
    setResponseNotes("Available for all requested dates and can handle this group size.");
    setShowAcceptModal(true);
  };

  /**
   * Open Reject Modal
   */
  const handleOpenRejectModal = (reqItem) => {
    setTargetRequestForResponse(reqItem);
    setRejectionReason("Unavailable on requested dates");
    setRejectionNotes("");
    setShowRejectModal(true);
  };

  /**
   * Submit Acceptance
   */
  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    if (!targetRequestForResponse) return;

    setSubmittingAccept(true);
    try {
      const res = await respondToGuideRequest(
        targetRequestForResponse._id,
        {
          action: "ACCEPT",
          availabilityChoice,
          priceAmount: Number(quoteAmount) || 8000,
          guideResponseNotes: responseNotes,
        },
        guideToken
      );

      if (res?.success) {
        toast.success("Request accepted! Response sent to Tour Operator.");
        setShowAcceptModal(false);
        setTargetRequestForResponse(null);
        loadMyRequests(guideToken, currentGuide.guideId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit acceptance");
    } finally {
      setSubmittingAccept(false);
    }
  };

  /**
   * Submit Rejection
   */
  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!targetRequestForResponse) return;

    setSubmittingReject(true);
    try {
      const res = await respondToGuideRequest(
        targetRequestForResponse._id,
        {
          action: "REJECT",
          rejectionReason,
          guideResponseNotes: rejectionNotes,
        },
        guideToken
      );

      if (res?.success) {
        toast.success("Request declined. Tour Operator has been notified.");
        setShowRejectModal(false);
        setTargetRequestForResponse(null);
        loadMyRequests(guideToken, currentGuide.guideId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rejection");
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A] flex font-sans">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (FIX: PREVENTS SIDEBAR FROM DISAPPEARING ON GUIDE PAGE)   */}
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
            <span className="text-sm font-bold text-[#1A1A1A]">Guide Portal</span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EBF3FF] text-[#0064D2]">
            {currentGuide ? currentGuide.fullName.split(" ")[0] : "Guide Network"}
          </span>
        </header>

        {/* Main Scroll Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
          
          {/* ========================================================================= */}
          {/* HERO BANNER (TRIP.COM DEEP BLUE GRADIENT)                                */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-[#1A56DB] via-[#1447B8] to-[#0F3D91] text-white p-5 sm:p-6 rounded-xl shadow-xs relative overflow-hidden">
            {/* Ambient background visual accent */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-6">
              <FiCompass size={130} />
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
                    Certified Tour Guides
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                  <span>TRANSIX Guide Portal</span>
                </h1>
                <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
                  {currentGuide
                    ? `Active Session: ${currentGuide.fullName} (${currentGuide.guideId}) • ${currentGuide.primaryRegion}`
                    : "Certified regional tour guide dispatch, operator request management, and daily quote coordination."}
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-center shrink-0">
                {!guideToken ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingRequestId(null);
                      setLoginGuideId("GUIDE001");
                      setShowLoginModal(true);
                    }}
                    className="px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-white/20 backdrop-blur-xs shadow-xs"
                  >
                    <FiLock size={13} />
                    <span>Guide Login</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                    title="Log out and return to Public Guide Portal"
                  >
                    <FiLogOut size={13} />
                    <span>Logout</span>
                  </button>
                )}

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse"></span>
                  Guide Network Live
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATE 1: PUBLIC GUIDE PORTAL (Unauthenticated State)                      */}
          {/* ========================================================================= */}
          {!guideToken || !currentGuide ? (
            <div className="bg-white rounded-xl border border-[#EBEBEB] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBEBEB]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#0064D2]">
                    PUBLIC REQUEST INBOX
                  </div>
                  <h2 className="text-lg font-bold text-[#1A1A1A] mt-0.5">
                    Operator Guide Requests
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">
                    All requests sent by tour operators to matched guides. Click "View Request &amp; Login" to authenticate and review full details.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={loadPublicRequests}
                  disabled={loadingPublicRequests}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#666666] hover:text-[#1A1A1A] text-xs font-semibold transition flex items-center gap-1.5 border border-[#EBEBEB] self-start sm:self-auto"
                >
                  <FiRefreshCw size={12} className={loadingPublicRequests ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingPublicRequests ? (
                <div className="py-16 text-center text-[#666666] text-xs">
                  <div className="w-7 h-7 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                  Loading guide requests...
                </div>
              ) : allPublicRequests.length === 0 ? (
                <div className="py-14 text-center text-[#666666] text-xs bg-[#F8FAFC] rounded-xl border border-dashed border-[#D1D5DB] p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center mx-auto">
                    <FiCompass size={22} />
                  </div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">No Active Guide Requests Dispatched</h3>
                  <p className="max-w-md mx-auto text-[#666666] text-xs">
                    When Tour Operators match and send guide requests from their itinerary dashboards, they will appear dynamically in this inbox.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allPublicRequests.map((reqItem) => {
                    const routeText =
                      reqItem.tripSummary?.route?.length > 1
                        ? reqItem.tripSummary.route.join(" → ")
                        : `${reqItem.tripSummary?.source || reqItem.tripId?.source || "Origin"} → ${reqItem.tripSummary?.destination || reqItem.tripId?.destination || "Destination"}`;

                    const tripTitle =
                      reqItem.tripSummary?.title ||
                      reqItem.tripId?.title ||
                      `${reqItem.tripSummary?.destination || reqItem.tripId?.destination || "Kerala"} Tour`;

                    const isPending = reqItem.status === "SENT" || reqItem.status === "PENDING";
                    const isAccepted = reqItem.status === "ACCEPTED" || reqItem.status === "CONFIRMED";
                    const isRejected = reqItem.status === "REJECTED";

                    return (
                      <div
                        key={reqItem._id}
                        className="bg-white rounded-xl border border-[#EBEBEB] hover:border-[#0064D2]/60 hover:shadow-md p-5 space-y-4 transition flex flex-col justify-between group shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                      >
                        <div className="space-y-3">
                          {/* Header: Trip Type & Status */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EBF3FF] text-[#0064D2] border border-[#BFDBFE]">
                              {reqItem.tripType || reqItem.tripId?.tripCategory || "Personal"} Trip
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? "bg-[#E6F4EA] text-[#00A65E] border border-[#CEEAD6]"
                                  : isRejected
                                  ? "bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]"
                                  : "bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7]"
                              }`}
                            >
                              {formatStatus(reqItem.status)}
                            </span>
                          </div>

                          {/* Title & Route */}
                          <div>
                            <h3 className="font-bold text-[#1A1A1A] text-sm group-hover:text-[#0064D2] transition leading-snug">
                              {tripTitle}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-[#666666] mt-1">
                              <FiMapPin size={12} className="text-[#0064D2] shrink-0" />
                              <span className="truncate">{routeText}</span>
                            </div>
                          </div>

                          {/* Route & Dates Box */}
                          <div className="bg-[#F8FAFC] rounded-lg p-3 border border-[#EBEBEB] text-xs space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[#666666]">
                              <FiCalendar size={12} className="text-[#9CA3AF] shrink-0" />
                              <span>
                                {reqItem.tripSummary?.startDate
                                  ? `${formatDate(reqItem.tripSummary.startDate)} – ${formatDate(reqItem.tripSummary.endDate)}`
                                  : "Upcoming / Scheduled"}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#666666] flex items-center gap-2">
                              <span>Guides: <strong className="text-[#1A1A1A]">{reqItem.requirement?.numberOfGuides || 1}</strong></span>
                              <span>•</span>
                              <span>Gender: <strong className="text-[#1A1A1A]">{reqItem.requirement?.genderPreference || "Any"}</strong></span>
                            </div>
                          </div>

                          {/* Matched Guide Snapshot */}
                          <div className="bg-white p-2.5 rounded-lg border border-[#EBEBEB] text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center font-bold text-[10px]">
                                <FiUser size={12} />
                              </div>
                              <div>
                                <span className="text-[10px] text-[#9CA3AF] block leading-none">Assigned Guide</span>
                                <span className="font-bold text-[#1A1A1A] text-xs">
                                  {reqItem.matchedGuideSnapshot?.fullName || reqItem.guideId?.fullName || "Regional Guide"}
                                </span>
                              </div>
                            </div>
                            <span className="font-mono text-[10px] bg-[#F1F5F9] text-[#475569] px-2 py-0.5 rounded font-semibold">
                              {reqItem.matchedGuideSnapshot?.guideId || reqItem.guideId?.guideId || "GUIDE"}
                            </span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={() => handleViewRequestClick(reqItem)}
                          className="w-full py-2.5 rounded-lg bg-[#0064D2] hover:bg-[#0052B4] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs mt-2"
                        >
                          <FiLock size={12} />
                          <span>View Request &amp; Login</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* STATE 2: AUTHENTICATED GUIDE SESSION (TWO-COLUMN WORKSPACE)               */
            /* ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ------------------------------------------------------------- */}
              {/* LEFT SIDE — MY GUIDE PROFILE                                  */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-xl border border-[#EBEBEB] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.06)] space-y-4 sticky top-6">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center">
                        <FiUser size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                          My Guide Profile
                        </h3>
                        <p className="text-[10px] text-[#666666]">Verified Guide Identity</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E6F4EA] text-[#00A65E] border border-[#CEEAD6] flex items-center gap-1">
                      <FiCheckCircle size={11} />
                      <span>{currentGuide.verificationStatus || "Approved"}</span>
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Name & ID */}
                    <div className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#EBEBEB] space-y-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="font-bold text-[#1A1A1A] text-base">{currentGuide.fullName}</h4>
                        <span className="text-[10px] bg-[#EBF3FF] text-[#0064D2] border border-[#BFDBFE] px-2 py-0.5 rounded font-mono font-bold">
                          {currentGuide.guideId}
                        </span>
                      </div>
                      <div className="text-[#666666] text-xs flex items-center gap-2">
                        <FiMail size={12} className="text-[#9CA3AF]" />
                        <span>{currentGuide.email}</span>
                      </div>
                      <div className="text-[#666666] text-xs flex items-center gap-2">
                        <FiPhone size={12} className="text-[#9CA3AF]" />
                        <span>{currentGuide.phone || "+91 98765 43210"}</span>
                      </div>
                    </div>

                    {/* Region & Experience Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] text-xs">
                      <div>
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block">Primary Region</span>
                        <span className="font-bold text-[#1A1A1A]">{currentGuide.primaryRegion}</span>
                      </div>
                      <div>
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block">Experience</span>
                        <span className="font-bold text-[#1A1A1A]">{currentGuide.guidingExperience}</span>
                      </div>
                      <div>
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block">Availability</span>
                        <span className="font-bold text-[#00A65E]">{currentGuide.availability}</span>
                      </div>
                      <div>
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block">Group Size</span>
                        <span className="font-semibold text-[#1A1A1A]">{currentGuide.preferredGroupSize}</span>
                      </div>
                    </div>

                    {/* Geographical States */}
                    <div>
                      <span className="text-[#666666] text-[10px] uppercase font-semibold block mb-1">
                        Geographical Coverage
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(currentGuide.geographicalKnowledge?.states || []).map((st) => (
                          <span
                            key={st}
                            className="px-2 py-0.5 rounded bg-[#EBF3FF] text-[#0064D2] border border-[#BFDBFE] text-[10px] font-semibold"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <span className="text-[#666666] text-[10px] uppercase font-semibold block mb-1">
                        Languages
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(currentGuide.languages || ["English", "Hindi"]).map((lang) => (
                          <span
                            key={lang}
                            className="px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] text-[11px] font-medium"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bio */}
                    {currentGuide.bio && (
                      <div>
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block mb-1">Bio</span>
                        <p className="text-xs text-[#666666] bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB] leading-relaxed italic">
                          "{currentGuide.bio}"
                        </p>
                      </div>
                    )}

                    {/* Professional Experience */}
                    {currentGuide.professionalExperience && (
                      <div className="space-y-1">
                        <span className="text-[#666666] text-[10px] uppercase font-semibold block">
                          Professional Experience
                        </span>
                        <div className="text-[11px] text-[#666666] bg-[#F8FAFC] p-2.5 rounded-lg border border-[#EBEBEB] space-y-0.5">
                          <div>
                            Worked with: <span className="text-[#1A1A1A] font-semibold">{currentGuide.professionalExperience?.workedWith || "Leading Tour Operators"}</span>
                          </div>
                          {currentGuide.professionalExperience?.organizations && (
                            <div>
                              Organizations: <span className="text-[#1A1A1A]">{currentGuide.professionalExperience.organizations}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* RIGHT SIDE — REQUESTS RECEIVED                                */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-xl border border-[#EBEBEB] p-5 space-y-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center">
                        <FiBriefcase size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                          Requests Received
                        </h3>
                        <p className="text-[10px] text-[#666666]">
                          Operator requests dispatched specifically to {currentGuide.fullName} ({currentGuide.guideId})
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF3FF] text-[#0064D2]">
                      {myRequests.length} Request(s)
                    </span>
                  </div>

                  {loadingMyRequests ? (
                    <div className="py-16 text-center text-[#666666] text-xs">
                      <div className="w-7 h-7 border-2 border-[#0064D2] border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
                      Loading your requests...
                    </div>
                  ) : myRequests.length === 0 ? (
                    <div className="py-12 text-center text-[#666666] text-xs bg-[#F8FAFC] rounded-xl border border-dashed border-[#EBEBEB]">
                      No active requests have been dispatched to your profile at this time.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myRequests.map((reqItem) => {
                        const isSelected = selectedRequestId === reqItem._id;
                        const isAccepted = reqItem.status === "ACCEPTED" || reqItem.status === "OPERATOR_SELECTED" || reqItem.status === "CONFIRMED";
                        const isRejected = reqItem.status === "REJECTED";
                        const canRespond = reqItem.status === "SENT" || reqItem.status === "VIEWED" || reqItem.status === "PENDING";

                        const routeText =
                          reqItem.tripSummary?.route?.length > 1
                            ? reqItem.tripSummary.route.join(" → ")
                            : `${reqItem.tripSummary?.source || reqItem.tripId?.source || "Origin"} → ${reqItem.tripSummary?.destination || reqItem.tripId?.destination || "Destination"}`;

                        const tripTitle =
                          reqItem.tripSummary?.title ||
                          reqItem.tripId?.title ||
                          `${reqItem.tripSummary?.destination || reqItem.tripId?.destination || "Kerala"} Tour`;

                        return (
                          <div
                            key={reqItem._id}
                            className={`rounded-xl border p-5 space-y-4 transition ${
                              isSelected
                                ? "bg-white border-[#0064D2] shadow-md ring-1 ring-[#0064D2]/20"
                                : isAccepted
                                ? "bg-white border-[#CEEAD6] shadow-xs"
                                : isRejected
                                ? "bg-white border-[#FDCFC7] opacity-80"
                                : "bg-white border-[#EBEBEB] hover:border-[#0064D2]/50 shadow-xs"
                            }`}
                          >
                            {/* Request Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EBF3FF] text-[#0064D2] border border-[#BFDBFE]">
                                  {reqItem.tripType || reqItem.tripId?.tripCategory || "Personal"} Trip
                                </span>
                                <h4 className="text-base font-bold text-[#1A1A1A] mt-1">
                                  {tripTitle}
                                </h4>
                              </div>

                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  isAccepted
                                    ? "bg-[#E6F4EA] text-[#00A65E] border-[#CEEAD6]"
                                    : isRejected
                                    ? "bg-[#FEECE8] text-[#F5330F] border-[#FDCFC7]"
                                    : "bg-[#FEECE8] text-[#F5330F] border-[#FDCFC7]"
                                }`}
                              >
                                {formatStatus(reqItem.status)}
                              </span>
                            </div>

                            {/* Route & Dates */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-1.5 text-[#1A1A1A] font-semibold">
                                <FiMapPin size={13} className="text-[#0064D2] shrink-0" />
                                <span>{routeText}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[#666666]">
                                <FiCalendar size={13} className="text-[#9CA3AF] shrink-0" />
                                <span>
                                  {reqItem.tripSummary?.startDate
                                    ? `${formatDate(reqItem.tripSummary.startDate)} – ${formatDate(reqItem.tripSummary.endDate)}`
                                    : "Upcoming / Scheduled"}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-lg border border-[#EBEBEB]">
                              <div>
                                <span className="text-[#666666] text-[10px] uppercase font-semibold block">Guides Req</span>
                                <span className="font-bold text-[#00A65E]">{reqItem.requirement?.numberOfGuides || 1}</span>
                              </div>
                              <div>
                                <span className="text-[#666666] text-[10px] uppercase font-semibold block">Gender Pref</span>
                                <span className="font-semibold text-[#1A1A1A]">{reqItem.requirement?.genderPreference || "Either"}</span>
                              </div>
                              <div>
                                <span className="text-[#666666] text-[10px] uppercase font-semibold block">Languages</span>
                                <span className="font-semibold text-[#1A1A1A] truncate block">
                                  {(reqItem.requirement?.preferredLanguages || []).join(", ") || "English, Hindi"}
                                </span>
                              </div>
                            </div>

                            {/* Special Notes */}
                            {reqItem.requirement?.specialNotes && (
                              <div className="bg-[#FFFBEB] p-3 rounded-lg border border-[#FDE68A] text-xs">
                                <span className="text-[#D97706] font-bold text-[10px] uppercase tracking-wider block mb-0.5">
                                  Special Notes from Operator:
                                </span>
                                <p className="text-[#1A1A1A] italic">"{reqItem.requirement.specialNotes}"</p>
                              </div>
                            )}

                            {/* Existing Response Display */}
                            {isAccepted && (
                              <div className="bg-[#E6F4EA] p-3 rounded-lg border border-[#CEEAD6] text-xs space-y-1">
                                <div className="text-[#00A65E] font-bold flex items-center gap-1.5">
                                  <FiCheckCircle size={13} />
                                  <span>You accepted this request</span>
                                </div>
                                <div className="text-[#1A1A1A]">
                                  Expected Fee: <strong className="text-[#00A65E] font-bold text-sm">₹{reqItem.price?.amount?.toLocaleString()}</strong> • Availability: <strong>{reqItem.availability}</strong>
                                </div>
                                {reqItem.guideResponseNotes && (
                                  <div className="text-[#666666] italic pt-0.5">
                                    "{reqItem.guideResponseNotes}"
                                  </div>
                                )}
                              </div>
                            )}

                            {isRejected && (
                              <div className="bg-[#FEECE8] p-3 rounded-lg border border-[#FDCFC7] text-xs space-y-1">
                                <div className="text-[#F5330F] font-bold flex items-center gap-1.5">
                                  <FiXCircle size={13} />
                                  <span>You declined this request</span>
                                </div>
                                <div className="text-[#1A1A1A]">
                                  Reason: <strong className="text-[#F5330F]">{reqItem.rejectionReason}</strong>
                                </div>
                              </div>
                            )}

                            {/* Response Action Buttons */}
                            {canRespond && (
                              <div className="pt-2 border-t border-[#EBEBEB] flex items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(reqItem)}
                                  className="px-4 py-2 rounded-lg bg-white hover:bg-[#FEECE8] text-[#F5330F] border border-[#FDCFC7] text-xs font-semibold transition"
                                >
                                  Reject Request
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAcceptModal(reqItem)}
                                  className="px-5 py-2 rounded-lg bg-[#00A65E] hover:bg-[#00874c] text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                                >
                                  <FiCheck size={13} />
                                  <span>Accept Request</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: GUIDE LOGIN MODAL (When clicking "View Request")                   */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleLoginSubmit}
            className="bg-white border border-[#EBEBEB] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] text-[#0064D2] flex items-center justify-center">
                  <FiLock size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">Guide Authentication</h3>
                  <p className="text-[11px] text-[#666666]">
                    Login to view and respond to this request
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  setPendingRequestId(null);
                }}
                className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Guide ID (e.g. GUIDE001)
                </label>
                <input
                  type="text"
                  required
                  value={loginGuideId}
                  onChange={(e) => setLoginGuideId(e.target.value)}
                  placeholder="GUIDE001"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] font-mono font-bold focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2] uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Password (Default: guide123)
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] font-mono focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 bg-[#0064D2] hover:bg-[#0052B4] text-white font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <FiLock size={12} />
                <span>{loggingIn ? "Authenticating..." : "Login & View Request"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ACCEPT REQUEST MODAL                                             */}
      {/* ========================================================================= */}
      {showAcceptModal && targetRequestForResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleAcceptSubmit}
            className="bg-white border border-[#EBEBEB] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#00A65E]">
                  ACCEPT GUIDE REQUEST
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">
                  Send Response to Tour Operator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Expected Fee */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Expected Fee (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#666666] font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="8000"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] font-mono font-bold focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                  />
                </div>
                <span className="text-[10px] text-[#666666] mt-1 block">
                  Total expected compensation for the guided journey
                </span>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Availability Confirmation *
                </label>
                <select
                  value={availabilityChoice}
                  onChange={(e) => setAvailabilityChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                >
                  <option value="AVAILABLE">Available for all requested dates</option>
                  <option value="PARTIALLY_AVAILABLE">Partially Available (subject to timings)</option>
                  <option value="UNAVAILABLE">Not Available</option>
                </select>
              </div>

              {/* Response Notes */}
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Response Notes
                </label>
                <textarea
                  rows={3}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="e.g. Available for all requested dates and can handle this group size."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2] text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBEBEB]">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F7FA] text-[#666666] font-semibold text-xs border border-[#EBEBEB] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAccept}
                className="px-5 py-2 rounded-lg bg-[#00A65E] hover:bg-[#00874c] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <FiSend size={12} />
                <span>{submittingAccept ? "Submitting..." : "Submit Acceptance"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT REQUEST MODAL                                             */}
      {/* ========================================================================= */}
      {showRejectModal && targetRequestForResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-white border border-[#EBEBEB] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EBEBEB]">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#F5330F]">
                  REJECT GUIDE REQUEST
                </div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Decline Assignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 text-[#666666] hover:text-[#1A1A1A] rounded-lg hover:bg-[#F5F7FA] transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                >
                  <option value="Unavailable on requested dates">Unavailable on requested dates</option>
                  <option value="Group size not suitable">Group size not suitable</option>
                  <option value="Travel distance too far">Travel distance too far</option>
                  <option value="Language mismatch">Language mismatch</option>
                  <option value="Other commitment">Other commitment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#1A1A1A] mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Optional context for operator..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#D1D5DB] text-[#1A1A1A] text-xs focus:outline-none focus:border-[#0064D2] focus:ring-1 focus:ring-[#0064D2]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EBEBEB]">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg bg-white hover:bg-[#F5F7FA] text-[#666666] border border-[#EBEBEB] font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="px-5 py-2 rounded-lg bg-[#F5330F] hover:bg-[#d62808] text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{submittingReject ? "Declining..." : "Reject Request"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
