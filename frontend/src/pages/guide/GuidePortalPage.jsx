import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  guideLogin,
  getGuideMe,
  getGuidePortalRequests,
  getGuideRequestDetails,
  respondToGuideRequest,
} from "../../api/guideWorkflowApi";
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

  // Authentication State
  // Rule 7: /guide-portal must always start as public unless the user authenticated in this session
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

  // Rule 6 & 7: When /guide-portal opens, ensure public state by clearing lingering stored credentials
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
    setPendingRequestId(reqItem._id);
    setLoginGuideId(reqItem.guideId || "GUIDE001");
    setShowLoginModal(true);
  };

  /**
   * Guide Login Handler
   * Resumes and opens the exact requested guide assignment
   */
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await guideLogin({
        guideId: loginGuideId.trim().toUpperCase(),
        password: loginPassword,
      });

      if (res?.success && res.token) {
        const token = res.token;
        const profile = res.guide;

        setGuideToken(token);
        setCurrentGuide(profile);
        setShowLoginModal(false);
        toast.success(`Logged in as ${profile.fullName}`);

        // Load requests for this authenticated guide
        await loadMyRequests(token, profile.guideId);

        // Auto-focus the exact request clicked
        if (pendingRequestId) {
          setSelectedRequestId(pendingRequestId);
          setPendingRequestId(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Guide ID or credentials");
    } finally {
      setLoggingIn(false);
    }
  };

  /**
   * Logout Handler (Rule 5 & 6)
   * Clears all session tokens and immediately returns to PUBLIC GUIDE PORTAL
   */
  const handleLogout = () => {
    localStorage.removeItem("guideToken");
    localStorage.removeItem("guideProfile");
    setGuideToken("");
    setCurrentGuide(null);
    setMyRequests([]);
    setSelectedRequestId(null);
    setTargetRequestForResponse(null);
    toast.success("Logged out. Returned to Public Guide Portal.");
    loadPublicRequests();
  };

  /**
   * Open Accept Modal
   */
  const handleOpenAcceptModal = (reqItem) => {
    setTargetRequestForResponse(reqItem);
    setQuoteAmount(8000);
    setAvailabilityChoice("AVAILABLE");
    setResponseNotes("Available for all requested dates and can handle the group.");
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
          price: { amount: Number(quoteAmount), rateType: "TOTAL_QUOTE", currency: "INR" },
          availability: availabilityChoice,
          guideResponseNotes: responseNotes,
        },
        guideToken
      );

      if (res?.success) {
        toast.success("Request accepted! Response sent to Tour Operator.");
        setShowAcceptModal(false);
        setTargetRequestForResponse(null);
        // Refresh this guide's requests
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
        // Refresh this guide's requests
        loadMyRequests(guideToken, currentGuide.guideId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rejection");
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans dark flex flex-col">
      {/* ========================================================================= */}
      {/* STATE 1: PUBLIC GUIDE PORTAL (Unauthenticated State)                      */}
      {/* ========================================================================= */}
      {!guideToken || !currentGuide ? (
        <>
          {/* Public Top Header */}
          <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FiCompass size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-base tracking-tight">TRANSIX</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                      Guide Portal
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Public Request Inbox
                  </div>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="button"
                onClick={() => {
                  setPendingRequestId(null);
                  setLoginGuideId("GUIDE001");
                  setShowLoginModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <FiLock size={13} />
                <span>Guide Login</span>
              </button>
            </div>
          </header>

          {/* Public Dashboard Body */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FiClock className="text-teal-400" />
                  <span>Guide Requests</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  All requests sent by tour operators to matched guides. Click "View Request" to log in and review full details.
                </p>
              </div>

              <button
                type="button"
                onClick={loadPublicRequests}
                disabled={loadingPublicRequests}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer w-fit"
              >
                <FiRefreshCw size={13} className={loadingPublicRequests ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingPublicRequests ? (
              <div className="p-16 text-center text-slate-500 text-xs bg-slate-900/50 rounded-2xl border border-slate-800">
                <FiRefreshCw className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                Loading Guide Requests from MongoDB...
              </div>
            ) : allPublicRequests.length === 0 ? (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
                <FiCompass size={32} className="mx-auto text-slate-600" />
                <h3 className="font-bold text-slate-300 text-sm">No Active Guide Requests</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When Tour Operators match and send guide requests, they will appear here dynamically.
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

                  return (
                    <div
                      key={reqItem._id}
                      className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-700 p-5 space-y-4 shadow-sm transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Header: Trip Type & Status */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
                            {reqItem.tripType || reqItem.tripId?.tripCategory || "Personal"} Trip
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800">
                            {formatStatus(reqItem.status)}
                          </span>
                        </div>

                        {/* Trip Title & Route */}
                        <div>
                          <h4 className="font-extrabold text-white text-base leading-snug">
                            {tripTitle}
                          </h4>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            <FiMapPin size={12} className="text-indigo-400 shrink-0" />
                            <span className="truncate">{routeText}</span>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <FiCalendar size={12} className="text-slate-500 shrink-0" />
                          <span>
                            {reqItem.tripSummary?.startDate
                              ? `${formatDate(reqItem.tripSummary.startDate)} – ${formatDate(reqItem.tripSummary.endDate)}`
                              : "Dates: Upcoming / Flexible"}
                          </span>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-medium block">
                              Guides Required
                            </span>
                            <span className="font-extrabold text-emerald-400">
                              {reqItem.requirement?.numberOfGuides || 1}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase font-medium block">
                              Gender Pref
                            </span>
                            <span className="font-semibold text-slate-200">
                              {reqItem.requirement?.genderPreference || "Either"}
                            </span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-slate-800/60">
                            <span className="text-slate-500 text-[10px] uppercase font-medium block">
                              Languages
                            </span>
                            <span className="font-semibold text-slate-300 truncate block">
                              {(reqItem.requirement?.preferredLanguages || []).join(", ") || "English, Hindi"}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500">
                          Sent on: {formatDate(reqItem.sentAt || reqItem.createdAt)}
                        </div>
                      </div>

                      {/* View Request Button */}
                      <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleViewRequestClick(reqItem)}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>View Request</span>
                          <FiLock size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      ) : (
        /* ========================================================================= */
        /* STATE 2: AUTHENTICATED GUIDE REQUEST PAGE (Two-Column Layout)             */
        /* ========================================================================= */
        <>
          {/* Authenticated Top Header */}
          <header className="bg-slate-900/95 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FiCompass size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-base tracking-tight">TRANSIX</span>
                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                      Guide Workspace
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Guide Operations & Response Center
                  </div>
                </div>
              </div>

              {/* ONLY LOGOUT ACTION (Rule 5) */}
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5 justify-end">
                    <span>{currentGuide.fullName}</span>
                    <span className="text-[9px] bg-teal-950 text-teal-300 px-1.5 py-0.5 rounded font-mono">
                      {currentGuide.guideId}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">{currentGuide.primaryRegion}</div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Log out and return to Public Guide Portal"
                >
                  <FiLogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* TWO-COLUMN AUTHENTICATED BODY */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ------------------------------------------------------------- */}
              {/* LEFT SIDE — MY GUIDE PROFILE                                  */}
              {/* ------------------------------------------------------------- */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-sm sticky top-24">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                        <FiUser size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          MY GUIDE PROFILE
                        </h3>
                        <p className="text-[10px] text-slate-400">Authenticated MongoDB Guide Identity</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                      <FiCheckCircle size={11} />
                      <span>{currentGuide.verificationStatus || "Approved"}</span>
                    </span>
                  </div>

                  <div className="space-y-4 text-xs">
                    {/* Name & ID */}
                    <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <h4 className="font-extrabold text-white text-base">{currentGuide.fullName}</h4>
                        <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded font-mono font-bold">
                          {currentGuide.guideId}
                        </span>
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-2">
                        <FiMail size={12} className="text-slate-500" />
                        <span>{currentGuide.email}</span>
                      </div>
                      <div className="text-slate-400 text-xs flex items-center gap-2">
                        <FiPhone size={12} className="text-slate-500" />
                        <span>{currentGuide.phone || "+91 98765 43210"}</span>
                      </div>
                    </div>

                    {/* Region & Experience Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Primary Region / City</span>
                        <span className="font-bold text-white">{currentGuide.primaryRegion}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Guiding Experience</span>
                        <span className="font-bold text-white">{currentGuide.guidingExperience}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Availability</span>
                        <span className="font-bold text-emerald-400">{currentGuide.availability}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">Preferred Group</span>
                        <span className="font-semibold text-slate-300">{currentGuide.preferredGroupSize}</span>
                      </div>
                    </div>

                    {/* Geographical States */}
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                        Geographical Knowledge / States
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {(currentGuide.geographicalKnowledge?.states || []).map((st) => (
                          <span
                            key={st}
                            className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/70 text-[10px] font-bold"
                          >
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">
                        Languages
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(currentGuide.languages || ["English", "Hindi"]).map((lang) => (
                          <span
                            key={lang}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-[11px] font-semibold"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Bio */}
                    {currentGuide.bio && (
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Bio</span>
                        <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 leading-relaxed italic">
                          "{currentGuide.bio}"
                        </p>
                      </div>
                    )}

                    {/* Professional Experience */}
                    {currentGuide.professionalExperience && (
                      <div className="space-y-1">
                        <span className="text-slate-500 text-[10px] uppercase font-bold block">
                          Professional Experience
                        </span>
                        <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/70 space-y-0.5">
                          <div>
                            Worked with: <span className="text-slate-200 font-semibold">{currentGuide.professionalExperience?.workedWith || "Leading Travel Operators"}</span>
                          </div>
                          {currentGuide.professionalExperience?.organizations && (
                            <div>
                              Organizations: <span className="text-slate-300">{currentGuide.professionalExperience.organizations}</span>
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
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <FiBriefcase size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider">
                          REQUESTS RECEIVED
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Operator requests dispatched specifically to {currentGuide.fullName} ({currentGuide.guideId})
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {myRequests.length} Request(s)
                    </span>
                  </div>

                  {loadingMyRequests ? (
                    <div className="p-12 text-center text-slate-500 text-xs">
                      <FiRefreshCw className="animate-spin mx-auto text-indigo-500 mb-2" size={20} />
                      Loading your requests...
                    </div>
                  ) : myRequests.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
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
                            className={`rounded-2xl border p-5 space-y-4 transition ${
                              isSelected
                                ? "bg-slate-950 border-indigo-500 ring-1 ring-indigo-500/30"
                                : isAccepted
                                ? "bg-slate-950/70 border-emerald-900/60"
                                : isRejected
                                ? "bg-slate-950/50 border-rose-950/60 opacity-80"
                                : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            {/* Request Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700">
                                  {reqItem.tripType || reqItem.tripId?.tripCategory || "Personal"} Trip
                                </span>
                                <h4 className="text-base font-extrabold text-white mt-1">
                                  {tripTitle}
                                </h4>
                              </div>

                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                                  isAccepted
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                    : isRejected
                                    ? "bg-rose-950 text-rose-300 border-rose-800"
                                    : "bg-amber-950 text-amber-300 border-amber-800"
                                }`}
                              >
                                {formatStatus(reqItem.status)}
                              </span>
                            </div>

                            {/* Route & Dates */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                                <FiMapPin size={13} className="text-indigo-400 shrink-0" />
                                <span>{routeText}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                <FiCalendar size={13} className="text-slate-500 shrink-0" />
                                <span>
                                  {reqItem.tripSummary?.startDate
                                    ? `${formatDate(reqItem.tripSummary.startDate)} – ${formatDate(reqItem.tripSummary.endDate)}`
                                    : "Upcoming / Scheduled"}
                                </span>
                              </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold block">Guides Req</span>
                                <span className="font-extrabold text-emerald-400">{reqItem.requirement?.numberOfGuides || 1}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold block">Gender Pref</span>
                                <span className="font-semibold text-slate-200">{reqItem.requirement?.genderPreference || "Either"}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 text-[10px] uppercase font-bold block">Languages</span>
                                <span className="font-semibold text-slate-300 truncate block">
                                  {(reqItem.requirement?.preferredLanguages || []).join(", ") || "English, Hindi"}
                                </span>
                              </div>
                            </div>

                            {/* Special Notes */}
                            {reqItem.requirement?.specialNotes && (
                              <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-900/30 text-xs">
                                <span className="text-amber-400 font-bold text-[10px] uppercase tracking-wider block mb-0.5">
                                  Special Notes from Operator / Traveler:
                                </span>
                                <p className="text-slate-200 italic">"{reqItem.requirement.specialNotes}"</p>
                              </div>
                            )}

                            {/* Existing Response Display */}
                            {isAccepted && (
                              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-900/40 text-xs space-y-1">
                                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                                  <FiCheckCircle size={13} />
                                  <span>You accepted this request</span>
                                </div>
                                <div className="text-slate-300">
                                  Expected Fee: <strong className="text-emerald-300 font-mono text-sm">₹{reqItem.price?.amount?.toLocaleString()}</strong> • Availability: <strong>{reqItem.availability}</strong>
                                </div>
                                {reqItem.guideResponseNotes && (
                                  <div className="text-slate-400 italic pt-0.5">
                                    "{reqItem.guideResponseNotes}"
                                  </div>
                                )}
                              </div>
                            )}

                            {isRejected && (
                              <div className="bg-rose-950/30 p-3 rounded-xl border border-rose-900/40 text-xs space-y-1">
                                <div className="text-rose-400 font-bold flex items-center gap-1.5">
                                  <FiXCircle size={13} />
                                  <span>You declined this request</span>
                                </div>
                                <div className="text-slate-300">
                                  Reason: <strong className="text-white">{reqItem.rejectionReason}</strong>
                                </div>
                              </div>
                            )}

                            {/* Response Action Buttons (Rule 4) */}
                            {canRespond && (
                              <div className="pt-2 border-t border-slate-850 flex items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(reqItem)}
                                  className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/70 text-xs font-bold transition cursor-pointer"
                                >
                                  Reject Request
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAcceptModal(reqItem)}
                                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
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
          </main>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GUIDE LOGIN MODAL (When clicking "View Request")                   */}
      {/* ========================================================================= */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleLoginSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <FiLock size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">Guide Login</h3>
                  <p className="text-[11px] text-slate-400">
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
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Guide ID (e.g. GUIDE001)
                </label>
                <input
                  type="text"
                  required
                  value={loginGuideId}
                  onChange={(e) => setLoginGuideId(e.target.value)}
                  placeholder="GUIDE001"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Password (Default: guide123)
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleAcceptSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  ACCEPT GUIDE REQUEST
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Send Response to Tour Operator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Expected Fee */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Expected Fee (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    min={500}
                    step={500}
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="8000"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Total expected compensation for the trip
                </span>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Availability *
                </label>
                <select
                  value={availabilityChoice}
                  onChange={(e) => setAvailabilityChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="AVAILABLE">Available for all requested dates</option>
                  <option value="PARTIALLY_AVAILABLE">Partially Available (subject to timings)</option>
                  <option value="UNAVAILABLE">Not Available</option>
                </select>
              </div>

              {/* Response Notes */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Response Notes
                </label>
                <textarea
                  rows={3}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="e.g. Available for all requested dates and can handle this group size."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingAccept}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleRejectSubmit}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                  REJECT GUIDE REQUEST
                </div>
                <h3 className="text-base font-extrabold text-white">Decline Assignment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Unavailable on requested dates">Unavailable on requested dates</option>
                  <option value="Group size not suitable">Group size not suitable</option>
                  <option value="Travel distance too far">Travel distance too far</option>
                  <option value="Language mismatch">Language mismatch</option>
                  <option value="Other commitment">Other commitment</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Optional context for operator..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
