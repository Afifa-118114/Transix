import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiUsers, FiCheckCircle, FiFileText, FiDollarSign, FiCopy, FiShare2, 
  FiBell, FiCalendar, FiClock, FiSettings, FiCheck, FiX, FiInfo,
  FiMapPin, FiEye, FiEdit3, FiPieChart, FiAlertCircle, FiSearch, FiFilter,
  FiSend, FiMessageSquare, FiPlus, FiDownload
} from "react-icons/fi";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import CampusSettingsModal from "../components/campus/CampusSettingsModal";
import TripChatModal from "../components/chat/TripChatModal";
import { getUnreadMessageCount } from "../api/tripApi";
import { generateTripItineraryPdf } from "../utils/itineraryPdfGenerator";

export default function CoordinatorDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showStudentModal, setShowStudentModal] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState("general");
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Coordinator Personal Message Input
  const [coordinatorMessageInput, setCoordinatorMessageInput] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // 1-to-1 Trip Chat with Operator State
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // IV Code Copy & Itinerary PDF Download State
  const [copiedIvCode, setCopiedIvCode] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleCopyIvCode = () => {
    if (!trip?.joinCode) return;
    const code = trip.joinCode;

    const onCopied = () => {
      setCopiedIvCode(true);
      toast.success("IV Code copied", { id: "copy-iv-code", duration: 2500 });
      setTimeout(() => setCopiedIvCode(false), 2500);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(onCopied).catch(() => {
        fallbackCopyText(code, onCopied);
      });
    } else {
      fallbackCopyText(code, onCopied);
    }
  };

  const fallbackCopyText = (text, callback) => {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(el);
      if (successful) callback();
    } catch (err) {
      console.error("Copy fallback failed:", err);
    }
  };

  const handleDownloadItinerary = () => {
    if (!trip) return;
    try {
      setDownloadingPdf(true);
      generateTripItineraryPdf(trip);
      toast.success("Itinerary downloaded", { id: "download-itinerary", duration: 3000 });
    } catch (err) {
      console.error("Itinerary download error:", err);
      toast.error("Failed to generate itinerary PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Document Preview Modal State
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    title: "",
    loading: false,
    error: null,
    blobUrl: null,
    fileType: "pdf",
  });

  const closePreviewModal = () => {
    setPreviewModal((prev) => {
      if (prev.blobUrl) {
        URL.revokeObjectURL(prev.blobUrl);
      }
      return {
        isOpen: false,
        title: "",
        loading: false,
        error: null,
        blobUrl: null,
        fileType: "pdf",
      };
    });
  };

  useEffect(() => {
    return () => {
      if (previewModal.blobUrl) {
        URL.revokeObjectURL(previewModal.blobUrl);
      }
    };
  }, [previewModal.blobUrl]);

  useEffect(() => {
    fetchData();
  }, [id, navigate]);

  // Periodic polling for unread operator messages when chat modal is closed
  useEffect(() => {
    if (!id || isChatModalOpen) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    const interval = setInterval(() => {
      getUnreadMessageCount(id, token)
        .then((res) => {
          if (res?.success) setUnreadCount(res.unreadCount || 0);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [id, isChatModalOpen]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [tripRes, partRes, unreadRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}`, { headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participants`, { headers: { Authorization: `Bearer ${token}` }}),
        getUnreadMessageCount(id, token).catch(() => null)
      ]);

      const tripData = await tripRes.json();
      const partData = await partRes.json();

      if (unreadRes?.success) {
        setUnreadCount(unreadRes.unreadCount || 0);
      }

      if (tripData.success && tripData.relationship === "COORDINATOR") {
        setTrip(tripData.trip);
        setParticipants(partData.participants || []);
      } else {
        navigate("/campus");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sync coordinator message input when student modal opens
  useEffect(() => {
    if (showStudentModal) {
      setCoordinatorMessageInput(showStudentModal.coordinatorMessage?.message || "");
    }
  }, [showStudentModal]);

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
  if (!trip) return <div className="p-10 text-center text-red-500">Trip not found or unauthorized</div>;

  const { registrationSettings: settings = {}, campusConfig = {}, paymentPlanConfig = [] } = trip;

  // Registered students (submitted registration flow)
  const registeredStudents = (participants || []).filter(p => p && p.status !== "DRAFT");
  const totalRegistered = registeredStudents.length;
  const registeredCount = totalRegistered;

  // In-draft participants who have not submitted registration
  const pendingCount = (participants || []).filter(p => p && p.status === "DRAFT").length;

  // Aggregate Metrics per Requirements
  const pendingVerificationCount = registeredStudents.filter(p => (p.coordinatorReview?.status || "PENDING") === "PENDING" && p.status !== "APPROVED").length;
  const underReviewCount = pendingVerificationCount;
  const approvedCount = registeredStudents.filter(p => p.coordinatorReview?.status === "APPROVED" || p.status === "APPROVED").length;
  const rejectedCount = registeredStudents.filter(p => p.coordinatorReview?.status === "REJECTED").length;

  const docsCompleteCount = registeredStudents.filter(p => {
    const reqDocs = trip.documentsConfig?.filter(d => d.required) || [];
    if (reqDocs.length === 0) return true;
    return reqDocs.every(req => p.documents?.some(d => d.documentType === req.name && d.status === "VERIFIED"));
  }).length;
  const docsPendingCount = totalRegistered - docsCompleteCount;

  const confirmationPaidCount = registeredStudents.filter(p => 
    p.confirmationPayment?.status === "PAID" || 
    p.payments?.some(py => py.status === "PAID" && (py.installmentId === "CONFIRMATION" || py.amount === settings.confirmationFee))
  ).length;
  const confirmationPendingCount = totalRegistered - confirmationPaidCount;

  const fullyPaidCount = registeredStudents.filter(p => {
    const totalPaid = p.payments?.filter(py => py.status === "PAID").reduce((sum, py) => sum + py.amount, 0) || 0;
    return totalPaid >= (settings.totalFee || 0) && (settings.totalFee > 0);
  }).length;

  // Canonical Form Fields Preview List
  const defaultBaseFormFields = [
    { name: "name", label: "Full Name", type: "text", required: true },
    { name: "studentId", label: "Student ID / Roll No.", type: "text", required: true },
    { name: "year", label: "Year", type: "select", required: true, options: ["1st Year", "2nd Year", "3rd Year", "4th Year"] },
    { name: "department", label: "Department", type: "select", required: true, options: ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Civil Engineering"] },
    { name: "studentPhone", label: "Student Phone Number", type: "tel", required: true },
    { name: "parentPhone", label: "Parent/Guardian Phone Number", type: "tel", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "emergencyContactName", label: "Emergency Contact Name", type: "text", required: false },
    { name: "emergencyContactNumber", label: "Emergency Contact Number", type: "tel", required: false },
    { name: "emergencyContactRelationship", label: "Emergency Contact Relationship", type: "text", required: false },
    { name: "foodAllergy", label: "Food Allergy / Dietary Restrictions", type: "textarea", required: false },
    { name: "medicalInfo", label: "Medical / Other Important Information", type: "textarea", required: false }
  ];
  const activeFormFields = (settings.formFields && settings.formFields.length > 0) ? settings.formFields : defaultBaseFormFields;

  // Filtered students based on search query and status filter
  const filteredStudents = registeredStudents.filter(student => {
    const name = (student.studentInfo?.name || student.userId?.name || "").toLowerCase();
    const email = (student.studentInfo?.email || student.userId?.email || "").toLowerCase();
    const studentId = (student.studentInfo?.studentId || student.studentInfo?.rollNo || "").toLowerCase();
    const dept = (student.studentInfo?.department || "").toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      name.includes(searchQuery.toLowerCase()) || 
      email.includes(searchQuery.toLowerCase()) || 
      studentId.includes(searchQuery.toLowerCase()) ||
      dept.includes(searchQuery.toLowerCase());

    const reviewStatus = student.coordinatorReview?.status || (student.status === "APPROVED" ? "APPROVED" : "PENDING");
    const matchesFilter = statusFilter === "ALL" || reviewStatus === statusFilter;

    return matchesSearch && matchesFilter;
  });

  // The latest active announcement
  const activeAnnouncements = trip.announcements?.filter(a => a.active).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];
  const latestAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;

  // Handlers
  const handleVerifyDocument = async (regId, docId, status, rejectionReason = null) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/participants/${regId}/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejectionReason })
      });
      const data = await res.json();
      if (res.ok) {
        if (showStudentModal && showStudentModal._id === regId && data.registration) {
          setShowStudentModal(data.registration);
        }
        fetchData(); // Refresh all
      } else {
        alert(data.message || "Error updating document status");
      }
    } catch (err) {
      alert("Error updating document");
    }
  };

  const handlePreviewDocument = async (doc) => {
    const regId = showStudentModal?._id;
    const docId = doc._id;
    if (!regId || !docId) return;

    setPreviewModal({
      isOpen: true,
      title: doc.documentType || "Document Preview",
      loading: true,
      error: null,
      blobUrl: null,
      fileType: doc.fileType || (doc.fileUrl?.toLowerCase().endsWith(".pdf") ? "pdf" : "image"),
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/campus-trips/${trip._id}/participants/${regId}/documents/${docId}/preview`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to load document preview.");
      }

      const contentType = res.headers.get("content-type") || "";
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const isPdf = contentType.includes("pdf") || doc.fileType === "pdf" || doc.fileUrl?.toLowerCase().endsWith(".pdf");

      setPreviewModal({
        isOpen: true,
        title: doc.documentType || "Document Preview",
        loading: false,
        error: null,
        blobUrl,
        fileType: isPdf ? "pdf" : "image",
      });
    } catch (err) {
      setPreviewModal((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load document preview.",
      }));
    }
  };

  const handleApproveStudent = async (regId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/campus-trips/${trip._id}/registrations/${regId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to approve student registration.");
      }
      alert("Student registration approved successfully! The student's participation is now confirmed.");
      if (showStudentModal && showStudentModal._id === regId && data.registration) {
        setShowStudentModal(data.registration);
      }
      await fetchData();
    } catch (err) {
      alert(err.message || "Approval failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStudent = async (regId) => {
    const reason = window.prompt("Please provide the reason for rejection (this will be displayed to the student):");
    if (!reason || !reason.trim()) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/campus-trips/${trip._id}/registrations/${regId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ reason: reason.trim() })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reject registration.");
      }
      alert("Student registration has been rejected with the provided reason.");
      if (showStudentModal && showStudentModal._id === regId && data.registration) {
        setShowStudentModal(data.registration);
      }
      await fetchData();
    } catch (err) {
      alert(err.message || "Rejection failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCoordinatorMessage = async (regId) => {
    if (!coordinatorMessageInput.trim()) {
      alert("Please enter a message to send to the student.");
      return;
    }
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/campus-trips/${trip._id}/registrations/${regId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: coordinatorMessageInput.trim() })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to send coordinator message.");
      }
      alert("Personal message sent to the student successfully!");
      if (showStudentModal && showStudentModal._id === regId && data.registration) {
        setShowStudentModal(data.registration);
      }
      await fetchData();
    } catch (err) {
      alert(err.message || "Failed to send message.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    const message = e.target.message.value;
    if (!message) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        setShowAnnouncementModal(false);
        fetchData();
      }
    } catch (err) {
      alert("Error adding announcement");
    }
  };

  const handleToggleStudentAccess = async (enabled) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/student-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Error updating access");
    }
  };

  // UI Theme matching reference image: very dark blue/navy
  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-screen bg-[#0a101f] text-slate-300 pb-12 font-sans selection:bg-indigo-500/30">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6">
          
          {/* Breadcrumb & Trip Type */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-600/20 text-indigo-400 rounded-full text-xs font-bold border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Campus IV
            </div>
            <div className="px-3 py-1 bg-slate-800/80 text-slate-300 rounded-full text-xs font-semibold border border-slate-700">
              Educational Trip
            </div>
          </div>

          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden mb-4 border border-slate-800 bg-slate-900/50 shadow-2xl">
            {/* Background image effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a101f] via-[#0f172a] to-transparent z-0"></div>
            <img 
              src="https://images.unsplash.com/photo-1593693397690-362cb9666cb2?auto=format&fit=crop&q=80&w=2000" 
              alt="Destination" 
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay z-[-1]"
            />
            
            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                  {trip.organizationDetails?.name || 'Organization'}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <FiMapPin className="text-indigo-400" />
                    <span>{trip.source || 'Origin'} &rarr; {trip.destination}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                    <FiCalendar className="text-indigo-400" />
                    <span>{new Date(trip.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})} &ndash; {new Date(trip.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                    <FiClock className="text-indigo-400" />
                    <span>{trip.itinerary?.length || 0} Days</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-800/60 px-2.5 py-1 rounded-md border border-slate-700/50">
                    <FiUsers className="text-indigo-400" />
                    <span>{campusConfig.expectedParticipants || settings.capacity || '-'} Students</span>
                  </div>
                </div>
              </div>

              {/* IV Code & Operations Communication Block */}
              {trip.status === "Finalized" && (
                <div className="shrink-0 bg-[#131c31] border border-slate-700 p-4 rounded-xl shadow-lg backdrop-blur-md">
                  {trip.joinCode && <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">IV Code</p>}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {trip.joinCode && (
                      <h2 className="text-2xl font-black text-white tracking-widest sm:mr-2">{trip.joinCode}</h2>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {trip.joinCode && (
                        <button 
                          onClick={handleCopyIvCode} 
                          className="flex items-center gap-1.5 p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition cursor-pointer" 
                          title={copiedIvCode ? "Copied!" : "Copy IV Code"}
                        >
                          {copiedIvCode ? (
                            <>
                              <FiCheck className="text-emerald-400" />
                              <span className="text-[10px] font-bold text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <FiCopy className="text-slate-300" />
                          )}
                        </button>
                      )}
                      <button 
                        onClick={handleDownloadItinerary}
                        disabled={downloadingPdf}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-900/50 cursor-pointer disabled:opacity-60"
                        title="Download official finalized trip itinerary PDF"
                      >
                        <FiDownload size={14} />
                        <span>{downloadingPdf ? "Generating..." : "Download Itinerary"}</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsChatModalOpen(true);
                          setUnreadCount(0);
                        }}
                        className="relative flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700 hover:border-indigo-500/70 text-xs font-bold rounded-lg transition shadow-md group"
                        title="Direct chat with Transix Tour Operations"
                      >
                        <FiMessageSquare className="text-indigo-400 group-hover:text-indigo-300" size={14} />
                        <span>Chat with Operator</span>
                        {unreadCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-500 text-white text-[10px] font-black rounded-full animate-pulse shadow-xs">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Announcement Bar */}
          <div className="flex items-center justify-between bg-indigo-50 text-indigo-900 p-3 rounded-xl mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-200 text-indigo-800 p-2 rounded-lg">
                <FiBell />
              </div>
              <span className="font-bold text-sm bg-indigo-100 px-2 py-0.5 rounded text-indigo-800">Announcement</span>
              <span className="text-sm font-medium">
                {latestAnnouncement ? latestAnnouncement.message : "No active announcements."}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              {latestAnnouncement && <span className="text-indigo-700">Posted on {new Date(latestAnnouncement.createdAt).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}</span>}
              <button onClick={() => setShowAnnouncementModal(true)} className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                + New Announcement
              </button>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* LEFT COLUMN (Wider) */}
            <div className="lg:col-span-3 flex flex-col gap-4 md:gap-6">
              
              {/* TOP ROW: Registration Overview & Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                
                {/* Registration Overview Chart */}
                <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FiPieChart className="text-indigo-400" />
                      Registration Overview
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between flex-1">
                    {/* Fake Donut Chart via CSS / SVG */}
                    <div className="relative w-32 h-32 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#2dd4bf" strokeWidth="12" strokeDasharray={`${Math.min((registeredCount / (settings.capacity || 1)) * 251, 251)} 251`} />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{registeredCount} <span className="text-sm text-slate-500">/ {settings.capacity || '-'}</span></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Registered</span>
                      </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex-1 ml-6 space-y-3 text-xs font-semibold">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span> Registered</span>
                        <span className="text-white font-bold">{registeredCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Pending</span>
                        <span className="text-white font-bold">{pendingCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Under Review</span>
                        <span className="text-white font-bold">{underReviewCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2 text-slate-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Rejected</span>
                        <span className="text-white font-bold">{rejectedCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registration Details */}
                <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FiCalendar className="text-indigo-400" />
                      Registration Details
                    </h3>
                    <button onClick={() => { setSettingsModalTab("general"); setShowRegistrationModal(true); }} className="text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-300 transition">Edit Settings</button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Opens</p>
                      <p className="text-sm font-semibold text-white">{settings.openDate ? new Date(settings.openDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Closes</p>
                      <p className="text-sm font-semibold text-white">{settings.closeDate ? new Date(settings.closeDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Confirmation Fee</p>
                      <p className="text-sm font-semibold text-white">₹{settings.confirmationFee?.toLocaleString() || 0} <span className="text-[10px] text-slate-500 font-normal">(at registration)</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Capacity</p>
                      <p className="text-sm font-semibold text-white">{settings.capacity || 'Unlimited'} Students</p>
                    </div>
                  </div>

                  <button onClick={() => { setSettingsModalTab("general"); setShowRegistrationModal(true); }} className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
                    <FiSettings /> Manage Registration
                  </button>
                </div>
              </div>

              {/* MIDDLE ROW: Campus IV Registration Overview */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FiUsers className="text-indigo-400" />
                      Registration Overview
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Real-time status of student registrations, documents, and payments</p>
                  </div>
                  <div className="text-xs text-slate-400 font-semibold">
                    Capacity: <span className="text-white font-bold">{settings.capacity || 'Unlimited'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Total Registered */}
                  <div className="bg-[#0a101f] border border-slate-800 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registered</p>
                    <p className="text-xl font-black text-white mt-1">{totalRegistered}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Submitted registrations</p>
                  </div>

                  {/* Pending Verification */}
                  <div className="bg-[#0a101f] border border-amber-500/20 bg-amber-500/5 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending Review</p>
                    <p className="text-xl font-black text-amber-300 mt-1">{pendingVerificationCount}</p>
                    <p className="text-[10px] text-amber-400/70 mt-0.5">Awaiting verification</p>
                  </div>

                  {/* Approved */}
                  <div className="bg-[#0a101f] border border-emerald-500/20 bg-emerald-500/5 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Approved</p>
                    <p className="text-xl font-black text-emerald-300 mt-1">{approvedCount}</p>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">Confirmed students</p>
                  </div>

                  {/* Rejected */}
                  <div className="bg-[#0a101f] border border-rose-500/20 bg-rose-500/5 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Rejected</p>
                    <p className="text-xl font-black text-rose-300 mt-1">{rejectedCount}</p>
                    <p className="text-[10px] text-rose-400/70 mt-0.5">Needs correction</p>
                  </div>

                  {/* Documents Complete */}
                  <div className="bg-[#0a101f] border border-slate-800 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Docs Complete</p>
                    <p className="text-xl font-black text-white mt-1">{docsCompleteCount} <span className="text-xs text-slate-500 font-normal">/ {totalRegistered}</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{docsPendingCount} pending review</p>
                  </div>

                  {/* Confirmation Paid */}
                  <div className="bg-[#0a101f] border border-slate-800 p-3.5 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirmation Paid</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{confirmationPaidCount} <span className="text-xs text-slate-500 font-normal">/ {totalRegistered}</span></p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{confirmationPendingCount} pending</p>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Registered Students Table */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FiUsers className="text-indigo-400" />
                      Student Registrations ({filteredStudents.length}{filteredStudents.length !== totalRegistered ? ` of ${totalRegistered}` : ''})
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Review student details, verify uploaded documents, and approve registrations.</p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input 
                        type="text"
                        placeholder="Search student, ID, dept..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-[#0a101f] border border-slate-700 text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500 placeholder-slate-500 w-48"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#0a101f] border border-slate-700 rounded-lg p-0.5 text-xs">
                      {["ALL", "PENDING", "APPROVED", "REJECTED"].map(filterVal => (
                        <button
                          key={filterVal}
                          onClick={() => setStatusFilter(filterVal)}
                          className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition ${
                            statusFilter === filterVal 
                              ? "bg-indigo-600 text-white shadow" 
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {filterVal === "ALL" ? "All" : filterVal === "PENDING" ? "Pending" : filterVal === "APPROVED" ? "Approved" : "Rejected"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0a101f]">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Student Details</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Registration</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Documents</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Confirmation Fee</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Coordinator Review</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                            {registeredStudents.length === 0 
                              ? "No students have submitted registration yet." 
                              : "No students match the current search / filter criteria."}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map(student => {
                          const name = student.studentInfo?.name || student.userId?.name || 'Unknown Student';
                          const rollNo = student.studentInfo?.studentId || student.studentInfo?.rollNo;
                          const dept = student.studentInfo?.department;
                          const year = student.studentInfo?.year;
                          const docsUploaded = student.documents?.length || 0;
                          const reqDocs = trip.documentsConfig?.filter(d => d.required) || [];
                          const verifiedDocsCount = student.documents?.filter(d => d.status === "VERIFIED").length || 0;
                          const allVerified = reqDocs.length > 0 && reqDocs.every(req => student.documents?.some(d => d.documentType === req.name && d.status === "VERIFIED"));
                          
                          const isPaid = student.confirmationPayment?.status === "PAID" || 
                            student.payments?.some(py => py.status === "PAID" && (py.installmentId === "CONFIRMATION" || py.amount === settings.confirmationFee));
                          
                          const reviewStatus = student.coordinatorReview?.status || (student.status === "APPROVED" ? "APPROVED" : "PENDING");

                          return (
                            <tr key={student._id} className="hover:bg-slate-800/30 transition">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                                    {name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white text-sm">{name}</div>
                                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                      {rollNo && <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-300">{rollNo}</span>}
                                      {dept && <span>{dept}</span>}
                                      {year && <span>• {year}</span>}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{student.studentInfo?.email || student.userId?.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                  <FiCheckCircle className="shrink-0" />
                                  <span>Submitted</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{new Date(student.createdAt).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`flex items-center gap-1.5 font-semibold ${allVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {allVerified ? <FiCheckCircle className="shrink-0" /> : <FiClock className="shrink-0" />}
                                  <span>{verifiedDocsCount}/{reqDocs.length || student.documents?.length || 0} Verified</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  {allVerified ? 'Ready for approval' : `${docsUploaded} uploaded`}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {isPaid ? <FiCheckCircle className="shrink-0 text-xs" /> : <FiClock className="shrink-0 text-xs" />}
                                  <span>₹{(student.confirmationPayment?.amount || settings.confirmationFee || 0).toLocaleString()} {isPaid ? 'Paid' : 'Pending'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                                  reviewStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  reviewStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {reviewStatus === 'APPROVED' ? <FiCheckCircle className="shrink-0" /> :
                                   reviewStatus === 'REJECTED' ? <FiAlertCircle className="shrink-0" /> :
                                   <FiClock className="shrink-0" />}
                                  <span>{reviewStatus === 'APPROVED' ? 'Approved' : reviewStatus === 'REJECTED' ? 'Rejected' : 'Pending'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => setShowStudentModal(student)}
                                  className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold text-xs transition shadow-sm"
                                >
                                  Review Student
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COMPACT STUDENT REGISTRATION FORM CARD */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiFileText className="text-indigo-400" />
                    Student Registration Form
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Configure the information students must provide during registration.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold">
                    <span className="bg-[#0a101f] border border-slate-800 px-2.5 py-1 rounded-md text-slate-300">
                      {activeFormFields.length} fields configured
                    </span>
                    <span className="bg-[#0a101f] border border-slate-800 px-2.5 py-1 rounded-md text-indigo-400">
                      {activeFormFields.filter(f => f.required).length} required fields
                    </span>
                    <span className="bg-[#0a101f] border border-slate-800 px-2.5 py-1 rounded-md text-slate-400">
                      {trip.documentsConfig?.length || 3} documents configured
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setSettingsModalTab("fields"); setShowRegistrationModal(true); }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-indigo-900/40 shrink-0 cursor-pointer"
                >
                  <FiEdit3 /> Edit Registration Form
                </button>
              </div>

            </div>

            {/* RIGHT COLUMN (Sidebar) */}
            <div className="flex flex-col gap-4 md:gap-6">
              
              {/* Trip & Budget Summary */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiDollarSign className="text-emerald-400" />
                    Trip & Budget Summary
                  </h3>
                  <button 
                    onClick={() => { setSettingsModalTab("payment"); setShowRegistrationModal(true); }}
                    className="text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Edit Budget
                  </button>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-2"><FiFileText /> Total Fee <span className="text-[10px] italic">(per student)</span></span>
                    <span className="font-bold text-white">₹{settings.totalFee?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-2"><FiCheckCircle /> Confirmation Fee</span>
                    <span className="font-bold text-emerald-400">₹{settings.confirmationFee?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-800">
                    <span className="text-slate-400 flex items-center gap-2"><FiPieChart /> Remaining Balance</span>
                    <span className="font-bold text-indigo-400">₹{Math.max(0, (settings.totalFee || 0) - (settings.confirmationFee || 0)).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Payment Plan</h4>
                      <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">
                        {paymentPlanConfig?.length || 3} installments configured
                      </p>
                    </div>
                    <button 
                      onClick={() => { setSettingsModalTab("payment"); setShowRegistrationModal(true); }}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer"
                    >
                      Edit Payment Plan
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-[#0a101f] border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <div>
                          <p className="font-bold text-white">Confirmation Fee</p>
                          <p className="text-[9px] text-slate-500">At Registration</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">₹{settings.confirmationFee?.toLocaleString() || 0}</div>
                      </div>
                    </div>
                    {paymentPlanConfig && paymentPlanConfig.length > 0 ? (
                      paymentPlanConfig.map((inst, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-[#0a101f] border border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="text-indigo-400 font-bold">○</span>
                            <div>
                              <p className="font-bold text-white">{inst.name || `Installment ${i+1}`}</p>
                              <p className="text-[9px] text-slate-500">Due: {inst.dueDate ? new Date(inst.dueDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : 'Not set'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">₹{inst.amount?.toLocaleString() || 0}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-[#0a101f] border border-slate-800 rounded-lg text-center text-[11px] text-slate-500">
                        No installments configured yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sharing Access */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <FiShare2 className="text-indigo-400" />
                  Sharing Access
                </h3>
                
                <div className="space-y-4">
                  {/* Operator */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#0a101f]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><FiUsers /></div>
                      <div>
                        <div className="text-xs font-bold text-white">Operator</div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          {trip.operatorAccess?.enabled ? <><FiCheck /> Shared</> : <span className="text-slate-500">Not Shared</span>}
                        </div>
                      </div>
                    </div>
                    {/* Fake toggle for visual */}
                    <button className="px-3 py-1.5 text-[10px] font-bold border border-slate-700 rounded-md text-slate-300 hover:bg-slate-800">Manage</button>
                  </div>

                  {/* Students */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-[#0a101f]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"><FiUsers /></div>
                      <div>
                        <div className="text-xs font-bold text-white">Students Access</div>
                        <div className={`flex items-center gap-1 text-[10px] font-semibold ${trip.studentAccess?.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {trip.studentAccess?.enabled ? <><FiCheck /> Active</> : <span>Inactive</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleToggleStudentAccess(!trip.studentAccess?.enabled)}
                      className={`px-3 py-1.5 text-[10px] font-bold border rounded-md transition ${trip.studentAccess?.enabled ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10' : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'}`}
                    >
                      {trip.studentAccess?.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <FiSettings className="text-indigo-400" />
                  Quick Actions
                </h3>
                
                <div className="flex flex-col gap-2">
                  <button onClick={() => navigate(`/itinerary/${trip._id}`, { state: { viewOnly: true, trip, dayIndex: 0, relation: "COORDINATOR" }})} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800/50 transition text-left group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-900/40 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition"><FiEye /></div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">View Finalized Itinerary</div>
                      <div className="text-[10px] text-slate-500">Read-only view</div>
                    </div>
                  </button>

                  <button onClick={() => navigate(`/builder?tripId=${trip._id}`)} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800/50 transition text-left group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-900/40 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition"><FiEdit3 /></div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Update Itinerary</div>
                      <div className="text-[10px] text-slate-500">Make changes (opens builder)</div>
                    </div>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* MODALS */}

        {/* Registration Settings Modal */}
        {showRegistrationModal && (
          <CampusSettingsModal
            trip={trip}
            initialTab={settingsModalTab}
            onClose={() => setShowRegistrationModal(false)}
            onRefresh={fetchData}
          />
        )}

        {/* New Announcement Modal */}
        {showAnnouncementModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-black text-white mb-4">Post Announcement</h3>
              <form onSubmit={handleCreateAnnouncement}>
                <textarea 
                  name="message" 
                  rows="4" 
                  placeholder="Type your message here..."
                  className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 mb-4"
                  required
                ></textarea>
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setShowAnnouncementModal(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold">Post Notice</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student Details & Verification Modal */}
        {showStudentModal && (() => {
          const reqDocs = trip.documentsConfig?.filter(d => d.required) || [];
          const unverifiedDocs = reqDocs.filter(req => {
            const uploaded = showStudentModal.documents?.find(d => d.documentType === req.name);
            return !uploaded || uploaded.status !== "VERIFIED";
          });

          const isConfirmationPaid = showStudentModal.confirmationPayment?.status === "PAID" || 
            showStudentModal.payments?.some(py => py.status === "PAID" && (py.installmentId === "CONFIRMATION" || py.amount === settings.confirmationFee));

          const hasStudentDetails = Boolean(showStudentModal.studentInfo?.name || showStudentModal.userId?.name);

          const missingRequirements = [];
          if (!hasStudentDetails) missingRequirements.push("Student personal details");
          if (unverifiedDocs.length > 0) {
            missingRequirements.push(`Verification pending: ${unverifiedDocs.map(d => d.name).join(", ")}`);
          }
          if (!isConfirmationPaid) missingRequirements.push("Confirmation fee payment verification");

          const canApprove = missingRequirements.length === 0;
          const reviewStatus = showStudentModal.coordinatorReview?.status || (showStudentModal.status === "APPROVED" ? "APPROVED" : "PENDING");
          
          const standardKeys = ["name", "studentId", "rollNo", "department", "year", "phone", "studentPhone", "parentPhone", "guardianPhone", "email", "emergencyContact", "foodAllergy", "dietaryRestrictions", "medicalInfo"];
          const customEntries = Object.entries(showStudentModal.studentInfo || {}).filter(
            ([key, val]) => !standardKeys.includes(key) && val !== null && val !== undefined && val !== ""
          );

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-3xl bg-[#131c31] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a101f]">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-white">
                        {showStudentModal.studentInfo?.name || showStudentModal.userId?.name || 'Student Review'}
                      </h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        reviewStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        reviewStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {reviewStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted on {new Date(showStudentModal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowStudentModal(null)} 
                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    <FiX className="text-lg" />
                  </button>
                </div>
                
                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-8">

                  {/* 1. STUDENT DETAILS */}
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                      <FiUsers className="text-indigo-400" />
                      Student Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#0a101f] border border-slate-800/80 p-4 rounded-xl text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Full Name</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.name || showStudentModal.userId?.name || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Student ID / Roll No</p>
                        <p className="font-semibold text-white mt-1 font-mono">{showStudentModal.studentInfo?.studentId || showStudentModal.studentInfo?.rollNo || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Department & Year</p>
                        <p className="font-semibold text-white mt-1">
                          {showStudentModal.studentInfo?.department || '—'} {showStudentModal.studentInfo?.year ? `(${showStudentModal.studentInfo?.year})` : ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Student Phone</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.phone || showStudentModal.studentInfo?.studentPhone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Parent / Guardian Phone</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.parentPhone || showStudentModal.studentInfo?.guardianPhone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Email Address</p>
                        <p className="font-semibold text-white mt-1 break-all">{showStudentModal.studentInfo?.email || showStudentModal.userId?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Emergency Contact</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.emergencyContact || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Dietary Restrictions</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.foodAllergy || showStudentModal.studentInfo?.dietaryRestrictions || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Medical Information</p>
                        <p className="font-semibold text-white mt-1">{showStudentModal.studentInfo?.medicalInfo || 'None'}</p>
                      </div>

                      {/* Custom Fields Configured by Coordinator */}
                      {customEntries.length > 0 && customEntries.map(([key, val]) => (
                        <div key={key}>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
                          <p className="font-semibold text-white mt-1">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 2. DOCUMENT REVIEW & VERIFICATION */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <FiFileText className="text-indigo-400" />
                        Document Verification
                      </h4>
                      <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded text-slate-300 font-semibold">
                        {showStudentModal.documents?.filter(d => d.status === 'VERIFIED').length || 0} of {trip.documentsConfig?.length || showStudentModal.documents?.length || 0} Verified
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      {showStudentModal.documents?.length > 0 ? (
                        showStudentModal.documents.map((doc, i) => {
                          const isVerified = doc.status === 'VERIFIED';
                          const isRejected = doc.status === 'REJECTED';

                          return (
                            <div key={doc._id || i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-[#0a101f] border border-slate-800 gap-4">
                              <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-lg shrink-0 ${
                                  isVerified ? 'bg-emerald-500/20 text-emerald-400' : 
                                  isRejected ? 'bg-rose-500/20 text-rose-400' : 
                                  'bg-amber-500/20 text-amber-400'
                                }`}>
                                  <FiFileText className="text-lg" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-white">{doc.documentType}</div>
                                  <div className="flex items-center gap-2.5 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                      isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                      isRejected ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                                      'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                      {doc.status}
                                    </span>
                                    <button 
                                      onClick={() => handlePreviewDocument(doc)} 
                                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                                    >
                                      <FiEye className="text-xs" /> View Document
                                    </button>
                                  </div>
                                  {isRejected && doc.rejectionReason && (
                                    <p className="text-[11px] text-rose-400 mt-1.5 italic">
                                      Rejection Reason: {doc.rejectionReason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex gap-2 shrink-0">
                                {doc.status !== 'VERIFIED' && (
                                  <button 
                                    onClick={() => handleVerifyDocument(showStudentModal._id, doc._id, 'VERIFIED')} 
                                    className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <FiCheckCircle /> Mark Verified
                                  </button>
                                )}
                                {doc.status !== 'REJECTED' && (
                                  <button 
                                    onClick={() => {
                                      const reason = window.prompt("Reason for document rejection (will be shown to student):");
                                      if (reason && reason.trim()) {
                                        handleVerifyDocument(showStudentModal._id, doc._id, 'REJECTED', reason.trim());
                                      }
                                    }} 
                                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <FiX /> Reject
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 rounded-xl bg-[#0a101f] border border-slate-800 text-center text-xs text-slate-500">
                          No documents uploaded yet.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 3. CONFIRMATION PAYMENT VERIFICATION */}
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                      <FiDollarSign className="text-emerald-400" />
                      Confirmation Payment
                    </h4>
                    <div className="bg-[#0a101f] border border-slate-800 rounded-xl p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Confirmation Amount</p>
                          <p className="text-base font-black text-white mt-0.5">
                            ₹{(showStudentModal.confirmationPayment?.amount || settings.confirmationFee || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Payment Status</p>
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                              isConfirmationPaid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isConfirmationPaid ? <FiCheckCircle /> : <FiClock />}
                              {isConfirmationPaid ? 'PAID' : 'PENDING'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Razorpay Payment ID</p>
                          <p className="font-mono text-xs text-slate-300 mt-1">
                            {showStudentModal.confirmationPayment?.razorpayPaymentId || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Paid Timestamp</p>
                          <p className="text-slate-300 mt-1">
                            {showStudentModal.confirmationPayment?.paidAt 
                              ? new Date(showStudentModal.confirmationPayment.paidAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 4. PERSONAL COORDINATOR MESSAGE */}
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                      <FiMessageSquare className="text-indigo-400" />
                      Personal Message to Student
                    </h4>
                    <div className="bg-[#0a101f] border border-slate-800 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-slate-400">
                        Send individual instructions, reporting times, or reminders visible only on this student's dashboard.
                      </p>
                      <textarea
                        rows="3"
                        placeholder="e.g. Please report to college by 6:30 AM on 17 September. The bus departs at 7:00 AM sharp."
                        value={coordinatorMessageInput}
                        onChange={(e) => setCoordinatorMessageInput(e.target.value)}
                        className="w-full bg-[#131c31] border border-slate-700 text-xs text-white rounded-xl p-3 focus:outline-none focus:border-indigo-500 placeholder-slate-500"
                      />
                      <div className="flex items-center justify-between">
                        {showStudentModal.coordinatorMessage?.updatedAt ? (
                          <span className="text-[11px] text-slate-500">
                            Last updated: {new Date(showStudentModal.coordinatorMessage.updatedAt).toLocaleString()}
                          </span>
                        ) : <span />}
                        <button
                          onClick={() => handleUpdateCoordinatorMessage(showStudentModal._id)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
                        >
                          <FiSend /> Send Message
                        </button>
                      </div>
                    </div>
                  </section>

                  {/* 5. COORDINATOR APPROVAL DECISION */}
                  <section className="p-5 rounded-xl bg-[#0a101f] border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">Coordinator Approval Decision</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enforces verification of student details, required documents, and confirmation payment before approval.
                        </p>
                      </div>
                      <div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          reviewStatus === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          reviewStatus === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {reviewStatus}
                        </span>
                      </div>
                    </div>

                    {/* Pre-approval validation checklist */}
                    <div className="bg-[#131c31] p-3 rounded-lg text-xs space-y-1.5 border border-slate-800">
                      <div className="flex items-center gap-2">
                        {hasStudentDetails ? <FiCheckCircle className="text-emerald-400 text-sm" /> : <FiAlertCircle className="text-amber-400 text-sm" />}
                        <span className={hasStudentDetails ? "text-slate-300" : "text-amber-400"}>Student Details Submitted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {unverifiedDocs.length === 0 ? <FiCheckCircle className="text-emerald-400 text-sm" /> : <FiAlertCircle className="text-amber-400 text-sm" />}
                        <span className={unverifiedDocs.length === 0 ? "text-slate-300" : "text-amber-400"}>
                          All Required Documents Verified {unverifiedDocs.length > 0 && `(Missing: ${unverifiedDocs.map(d => d.name).join(", ")})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isConfirmationPaid ? <FiCheckCircle className="text-emerald-400 text-sm" /> : <FiAlertCircle className="text-amber-400 text-sm" />}
                        <span className={isConfirmationPaid ? "text-slate-300" : "text-amber-400"}>Confirmation Fee Paid (Verified)</span>
                      </div>
                    </div>

                    {!canApprove && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-start gap-2">
                        <FiAlertCircle className="shrink-0 mt-0.5 text-sm" />
                        <div>
                          <p className="font-bold">Cannot approve yet.</p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {missingRequirements.map((req, idx) => (
                              <li key={idx}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {reviewStatus === 'APPROVED' ? (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400">
                        <FiCheckCircle className="text-xl shrink-0" />
                        <div>
                          <p className="font-bold text-sm">Registration Approved</p>
                          <p className="text-xs text-emerald-400/80 mt-0.5">
                            This student has been verified and their participation in this IV is confirmed.
                            {showStudentModal.coordinatorReview?.reviewedAt && (
                              <span> Approved on {new Date(showStudentModal.coordinatorReview.reviewedAt).toLocaleString()}.</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button 
                          onClick={() => handleApproveStudent(showStudentModal._id)}
                          disabled={!canApprove || actionLoading}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 shadow-lg ${
                            canApprove && !actionLoading
                              ? "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                          }`}
                        >
                          <FiCheckCircle /> Approve Student
                        </button>

                        <button 
                          onClick={() => handleRejectStudent(showStudentModal._id)}
                          disabled={actionLoading}
                          className="px-4 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-xl font-bold text-xs transition flex items-center gap-2"
                        >
                          <FiX /> Reject Registration
                        </button>
                      </div>
                    )}
                  </section>

                </div>
              </div>
            </div>
          );
        })()}

        {/* Secure Document Preview Modal */}
        {previewModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-4xl bg-[#131c31] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a101f]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FiFileText className="text-indigo-400" />
                    {previewModal.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Secure Document Preview</p>
                </div>
                <button
                  onClick={closePreviewModal}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 md:p-6 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-[#070b14]">
                {previewModal.loading && (
                  <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs text-slate-400 font-semibold">Decrypting and loading document preview...</p>
                  </div>
                )}

                {previewModal.error && (
                  <div className="text-center py-12 max-w-md">
                    <FiAlertCircle className="text-rose-400 text-3xl mx-auto mb-3" />
                    <p className="text-sm font-bold text-white mb-1">Failed to load preview</p>
                    <p className="text-xs text-rose-400">{previewModal.error}</p>
                  </div>
                )}

                {!previewModal.loading && !previewModal.error && previewModal.blobUrl && (
                  previewModal.fileType === "pdf" ? (
                    <iframe
                      src={previewModal.blobUrl}
                      title={previewModal.title}
                      className="w-full h-[65vh] border-0 rounded-lg bg-slate-900"
                    />
                  ) : (
                    <div className="max-h-[65vh] flex items-center justify-center">
                      <img
                        src={previewModal.blobUrl}
                        alt={previewModal.title}
                        className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  )
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-800 bg-[#0a101f] flex justify-end">
                <button
                  onClick={closePreviewModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1-to-1 Trip Chat Modal with Tour Operator */}
        <TripChatModal
          isOpen={isChatModalOpen}
          onClose={() => {
            setIsChatModalOpen(false);
            const token = localStorage.getItem("token");
            if (token && id) {
              getUnreadMessageCount(id, token)
                .then((res) => {
                  if (res?.success) setUnreadCount(res.unreadCount || 0);
                })
                .catch(() => {});
            }
          }}
          tripId={id}
          currentRole="coordinator"
        />

      </div>
    </DashboardLayout>
  );
}
