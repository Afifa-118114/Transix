import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { 
  getOperatorTripDetails, 
  updateBookingStatus, 
  getDashboardStats,
  getTripMessages,
  sendTripMessage,
  getUnreadMessageCount,
  getTripFleetVendors,
  getTripFleetVendorRequests,
  sendFleetVendorRequests,
  selectFleetVendor,
  requestFleetVendorConfirmation,
  getOperatorVendorRequestMessages,
  sendOperatorVendorRequestMessage,
  searchConnectedVendors,
} from "../../api/operatorApi";
import {
  getMatchedGuidesForTrip,
  createGuideRequest,
  getTripGuideRequests,
  selectGuidesForTrip,
  finalizeTripGuides,
} from "../../api/guideWorkflowApi";
import { formatDate } from "../../utils/formatTrip";
import OperatorSidebar from "../../components/operator/OperatorSidebar";
import StatusDropdown, { DEFAULT_VALID_TRANSITIONS } from "../../components/operator/StatusDropdown";
import OperatorMessageModal from "../../components/operator/OperatorMessageModal";
import DayTabs from "../../components/itinerary/DayTabs";
import Timeline from "../../components/itinerary/Timeline";
import { 
  FiArrowLeft, FiClock, FiCheckCircle, FiAlertCircle, 
  FiCalendar, FiUsers, FiDollarSign, FiMessageSquare, 
  FiRefreshCw, FiExternalLink, FiSend, FiX, FiCheck,
  FiFileText, FiShield, FiBriefcase, FiAlertTriangle,
  FiMapPin, FiArrowRight, FiMenu, FiUser, FiInfo, FiTruck,
  FiMail, FiPhone, FiHome, FiStar, FiCompass, FiChevronUp, FiChevronDown, FiLayers
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";
import { findExistingTransportRecord } from "../../utils/schedulingEngine";
import { detectBusRequirements, resolveLocalTransportArrangement, calculateDayDate } from "../../utils/busRequirementDetector";
import OperatorAutoBookCard from "../../components/operator/OperatorAutoBookCard";

export default function OperatorTripDetails() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "itinerary"); // "itinerary" | "messages" | "bookings" | "accommodation" | "transport" | "activities"
  const highlightedActivityId = searchParams.get("activityId");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["itinerary", "messages", "bookings", "accommodation", "transport", "activities"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "activities" && highlightedActivityId) {
      setTimeout(() => {
        const el = document.getElementById(`activity-card-${highlightedActivityId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
    }
  }, [activeTab, highlightedActivityId]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [statusUpdating, setStatusUpdating] = useState({});
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Campus Fleet Vendor Workflow State
  const [fleetVendorsData, setFleetVendorsData] = useState(null);
  const [loadingFleetVendors, setLoadingFleetVendors] = useState(false);
  const [fleetRequests, setFleetRequests] = useState([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [dispatchingRequests, setDispatchingRequests] = useState(false);
  const [selectingVendor, setSelectingVendor] = useState(false);
  const [requestingConfirmation, setRequestingConfirmation] = useState(false);
  const [vendorSelectionModal, setVendorSelectionModal] = useState(null);
  const [showRejectedVendors, setShowRejectedVendors] = useState(false);
  const [showConfirmRequestModal, setShowConfirmRequestModal] = useState(false);
  const [requestSuccessData, setRequestSuccessData] = useState(null);
  const [activeChatModalRequest, setActiveChatModalRequest] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const [viewResponseModal, setViewResponseModal] = useState(null);

  // Guide Workflow State
  const [matchedGuidesData, setMatchedGuidesData] = useState({ tripStates: [], guides: [], count: 0 });
  const [loadingMatchedGuides, setLoadingMatchedGuides] = useState(false);
  const [tripGuideRequests, setTripGuideRequests] = useState([]);
  const [loadingTripGuideRequests, setLoadingTripGuideRequests] = useState(false);
  const [requestingGuideId, setRequestingGuideId] = useState(null);
  const [selectedGuideIds, setSelectedGuideIds] = useState([]);
  const [selectingGuide, setSelectingGuide] = useState(false);
  const [finalizingGuides, setFinalizingGuides] = useState(false);

  useEffect(() => {
    if (trip?.guideRequirement?.selectedGuides) {
      setSelectedGuideIds(trip.guideRequirement.selectedGuides);
    }
  }, [trip]);

  const fetchGuideData = async () => {
    if (!tripId) return;
    const token = localStorage.getItem("token");
    setLoadingMatchedGuides(true);
    setLoadingTripGuideRequests(true);
    try {
      const [matchedRes, reqsRes] = await Promise.all([
        getMatchedGuidesForTrip(tripId, token).catch(() => null),
        getTripGuideRequests(tripId, token).catch(() => null),
      ]);
      if (matchedRes?.success) {
        setMatchedGuidesData({
          tripStates: matchedRes.tripStates || [],
          guides: matchedRes.guides || [],
          count: matchedRes.count || 0,
          routeDisplayText: matchedRes.routeDisplayText || "",
          destinationName: matchedRes.destinationName || "",
        });
      }
      if (reqsRes?.success) {
        setTripGuideRequests(reqsRes.requests || []);
      }
    } catch (e) {
      console.error("Failed to fetch guide data", e);
    } finally {
      setLoadingMatchedGuides(false);
      setLoadingTripGuideRequests(false);
    }
  };

  useEffect(() => {
    if (tripId && (activeTab === "guide" || trip?.guideRequirement?.required)) {
      fetchGuideData();
    }
  }, [tripId, activeTab, trip?.guideRequirement?.required]);

  const handleSendGuideRequest = async (guideId) => {
    const token = localStorage.getItem("token");
    setRequestingGuideId(guideId);
    try {
      const res = await createGuideRequest(tripId, guideId, trip?.guideRequirement, token);
      if (res?.success) {
        toast.success(res.message || "Guide request dispatched!");
        fetchGuideData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send guide request");
    } finally {
      setRequestingGuideId(null);
    }
  };

  const handleToggleSelectGuide = async (guideId) => {
    const token = localStorage.getItem("token");
    const newSelected = selectedGuideIds.includes(guideId)
      ? selectedGuideIds.filter(id => id !== guideId)
      : [...selectedGuideIds, guideId];

    if (newSelected.length === 0) {
      toast.error("Please keep at least one guide selected");
      return;
    }

    setSelectedGuideIds(newSelected);
    setSelectingGuide(true);
    try {
      const res = await selectGuidesForTrip(tripId, newSelected, token);
      if (res?.success) {
        toast.success(res.message || "Selection updated");
        if (res.guideRequirement && trip) {
          setTrip(prev => ({ ...prev, guideRequirement: res.guideRequirement }));
        }
        fetchGuideData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update guide selection");
    } finally {
      setSelectingGuide(false);
    }
  };

  const handleFinalizeGuideArrangement = async () => {
    const token = localStorage.getItem("token");
    setFinalizingGuides(true);
    try {
      const res = await finalizeTripGuides(tripId, token);
      if (res?.success) {
        toast.success("Guide arrangement confirmed!");
        if (res.guideRequirement && trip) {
          setTrip(prev => ({ ...prev, guideRequirement: res.guideRequirement }));
        }
        fetchGuideData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to finalize guide arrangement");
    } finally {
      setFinalizingGuides(false);
    }
  };

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

  const loadCampusVendorData = async () => {
    if (!tripId || !isCampus) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingFleetVendors(true);
    try {
      const [vendorsRes, requestsRes] = await Promise.all([
        getTripFleetVendors(tripId, token).catch(err => {
          console.error("Failed to load matching fleet vendors:", err);
          return null;
        }),
        getTripFleetVendorRequests(tripId, token).catch(err => {
          console.error("Failed to load vendor requests:", err);
          return null;
        })
      ]);

      if (vendorsRes?.success) {
        const normalizedData = {
          ...vendorsRes,
          route: vendorsRes.route || vendorsRes.matching?.route,
          matchedCount: vendorsRes.matchedCount ?? vendorsRes.matching?.matchedVendors?.length ?? 0,
          matchedVendors: vendorsRes.matchedVendors || vendorsRes.matching?.matchedVendors || [],
          partiallyMatchedVendors: vendorsRes.partiallyMatchedVendors || vendorsRes.matching?.partiallyMatchedVendors || [],
          rejectedVendors: vendorsRes.rejectedVendors || vendorsRes.matching?.rejectedVendors || [],
          totalConnectedVendors: vendorsRes.totalConnectedVendors || vendorsRes.matching?.totalConnectedVendors || 100,
        };
        setFleetVendorsData(normalizedData);
      }
      if (requestsRes?.success) {
        setFleetRequests(requestsRes.requests || []);
      }
    } finally {
      setLoadingFleetVendors(false);
    }
  };

  useEffect(() => {
    if (tripId && isCampus) {
      loadCampusVendorData();
    }
  }, [tripId, isCampus]);

  const handleToggleSelectVendor = (vendorId) => {
    setSelectedVendorIds(prev => 
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleOpenConfirmRequestModal = () => {
    if (selectedVendorIds.length === 0) return;
    setShowConfirmRequestModal(true);
  };

  const handleConfirmSendVendorRequests = async () => {
    if (selectedVendorIds.length === 0) return;
    setDispatchingRequests(true);
    try {
      const token = localStorage.getItem("token");
      const res = await sendFleetVendorRequests(tripId, selectedVendorIds, token);
      if (res?.success) {
        setShowConfirmRequestModal(false);
        setRequestSuccessData({
          vendorCount: res.createdCount || selectedVendorIds.length,
          originCity: fleetVendorsData?.route?.originCity || trip?.source,
          originState: fleetVendorsData?.route?.originState,
          destCity: fleetVendorsData?.route?.destinationCity || trip?.destination,
          destState: fleetVendorsData?.route?.destinationState,
          travelers: campusFleetPlan?.totalTravelers || trip?.travelers || 20,
          vehicleSummary: `${campusFleetPlan?.vehiclesRequired || 1} × ${campusFleetPlan?.comfort || "AC"} ${campusFleetPlan?.vehicleType || "Coach"}`,
        });
        setSelectedVendorIds([]);
        const reqRes = await getTripFleetVendorRequests(tripId, token);
        if (reqRes?.success) setFleetRequests(reqRes.requests || []);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to send vendor requests."
      });
    } finally {
      setDispatchingRequests(false);
    }
  };

  const handleOpenChatModal = async (req) => {
    setActiveChatModalRequest(req);
    setLoadingChatMessages(true);
    try {
      const token = localStorage.getItem("token");
      const res = await getOperatorVendorRequestMessages(req._id, token);
      if (res?.success) {
        setChatMessages(res.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat messages", err);
    } finally {
      setLoadingChatMessages(false);
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!activeChatModalRequest || !chatMessageInput.trim()) return;
    setSendingChatMessage(true);
    try {
      const token = localStorage.getItem("token");
      const res = await sendOperatorVendorRequestMessage(activeChatModalRequest._id, chatMessageInput.trim(), token);
      if (res?.success) {
        setChatMessages(prev => [...prev, res.message]);
        setChatMessageInput("");
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSendingChatMessage(false);
    }
  };

  const handleSelectVendorConfirm = async () => {
    if (!vendorSelectionModal) return;
    setSelectingVendor(true);
    try {
      const token = localStorage.getItem("token");
      const res = await selectFleetVendor(tripId, { requestId: vendorSelectionModal._id }, token);
      if (res?.success) {
        setFeedback({
          type: "success",
          message: `Selected ${vendorSelectionModal.vendorId?.name || "vendor"} for this campus group fleet.`
        });
        setVendorSelectionModal(null);
        const reqRes = await getTripFleetVendorRequests(tripId, token);
        if (reqRes?.success) setFleetRequests(reqRes.requests || []);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to select vendor."
      });
    } finally {
      setSelectingVendor(false);
    }
  };

  const handleRequestConfirmation = async (requestId) => {
    setRequestingConfirmation(true);
    try {
      const token = localStorage.getItem("token");
      const res = await requestFleetVendorConfirmation(tripId, { requestId }, token);
      if (res?.success) {
        setFeedback({
          type: "success",
          message: "Confirmation requested. The vendor can now confirm in the Demo Vendor Portal."
        });
        const reqRes = await getTripFleetVendorRequests(tripId, token);
        if (reqRes?.success) setFleetRequests(reqRes.requests || []);
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to request confirmation."
      });
    } finally {
      setRequestingConfirmation(false);
    }
  };

  const getMatchingFleetLabel = (vendor) => {
    const matches = vendor?.matchingFleet || vendor?.fleet || [];
    if (!matches || matches.length === 0) {
      const cap = campusFleetPlan?.capacityPerVehicle || 25;
      const comfort = campusFleetPlan?.comfort || "AC";
      const vType = campusFleetPlan?.vehicleType || "Coach";
      return `${cap}-seat ${comfort} ${vType}`.replace(/\s+/g, " ").trim();
    }
    // Prioritize coaches matching the group requirement
    const coachMatch = matches.find(f => f.category && f.category.toLowerCase().includes("coach")) || matches[0];
    const cap = coachMatch.capacity || campusFleetPlan?.capacityPerVehicle || 25;
    const acText = coachMatch.ac !== false ? "AC " : "";
    let typeName = "Coach";
    if (coachMatch.category) {
      const c = coachMatch.category.toLowerCase();
      if (c.includes("coach")) typeName = "Coach";
      else if (c.includes("bus")) typeName = "Bus";
      else if (c.includes("traveller")) typeName = "Tempo Traveller";
    }
    return `${cap}-seat ${acText}${typeName}`.replace(/\s+/g, " ").trim();
  };

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

  // For Campus Trips: Consolidate outbound & return into EXACTLY TWO intercity cards
  const campusIntercityCards = useMemo(() => {
    if (!isCampus || !trip) return [];
    const out = findExistingTransportRecord(trip, "outbound");
    const ret = findExistingTransportRecord(trip, "return");
    const totalDays = Array.isArray(trip.itinerary) ? trip.itinerary.length : 10;
    
    return [
      {
        direction: "OUTBOUND",
        date: out?.rawLeg?.date || (trip.startDate ? formatDate(trip.startDate) : "Day 1"),
        from: out?.source || out?.rawLeg?.from || trip.source || "Origin",
        to: out?.destination || out?.rawLeg?.to || trip.destination || "Destination",
        mode: (out?.mode === "flight" || out?.rawLeg?.mode === "flight") ? "Flight" : "Train",
        carrierInfo: out?.mode === "flight"
          ? (out.flightNumber ? `${out.airline || "Flight"} #${out.flightNumber}` : (out.airline || "Scheduled Flight"))
          : (out?.trainNumber ? `${out.trainName || "Train"} #${out.trainNumber}` : (out?.trainName || "Scheduled Train")),
        departureTime: out?.departure || out?.rawLeg?.startTime || "Departure",
        arrivalTime: out?.arrival || out?.rawLeg?.endTime || "Arrival",
      },
      {
        direction: "RETURN",
        date: ret?.rawLeg?.date || (trip.endDate ? formatDate(trip.endDate) : (trip.startDate ? `Day ${totalDays}` : "Return")),
        from: ret?.source || ret?.rawLeg?.from || trip.destination || "Destination",
        to: ret?.destination || ret?.rawLeg?.to || trip.source || "Origin",
        mode: (ret?.mode === "flight" || ret?.rawLeg?.mode === "flight") ? "Flight" : "Train",
        carrierInfo: ret?.mode === "flight"
          ? (ret.flightNumber ? `${ret.airline || "Flight"} #${ret.flightNumber}` : (ret.airline || "Scheduled Flight"))
          : (ret?.trainNumber ? `${ret.trainName || "Train"} #${ret.trainNumber}` : (ret?.trainName || "Scheduled Train")),
        departureTime: ret?.departure || ret?.rawLeg?.startTime || "Departure",
        arrivalTime: ret?.arrival || ret?.rawLeg?.endTime || "Arrival",
      }
    ];
  }, [trip, isCampus]);

  // Operational road movements across the entire trip
  const scheduledRoadMovements = useMemo(() => {
    if (!trip) return [];
    return detectBusRequirements(trip);
  }, [trip]);

  // Personal trip local transport resolution
  const personalTransportArrangement = useMemo(() => {
    if (!trip || isCampus) return null;
    return resolveLocalTransportArrangement(trip);
  }, [trip, isCampus]);

  // Operational Group Fleet plan for Campus trips
  const campusFleetPlan = useMemo(() => {
    if (!isCampus || !trip) return null;
    return trip.campusTransportPlan || {
      vehiclesRequired: Math.ceil((trip.travelers || 20) / 25),
      vehicleType: "Coach",
      comfort: "AC",
      capacityPerVehicle: 25,
      totalTravelers: trip.travelers || 20,
      studentsCount: trip.travelers || 20,
      teachersStaffCount: 0,
      luggageCount: trip.travelers || 20,
      notes: "",
    };
  }, [trip, isCampus]);

  // Operational Group Fleet Booking (Single Requirement)
  const campusFleetBooking = useMemo(() => {
    if (!isCampus) return null;
    return transportBookings.find(b => b.itemId === "campus-group-fleet") || transportBookings[0] || null;
  }, [transportBookings, isCampus]);

  // Operational Personal Private Vehicle Booking (Single Requirement)
  const personalVehicleBooking = useMemo(() => {
    if (isCampus) return null;
    return transportBookings.find(b => b.itemId === "personal-private-vehicle") || transportBookings[0] || null;
  }, [transportBookings, isCampus]);

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

          {/* One-Click Automated Booking Action Card */}
          <OperatorAutoBookCard
            trip={trip}
            bookings={bookings}
            onBookingSuccess={(data) => {
              setTrip(prev => ({
                ...prev,
                isBooked: true,
                status: "BOOKED",
                bookingSummary: {
                  ...prev?.bookingSummary,
                  confirmedBookings: data.confirmedBookings
                }
              }));
              if (data.requirements) {
                setBookings(data.requirements);
              }
            }}
          />

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
              <span>{isCampus ? "Transport & Fleet" : "Transport Legs"} ({isCampus ? 2 : (transportBookings.length || trip.travelLegs?.length || 0)})</span>
            </button>

            <button
              onClick={() => setActiveTab("activities")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "activities"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiCompass size={13} />
              <span>Activities ({activityBookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("guide")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "guide"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <FiCompass size={13} className={trip?.guideRequirement?.required ? "text-teal-400" : ""} />
              <span>
                Guide
                {trip?.guideRequirement?.required ? " (Requested)" : trip?.guideRequirement?.required === false ? " (Not Needed)" : ""}
              </span>
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

              {/* 1. Intercity Transit (Trains/Flights) */}
              {isCampus ? (
                /* Campus Trip: EXACTLY TWO intercity cards (OUTBOUND and RETURN) regardless of mode combination */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      INTERCITY TRANSIT (CAMPUS OUTBOUND & RETURN)
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      2 Canonical Cards
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campusIntercityCards.map((card) => (
                      <div key={card.direction} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between gap-4">
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider border ${
                              card.direction === "OUTBOUND"
                                ? "bg-indigo-950/70 text-indigo-300 border-indigo-800/60"
                                : "bg-purple-950/70 text-purple-300 border-purple-800/60"
                            }`}>
                              {card.direction}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-700">
                              {card.mode}
                            </span>
                          </div>

                          <div className="font-bold text-white text-base flex items-center gap-2 mt-1">
                            <span>{card.from}</span>
                            <FiArrowRight className="text-indigo-400 shrink-0" />
                            <span>{card.to}</span>
                          </div>

                          <div className="text-xs text-slate-400 mt-2.5 font-medium space-y-1 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                            <div>Date: <span className="text-slate-300 font-semibold">{card.date}</span></div>
                            <div>Timing: <span className="text-slate-300 font-semibold">{card.departureTime} – {card.arrivalTime}</span></div>
                            <div>Carrier: <span className="text-slate-300 font-mono font-semibold">{card.carrierInfo}</span></div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Canonical Intercity Leg</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <FiCheck size={12} /> Scheduled
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Personal Trip: Retain existing 4-card door-to-door transit structure */
                Array.isArray(trip.travelLegs) && trip.travelLegs.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      DOOR-TO-DOOR TRANSIT LEGS (PERSONAL)
                    </div>
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
                  </div>
                )
              )}

              {/* 2. Operational Road Transport & Fleet Movements */}
              {isCampus ? (
                /* Campus Group Road Transport: ONE operational Group Fleet Card + Movements List */
                <div className="space-y-4 pt-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <span>CAMPUS GROUP FLEET & ROAD MOVEMENTS</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-[9px] font-bold text-indigo-300 border border-indigo-800/60">
                      ONE TRIP FLEET ARRANGEMENT
                    </span>
                  </div>

                  {/* Confirmed Fleet Banner (if BookingRequirement confirmed) */}
                  {campusFleetBooking?.status === "CONFIRMED" && (
                    <div className="bg-emerald-950/40 border border-emerald-500/60 rounded-2xl p-5 shadow-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                            <FiCheckCircle size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                                OPERATIONAL FLEET CONFIRMED
                              </span>
                              <span className="text-xs text-slate-400">Single Group Fleet Arrangement</span>
                            </div>
                            <div className="text-base font-black text-white mt-1">
                              {campusFleetBooking.vendorName || "Confirmed Fleet Partner"}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                              <span>
                                Reference: <code className="text-emerald-400 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-emerald-900/60">{campusFleetBooking.externalReferenceId || "TX-FLT-CONFIRMED"}</code>
                              </span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-300 font-medium">
                                Fleet ready for execution
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            CONFIRMED
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ONE Group Transport / Fleet Card */}
                  {campusFleetPlan && (
                    <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-900 text-indigo-200 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-700">
                              GROUP TRANSPORT
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              Single Group Fleet Arrangement
                            </span>
                          </div>
                          <div className="text-lg font-black text-white mt-1">
                            {campusFleetPlan.vehiclesRequired}x {campusFleetPlan.comfort} {campusFleetPlan.vehicleType}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                              Total Travelers
                            </span>
                            <div className="text-sm font-extrabold text-white">
                              {campusFleetPlan.totalTravelers} ({campusFleetPlan.studentsCount || 0} Students + {campusFleetPlan.teachersStaffCount || 0} Staff)
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(campusFleetBooking?.status || "PENDING")}`}>
                            {(campusFleetBooking?.status || "PENDING").replace("_", " ")}
                          </span>

                          <button
                            onClick={loadCampusVendorData}
                            title="Refresh matching vendors and responses"
                            className="p-1.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 hover:text-white transition border border-indigo-700/50"
                          >
                            <FiRefreshCw size={13} className={loadingFleetVendors ? "animate-spin" : ""} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Type</span>
                          <span className="font-extrabold text-white">{campusFleetPlan.vehicleType}</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Capacity</span>
                          <span className="font-extrabold text-white">{campusFleetPlan.capacityPerVehicle} seats / vehicle</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicles Required</span>
                          <span className="font-extrabold text-emerald-400">{campusFleetPlan.vehiclesRequired} coaches required</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Luggage</span>
                          <span className="font-extrabold text-white">{campusFleetPlan.luggageCount} bags</span>
                        </div>
                      </div>

                      {campusFleetPlan.notes && (
                        <div className="text-xs text-indigo-200/90 italic bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/40">
                          Notes: "{campusFleetPlan.notes}"
                        </div>
                      )}

                      {/* Canonical Resolved Operational Route */}
                      <div className="bg-slate-900/90 rounded-xl p-3.5 border border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <FiCompass className="text-indigo-400 shrink-0" size={16} />
                          <span className="font-bold text-slate-300">Resolved Operational Route:</span>
                          <div className="flex items-center gap-1.5 text-white font-extrabold flex-wrap">
                            <span>{fleetVendorsData?.route?.originCity || trip.source}</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-[10px] text-indigo-300 font-mono border border-indigo-800">
                              {fleetVendorsData?.route?.originState || "Resolving state..."}
                            </span>
                            <FiArrowRight size={12} className="text-indigo-400 mx-0.5" />
                            <span>{fleetVendorsData?.route?.destinationCity || trip.destination}</span>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-[10px] text-indigo-300 font-mono border border-indigo-800">
                              {fleetVendorsData?.route?.destinationState || "Resolving state..."}
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-400 text-[11px] font-medium flex items-center gap-2 shrink-0">
                          <span>Connected Network: {fleetVendorsData?.totalConnectedVendors || 100}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold">{fleetVendorsData?.matchedCount || 0} suitable match(es)</span>
                        </div>
                      </div>

                      {/* Operator Status Management for the ONE Fleet */}
                      {campusFleetBooking && (
                        <div className="pt-3 border-t border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="text-slate-300 font-medium flex items-center gap-1.5">
                            <span>Manage Fleet Booking Status:</span>
                            <span className="text-slate-400 text-[11px]">(Applies to the entire group transport plan)</span>
                          </div>
                          <StatusDropdown
                            currentStatus={campusFleetBooking.status}
                            disabled={statusUpdating[campusFleetBooking._id]}
                            validTransitions={validTransitions}
                            onStatusChange={(newStatus) => handleStatusChange(campusFleetBooking._id, newStatus)}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success State Banner */}
                  {requestSuccessData && (
                    <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-2xl p-5 space-y-3 shadow-md">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                        <FiCheckCircle size={18} />
                        <span>✓ Request sent successfully</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        <strong className="text-white">{requestSuccessData.vendorCount} vendors</strong> have received the group fleet request.
                      </p>
                      <div className="text-xs bg-slate-900/80 p-3 rounded-xl border border-emerald-900/60 space-y-1 text-slate-300">
                        <div className="font-extrabold text-white">
                          {requestSuccessData.originCity} → {requestSuccessData.destCity}
                        </div>
                        <div>{requestSuccessData.travelers} travelers • {requestSuccessData.vehicleSummary}</div>
                        <div className="text-[11px] text-emerald-300/90 font-medium">Availability + quotation requested.</div>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            const el = document.getElementById("operator-responses-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow"
                        >
                          View Vendor Responses
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Vendor Responses Section */}
                  {fleetRequests.length > 0 && (
                    <div id="operator-responses-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            GROUP FLEET REQUEST
                          </div>
                          <div className="text-base font-extrabold text-white">
                            {fleetVendorsData?.route?.originCity || trip?.source} → {fleetVendorsData?.route?.destinationCity || trip?.destination}
                          </div>
                          <div className="text-xs text-slate-400">
                            {campusFleetPlan?.totalTravelers || trip?.travelers} Travelers • {campusFleetPlan?.vehiclesRequired} × {campusFleetPlan?.comfort} {campusFleetPlan?.vehicleType}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link 
                            to="/vendor/requests" 
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/80 px-3 py-1.5 rounded-lg border border-indigo-800/60 transition"
                          >
                            <FiExternalLink size={12} />
                            <span>Vendor Portal</span>
                          </Link>
                        </div>
                      </div>

                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pt-1">
                        Responses ({fleetRequests.length})
                      </div>

                      <div className="space-y-3">
                        {fleetRequests.map((req) => {
                          const vName = req.vendorId?.name || "Connected Vendor";
                          const isAvail = req.response?.availability === "AVAILABLE";
                          const isPartAvail = req.response?.availability === "PARTIALLY_AVAILABLE";
                          const isUnavail = req.response?.availability === "UNAVAILABLE" || req.status === "REJECTED";
                          const isAwaiting = req.status === "SENT" || req.status === "VIEWED" || req.status === "ACCEPTED";
                          const quoteAmount = req.response?.quotation?.totalAmount || req.response?.quote;
                          const vehiclesAlloc = req.response?.vehicles && req.response.vehicles.length > 0
                            ? req.response.vehicles.map(v => `${v.count} × ${v.category} (${v.seatsPerVehicle} seats each)`).join(", ")
                            : (req.response?.vehiclesAvailable ? `${req.response.vehiclesAvailable} × ${campusFleetPlan?.vehicleType || "Coaches"}` : null);

                          return (
                            <div key={req._id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-extrabold text-white text-sm">{vName}</span>
                                  {isAvail && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                                      <FiCheck size={10} /> Available
                                    </span>
                                  )}
                                  {isPartAvail && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800/60">
                                      ◐ Partially Available
                                    </span>
                                  )}
                                  {isUnavail && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800/60">
                                      ✕ Not Available
                                    </span>
                                  )}
                                  {isAwaiting && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                                      Awaiting Response
                                    </span>
                                  )}
                                </div>

                                {req.response?.rejectionReason && (
                                  <div className="text-xs text-rose-400">
                                    <span className="font-bold">Reason:</span> {req.response.rejectionReason}
                                    {req.response.rejectionMessage && <span> • "{req.response.rejectionMessage}"</span>}
                                  </div>
                                )}

                                {vehiclesAlloc && (
                                  <div className="text-xs text-slate-300 font-medium">
                                    {vehiclesAlloc}
                                  </div>
                                )}

                                {quoteAmount > 0 && (
                                  <div className="text-sm font-extrabold text-emerald-400">
                                    ₹{quoteAmount.toLocaleString("en-IN")}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {(req.status === "RESPONDED" || req.status === "SELECTED" || req.status === "CONFIRMED") && (
                                  <button
                                    onClick={() => setViewResponseModal(req)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition border border-slate-700"
                                  >
                                    View Response
                                  </button>
                                )}
                                {isAwaiting && (
                                  <button
                                    onClick={() => setViewResponseModal(req)}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition border border-slate-700"
                                  >
                                    View Request
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenChatModal(req)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                                >
                                  <FiMessageSquare size={12} />
                                  <span>Message Vendor</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Connected Vendor Matching Section */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div>
                        <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <span>Suitable Connected Vendors</span>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-[10px] font-black border border-indigo-800/80">
                            {fleetVendorsData?.matchedCount || 0} MATCHES
                          </span>
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          Vendors matching the selected route and fleet requirement.
                        </p>
                      </div>

                      {/* Multi-Select Action Button */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleOpenConfirmRequestModal}
                          disabled={selectedVendorIds.length === 0 || dispatchingRequests}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:cursor-not-allowed"
                        >
                          <FiSend size={13} />
                          <span>
                            {dispatchingRequests
                              ? "Sending..."
                              : `Request Quotes (${selectedVendorIds.length} selected)`}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Vendor Grid */}
                    {loadingFleetVendors ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        Matching connected vendors with MongoDB...
                      </div>
                    ) : (fleetVendorsData?.matchedVendors || []).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80 p-6">
                        <FiAlertCircle className="mx-auto text-amber-400 mb-2" size={24} />
                        <div className="font-bold text-white">No connected vendors match this route and fleet requirement.</div>
                        <p className="text-slate-400 text-[11px] mt-1 max-w-md mx-auto">
                          Verify that connected vendors serve both {fleetVendorsData?.route?.originState} and {fleetVendorsData?.route?.destinationState} with {campusFleetPlan?.vehicleType || "requested fleet"}.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(fleetVendorsData?.matchedVendors || []).map((vendor) => {
                          const existingReq = fleetRequests.find(r => (r.vendorId?._id || r.vendorId) === vendor._id);
                          const isSelected = selectedVendorIds.includes(vendor._id);

                          return (
                            <div
                              key={vendor._id}
                              onClick={() => {
                                if (!existingReq) handleToggleSelectVendor(vendor._id);
                              }}
                              className={`p-4 rounded-xl border transition flex items-center justify-between gap-3 ${
                                existingReq
                                  ? "bg-slate-950/60 border-slate-800/90 cursor-default opacity-85"
                                  : isSelected
                                  ? "bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500/50 cursor-pointer"
                                  : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700 cursor-pointer"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-white text-sm leading-tight truncate">
                                  {vendor.name}
                                </h4>
                                <div className="text-xs font-semibold text-slate-400 mt-1">
                                  {getMatchingFleetLabel(vendor)}
                                </div>
                              </div>

                              <div className="shrink-0">
                                {existingReq ? (
                                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-950 text-purple-300 border border-purple-800/60">
                                    {existingReq.status.replace("_", " ")}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleSelectVendor(vendor._id);
                                    }}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                      isSelected
                                        ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400"
                                        : "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60"
                                    }`}
                                  >
                                    {isSelected ? (
                                      <>
                                        <FiCheck size={12} />
                                        <span>Selected</span>
                                      </>
                                    ) : (
                                      <span>Select</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Expandable Accordion for Ineligible / Rejected Vendors */}
                    {(fleetVendorsData?.rejectedVendors || []).length > 0 && (
                      <div className="pt-3 border-t border-slate-800/80">
                        <button
                          onClick={() => setShowRejectedVendors(prev => !prev)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition"
                        >
                          <span>
                            {showRejectedVendors ? "Hide" : "View"} Partially Matched / Ineligible Vendors ({fleetVendorsData.rejectedVendors.length})
                          </span>
                          {showRejectedVendors ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>

                        {showRejectedVendors && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {fleetVendorsData.rejectedVendors.map(rej => (
                              <div key={rej.vendorId} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-bold text-slate-300">{rej.name}</div>
                                  <div className="text-[11px] text-rose-400/90 mt-0.5">
                                    Reason: {rej.reason}
                                  </div>
                                </div>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-950/60 text-rose-400 border border-rose-900/50 uppercase">
                                  Ineligible
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Underneath: TRIP TRANSPORT MOVEMENTS List (No independent booking statuses) */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        TRIP TRANSPORT MOVEMENTS ({scheduledRoadMovements.length})
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Operational requirements under group fleet • No separate booking statuses
                      </span>
                    </div>

                    {scheduledRoadMovements.length === 0 ? (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-center">
                        No road transport movements detected for this itinerary.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scheduledRoadMovements.map((movement, mIdx) => {
                          const dateStr = movement.date || (movement.dayNumber && trip.startDate ? calculateDayDate(trip.startDate, movement.dayNumber) : `Day ${movement.dayNumber || mIdx + 1}`);
                          const timeStr = movement.requiredDepartureTime || (movement.timing ? movement.timing.split("-")[0].trim() : "Scheduled Timing");
                          const activityDesc = movement.relatedActivity || (movement.type === "TRANSFER" ? "Arrival / hotel transfer" : "Scheduled activity transport");

                          return (
                            <div key={movement.id || mIdx} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-2 shadow-xs">
                              <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                  <span className="font-bold text-slate-300">{dateStr}</span>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">{timeStr}</span>
                                </div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{movement.from}</span>
                                  <FiArrowRight className="text-indigo-400 shrink-0" size={13} />
                                  <span>{movement.to}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {activityDesc}
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Assigned to Group Fleet</span>
                                <span className="text-indigo-300 font-semibold">Operational Requirement</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Personal Trip: ONE Private Vehicle Arrangement OR Traveler Managed + Movements */
                <div className="space-y-4 pt-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                    <span>PERSONAL LOCAL TRANSPORT</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-[9px] font-bold text-indigo-300 border border-indigo-800/60">
                      {personalTransportArrangement?.isTravelerManaged ? "TRAVELER MANAGED" : "ONE TRIP ARRANGEMENT"}
                    </span>
                  </div>

                  {personalTransportArrangement?.isTravelerManaged ? (
                    /* Traveler Managed Banner */
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-black rounded uppercase tracking-wider border border-slate-700">
                            TRAVELER MANAGED
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            Entire Trip Scope
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                          No Transix Booking Required
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        The traveler selected <strong>"I'll manage local transport myself"</strong>. They will arrange local transit independently (Ola / Uber / Auto / Taxi / Rental / Public Transport).
                      </p>
                    </div>
                  ) : personalTransportArrangement?.isTransixCoordinated ? (
                    /* ONE Private Vehicle Arrangement Card */
                    <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-800/60">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-900 text-indigo-200 text-[10px] font-black rounded uppercase tracking-wider border border-indigo-700">
                              PRIVATE VEHICLE
                            </span>
                            <span className="text-xs font-bold text-slate-300">
                              Entire Trip Scope
                            </span>
                          </div>
                          <div className="text-lg font-black text-white mt-1">
                            {personalTransportArrangement.preferences?.vehicleType || (personalTransportArrangement.isPrivateMinibus ? "Private Mini Bus" : "Private Car")} • {personalTransportArrangement.preferences?.comfort || "AC"}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                              Travelers
                            </span>
                            <div className="text-sm font-extrabold text-white">
                              {personalTransportArrangement.preferences?.travelerCount || trip.travelers} travelers
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(personalVehicleBooking?.status || "PENDING")}`}>
                            {(personalVehicleBooking?.status || "PENDING").replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Vehicle Type</span>
                          <span className="font-extrabold text-white">{personalTransportArrangement.preferences?.vehicleType || (personalTransportArrangement.isPrivateMinibus ? "Private Mini Bus" : "Private Car")}</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Comfort</span>
                          <span className="font-extrabold text-white">{personalTransportArrangement.preferences?.comfort || "AC"}</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Capacity</span>
                          <span className="font-extrabold text-white">{personalTransportArrangement.preferences?.seatCount || personalTransportArrangement.preferences?.travelerCount || trip.travelers} seats</span>
                        </div>
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-indigo-900/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Luggage</span>
                          <span className="font-extrabold text-white">{personalTransportArrangement.preferences?.luggageCount !== undefined ? `${personalTransportArrangement.preferences.luggageCount} bags` : "Standard"}</span>
                        </div>
                      </div>

                      {personalTransportArrangement.preferences?.notes && (
                        <div className="text-xs text-indigo-200/90 italic bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/40">
                          Preferences: "{personalTransportArrangement.preferences.notes}"
                        </div>
                      )}

                      {personalVehicleBooking && (
                        <div className="pt-3 border-t border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="text-slate-300 font-medium flex items-center gap-1.5">
                            <span>Update Private Vehicle Status:</span>
                            <span className="text-slate-400 text-[11px]">(Applies to all scheduled movements)</span>
                          </div>
                          <StatusDropdown
                            currentStatus={personalVehicleBooking.status}
                            disabled={statusUpdating[personalVehicleBooking._id]}
                            validTransitions={validTransitions}
                            onStatusChange={(newStatus) => handleStatusChange(personalVehicleBooking._id, newStatus)}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xs text-xs text-slate-400">
                      No private local vehicle has been coordinated for this trip. Local transport is traveler-managed by default.
                    </div>
                  )}

                  {/* Underneath: SCHEDULED MOVEMENTS list under the one arrangement */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                        SCHEDULED MOVEMENTS ({scheduledRoadMovements.length})
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {personalTransportArrangement?.isTravelerManaged ? "Traveler managed movements" : "Operational requirements under assigned private vehicle"}
                      </span>
                    </div>

                    {scheduledRoadMovements.length === 0 ? (
                      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 text-center">
                        No local movements detected for this itinerary.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scheduledRoadMovements.map((movement, mIdx) => {
                          const dateStr = movement.date || (movement.dayNumber && trip.startDate ? calculateDayDate(trip.startDate, movement.dayNumber) : `Day ${movement.dayNumber || mIdx + 1}`);
                          const timeStr = movement.requiredDepartureTime || (movement.timing ? movement.timing.split("-")[0].trim() : "Scheduled Timing");
                          const activityDesc = movement.relatedActivity || (movement.type === "TRANSFER" ? "Hotel / station transfer" : "Scheduled activity transport");

                          return (
                            <div key={movement.id || mIdx} className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-2 shadow-xs">
                              <div>
                                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                                  <span className="font-bold text-slate-300">{dateStr}</span>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">{timeStr}</span>
                                </div>
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{movement.from}</span>
                                  <FiArrowRight className="text-indigo-400 shrink-0" size={13} />
                                  <span>{movement.to}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {activityDesc}
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                                {personalTransportArrangement?.isTravelerManaged ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-semibold">
                                    Traveler managed
                                  </span>
                                ) : (
                                  <span>Assigned Private Vehicle</span>
                                )}
                                <span className="text-indigo-300 font-semibold">Operational Requirement</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state if neither transit nor road movements exist */}
              {(!trip.travelLegs || trip.travelLegs.length === 0) &&
               (!isCampus || campusIntercityCards.length === 0) &&
               scheduledRoadMovements.length === 0 && (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                  No travel legs or road movements mapped for this trip.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACTIVITIES & VISITS BOOKING REQUIREMENTS */}
          {activeTab === "activities" && (
            <div className="space-y-6">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {isCampus ? "Visits & Permissions" : "Trip Activities"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isCampus 
                      ? "Official institutional permissions, educational visits, and scheduled academic activities."
                      : "Operational coordination, tickets, entry passes, and vendor coordination for trip activities."}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="px-3 py-1 rounded-lg bg-indigo-950/70 text-indigo-300 text-xs font-bold border border-indigo-800/60">
                    {activityBookings.length} Requirement{activityBookings.length !== 1 ? "s" : ""}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-950/70 text-emerald-300 text-xs font-bold border border-emerald-800/60">
                    {actConfirmed} Confirmed
                  </span>
                </div>
              </div>

              {activityBookings.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                  <FiCompass className="mx-auto text-slate-600 mb-2" size={28} />
                  <p className="font-semibold text-slate-300">No activity booking requirements found.</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    No activities or visits require operational booking for this trip.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activityBookings.map((b) => {
                    const isHighlighted = highlightedActivityId === b._id;
                    let dayNum = null;
                    let timingStr = null;
                    if (Array.isArray(trip?.itinerary)) {
                      trip.itinerary.forEach((day, dIdx) => {
                        const items = day.activities || day.events || [];
                        const found = items.find(
                          item => String(item.id || item._id) === String(b.itemId) || item.title === b.title || item.name === b.title
                        );
                        if (found) {
                          dayNum = day.dayNumber || dIdx + 1;
                          timingStr = found.time || found.timing || found.startTime;
                        }
                      });
                    }

                    const dateStr = dayNum && trip.startDate 
                      ? calculateDayDate(trip.startDate, dayNum) 
                      : (trip.startDate ? formatDate(trip.startDate) : "Scheduled Date");

                    const timeLabel = timingStr || (b.notes && b.notes.includes("Day") ? b.notes : "Operational Coordination");
                    const participantsLabel = isCampus
                      ? `${campusFleetPlan?.totalTravelers || trip.travelers} Participants (${campusFleetPlan?.studentsCount || trip.travelers} Students, ${campusFleetPlan?.teachersStaffCount || 0} Staff)`
                      : `${trip.travelers || 2} Travelers`;

                    return (
                      <div
                        key={b._id}
                        id={`activity-card-${b._id}`}
                        className={`bg-slate-900 rounded-2xl border p-5 space-y-4 shadow-sm transition ${
                          isHighlighted
                            ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/20"
                            : "border-slate-800 hover:border-slate-750"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                                {b.type}
                              </span>
                              {isHighlighted && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white animate-pulse">
                                  Selected Activity
                                </span>
                              )}
                            </div>
                            <h4 className="text-base font-extrabold text-white mt-1 leading-snug">
                              {b.title}
                            </h4>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <FiMapPin size={12} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{b.location || trip.destination}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border ${getStatusBadge(b.status)}`}>
                              {b.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Date & Schedule</span>
                            <span className="font-bold text-slate-200">{dateStr}</span>
                            {dayNum && <span className="text-slate-500 ml-1 text-[11px]">(Day {dayNum})</span>}
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Timing</span>
                            <span className="font-bold text-indigo-300 truncate block">{timeLabel}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Trip & Route</span>
                            <span className="font-semibold text-slate-300 truncate block">
                              {trip.organizationDetails?.name || `${trip.source} → ${trip.destination}`}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Participants</span>
                            <span className="font-semibold text-slate-300 truncate block">{participantsLabel}</span>
                          </div>
                          <div className="col-span-2 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                            <div>
                              <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Provider / Authority</span>
                              <span className="font-semibold text-slate-300">
                                {b.vendorName || "Direct Entry / Local Authority"}
                              </span>
                            </div>
                            {b.externalUrl && (
                              <a
                                href={b.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                              >
                                <span>Official Portal</span>
                                <FiExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          {b.notes && (
                            <div className="col-span-2 text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/80">
                              Notes: {b.notes}
                            </div>
                          )}
                        </div>

                        {/* Operational Action */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <div className="text-[11px] text-slate-400 font-medium">
                            Operational Action:
                          </div>
                          <div className="w-48">
                            <StatusDropdown
                              currentStatus={b.status}
                              disabled={statusUpdating[b._id]}
                              validTransitions={validTransitions}
                              onStatusChange={(newStatus) => handleStatusChange(b._id, newStatus)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: GUIDE WORKFLOW (Matching, Requests, Selection & Responses) */}
          {activeTab === "guide" && (
            <div className="space-y-6">
              {/* If Traveler chose NOT to request a guide */}
              {(!trip.guideRequirement || trip.guideRequirement.required === false) ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2 border border-slate-700">
                    <FiCompass size={28} />
                  </div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Guide Not Required</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    This traveler has chosen not to request a guide for this trip.
                  </p>
                  <div className="pt-2">
                    <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px] font-bold border border-slate-700">
                      Requirement: No guide required
                    </span>
                  </div>
                </div>
              ) : (
                /* Traveler Requested a Guide: Show Requirement + Geographic Matches + Requests + Selection */
                <div className="space-y-6">
                  {/* Top Bar: Requirement Summary */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-black uppercase tracking-wider text-white">
                            Guide Requirement
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            trip.guideRequirement.status === "confirmed"
                              ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                              : trip.guideRequirement.status === "guide_selected"
                              ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                              : "bg-amber-950 text-amber-300 border-amber-700"
                          }`}>
                            {trip.guideRequirement.status?.replace("_", " ") || "Pending"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Traveler requested professional guide coordination for this itinerary.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={fetchGuideData}
                        disabled={loadingMatchedGuides}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <FiRefreshCw size={12} className={loadingMatchedGuides ? "animate-spin" : ""} />
                        <span>Refresh Matches</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Number of Guides</span>
                        <span className="font-extrabold text-white text-sm">
                          {trip.guideRequirement.numberOfGuides || "1"} {Number(trip.guideRequirement.numberOfGuides) === 1 ? "Guide" : "Guides"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Gender Preference</span>
                        <span className="font-extrabold text-white text-sm">
                          {trip.guideRequirement.genderPreference || "Either"}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Preferred Languages</span>
                        <span className="font-semibold text-slate-200">
                          {(trip.guideRequirement.preferredLanguages || []).join(", ") || "English, Hindi"}
                        </span>
                      </div>
                      {trip.guideRequirement.specialNotes && (
                        <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-800/60">
                          <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">Special Notes / Requirements</span>
                          <p className="text-slate-300 italic mt-0.5">"{trip.guideRequirement.specialNotes}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confirmed Guides Banner (if already finalized) */}
                  {trip.guideRequirement?.finalizedGuides && trip.guideRequirement.finalizedGuides.length > 0 && (
                    <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-wider">
                        <FiCheckCircle size={18} />
                        <span>Confirmed Guide Arrangement ({trip.guideRequirement.finalizedGuides.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {trip.guideRequirement.finalizedGuides.map((g) => (
                          <div key={g.guideId} className="bg-slate-900/90 border border-emerald-700/50 p-3.5 rounded-xl space-y-1">
                            <div className="font-bold text-white text-sm">{g.fullName}</div>
                            <div className="text-xs text-emerald-300 font-mono font-bold">
                              ₹{g.price?.toLocaleString()} ({g.status})
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{g.guideId}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION A: GUIDE RESPONSES (Responses received from contacted guides) */}
                  {tripGuideRequests.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <span>Guide Requests & Responses ({tripGuideRequests.length})</span>
                        </h4>
                        {selectedGuideIds.length > 0 && trip.guideRequirement?.status !== "confirmed" && (
                          <button
                            type="button"
                            onClick={handleFinalizeGuideArrangement}
                            disabled={finalizingGuides}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <FiCheckCircle size={14} />
                            <span>{finalizingGuides ? "Finalizing..." : `Finalize Selection (${selectedGuideIds.length})`}</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tripGuideRequests.map((reqItem) => {
                          const isAccepted = reqItem.status === "ACCEPTED" || reqItem.status === "OPERATOR_SELECTED" || reqItem.status === "CONFIRMED";
                          const isRejected = reqItem.status === "REJECTED";
                          const isSelected = selectedGuideIds.includes(reqItem.guideId);

                          return (
                            <div
                              key={reqItem._id}
                              className={`bg-slate-900 rounded-2xl border p-4 space-y-3 transition ${
                                isSelected
                                  ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/10"
                                  : isAccepted
                                  ? "border-indigo-800/80 hover:border-indigo-700"
                                  : isRejected
                                  ? "border-rose-900/60 opacity-80"
                                  : "border-slate-800"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h5 className="font-extrabold text-white text-sm">
                                      {reqItem.guide?.fullName || reqItem.guideId}
                                    </h5>
                                    <span className="text-[10px] text-slate-500 font-mono">({reqItem.guideId})</span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {reqItem.guide?.primaryRegion} • {reqItem.guide?.guidingExperience}
                                  </div>
                                </div>

                                <span className={`px-2.5 py-0.5 text-[10px] uppercase font-black tracking-wider rounded-lg border ${
                                  isAccepted
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                    : isRejected
                                    ? "bg-rose-950 text-rose-300 border-rose-800"
                                    : "bg-amber-950 text-amber-300 border-amber-800"
                                }`}>
                                  {reqItem.status?.replace("_", " ")}
                                </span>
                              </div>

                              {/* Response Details (if accepted) */}
                              {isAccepted && (
                                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-slate-400 text-[11px]">Price Quote:</span>
                                    <span className="text-emerald-400 font-black text-sm font-mono">
                                      ₹{reqItem.price?.amount?.toLocaleString() || 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Availability:</span>
                                    <span className="text-slate-200 font-semibold">{reqItem.availability}</span>
                                  </div>
                                  {reqItem.guideResponseNotes && (
                                    <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800/60">
                                      "{reqItem.guideResponseNotes}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Rejection Details */}
                              {isRejected && (
                                <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-900/40 text-xs space-y-1">
                                  <div className="text-rose-400 font-bold text-[11px]">Request Rejected</div>
                                  <div className="text-slate-300 text-[11px]">
                                    Reason: {reqItem.rejectionReason || "Not available on requested dates"}
                                  </div>
                                </div>
                              )}

                              {/* Pending Details */}
                              {reqItem.status === "SENT" && (
                                <div className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/40 text-[11px] text-amber-300 flex items-center gap-1.5">
                                  <FiClock size={12} />
                                  <span>Request sent to Guide Portal. Awaiting response...</span>
                                </div>
                              )}

                              {/* Action: Select / Deselect Guide */}
                              {isAccepted && trip.guideRequirement?.status !== "confirmed" && (
                                <div className="pt-2 flex justify-end">
                                  <button
                                    type="button"
                                    disabled={selectingGuide}
                                    onClick={() => handleToggleSelectGuide(reqItem.guideId)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                      isSelected
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                        : "bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white"
                                    }`}
                                  >
                                    {isSelected ? <FiCheck size={13} /> : null}
                                    <span>{isSelected ? "Selected ✓" : "Select Guide"}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SECTION B: GEOGRAPHIC MATCHING ENGINE (4 to 10 Profiles from MongoDB) */}
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                          <FiCompass className="text-teal-400" />
                          <span>Matched Guides ({matchedGuidesData.count})</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {matchedGuidesData.routeDisplayText ? (
                            <span>{matchedGuidesData.routeDisplayText}</span>
                          ) : matchedGuidesData.tripStates?.length === 1 && trip?.destination && trip.destination.toLowerCase() !== matchedGuidesData.tripStates[0].toLowerCase() ? (
                            <span>
                              Geographically matched based on trip route:{" "}
                              <span className="text-indigo-400 font-bold">
                                {trip.destination} → {matchedGuidesData.tripStates[0]}
                              </span>
                            </span>
                          ) : (
                            <span>
                              Geographically matched based on trip route states:{" "}
                              <span className="text-indigo-400 font-bold">
                                {(matchedGuidesData.tripStates || []).join(", ") || trip?.destination}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Ranked by Geographic Overlap & Experience
                      </span>
                    </div>

                    {loadingMatchedGuides ? (
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-400 text-xs">
                        <FiRefreshCw className="animate-spin mx-auto text-indigo-500 mb-2" size={24} />
                        <span>Searching 100 Guide Profiles in MongoDB...</span>
                      </div>
                    ) : matchedGuidesData.guides.length === 0 ? (
                      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center text-slate-400 text-xs">
                        No guides found matching this specific geographic route.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {matchedGuidesData.guides.map((guide) => {
                          const existingReq = tripGuideRequests.find((r) => r.guideId === guide.guideId);
                          const isAlreadyRequested = Boolean(existingReq);

                          return (
                            <div
                              key={guide.guideId}
                              className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-slate-750 p-5 space-y-4 shadow-sm transition flex flex-col justify-between"
                            >
                              <div className="space-y-3">
                                {/* Guide Header */}
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="text-base font-black text-white">{guide.fullName}</h5>
                                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-950/80 text-teal-300 border border-teal-800/80">
                                        Verified ✓
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                      <span className="text-indigo-400 font-bold">{guide.primaryRegion}</span>
                                      <span>•</span>
                                      <span className="font-mono text-slate-500">{guide.guideId}</span>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[10px] font-bold text-slate-400 block">Experience</span>
                                    <span className="text-xs font-extrabold text-slate-200">{guide.guidingExperience}</span>
                                  </div>
                                </div>

                                {/* Geographic States Coverage */}
                                <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                  <span className="text-slate-500 font-semibold mr-1">States:</span>
                                  {(guide.geographicalKnowledge?.states || []).map((st) => {
                                    const isMatch = (matchedGuidesData.tripStates || []).includes(st);
                                    return (
                                      <span
                                        key={st}
                                        className={`px-2 py-0.5 rounded font-bold ${
                                          isMatch
                                            ? "bg-indigo-950 text-indigo-300 border border-indigo-800/80"
                                            : "bg-slate-800 text-slate-400"
                                        }`}
                                      >
                                        {st}
                                      </span>
                                    );
                                  })}
                                </div>

                                {/* Languages & Availability */}
                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70">
                                  <div>
                                    <span className="text-slate-500 text-[10px] block font-medium">Languages</span>
                                    <span className="font-semibold text-slate-300 truncate block">
                                      {(guide.languages || []).join(", ")}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 text-[10px] block font-medium">Group Size</span>
                                    <span className="font-semibold text-slate-300 truncate block">
                                      {guide.preferredGroupSize || "Any"}
                                    </span>
                                  </div>
                                </div>

                                {/* Bio snippet */}
                                {guide.bio && (
                                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed italic">
                                    "{guide.bio}"
                                  </p>
                                )}
                              </div>

                              {/* Request Button */}
                              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Availability: <span className="text-slate-300 font-bold">{guide.availability}</span>
                                </span>

                                {isAlreadyRequested ? (
                                  <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-emerald-400 border border-slate-700 flex items-center gap-1.5">
                                    <FiCheck size={13} />
                                    <span>Request Sent</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={requestingGuideId === guide.guideId}
                                    onClick={() => handleSendGuideRequest(guide.guideId)}
                                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white transition flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
                                  >
                                    <FiSend size={12} className={requestingGuideId === guide.guideId ? "animate-spin" : ""} />
                                    <span>{requestingGuideId === guide.guideId ? "Sending..." : "Request Guide"}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

      {/* Vendor Selection Confirmation Dialog Modal */}
      {vendorSelectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  CONFIRM VENDOR SELECTION
                </div>
                <h3 className="text-base font-extrabold text-white">
                  Select {vendorSelectionModal.vendorId?.name || "Vendor"}?
                </h3>
              </div>
              <button
                onClick={() => setVendorSelectionModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">Trip:</span>
                <span className="font-bold text-white">{trip.title || "Campus Tour"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Route:</span>
                <span className="font-bold text-white">
                  {fleetVendorsData?.route?.originCity || trip.source} ({fleetVendorsData?.route?.originState || "Origin"}) → {fleetVendorsData?.route?.destinationCity || trip.destination} ({fleetVendorsData?.route?.destinationState || "Destination"})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Dates:</span>
                <span className="font-bold text-white">
                  {trip.startDate ? formatDate(trip.startDate) : "Start"} – {trip.endDate ? formatDate(trip.endDate) : "End"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Travelers:</span>
                <span className="font-bold text-white">
                  {campusFleetPlan?.totalTravelers} ({campusFleetPlan?.studentsCount || 0} students, {campusFleetPlan?.teachersStaffCount || 0} staff)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Required Fleet:</span>
                <span className="font-bold text-white">
                  {campusFleetPlan?.vehiclesRequired}x {campusFleetPlan?.comfort} {campusFleetPlan?.vehicleType}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="font-bold text-indigo-300">Quote:</span>
                <span className="font-black text-emerald-400">
                  ₹{vendorSelectionModal.response?.quote ? vendorSelectionModal.response.quote.toLocaleString("en-IN") : "—"}
                </span>
              </div>
              {vendorSelectionModal.response?.notes && (
                <div className="text-slate-400 italic pt-1 border-t border-slate-800">
                  Notes: "{vendorSelectionModal.response.notes}"
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setVendorSelectionModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectVendorConfirm}
                disabled={selectingVendor}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50"
              >
                {selectingVendor ? "Selecting..." : "Confirm Selection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. OPERATOR CONFIRM VENDOR REQUEST MODAL */}
      {showConfirmRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white">
                  Confirm Vendor Request
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  You are requesting availability and pricing from <strong className="text-indigo-400">{selectedVendorIds.length} connected vendors</strong>.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmRequestModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Trip Requirements */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  TRIP REQUIREMENTS
                </div>
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>{fleetVendorsData?.route?.originCity || trip?.source}</span>
                  <span className="text-slate-500">→</span>
                  <span>{fleetVendorsData?.route?.destinationCity || trip?.destination}</span>
                </div>
                <div className="text-slate-300 font-semibold">
                  {campusFleetPlan?.totalTravelers || trip?.travelers || 20} Travelers
                </div>
                <div className="text-slate-400 text-[11px]">
                  {campusFleetPlan?.studentsCount || trip?.travelers || 20} Students · {campusFleetPlan?.teachersStaffCount || 0} Staff
                </div>
              </div>

              {/* Fleet Requirement */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  FLEET REQUIREMENT
                </div>
                <div className="text-sm font-extrabold text-white">
                  {campusFleetPlan?.vehiclesRequired} × {campusFleetPlan?.comfort} {campusFleetPlan?.vehicleType}
                </div>
                <div className="text-slate-300">
                  Minimum capacity: <strong className="text-white">{campusFleetPlan?.capacityPerVehicle} seats/vehicle</strong>
                </div>
                <div className="text-slate-300">
                  Total capacity required: <strong className="text-emerald-400">{campusFleetPlan?.totalTravelers || trip?.travelers || 20}</strong>
                </div>
              </div>

              {/* Traveler Preferences */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  TRAVELER PREFERENCES
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-slate-300">
                  <div>• {campusFleetPlan?.comfort || "AC"}</div>
                  <div>• {campusFleetPlan?.vehicleType || "Coach"}</div>
                  <div>• Group transport</div>
                  <div>• Driver included</div>
                  <div className="col-span-2">• Multi-day requirement</div>
                </div>
              </div>

              {/* Vendor Response Request */}
              <div className="bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-900/50 space-y-1.5">
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                  VENDOR RESPONSE REQUEST
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-indigo-200">
                  <div className="flex items-center gap-1.5"><FiCheck size={12} className="text-emerald-400" /> Availability</div>
                  <div className="flex items-center gap-1.5"><FiCheck size={12} className="text-emerald-400" /> Vehicle allocation</div>
                  <div className="flex items-center gap-1.5"><FiCheck size={12} className="text-emerald-400" /> Price / quotation</div>
                  <div className="flex items-center gap-1.5"><FiCheck size={12} className="text-emerald-400" /> Notes / conditions</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmRequestModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendVendorRequests}
                disabled={dispatchingRequests}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2"
              >
                <span>{dispatchingRequests ? "Sending Requests..." : "Send Request →"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. OPERATOR 1-TO-1 CHAT MODAL WITH VENDOR */}
      {activeChatModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  OPERATOR ↔ VENDOR CHAT
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {activeChatModalRequest.vendorId?.name || "Vendor"}
                </h3>
                <div className="text-[11px] text-slate-400">
                  {activeChatModalRequest.route?.originCity || trip?.source} → {activeChatModalRequest.route?.destinationCity || trip?.destination} • Group Fleet Request
                </div>
              </div>
              <button
                onClick={() => setActiveChatModalRequest(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-2.5 p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              {loadingChatMessages ? (
                <div className="text-center text-slate-500 py-8">Loading messages...</div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic">
                  No messages yet. Send a message to coordinate with {activeChatModalRequest.vendorId?.name || "the vendor"}.
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isOperator = m.senderRole === "operator";
                  return (
                    <div
                      key={m._id || Math.random()}
                      className={`flex flex-col ${isOperator ? "items-end" : "items-start"}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-0.5">
                        {isOperator ? "Operator (You)" : (m.senderName || "Vendor")}
                      </div>
                      <div
                        className={`p-2.5 rounded-xl max-w-[85%] text-xs ${
                          isOperator
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

            {/* Input form */}
            <form onSubmit={handleSendChatMessage} className="flex gap-2 shrink-0 pt-1">
              <input
                type="text"
                placeholder="Type message..."
                value={chatMessageInput}
                onChange={(e) => setChatMessageInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="submit"
                disabled={sendingChatMessage || !chatMessageInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <span>Send</span>
                <FiSend size={12} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. VIEW RESPONSE DETAILS MODAL */}
      {viewResponseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                  VENDOR RESPONSE DETAILS
                </div>
                <h3 className="text-base font-extrabold text-white">
                  {viewResponseModal.vendorId?.name || "Connected Vendor"}
                </h3>
              </div>
              <button
                onClick={() => setViewResponseModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-white uppercase">{viewResponseModal.status}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Availability:</span>
                <span className="font-extrabold text-emerald-400">
                  {viewResponseModal.response?.availability || "AWAITING RESPONSE"}
                </span>
              </div>

              {viewResponseModal.response?.vehicles && viewResponseModal.response.vehicles.length > 0 && (
                <div className="border-t border-slate-800 pt-2 space-y-1">
                  <span className="text-slate-400 font-bold block">Allocated Vehicles:</span>
                  {viewResponseModal.response.vehicles.map((v, i) => (
                    <div key={i} className="text-white">
                      • {v.count} × {v.category} ({v.seatsPerVehicle} seats each, total {v.totalCapacity} seats)
                    </div>
                  ))}
                </div>
              )}

              {viewResponseModal.response?.quotation && (
                <div className="border-t border-slate-800 pt-2 space-y-1">
                  <span className="text-slate-400 font-bold block">Quotation Breakdown:</span>
                  <div className="flex justify-between">
                    <span>Base Amount:</span>
                    <span className="font-semibold text-white">₹{viewResponseModal.response.quotation.baseAmount?.toLocaleString("en-IN") || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Additional Charges:</span>
                    <span className="font-semibold text-white">₹{viewResponseModal.response.quotation.additionalCharges?.toLocaleString("en-IN") || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-sm font-extrabold text-emerald-400">
                    <span>Total Amount:</span>
                    <span>₹{viewResponseModal.response.quotation.totalAmount?.toLocaleString("en-IN") || 0}</span>
                  </div>
                </div>
              )}

              {viewResponseModal.response?.notes && (
                <div className="border-t border-slate-800 pt-2">
                  <span className="text-slate-400 font-bold block">Notes:</span>
                  <p className="text-slate-300 italic mt-0.5">"{viewResponseModal.response.notes}"</p>
                </div>
              )}

              {viewResponseModal.response?.rejectionReason && (
                <div className="border-t border-slate-800 pt-2 text-rose-400">
                  <span className="font-bold block">Rejection Reason:</span>
                  <p className="mt-0.5">{viewResponseModal.response.rejectionReason}</p>
                  {viewResponseModal.response.rejectionMessage && (
                    <p className="italic text-xs text-rose-300 mt-0.5">"{viewResponseModal.response.rejectionMessage}"</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewResponseModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
