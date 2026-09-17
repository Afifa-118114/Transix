import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiUsers, FiCheckCircle, FiFileText, FiDollarSign, FiCopy, FiShare2, 
  FiBell, FiCalendar, FiClock, FiSettings, FiCheck, FiX, FiInfo,
  FiMapPin, FiEye, FiEdit3, FiPieChart, FiAlertCircle
} from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import CampusSettingsModal from "../components/campus/CampusSettingsModal";

export default function CoordinatorDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showStudentModal, setShowStudentModal] = useState(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id, navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [tripRes, partRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}`, { headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participants`, { headers: { Authorization: `Bearer ${token}` }})
      ]);

      const tripData = await tripRes.json();
      const partData = await partRes.json();

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

  if (loading) return <div className="p-10 text-center">Loading Dashboard...</div>;
  if (!trip) return <div className="p-10 text-center text-red-500">Trip not found or unauthorized</div>;

  const { registrationSettings: settings = {}, campusConfig = {}, paymentPlanConfig = [] } = trip;
  
  // Metrics Calculation
  const registeredCount = participants.filter(p => p.status === "REGISTERED" || p.status === "APPROVED").length;
  const pendingCount = participants.filter(p => p.status === "DRAFT").length;
  const underReviewCount = participants.filter(p => p.status === "REGISTERED" && p.documents?.some(d => d.status === "UNDER_REVIEW")).length;
  const rejectedCount = participants.filter(p => p.status === "REJECTED").length;
  
  const documentsCompleteCount = participants.filter(p => p.status !== "DRAFT" && p.documents?.every(d => d.status === "VERIFIED")).length;
  const confirmationPaidCount = participants.filter(p => p.payments?.some(py => py.status === "PAID" && py.amount === settings.confirmationFee)).length;
  
  // Actually, we can check full payments based on totalFee
  const fullyPaidCount = participants.filter(p => {
    const totalPaid = p.payments?.filter(py => py.status === "PAID").reduce((sum, py) => sum + py.amount, 0) || 0;
    return totalPaid >= (settings.totalFee || 0) && (settings.totalFee > 0);
  }).length;

  // The latest active announcement
  const activeAnnouncements = trip.announcements?.filter(a => a.active).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];
  const latestAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;

  // Registered students (only completed registration flow)
  const registeredStudents = participants.filter(p => p.status !== "DRAFT");

  const handleVerifyDocument = async (regId, docId, status, rejectionReason = null) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/participants/${regId}/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejectionReason })
      });
      if (res.ok) {
        fetchData(); // Refresh all
      }
    } catch (err) {
      alert("Error updating document");
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

              {/* IV Code Block */}
              {trip.status === "Finalized" && trip.joinCode && (
                <div className="shrink-0 bg-[#131c31] border border-slate-700 p-4 rounded-xl shadow-lg backdrop-blur-md">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">IV Code</p>
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-white tracking-widest">{trip.joinCode}</h2>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(trip.joinCode)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition" title="Copy">
                        <FiCopy className="text-slate-300" />
                      </button>
                      <button className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-900/50">
                        <FiShare2 />
                        <span>Share with Students</span>
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
                    <button onClick={() => setShowRegistrationModal(true)} className="text-[10px] font-bold uppercase text-indigo-400 hover:text-indigo-300 transition">Edit Settings</button>
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

                  <button onClick={() => setShowRegistrationModal(true)} className="w-full py-2.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
                    <FiSettings /> Manage Registration
                  </button>
                </div>
              </div>

              {/* MIDDLE ROW: Student Participation Metrics */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiUsers className="text-indigo-400" />
                    Student Participation
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Metric 1 */}
                  <div className="bg-[#0a101f] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                      <FiCheck />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Registration Complete</p>
                      <p className="text-base font-black text-white mt-0.5">{registeredCount} <span className="text-xs text-slate-500 font-semibold">/ {settings.capacity || 0}</span></p>
                    </div>
                  </div>
                  {/* Metric 2 */}
                  <div className="bg-[#0a101f] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl shrink-0">
                      <FiFileText />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Documents Complete</p>
                      <p className="text-base font-black text-white mt-0.5">{documentsCompleteCount} <span className="text-xs text-slate-500 font-semibold">/ {registeredCount || 0}</span></p>
                    </div>
                  </div>
                  {/* Metric 3 */}
                  <div className="bg-[#0a101f] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl shrink-0">
                      <FiDollarSign />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Confirmation Paid</p>
                      <p className="text-base font-black text-white mt-0.5">{confirmationPaidCount} <span className="text-xs text-slate-500 font-semibold">/ {registeredCount || 0}</span></p>
                    </div>
                  </div>
                  {/* Metric 4 */}
                  <div className="bg-[#0a101f] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl shrink-0">
                      <FiCheckCircle />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Fully Paid</p>
                      <p className="text-base font-black text-white mt-0.5">{fullyPaidCount} <span className="text-xs text-slate-500 font-semibold">/ {registeredCount || 0}</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM ROW: Registered Students Table */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl shadow-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FiUsers className="text-indigo-400" />
                    Registered Students ({registeredStudents.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#0a101f]">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Student Details</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Registration</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Documents</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Approval</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">Installments</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {registeredStudents.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No registered students yet.</td>
                        </tr>
                      ) : (
                        registeredStudents.map(student => {
                          const name = student.studentInfo?.name || student.userId?.name || 'Unknown';
                          const docsUploaded = student.documents?.length || 0;
                          const docsTotal = trip.documentsConfig?.length || 0;
                          const paidAmount = student.payments?.filter(py => py.status === "PAID").reduce((sum, py) => sum + py.amount, 0) || 0;
                          
                          // Very basic derived logic for UI
                          const isDocsComplete = docsUploaded >= docsTotal && student.documents?.every(d => d.status === "VERIFIED");
                          const isApproved = student.status === "APPROVED";

                          return (
                            <tr key={student._id} className="hover:bg-slate-800/30 transition">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center font-bold">
                                    {name.substring(0,2).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-white">{name}</div>
                                    <div className="text-[10px] text-slate-500">{student.studentInfo?.email || student.userId?.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                                  <FiCheckCircle />
                                  <span>Completed</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{new Date(student.createdAt).toLocaleDateString()}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`flex items-center gap-1.5 font-semibold ${isDocsComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {isDocsComplete ? <FiCheckCircle /> : <FiAlertCircle />}
                                  <span>{docsUploaded}/{docsTotal}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{isDocsComplete ? 'Complete' : 'Pending verification'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className={`flex items-center gap-1.5 font-semibold ${isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {isApproved ? <FiCheckCircle /> : <FiClock />}
                                  <span>{isApproved ? 'Approved' : 'Pending'}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">{isApproved ? 'All good' : 'Awaiting review'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="bg-[#0a101f] border border-slate-700 px-2.5 py-1 rounded-md inline-block">
                                  <span className="font-bold text-emerald-400">₹{paidAmount.toLocaleString()}</span>
                                  <span className="text-slate-500 font-semibold ml-1">paid</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => setShowStudentModal(student)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white font-semibold transition"
                                >
                                  View
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

            </div>

            {/* RIGHT COLUMN (Sidebar) */}
            <div className="flex flex-col gap-4 md:gap-6">
              
              {/* Trip & Budget Summary */}
              <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <FiDollarSign className="text-emerald-400" />
                  Trip & Budget Summary
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-2"><FiFileText /> Total Fee <span className="text-[10px] italic">(per student)</span></span>
                    <span className="font-bold text-white">₹{settings.totalFee?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-2"><FiCheckCircle /> Confirmation Fee</span>
                    <span className="font-bold text-white">₹{settings.confirmationFee?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-800">
                    <span className="text-slate-400 flex items-center gap-2"><FiPieChart /> Remaining Balance</span>
                    <span className="font-bold text-indigo-400">₹{((settings.totalFee || 0) - (settings.confirmationFee || 0)).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 uppercase mb-4">Payment Plan</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Confirmation</span>
                      <div className="text-right">
                        <div className="font-bold text-white">₹{settings.confirmationFee?.toLocaleString() || 0}</div>
                        <div className="text-[9px] text-slate-500">At Registration</div>
                      </div>
                    </div>
                    {paymentPlanConfig.map((inst, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">{inst.name || `Installment ${i+1}`}</span>
                        <div className="text-right">
                          <div className="font-bold text-white">₹{inst.amount.toLocaleString()}</div>
                          <div className="text-[9px] text-slate-500">{new Date(inst.dueDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</div>
                        </div>
                      </div>
                    ))}
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
                  <button onClick={() => navigate(`/itinerary/${trip._id}`, { state: { viewOnly: true, trip, dayIndex: 0 }})} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800/50 transition text-left group">
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

        {/* Student Details Modal */}
        {showStudentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-[#131c31] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0a101f]">
                <h3 className="text-lg font-black text-white">Student Registration Details</h3>
                <button onClick={() => setShowStudentModal(null)} className="text-slate-400 hover:text-white p-2"><FiX /></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8">
                {/* Personal Details */}
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Personal Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Name</p>
                      <p className="text-sm font-semibold text-white">{showStudentModal.studentInfo?.name || showStudentModal.userId?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Email</p>
                      <p className="text-sm font-semibold text-white">{showStudentModal.studentInfo?.email || showStudentModal.userId?.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 mb-1">Registration Date</p>
                      <p className="text-sm font-semibold text-white">{new Date(showStudentModal.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </section>

                {/* Submitted Documents */}
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider flex items-center justify-between">
                    <span>Submitted Documents</span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 normal-case">{showStudentModal.documents?.length || 0} of {trip.documentsConfig?.length || 0} uploaded</span>
                  </h4>
                  
                  <div className="space-y-3">
                    {showStudentModal.documents?.length > 0 ? showStudentModal.documents.map((doc, i) => (
                      <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-[#0a101f] border border-slate-800 gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${doc.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : doc.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            <FiFileText />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{doc.documentType}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${doc.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' : doc.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {doc.status}
                              </span>
                              {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:underline">View File</a>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {doc.status !== 'VERIFIED' && (
                            <button onClick={() => handleVerifyDocument(showStudentModal._id, doc._id, 'VERIFIED')} className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition">Verify</button>
                          )}
                          {doc.status !== 'REJECTED' && (
                            <button onClick={() => {
                              const reason = window.prompt("Reason for rejection:");
                              if(reason) handleVerifyDocument(showStudentModal._id, doc._id, 'REJECTED', reason);
                            }} className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition">Reject</button>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="p-4 rounded-xl bg-[#0a101f] border border-slate-800 text-center text-xs text-slate-500">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>
                </section>

                {/* Coordinator Approval */}
                <section className="p-5 rounded-xl bg-indigo-900/20 border border-indigo-500/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-300 mb-1">Coordinator Approval</h4>
                      <p className="text-[11px] text-indigo-400/70">Approve this student's registration to unlock their remaining installment plan.</p>
                    </div>
                    <div>
                      {showStudentModal.status === "APPROVED" ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold text-sm">
                          <FiCheckCircle /> Registration Approved
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-lg">Approve Registration</button>
                          <button className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition">Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
                
                {/* Payments */}
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Payment Tracking</h4>
                  <div className="space-y-2 bg-[#0a101f] border border-slate-800 rounded-xl p-4">
                    {showStudentModal.payments?.length > 0 ? (
                      showStudentModal.payments.map((py, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-800/50 last:border-0 py-2">
                          <span className="text-slate-300 font-semibold">{py.installmentId || 'Payment'}</span>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-white">₹{py.amount.toLocaleString()}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${py.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                              {py.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 text-center py-2">No payment records found.</div>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
