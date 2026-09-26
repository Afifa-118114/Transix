import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiFileText, FiDollarSign, FiMap, FiCheckCircle, FiBell, FiChevronRight, FiUpload, FiX, FiAlertCircle, FiClock, FiMail, FiPhone, FiMessageSquare, FiInfo, FiCompass, FiBriefcase, FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import StudentAnnouncementMarquee from "../components/campus/StudentAnnouncementMarquee";
import { generateTripItineraryPdf } from "../utils/itineraryPdfGenerator";

export default function ParticipantDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentStep, setCurrentStep] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const handlePreviewDocument = async (uploadedDoc) => {
    if (!uploadedDoc || !uploadedDoc._id) return;

    if (previewModal.blobUrl) {
      URL.revokeObjectURL(previewModal.blobUrl);
    }

    setPreviewModal({
      isOpen: true,
      title: uploadedDoc.documentType || "Document Preview",
      loading: true,
      error: null,
      blobUrl: null,
      fileType: "pdf",
    });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/documents/${uploadedDoc._id}/preview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        let errMsg = `Failed to load document preview (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson.message) errMsg = errJson.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const contentType = blob.type || res.headers.get("content-type") || "";
      const isImg = contentType.startsWith("image/") || (uploadedDoc.fileUrl && /\.(png|jpe?g|webp)$/i.test(uploadedDoc.fileUrl));

      const objectUrl = URL.createObjectURL(blob);
      setPreviewModal({
        isOpen: true,
        title: uploadedDoc.documentType || "Document Preview",
        loading: false,
        error: null,
        blobUrl: objectUrl,
        fileType: isImg ? "image" : "pdf",
      });
    } catch (err) {
      setPreviewModal({
        isOpen: true,
        title: uploadedDoc.documentType || "Document Preview",
        loading: false,
        error: err.message || "Failed to load document preview.",
        blobUrl: null,
        fileType: "pdf",
      });
    }
  };

  const handleContinueFromDocuments = () => {
    // Validate required documents
    const missingDocs = requiredDocs.filter(doc => doc.required).filter(doc => {
      const uploaded = registration?.documents?.find(d => 
        d.documentType === doc.documentType ||
        (doc.documentType.includes('Parent Consent') && (d.documentType?.includes('Parent Consent') || d.documentType?.includes('Undertaking')))
      );
      return !uploaded || (uploaded.status !== 'UPLOADED' && uploaded.status !== 'UNDER_REVIEW' && uploaded.status !== 'VERIFIED');
    });

    if (missingDocs.length > 0) {
      alert(`Please upload the following required documents:\n${missingDocs.map(d => '- ' + d.documentType).join('\n')}`);
      return;
    }

    setCurrentStep(3);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayConfirmationPayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay Checkout SDK. Please check your internet connection.");
      }

      const token = localStorage.getItem("token");
      const orderRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || "Failed to initialize payment order");
      }

      const options = {
        key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "TRANSIX",
        description: "Campus IV Confirmation Fee",
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            setPaymentLoading(true);
            const verifyRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/payment/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.message || "Payment signature verification failed. Registration not completed.");
            }

            setRegistration(verifyData.registration);
            setCurrentStep(4);
            await fetchData();
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            setPaymentError(verifyErr.message || "Error verifying payment signature");
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: registration?.studentInfo?.name || user?.name || "",
          email: registration?.studentInfo?.email || user?.email || "",
          contact: registration?.studentInfo?.studentPhone || ""
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
            setPaymentError("Payment cancelled. You can try again.");
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setPaymentLoading(false);
        setPaymentError(response.error?.description || "Payment failed. Your registration has not been completed.");
      });
      rzp.open();
    } catch (err) {
      console.error("Checkout initiation error:", err);
      setPaymentLoading(false);
      setPaymentError(err.message || "Failed to start payment checkout");
    }
  };

  const handleMockPay = async (installmentId) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${id}/participant/payments/${installmentId}`;

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
  
  const customFields = trip.registrationSettings?.formFields;
  const formFields = (customFields && customFields.length > 0) ? customFields : defaultFields;

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
  
  const confirmationFeeAmount = (trip.registrationSettings?.confirmationFee !== undefined && trip.registrationSettings?.confirmationFee !== null && trip.registrationSettings?.confirmationFee > 0)
    ? trip.registrationSettings.confirmationFee
    : 1000;

  const isConfirmationPaid = registration?.confirmationPayment?.status === "PAID" || 
    registration?.payments?.some(p => (p.name === "Confirmation Fee" || p.installmentId === "CONFIRMATION") && p.status === "PAID");

  const totalPaid = (registration?.payments?.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0) || 0) +
    (isConfirmationPaid && !registration?.payments?.some(p => (p.name === "Confirmation Fee" || p.installmentId === "CONFIRMATION") && p.status === "PAID") ? (registration?.confirmationPayment?.amount || confirmationFeeAmount) : 0);

  const coordinatorStatus = registration?.coordinatorReview?.status || "PENDING";
  const isApproved = coordinatorStatus === "APPROVED" || registration?.status === "COMPLETED";
  const isRejected = coordinatorStatus === "REJECTED" || registration?.status === "REJECTED";
  const isPendingReview = !isApproved && !isRejected;

  // Registration is only submitted once details, docs, and payment are completely verified
  const isRegistrationSubmitted = ["UNDER_REVIEW", "COMPLETED"].includes(registration?.status) || 
    (registration?.status === "REJECTED") ||
    (currentStep === 4 && isConfirmationPaid);

  const canonicalInstallmentNames = ["1st Installment", "2nd Installment", "Final Installment"];
  const configuredPaymentPlan = trip.paymentPlanConfig && trip.paymentPlanConfig.length === 3
    ? trip.paymentPlanConfig
    : canonicalInstallmentNames.map((name, idx) => {
        const existing = trip.paymentPlanConfig?.find(inst => inst.name === name) || trip.paymentPlanConfig?.[idx];
        return {
          name,
          amount: existing?.amount ?? 0,
          dueDate: existing?.dueDate || null
        };
      });

  const activeAnnouncements = trip.announcements?.filter(a => a.active).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];
  const latestAnnouncement = activeAnnouncements.length > 0 ? activeAnnouncements[0] : null;

  const getFieldValue = (name) => {
    if (!registration?.studentInfo) return "";
    const info = registration.studentInfo;
    if (info[name] !== undefined && info[name] !== null) return info[name];
    if (name === 'studentId' && info.rollNo) return info.rollNo;
    if (name === 'rollNo' && info.studentId) return info.studentId;
    if (name === 'studentPhone' && info.phone) return info.phone;
    if (name === 'phone' && info.studentPhone) return info.studentPhone;
    return "";
  };

  return (
    <DashboardLayout trip={trip} setTrip={() => {}}>
      <div className="w-full text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-12 font-sans">
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                {title}
              </h1>
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30 w-fit">
                {trip.organizationDetails?.name || 'Organization'} &bull; Educational Trip / Industrial Visit
              </div>
            </div>

            {/* View & Download Finalized Itinerary Action Buttons */}
            <div className="flex items-center gap-3 sm:gap-3.5 shrink-0">
              <button 
                onClick={() => navigate(`/itinerary/${trip._id}`, { state: { trip, viewOnly: true, relation: "PARTICIPANT" } })}
                className="h-10 px-4 py-2.5 bg-white dark:bg-indigo-600/20 hover:bg-slate-50 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-indigo-500/30 rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap transition shadow-xs cursor-pointer"
                title="View complete finalized itinerary"
              >
                <FiMap size={14} /> View Itinerary
              </button>
              <button 
                onClick={handleDownloadItinerary}
                disabled={downloadingPdf}
                className="h-10 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap transition shadow-sm cursor-pointer disabled:opacity-60"
                title="Download official finalized trip itinerary PDF"
              >
                <FiDownload size={14} /> {downloadingPdf ? "Generating..." : "Download Itinerary"}
              </button>
            </div>
          </div>

          {/* Animated Announcement Marquee */}
          <StudentAnnouncementMarquee announcements={trip.announcements || []} />

          {/* Banner: IV Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Destination</p>
              <p className="text-base font-black text-slate-900 dark:text-white truncate">{trip.destination}</p>
            </div>
            <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Duration</p>
              <p className="text-base font-black text-slate-900 dark:text-white">{trip.duration || `${trip.itinerary?.length || 0} Days`}</p>
            </div>
            <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Dates</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBD'} - {trip.endDate ? new Date(trip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
              </p>
            </div>
            {trip.joinCode && (
              <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">IV Code</p>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 tracking-widest">{trip.joinCode}</p>
              </div>
            )}
          </div>

          {/* If NOT submitted/completed, show continuous registration wizard */}
          {(!isRegistrationSubmitted || (isRejected && currentStep === 2)) ? (
            <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 dark:bg-slate-900 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Registration Process</h3>
                <div className="flex gap-2">
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 1 ? 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 2 ? 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                  <span className={`w-3 h-3 rounded-full ${currentStep >= 3 ? 'bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-200 dark:bg-slate-700'}`}></span>
                </div>
              </div>

              <div className="p-6 md:p-8">
                
                {/* STEP 1: Details */}
                {currentStep === 1 && (
                  <form onSubmit={handleRegister} className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 1 &mdash; Student Details
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {formFields.map((field, idx) => (
                        <div key={idx} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">
                            {field.label} {field.required && <span className="text-rose-500">*</span>}
                          </label>
                          
                          {field.type === 'select' ? (
                            <select 
                              name={field.name} 
                              required={field.required}
                              defaultValue={getFieldValue(field.name)}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none transition"
                            >
                              <option value="" disabled>Select {field.label}</option>
                              {field.options?.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.type === 'textarea' ? (
                            <textarea 
                              name={field.name} 
                              required={field.required}
                              defaultValue={getFieldValue(field.name)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              rows="3"
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none transition"
                            ></textarea>
                          ) : (
                            <input 
                              type={field.type || 'text'} 
                              name={field.name} 
                              required={field.required}
                              defaultValue={getFieldValue(field.name)}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none transition"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                      <button type="submit" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-xs cursor-pointer">
                        Continue to Documents <FiChevronRight />
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: Documents */}
                {currentStep === 2 && (
                  <div className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 2 &mdash; Documents
                    </h4>
                    
                    <div className="space-y-4">
                      {requiredDocs.map((doc, idx) => {
                        const uploaded = registration?.documents?.find(d => d.documentType === doc.documentType);
                        return (
                          <div key={idx} className="flex flex-col p-4 bg-slate-50/70 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{doc.documentType} {doc.required && <span className="text-rose-500">*</span>}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">{doc.instruction}</p>
                                <p className={`text-[10px] font-bold uppercase ${uploaded ? (uploaded.status === 'VERIFIED' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400') : 'text-slate-400'}`}>
                                  {uploaded ? uploaded.status : (doc.required ? "Required" : "Optional")}
                                </p>
                              </div>
                              {doc.isUndertaking && (
                                <a 
                                  href="/undertaking.pdf" 
                                  download 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs"
                                >
                                  Download Undertaking Form
                                </a>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <label className={`cursor-pointer px-4 py-2 flex items-center gap-2 text-xs font-bold rounded-lg transition ${uploaded ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
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
                                  onClick={(e) => { e.preventDefault(); handlePreviewDocument(uploaded); }}
                                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-bold rounded-lg transition border border-slate-200 dark:border-slate-600"
                                >
                                  View Uploaded
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between">
                      <button 
                        onClick={() => setCurrentStep(1)}
                        className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition flex items-center gap-2 cursor-pointer"
                      >
                        <FiChevronRight className="rotate-180" /> Back
                      </button>
                      <button 
                        onClick={handleContinueFromDocuments}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition shadow-xs cursor-pointer"
                      >
                        Continue to Payment <FiChevronRight />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Confirmation Payment */}
                {currentStep === 3 && (
                  <div className="animate-fade-in space-y-6">
                    <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                      Step 3 &mdash; Confirmation Payment
                    </h4>
                    
                    <div className="p-8 bg-slate-50/70 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl mb-4 border border-indigo-100 dark:border-indigo-800/40">
                        <FiDollarSign />
                      </div>

                      {/* Fee Breakdown Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl mb-6">
                        <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-xs">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirmation Fee</p>
                          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">₹{confirmationFeeAmount.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-xs">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Trip Fee</p>
                          <p className="text-xl font-black text-slate-900 dark:text-white">₹{(trip.registrationSettings?.totalFee || 0).toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-xs">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Remaining After Confirmation</p>
                          <p className="text-xl font-black text-amber-600 dark:text-amber-400">₹{Math.max(0, (trip.registrationSettings?.totalFee || 0) - confirmationFeeAmount).toLocaleString()}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                        Pay the confirmation fee using Razorpay Test Checkout to complete your student registration. Remaining balance will be payable in upcoming installments.
                      </p>

                      {/* Payment Error / Cancellation Notice */}
                      {paymentError && (
                        <div className="w-full max-w-xl p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 text-left mb-6">
                          <FiAlertCircle className="text-rose-500 text-xl flex-shrink-0" />
                          <div className="flex-1 font-medium">{paymentError}</div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 w-full justify-center">
                        <button 
                          onClick={() => setCurrentStep(2)}
                          disabled={paymentLoading}
                          className="px-6 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                          <FiChevronRight className="rotate-180" /> Back
                        </button>
                        <button 
                          onClick={handleRazorpayConfirmationPayment}
                          disabled={paymentLoading}
                          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 md:w-auto cursor-pointer"
                        >
                          {paymentLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Processing...
                            </>
                          ) : (
                            `Pay ₹${confirmationFeeAmount.toLocaleString()} & Complete Registration`
                          )}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* Single Compact Registration Complete / Status Card */}
                <div className="col-span-1 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs h-fit space-y-5">
                  {/* Status Header Block */}
                  {isApproved ? (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                        <FiCheckCircle />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                          Registration Complete
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                          Your participation in this IV has been confirmed.
                        </p>
                      </div>
                    </div>
                  ) : isRejected ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
                          <FiAlertCircle />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                            Registration Needs Attention
                          </h3>
                          <p className="text-xs text-rose-600 dark:text-rose-200/90 mt-0.5 leading-snug">
                            Your registration could not be approved yet.
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-left">
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Reason for Rejection</p>
                        <p className="text-xs font-semibold text-rose-900 dark:text-rose-100">{registration?.coordinatorReview?.rejectionReason || "Please review and re-upload required documents."}</p>
                      </div>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Update Required Information
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
                        <FiClock />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                          Registration Submitted
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                          Your registration has been successfully submitted and is awaiting coordinator verification.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Registration Checklist */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-2">
                      <FiCheckCircle className="text-indigo-600 dark:text-indigo-400"/> Registration Checklist
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 dark:text-white">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">✓</span>
                        <span>Details Submitted</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 dark:text-white">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">✓</span>
                        <span>{isApproved ? 'Required Documents Verified' : 'Required Documents Submitted'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold text-slate-900 dark:text-white">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isConfirmationPaid ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                          {isConfirmationPaid ? '✓' : '⏳'}
                        </span>
                        <span className={isConfirmationPaid ? 'text-slate-900 dark:text-white' : 'text-amber-600 dark:text-amber-400'}>
                          {isConfirmationPaid 
                            ? `Confirmation Fee Paid (₹${confirmationFeeAmount.toLocaleString()})`
                            : `Confirmation Fee Pending (₹${confirmationFeeAmount.toLocaleString()})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs font-bold">
                        {isApproved ? (
                          <>
                            <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">✓</span>
                            <span className="text-indigo-600 dark:text-indigo-400">Coordinator Approved</span>
                          </>
                        ) : isRejected ? (
                          <>
                            <span className="w-5 h-5 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center text-[10px]">✕</span>
                            <span className="text-rose-600 dark:text-rose-400">Action Required</span>
                          </>
                        ) : (
                          <>
                            <span className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px]">⏳</span>
                            <span className="text-amber-600 dark:text-amber-400">Coordinator Approval Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Footer */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                    Status: <span className={`font-bold ${isApproved ? 'text-indigo-600 dark:text-indigo-400' : isRejected ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {isApproved ? 'Participation Confirmed' : isRejected ? 'Needs Revision' : 'Awaiting Coordinator Verification'}
                    </span>
                  </div>
                </div>

                {/* Payment & Installment Status */}
                <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col">
                   <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                     <FiDollarSign className="text-indigo-600 dark:text-indigo-400"/> Payment & Installment Status
                   </h3>
                   
                   <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="bg-slate-50 dark:bg-[#0a101f] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                       <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Fee</p>
                       <p className="text-lg font-black text-slate-900 dark:text-white">₹{trip.registrationSettings?.totalFee?.toLocaleString() || 0}</p>
                     </div>
                     <div className="bg-indigo-50/80 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/30">
                       <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase mb-1">Paid</p>
                       <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">₹{totalPaid.toLocaleString()}</p>
                     </div>
                     <div className="bg-rose-50/80 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/30">
                       <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase mb-1">Remaining</p>
                       <p className="text-lg font-black text-rose-600 dark:text-rose-400">₹{Math.max(0, (trip.registrationSettings?.totalFee || 0) - totalPaid).toLocaleString()}</p>
                     </div>
                   </div>

                   <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Payment Plan</h4>
                   <div className="space-y-2.5">
                     {/* Section 1: Confirmation Fee */}
                     <div className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">Confirmation Fee</p>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">At Registration</span>
                          </div>
                          <p className={`text-[10px] font-bold mt-1 ${isConfirmationPaid ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {isConfirmationPaid ? '✓ PAID VIA RAZORPAY' : 'AWAITING PAYMENT'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 dark:text-white">₹{trip.registrationSettings?.confirmationFee?.toLocaleString() || 0}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                            isConfirmationPaid ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                          }`}>
                            {isConfirmationPaid ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                     </div>
                     
                     {/* Sections 2-4: 1st, 2nd, Final Installments */}
                     {configuredPaymentPlan.map((inst, i) => {
                        const pRecord = registration?.payments?.find(p => p.name === inst.name || (inst._id && p.installmentId === inst._id));
                        const isPaid = pRecord?.status === "PAID";
                        const dueDateObj = inst.dueDate ? new Date(inst.dueDate) : null;
                        const isOverdue = !isPaid && dueDateObj && dueDateObj < new Date();
                        const formattedDate = dueDateObj ? dueDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set';

                        return (
                          <div key={i} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl">
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{inst.name}</p>
                              <p className={`text-[10px] font-bold mt-1 ${
                                isPaid 
                                  ? 'text-indigo-600 dark:text-indigo-400' 
                                  : isOverdue 
                                  ? 'text-rose-600 dark:text-rose-400' 
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                {isPaid ? '✓ PAID' : isOverdue ? `OVERDUE (Due: ${formattedDate})` : `UPCOMING (Due: ${formattedDate})`}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900 dark:text-white">₹{inst.amount?.toLocaleString() || 0}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                                isPaid 
                                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20' 
                                  : isOverdue 
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20' 
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                              </span>
                            </div>
                          </div>
                        );
                     })}
                   </div>
                </div>

              </div>

              {/* Document Status Section */}
              <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FiFileText className="text-indigo-600 dark:text-indigo-400" /> Student Document Status
                  </h3>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    {registration?.documents?.length || 0} Uploaded
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {requiredDocs.map((docItem, idx) => {
                    const uploaded = registration?.documents?.find(d => d.documentType === docItem.documentType);
                    const docStatus = uploaded?.status || "NOT_UPLOADED";
                    const isVerified = docStatus === "VERIFIED";
                    const isDocRejected = docStatus === "REJECTED";

                    return (
                      <div key={idx} className="p-4 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">{docItem.documentType}</h4>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase shrink-0 ${
                              isVerified ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                              isDocRejected ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                              uploaded ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                              'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isVerified ? 'Verified' : isDocRejected ? 'Rejected' : uploaded ? 'Submitted / Pending' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">{docItem.instruction || 'Required student document'}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center">
                          {uploaded ? (
                            <button
                              onClick={() => handlePreviewDocument(uploaded)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-[11px] font-bold rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              View Uploaded
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-semibold">Not uploaded</span>
                          )}
                          {isDocRejected && uploaded?.rejectionReason && (
                            <span className="text-[10px] text-rose-500 dark:text-rose-400 italic truncate max-w-[120px]" title={uploaded.rejectionReason}>
                              {uploaded.rejectionReason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Message from Coordinator & Before You Travel Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Message from Coordinator */}
                <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FiMessageSquare className="text-indigo-600 dark:text-indigo-400" /> Message from Coordinator
                    </h3>
                    
                    {registration?.coordinatorMessage?.message ? (
                      <div className="p-4 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                        <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold">Hi {studentName},</p>
                        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {registration.coordinatorMessage.message}
                        </p>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center text-[10px] text-slate-400">
                          <span>&mdash; {trip.coordinatorId?.name || "Trip Coordinator"}</span>
                          {registration.coordinatorMessage.updatedAt && (
                            <span>{new Date(registration.coordinatorMessage.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 italic">
                        No personal notes from your coordinator yet. Please refer to announcements for trip-wide notifications.
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{trip.coordinatorId?.name || 'Coordinator'}</span>
                    <a
                      href={`mailto:${trip.coordinatorId?.email || 'coordinator@transix.com'}`}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-lg transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
                    >
                      <FiMail /> Contact Coordinator
                    </a>
                  </div>
                </div>

                {/* Before You Travel */}
                <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FiBriefcase className="text-indigo-600 dark:text-indigo-400" /> Before You Travel
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Reporting Date & Time</p>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {new Date(trip.startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Reporting Location</p>
                        <p className="font-bold text-slate-900 dark:text-white">{trip.source || 'College Campus / Main Assembly Point'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Things to Carry</p>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          Valid College ID card, printed Parent Consent/Undertaking form, personal medications, and appropriate clothing.
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Emergency Contact</p>
                        <p className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {registration?.studentInfo?.emergencyContactName || 'Guardian'} ({registration?.studentInfo?.emergencyContactNumber || registration?.studentInfo?.parentPhone || 'On File'})
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center gap-1">
                    <FiInfo className="text-indigo-600 dark:text-indigo-400" /> Please arrive at least 30 minutes before scheduled departure.
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* Document Preview Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0a101f]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FiFileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Document Preview
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {previewModal.title}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreviewModal}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close Preview"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center min-h-[420px] bg-slate-100 dark:bg-[#070c18]">
              {previewModal.loading && (
                <div className="flex flex-col items-center gap-3 py-16">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading document securely...</p>
                </div>
              )}

              {previewModal.error && (
                <div className="max-w-md p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-center">
                  <FiAlertCircle className="mx-auto text-rose-500 text-3xl mb-2" />
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 mb-1">Failed to Load Preview</h4>
                  <p className="text-xs text-rose-600 dark:text-rose-400/80 mb-4">{previewModal.error}</p>
                  <button
                    onClick={closePreviewModal}
                    className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              )}

              {!previewModal.loading && !previewModal.error && previewModal.blobUrl && (
                previewModal.fileType === "image" ? (
                  <div className="flex items-center justify-center w-full h-full p-2">
                    <img
                      src={previewModal.blobUrl}
                      alt={previewModal.title}
                      className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-lg border border-slate-200 dark:border-slate-800"
                    />
                  </div>
                ) : (
                  <iframe
                    src={previewModal.blobUrl}
                    title={previewModal.title}
                    className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                  />
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a101f] flex justify-end">
              <button
                onClick={closePreviewModal}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
