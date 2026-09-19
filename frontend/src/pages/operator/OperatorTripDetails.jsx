import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  getOperatorTripDetails, 
  updateBookingStatus, 
  getDashboardStats,
  getTripMessages,
  sendTripMessage,
  getUnreadMessageCount
} from "../../api/operatorApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import StatusDropdown, { DEFAULT_VALID_TRANSITIONS } from "../../components/operator/StatusDropdown";
import OperatorMessageModal from "../../components/operator/OperatorMessageModal";
import DayTabs from "../../components/itinerary/DayTabs";
import Timeline from "../../components/itinerary/Timeline";
import { 
  FiArrowLeft, FiMapPin, FiCalendar, FiExternalLink, FiClock,
  FiCheckCircle, FiArrowRight, FiUsers, FiDollarSign, FiLayers,
  FiAlertCircle, FiMenu, FiX, FiCheck, FiMail, FiPhone, FiCompass,
  FiMessageSquare, FiSend, FiHome, FiStar
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";

export default function OperatorTripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  const [trip, setTrip] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [validTransitions, setValidTransitions] = useState(DEFAULT_VALID_TRANSITIONS);
  const [messages, setMessages] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("itinerary"); // "itinerary" | "messages" | "bookings" | "accommodation" | "transport"
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    const fetchTrip = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Operator session not found. Please log in.");
          setLoading(false);
          return;
        }

        const [detailsData, statsData] = await Promise.all([
          getOperatorTripDetails(tripId, token),
          getDashboardStats(token).catch(() => null)
        ]);

        if (detailsData?.success && detailsData.trip) {
          setTrip(detailsData.trip);
          setBookings(detailsData.bookings || []);
          if (detailsData.validTransitions) {
            setValidTransitions(detailsData.validTransitions);
          }
          if (detailsData.messages) {
            setMessages(detailsData.messages);
            const unread = detailsData.messages.filter(m => m.senderRole !== "operator" && !m.readAt).length;
            setUnreadMessagesCount(unread);
          }
          if (detailsData.recipient) {
            setRecipient(detailsData.recipient);
          }
        } else {
          setError("Trip not found or not shared with Tour Operations.");
        }

        if (statsData?.success) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error("Failed to load operator trip details:", err);
        setError(err.response?.data?.message || err.message || "Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      fetchTrip();
    } else {
      setError("No trip ID specified in route.");
      setLoading(false);
    }
  }, [tripId]);

  // Periodic polling for unread messages from traveler/coordinator when chat modal is closed
  useEffect(() => {
    if (!tripId || isMessageModalOpen) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const interval = setInterval(() => {
      getUnreadMessageCount(tripId, token)
        .then((res) => {
          if (res?.success) setUnreadMessagesCount(res.unreadCount || 0);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [tripId, isMessageModalOpen]);

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      setStatusUpdating(prev => ({ ...prev, [bookingId]: true }));
      setFeedback(null);
      const token = localStorage.getItem("token");
      const res = await updateBookingStatus(bookingId, { status: newStatus }, token);
      if (res.success && res.booking) {
        setBookings(prev => prev.map(b => b._id === bookingId ? res.booking : b));
        if (res.validTransitions) {
          setValidTransitions(res.validTransitions);
        }
        setFeedback({
          type: "success",
          message: `Status updated to ${newStatus.replace("_", " ")} successfully.`,
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to update status";
      setFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setStatusUpdating(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleSendMessage = async ({ subject, message }) => {
    try {
      setSendingMessage(true);
      const token = localStorage.getItem("token");
      const res = await sendTripMessage(tripId, { subject, message }, token);
      if (res.success && res.messageData) {
        setMessages(prev => [...prev, res.messageData]);
        setIsMessageModalOpen(false);
        setFeedback({
          type: "success",
          message: "Message sent successfully.",
        });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to send message.",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-emerald-950/70 text-emerald-400 border-emerald-800/60";
      case "ACTION_REQUIRED":
        return "bg-amber-950/70 text-amber-400 border-amber-800/60";
      case "PROCESSING":
        return "bg-blue-950/70 text-blue-400 border-blue-800/60";
      case "CANCELLED":
        return "bg-rose-950/70 text-rose-400 border-rose-800/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  const isCampus = trip?.tripCategory === "CAMPUS";
  const contactPerson = recipient || (trip ? (trip.coordinatorId || trip.user) : null);
  const staySegmentsList = useMemo(() => {
    if (Array.isArray(trip?.staySegments) && trip.staySegments.length > 0) {
      return trip.staySegments;
    }
    return [];
  }, [trip]);
  const stayBookings = bookings.filter(b => b.type === "ACCOMMODATION");
  const transportBookings = bookings.filter(b => b.type === "TRANSPORT");
  const activityBookings = bookings.filter(b => b.type === "ACTIVITY" || b.type === "VISIT" || b.type === "PERMISSION");

  // Readiness stats
  const accConfirmed = stayBookings.filter(b => b.status === "CONFIRMED").length;
  const transConfirmed = transportBookings.filter(b => b.status === "CONFIRMED").length;
  const actConfirmed = activityBookings.filter(b => b.status === "CONFIRMED").length;

  const itineraryDays = Array.isArray(trip?.itinerary) ? trip.itinerary : [];
  const currentDay = itineraryDays[selectedDayIndex] || itineraryDays[0];

  // Calculate accommodation context for the current selected day matching DetailedItinerary logic
  const accommodationsToday = useMemo(() => {
    if (!trip?.staySegments?.length || !trip?.startDate) return [];
    const tripStart = new Date(trip.startDate);
    tripStart.setHours(0, 0, 0, 0);
    const currentDateMs = tripStart.getTime() + selectedDayIndex * 86400000;

    const accs = [];
    trip.staySegments.forEach(segment => {
      if (!segment.selectedHotel) return;
      const checkInMs = new Date(segment.checkIn).setHours(0, 0, 0, 0);
      const checkOutMs = new Date(segment.checkOut).setHours(0, 0, 0, 0);

      if (currentDateMs >= checkInMs && currentDateMs <= checkOutMs) {
        let status = "Staying at";
        let dayOfStay = Math.round((currentDateMs - checkInMs) / 86400000) + 1;
        
        if (currentDateMs === checkInMs) {
          status = "Check-in";
        } else if (currentDateMs === checkOutMs) {
          status = "Check-out";
        } else {
          status = `Night ${dayOfStay} of ${segment.nights}`;
        }
        
        accs.push({
          ...segment.selectedHotel,
          segmentLocation: segment.location,
          nights: segment.nights,
          status
        });
      }
    });
    return accs;
  }, [trip, selectedDayIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3 font-sans">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading Trip Operations...
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-6 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle size={24} />
          </div>
          <h2 className="text-lg font-black text-white mb-2">Trip Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {error || "The requested trip could not be found or has not been shared with Tour Operations."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/operator/trips"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <FiArrowLeft /> Back to Trips
            </Link>
            <Link
              to="/operator/dashboard"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans dark">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
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
                  <Link 
                    to={isCampus ? "/operator/trips?type=campus" : "/operator/trips?type=personal"}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <FiArrowLeft size={10} /> {isCampus ? "Campus Trips" : "Personal Trips"}
                  </Link>
                  <span className="text-slate-600 text-xs">/</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Operation #{trip._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{trip.source}</span>
                  <FiArrowRight className="text-indigo-400" size={16} />
                  <span>{trip.destination}</span>
                  {trip.organizationDetails?.name && (
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-normal">
                      ({trip.organizationDetails.name})
                    </span>
                  )}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link 
                to={isCampus ? "/operator/trips?type=campus" : "/operator/trips?type=personal"}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
              >
                <FiArrowLeft size={12} />
                <span className="hidden sm:inline">Back to List</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Notification / Feedback Banner */}
          {feedback && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition shadow-sm animate-in fade-in duration-150 ${
              feedback.type === "error"
                ? "bg-rose-950/80 border-rose-800 text-rose-300"
                : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
            }`}>
              <div className="flex items-center gap-2">
                {feedback.type === "error" ? (
                  <FiAlertCircle className="text-rose-400 shrink-0" size={16} />
                ) : (
                  <FiCheck className="text-emerald-400 shrink-0" size={16} />
                )}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white p-1">
                <FiX size={14} />
              </button>
            </div>
          )}

          {/* Trip Hero Banner */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                    isCampus 
                      ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/60" 
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}>
                    {isCampus ? "Campus Trip" : "Personal Trip"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 flex items-center gap-1">
                    <FiCheckCircle size={11} /> Finalized & Shared
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">ID: {trip._id}</span>
                </div>

                <div className="text-xl font-black text-white">
                  {isCampus && trip.organizationDetails?.name
                    ? `${trip.organizationDetails.name} • ${trip.destination.toUpperCase()} STUDY TOUR`
                    : `${trip.source} to ${trip.destination} Journey`}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <FiCalendar className="text-indigo-400" />
                    <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                    {trip.duration && <span className="text-slate-500">({trip.duration})</span>}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <FiUsers className="text-indigo-400" />
                    <span>{trip.travelers} {isCampus ? "Students / Participants" : "Travelers"}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <FiDollarSign className="text-indigo-400" />
                    <span>{trip.currency || "INR"} {trip.budget?.toLocaleString?.() || trip.budget}</span>
                  </span>
                </div>
              </div>

              {/* Lead Contact Info & Communication */}
              {contactPerson && (
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 lg:w-72 shrink-0 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      {isCampus ? "Campus Coordinator" : "Lead Traveler"}
                    </div>
                    <div className="font-bold text-white text-sm">{contactPerson.name}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                      <FiMail size={12} className="text-slate-500 shrink-0" />
                      <span className="truncate">{contactPerson.email}</span>
                    </div>
                    {contactPerson.phone && (
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <FiPhone size={12} className="text-slate-500 shrink-0" />
                        <span>{contactPerson.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMessageModalOpen(true);
                        setUnreadMessagesCount(0);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <FiMessageSquare size={13} />
                      <span>{isCampus ? "Chat with Coordinator" : "Chat with Traveler"}</span>
                      {unreadMessagesCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 bg-indigo-500 text-white text-[10px] font-black rounded-full shadow-xs animate-pulse">
                          {unreadMessagesCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Operational Readiness Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accommodation</div>
                  <div className="text-base font-black text-white mt-0.5">
                    {accConfirmed} <span className="text-xs text-slate-500 font-semibold">/ {stayBookings.length} Confirmed</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                  stayBookings.length > 0 && accConfirmed === stayBookings.length 
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" 
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {stayBookings.length === 0 ? "None" : accConfirmed === stayBookings.length ? "Ready" : "Pending"}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transport Legs</div>
                  <div className="text-base font-black text-white mt-0.5">
                    {transConfirmed} <span className="text-xs text-slate-500 font-semibold">/ {transportBookings.length} Confirmed</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                  transportBookings.length > 0 && transConfirmed === transportBookings.length 
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" 
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {transportBookings.length === 0 ? "None" : transConfirmed === transportBookings.length ? "Ready" : "Pending"}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isCampus ? "Visits & Permissions" : "Activities"}
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {actConfirmed} <span className="text-xs text-slate-500 font-semibold">/ {activityBookings.length} Confirmed</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${
                  activityBookings.length > 0 && actConfirmed === activityBookings.length 
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40" 
                    : "bg-slate-800 text-slate-400"
                }`}>
                  {activityBookings.length === 0 ? "None" : actConfirmed === activityBookings.length ? "Ready" : "Pending"}
                </div>
              </div>
            </div>
          </div>

          {/* Operational Views Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("itinerary")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "itinerary"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiCalendar size={13} />
              <span>Finalized Itinerary ({itineraryDays.length} Days)</span>
            </button>


            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "bookings"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiCheckCircle size={13} />
              <span>All Booking Requirements ({bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("accommodation")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "accommodation"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiMapPin size={13} />
              <span>Stay & Hotels ({staySegmentsList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("transport")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "transport"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiArrowRight size={13} />
              <span>Transport Legs ({transportBookings.length || trip.travelLegs?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: EXACT FINALIZED ITINERARY (Read-Only Canonical View) */}
          {activeTab === "itinerary" && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Finalized Itinerary
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Exact canonical itinerary sequence and activities finalized for this trip.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-950/70 text-indigo-300 text-[10px] font-bold border border-indigo-800/60 uppercase tracking-wider">
                  Read-Only View
                </span>
              </div>

              {itineraryDays.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                  No finalized itinerary is available for this trip.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Reused Canonical DayTabs Component */}
                  <DayTabs
                    itinerary={itineraryDays}
                    selectedDay={selectedDayIndex}
                    setSelectedDay={setSelectedDayIndex}
                  />

                  {/* Reused Canonical Timeline Component with Day Context & Accommodations */}
                  <Timeline
                    plan={currentDay?.plan || []}
                    destination={trip.destination}
                    accommodations={accommodationsToday}
                    viewOnly={true}
                  />
                </div>
              )}
            </div>
          )}


          {/* TAB 3: ALL BOOKINGS / STATUS MANAGEMENT */}
          {activeTab === "bookings" && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">
                    Operational Requirements & Bookings
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Track status and coordinate with vendors directly.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {bookings.length} Total Requirements
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-black">
                      <th className="p-4">Requirement / Title</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Vendor / Carrier</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500 text-xs font-medium">
                          No booking requirements synchronized for this trip yet.
                        </td>
                      </tr>
                    ) : (
                      bookings.map((booking) => (
                        <tr key={booking._id} className="hover:bg-slate-850/40 transition">
                          <td className="p-4 max-w-xs">
                            <div className="font-bold text-white text-xs">{booking.title}</div>
                            {booking.location && (
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                                <FiMapPin size={10} className="text-slate-500 shrink-0" />
                                <span className="truncate">{booking.location}</span>
                              </div>
                            )}
                            {booking.notes && (
                              <div className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">
                                {booking.notes}
                              </div>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                              {booking.type}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="text-xs text-slate-300 font-medium">
                              {booking.vendorName || "Pending Assignment"}
                            </div>
                            {booking.externalUrl && (
                              <a 
                                href={booking.externalUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline mt-0.5"
                              >
                                Link <FiExternalLink size={10} />
                              </a>
                            )}
                          </td>

                          <td className="p-4">
                            <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(booking.status)}`}>
                              {booking.status.replace("_", " ")}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                              <FiClock size={10} />
                              <span>{new Date(booking.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </td>

                          <td className="p-4">
                            <StatusDropdown
                              currentStatus={booking.status}
                              disabled={statusUpdating[booking._id]}
                              validTransitions={validTransitions}
                              onStatusChange={(newStatus) => handleStatusChange(booking._id, newStatus)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: STAY & HOTELS — STRUCTURED PER FINALIZED STAY SEGMENT */}
          {activeTab === "accommodation" && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Stay & Hotels
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Each finalized Stay Plan segment and its accommodation details.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-indigo-950/70 text-indigo-300 text-xs font-bold border border-indigo-800/60 self-start sm:self-auto">
                  {staySegmentsList.length} Finalized Stay Segment{staySegmentsList.length !== 1 ? "s" : ""}
                </span>
              </div>

              {staySegmentsList.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                  <FiHome className="mx-auto text-slate-600 mb-2" size={28} />
                  <p className="font-semibold text-slate-300">No finalized stay segments available.</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    No accommodation segments were defined in the canonical Stay Plan.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {staySegmentsList.map((stay, idx) => {
                    const stayId = stay.id || `stay-${idx}`;
                    const booking = bookings.find(
                      b => b.type === "ACCOMMODATION" && (b.staySegmentId === stayId || b.staySegmentId === stay.id || b.location === stay.location)
                    );

                    const hotel = stay.selectedHotel;
                    const hotelWebsiteUrl = hotel?.website || hotel?.websiteUrl || hotel?.officialWebsite || hotel?.bookingUrl || hotel?.externalUrl || hotel?.url || booking?.externalUrl || "";
                    const hotelImage = hotel?.image || hotel?.photos?.[0]?.url || (typeof hotel?.photos?.[0] === "string" ? hotel.photos[0] : null);

                    return (
                      <div 
                        key={stayId} 
                        className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-sm space-y-5"
                      >
                        {/* 1. FINALIZED STAY SEGMENT HEADER */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                          <div>
                            <div className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                              {stay.location}
                            </div>
                            <div className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <FiCalendar className="text-indigo-400 shrink-0" size={12} />
                              <span>{formatDate(stay.checkIn)} – {formatDate(stay.checkOut)}</span>
                              {stay.nights && (
                                <span className="text-slate-500 font-medium">({stay.nights} Night{stay.nights !== 1 ? "s" : ""})</span>
                              )}
                            </div>

                            <div className="mt-3">
                              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                                FINALIZED STAY
                              </div>
                              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                                {stay.location}
                              </div>
                              {stay.reason && (
                                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                                  {stay.reason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. SELECTED HOTEL SECTION */}
                        <div className="space-y-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            SELECTED HOTEL
                          </div>

                          {hotel ? (
                            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 space-y-4">
                              <div className="flex flex-col sm:flex-row gap-4 items-start">
                                {/* Hotel Image (only if genuinely available) */}
                                {hotelImage && (
                                  <div className="w-full sm:w-40 h-28 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
                                    <img
                                      src={hotelImage}
                                      alt={hotel.name || "Hotel"}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-sm font-bold text-white">
                                      {hotel.name || hotel.hotelName}
                                    </h5>
                                    {hotel.rating && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/40 flex items-center gap-1">
                                        <FiStar size={10} className="fill-amber-400 text-amber-400" />
                                        <span>{hotel.rating}</span>
                                        {hotel.reviews && (
                                          <span className="text-slate-400 font-normal">
                                            ({hotel.reviews.toLocaleString()} reviews)
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {(hotel.location || hotel.address || hotel.city) && (
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                      <FiMapPin size={12} className="text-slate-500 shrink-0" />
                                      <span className="truncate">{hotel.location || hotel.address || hotel.city}</span>
                                    </div>
                                  )}

                                  {(hotel.notes || hotel.description) && (
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                      {hotel.notes || hotel.description}
                                    </p>
                                  )}

                                  {(hotel.checkIn || hotel.checkOut || hotel.nights) && (
                                    <div className="text-[11px] text-slate-400 pt-0.5">
                                      Stay: {formatDate(hotel.checkIn || stay.checkIn)} – {formatDate(hotel.checkOut || stay.checkOut)}
                                      {hotel.nights && ` · ${hotel.nights} Nights`}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Hotel Website Action */}
                              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  {hotelWebsiteUrl ? (
                                    <a
                                      href={hotelWebsiteUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                    >
                                      <span>Book on Hotel Website</span>
                                      <FiExternalLink size={12} />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-500 italic px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
                                      Website unavailable
                                    </span>
                                  )}

                                  {hotel.mapsUrl && (
                                    <a
                                      href={hotel.mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5"
                                    >
                                      <span>View Hotel</span>
                                      <FiExternalLink size={11} />
                                    </a>
                                  )}
                                </div>

                                <div className="text-[11px] text-slate-500 font-medium">
                                  External hotel booking portal
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-slate-400 text-xs flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-slate-900 text-slate-500 shrink-0">
                                <FiHome size={18} />
                              </div>
                              <div>
                                <div className="font-bold text-slate-300">
                                  No specific hotel finalized
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  No accommodation was selected by the traveler / coordinator for this stay segment.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 3. VISUALLY SEPARATED BOOKING STATUS */}
                        <div className="pt-4 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                              BOOKING STATUS
                            </div>
                            {booking ? (
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(booking.status)}`}>
                                  ● {booking.status.replace("_", " ")}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  Last updated: {new Date(booking.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border bg-slate-800 text-slate-400 border-slate-700">
                                  ● NOT BOOKED
                                </span>
                              </div>
                            )}
                          </div>

                          {booking && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-400">Update Status:</span>
                              <StatusDropdown
                                currentStatus={booking.status}
                                disabled={statusUpdating[booking._id]}
                                validTransitions={validTransitions}
                                onStatusChange={(newStatus) => handleStatusChange(booking._id, newStatus)}
                                compact
                              />
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TRANSPORT LEGS */}
          {activeTab === "transport" && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Transport Legs & Transit Connections
                </h3>
                <p className="text-[11px] text-slate-400">
                  Trains, flights, and long-distance transfers mapped to the itinerary.
                </p>
              </div>

              {Array.isArray(trip.travelLegs) && trip.travelLegs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {trip.travelLegs.map((leg, i) => (
                    <div key={i} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-indigo-950/70 text-indigo-300 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-800/60">
                            {leg.mode || "Transit"}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            Leg #{i + 1}
                          </span>
                        </div>

                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{leg.from}</span>
                          <FiArrowRight className="text-indigo-400 shrink-0" />
                          <span>{leg.to}</span>
                        </div>

                        <div className="text-xs text-slate-400 mt-2 font-medium space-y-0.5">
                          {leg.date && <div>Date: <span className="text-slate-300">{leg.date}</span></div>}
                          {(leg.startTime || leg.endTime) && (
                            <div>Time: <span className="text-slate-300">{leg.startTime} – {leg.endTime}</span></div>
                          )}
                          {leg.trainNumber && <div>Train/Flight: <span className="text-slate-300 font-mono">{leg.trainNumber}</span></div>}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Canonical Itinerary Leg</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <FiCheck size={12} /> Scheduled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : transportBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transportBookings.map((b) => (
                    <div key={b._id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold text-white">{b.title}</h4>
                        <span className={`px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded border ${getStatusBadge(b.status)}`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{b.location}</div>
                      <div className="pt-3 border-t border-slate-800 flex justify-end">
                        <StatusDropdown
                          currentStatus={b.status}
                          disabled={statusUpdating[b._id]}
                          validTransitions={validTransitions}
                          onStatusChange={(newStatus) => handleStatusChange(b._id, newStatus)}
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                  No travel legs mapped for this trip.
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* 1-to-1 Trip Chat Modal with Traveler/Coordinator */}
      <OperatorMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          const token = localStorage.getItem("token");
          if (token && tripId) {
            getTripMessages(tripId, token)
              .then((data) => {
                if (data?.success && data.messages) {
                  setMessages(data.messages);
                }
              })
              .catch(() => {});
          }
        }}
        tripId={tripId}
        recipient={contactPerson}
        onMessageSent={(newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
        }}
      />
    </div>
  );
}
