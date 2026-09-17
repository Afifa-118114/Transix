import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFileText, FiDollarSign, FiMap, FiCheckCircle, FiBell, FiChevronRight, FiUpload } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function ParticipantDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    fetchData();
  }, [id, navigate]);

  async function fetchData() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();

      if (data.success && data.relationship === "PARTICIPANT") {
        setTrip(data.trip);
        setRegistration(data.registration);
        
        // Auto-advance step if previous steps are complete
        if (data.registration?.status) {
           const status = data.registration.status;
           if (["DRAFT", "REGISTERED"].includes(status)) setCurrentStep(1);
           else if (status === "DOCUMENTS_PENDING") setCurrentStep(2);
           else if (status === "PAYMENT_PENDING") setCurrentStep(3);
           else setCurrentStep(4); // Completed
        }

      } else {
        navigate("/campus");
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const studentInfo = {};
    for (let [key, value] of formData.entries()) {
      studentInfo[key] = value;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/registration`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentInfo })
      });
      const data = await res.json();
        if (data.success) {
          setRegistration(data.registration);
          setCurrentStep(2); // Always go to Step 2 for required documents
        } else {
        alert(data.message || "Failed to submit registration");
      }
    } catch (err) {
      alert("Error submitting registration");
    }
  };

  const handleUploadDocument = async (documentType, file) => {
    if (!file) return;
    
    // File validation
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF, JPG or PNG file.");
      return;
    }
    if (documentType.includes('Undertaking') && file.type !== 'application/pdf') {
      alert("Parent Consent / Undertaking Form MUST be a PDF.");
      return;
    }

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // Do NOT set Content-Type, browser sets it with boundary for FormData
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setRegistration(data.registration);
      } else {
        alert(data.message || "Failed to upload document");
      }
    } catch (err) {
      alert("Error uploading document");
    }
  };

  const handlePreviewDocument = async (docId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/documents/${docId}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        alert("Failed to load document preview.");
      }
    } catch (err) {
      alert("Error opening preview.");
    }
  };

  const handleContinueFromDocuments = () => {
    // Validate required documents
    const missingDocs = requiredDocs.filter(doc => doc.required).filter(doc => {
      const uploaded = registration?.documents?.find(d => d.documentType === doc.documentType);
      return !uploaded || (uploaded.status !== 'UPLOADED' && uploaded.status !== 'UNDER_REVIEW' && uploaded.status !== 'VERIFIED');
    });

    if (missingDocs.length > 0) {
      alert(`Please upload the following required documents:\n${missingDocs.map(d => '- ' + d.documentType).join('\n')}`);
      return;
    }

    if (trip.registrationSettings?.confirmationFee > 0) setCurrentStep(3);
    else setCurrentStep(4);
  };

  const handleMockPay = async (isConfirmation = false, installmentId = null) => {
    const url = isConfirmation 
      ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/payments/mock-confirmation`
      : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/payments/${installmentId}`;

    if (isConfirmation) {
      alert("Confirmation payment mock processing...");
      setCurrentStep(4);
      fetchData();
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRegistration(data.registration);
        alert("Payment processed successfully!");
      } else {
        alert(data.message || "Payment failed");
      }
    } catch (err) {
      alert("Error processing payment");
    }
  };

  if (loading) return <div className="p-10 text-center text-white">Loading Dashboard...</div>;
  if (!trip) return <div className="p-10 text-center text-red-500">Trip not found or unauthorized</div>;

  const studentName = registration?.studentInfo?.name || user?.name || "Student";
  const title = `${studentName}'s ${trip.destination} IV Status`;
  
  const defaultFields = [
    { name: 'name', label: 'Full Name', type: 'text', required: true },
    { name: 'rollNo', label: 'Student ID / Roll No.', type: 'text', required: true },
    { name: 'year', label: 'Year', type: 'text', required: true },
    { name: 'department', label: 'Department', type: 'text', required: true },
    { name: 'studentPhone', label: 'Student Phone Number', type: 'text', required: true },
    { name: 'parentPhone', label: 'Parent/Guardian Phone Number', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text', required: false },
    { name: 'emergencyContactNumber', label: 'Emergency Contact Number', type: 'text', required: false },
    { name: 'emergencyContactRelationship', label: 'Emergency Contact Relationship', type: 'text', required: false },
    { name: 'foodAllergy', label: 'Food Allergy / Dietary Restrictions', type: 'textarea', required: false },
    { name: 'medicalInfo', label: 'Medical / Other Important Information', type: 'textarea', required: false }
  ];
  
  const customFields = trip.registrationSettings?.formFields || [];
  
  // Merge defaults with custom. If a custom field overrides a default (by name), use custom.
  const mergedFieldsMap = new Map();
  defaultFields.forEach(f => mergedFieldsMap.set(f.name, f));
  customFields.forEach(f => mergedFieldsMap.set(f.name, f));
  const formFields = Array.from(mergedFieldsMap.values());

  const defaultDocs = [
    { documentType: 'Aadhaar Card', required: true, instruction: 'Upload a clear scan of your Aadhaar Card (PDF/JPG/PNG)' },
    { documentType: 'College ID', required: true, instruction: 'Upload a clear scan of your College ID (PDF/JPG/PNG)' },
    { documentType: 'Parent Consent / Undertaking Form', required: true, isUndertaking: true, instruction: 'Download, print, sign, and upload the completed form (PDF only)' }
  ];
  const customDocs = trip.documentsConfig || [];
  
  const mergedDocsMap = new Map();
  defaultDocs.forEach(d => mergedDocsMap.set(d.documentType, d));
  customDocs.forEach(d => mergedDocsMap.set(d.documentType, { ...mergedDocsMap.get(d.documentType), ...d }));
  const requiredDocs = Array.from(mergedDocsMap.values());
  
  const totalPaid = registration?.payments?.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0) || 0;
  const isFullyCompleted = registration?.status === "COMPLETED";

  const activeAnnouncements = trip.announcements?.filter(a => a.active).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];
  const latestAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;

  return (
    <DashboardLayout trip={trip} setTrip={() => {}}>
      <div className="min-h-screen bg-[#0a101f] text-slate-300 pb-12 font-sans">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-2">
                {title}
              </h1>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-500/30 w-fit">
                {trip.organizationDetails?.name || 'Organization'} &bull; Educational Trip / Industrial Visit
              </div>
            </div>
            <button 
              onClick={() => navigate(`/itinerary/${trip._id}`, { state: { trip, viewOnly: true } })}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-indigo-900/50 flex items-center gap-2 shrink-0"
            >
              <FiMap /> View Itinerary
            </button>
          </div>

          {/* Announcements */}
          {latestAnnouncement && (
            <div className="flex items-center gap-4 bg-indigo-900/40 border border-indigo-500/50 p-4 rounded-xl mb-6 shadow-md">
              <div className="p-2 bg-indigo-600 rounded-lg text-white"><FiBell /></div>
              <div>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Latest Announcement</p>
                <p className="text-sm font-semibold text-indigo-100">{latestAnnouncement.message}</p>
              </div>
            </div>
          )}

          {/* IV Information */}
          <div className="bg-[#131c31] border border-slate-800 p-6 rounded-2xl mb-8 shadow-lg flex flex-wrap gap-x-12 gap-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Source &rarr; Destination</p>
              <p className="text-sm font-black text-white">{trip.source || 'Origin'} &rarr; {trip.destination}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dates</p>
              <p className="text-sm font-bold text-white">
                {new Date(trip.startDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})} &ndash; {new Date(trip.endDate).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-sm font-bold text-white">{trip.duration || `${trip.itinerary?.length || 0} Days`}</p>
            </div>
            {trip.joinCode && (
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IV Code</p>
                <p className="text-sm font-black text-indigo-400 tracking-widest">{trip.joinCode}</p>
              </div>
            )}
          </div>

          {/* If NOT completed, show continuous registration wizard */}
          {!isFullyCompleted ? (
            <div className="bg-[#131c31] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-slate-900 p-6 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Registration Process</h3>
                <div className="flex gap-2">
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></span>
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></span>
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 3 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]' : 'bg-slate-700'}`}></span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                
                {/* STEP 1: Details */}
                {currentStep === 1 && (
                  <form onSubmit={handleRegister} className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 1 &mdash; Student Details
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {formFields.map((field, idx) => (
                        <div key={idx} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          
                          {field.type === 'select' ? (
                            <select 
                              name={field.name} 
                              required={field.required}
                              defaultValue={registration?.studentInfo?.[field.name] || ""}
                              className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            >
                              <option value="" disabled>Select {field.label}</option>
                              {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea 
                              name={field.name} 
                              required={field.required}
                              defaultValue={registration?.studentInfo?.[field.name] || ""}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              rows="3"
                              className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            ></textarea>
                          ) : (
                            <input 
                              type={field.type || 'text'} 
                              name={field.name} 
                              required={field.required}
                              defaultValue={registration?.studentInfo?.[field.name] || ""}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-indigo-500 focus:outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-800 flex justify-end">
                      <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition">
                        Continue to Documents <FiChevronRight />
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: Documents */}
                {currentStep === 2 && (
                  <div className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 2 &mdash; Documents
                    </h4>
                    
                    <div className="space-y-4">
                      {requiredDocs.map((doc, idx) => {
                        const uploaded = registration?.documents?.find(d => d.documentType === doc.documentType);
                        return (
                          <div key={idx} className="flex flex-col p-4 bg-[#0a101f] border border-slate-800 rounded-xl gap-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-white mb-1">{doc.documentType} {doc.required && <span className="text-rose-500">*</span>}</p>
                                <p className="text-[10px] text-slate-400 mb-2">{doc.instruction}</p>
                                <p className={`text-[10px] font-bold uppercase ${uploaded ? (uploaded.status === 'VERIFIED' ? 'text-emerald-500' : 'text-amber-500') : 'text-slate-500'}`}>
                                  {uploaded ? uploaded.status : (doc.required ? "Required" : "Optional")}
                                </p>
                              </div>
                              {doc.isUndertaking && (
                                <a 
                                  href="/undertaking.pdf" 
                                  download 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition border border-slate-700 whitespace-nowrap"
                                >
                                  Download Undertaking Form
                                </a>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <label className={`cursor-pointer px-4 py-2 flex items-center gap-2 text-xs font-bold rounded-lg transition ${uploaded ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                                <FiUpload /> {uploaded ? "Re-upload" : "Select File"}
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept={doc.isUndertaking ? "application/pdf" : "application/pdf,image/jpeg,image/png"} 
                                  onChange={(e) => handleUploadDocument(doc.documentType, e.target.files[0])}
                                />
                              </label>
                              {uploaded && uploaded.fileUrl && (
                                <button 
                                  onClick={(e) => { e.preventDefault(); handlePreviewDocument(uploaded._id); }}
                                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition"
                                >
                                  Preview
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-800 flex justify-between">
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 text-slate-400 hover:text-white font-bold transition flex items-center gap-2"
                      >
                        <FiChevronRight className="rotate-180" /> Back
                      </button>
                      <button 
                        onClick={handleContinueFromDocuments}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition"
                      >
                        Continue to Payment <FiChevronRight />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirmation Payment */}
                {currentStep === 3 && (
                  <div className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 3 &mdash; Confirmation Payment
                    </h4>
                    
                    <div className="p-8 bg-[#0a101f] border border-slate-800 rounded-xl text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-400 text-2xl mb-4">
                        <FiDollarSign />
                      </div>
                      <p className="text-sm font-semibold text-slate-400 mb-2">Total Trip Fee: ₹{trip.registrationSettings?.totalFee?.toLocaleString()}</p>
                      <h2 className="text-3xl font-black text-white mb-2">₹{trip.registrationSettings?.confirmationFee?.toLocaleString()}</h2>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-8">Required to confirm participation</p>
                      <div className="flex gap-4 w-full justify-center">
                        <button 
                          onClick={() => setCurrentStep(2)}
                          className="px-6 py-3 text-slate-400 hover:text-white font-bold transition flex items-center gap-2"
                        >
                          <FiChevronRight className="rotate-180" /> Back
                        </button>
                        <button 
                          onClick={() => handleMockPay(true)}
                          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition md:w-auto"
                        >
                          Pay ₹{trip.registrationSettings?.confirmationFee?.toLocaleString()} Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            
            /* AFTER REGISTRATION - STATUS VIEW */
            <div className="space-y-6 animate-fade-in">
              <div className="p-8 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl text-center">
                <FiCheckCircle className="text-5xl text-emerald-400 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-tight mb-2">Registration Complete</h2>
                <p className="text-emerald-100/70 text-sm font-medium">Your participation in this IV has been confirmed.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Checklists */}
                <div className="col-span-1 bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FiCheckCircle className="text-indigo-400"/> Registration</h4>
                    <p className="text-sm font-bold text-white">✓ Details Submitted</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FiFileText className="text-indigo-400"/> Documents</h4>
                    <p className="text-sm font-bold text-white">✓ All Required Uploaded</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><FiDollarSign className="text-indigo-400"/> Confirmation</h4>
                    <p className="text-sm font-bold text-white">✓ Confirmation Fee Paid</p>
                  </div>
                </div>

                {/* Payments */}
                <div className="col-span-1 md:col-span-2 bg-[#131c31] border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col">
                   <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                     <FiDollarSign className="text-indigo-400"/> Payment Status
                   </h3>
                   
                   <div className="grid grid-cols-3 gap-4 mb-8">
                     <div className="bg-[#0a101f] p-4 rounded-xl border border-slate-800">
                       <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Fee</p>
                       <p className="text-lg font-black text-white">₹{trip.registrationSettings?.totalFee?.toLocaleString()}</p>
                     </div>
                     <div className="bg-emerald-900/10 p-4 rounded-xl border border-emerald-900/30">
                       <p className="text-[10px] font-bold text-emerald-500/70 uppercase mb-1">Paid</p>
                       <p className="text-lg font-black text-emerald-400">₹{totalPaid.toLocaleString()}</p>
                     </div>
                     <div className="bg-rose-900/10 p-4 rounded-xl border border-rose-900/30">
                       <p className="text-[10px] font-bold text-rose-500/70 uppercase mb-1">Remaining</p>
                       <p className="text-lg font-black text-rose-400">₹{Math.max(0, (trip.registrationSettings?.totalFee || 0) - totalPaid).toLocaleString()}</p>
                     </div>
                   </div>

                   <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Payment Plan</h4>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center p-3 bg-[#0a101f] border border-slate-800 rounded-lg">
                        <div>
                          <p className="text-xs font-bold text-white uppercase">Confirmation Fee</p>
                          <p className="text-[10px] text-emerald-500 font-bold mt-1">PAID</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white">₹{trip.registrationSettings?.confirmationFee?.toLocaleString()}</p>
                        </div>
                     </div>
                     
                     {trip.paymentPlanConfig?.map((inst, i) => {
                        const pRecord = registration?.payments?.find(p => p.name === inst.name || p.installmentId === inst._id);
                        const isPaid = pRecord?.status === "PAID";
                        return (
                          <div key={i} className="flex justify-between items-center p-3 bg-[#0a101f] border border-slate-800 rounded-lg">
                            <div>
                              <p className="text-xs font-bold text-white uppercase">{inst.name}</p>
                              <p className={`text-[10px] font-bold mt-1 ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {isPaid ? 'PAID' : `Due: ${new Date(inst.dueDate).toLocaleDateString('en-GB', {day:'numeric', month:'short'})}`}
                              </p>
                            </div>
                            <div className="text-right flex items-center gap-4">
                              <p className="text-sm font-black text-white">₹{inst.amount.toLocaleString()}</p>
                              {!isPaid && (
                                <button onClick={() => handleMockPay(false, pRecord?._id || inst._id)} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded shadow-md">
                                  PAY
                                </button>
                              )}
                            </div>
                          </div>
                        )
                     })}
                   </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
