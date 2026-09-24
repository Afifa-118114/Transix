import React, { useState } from "react";
import { 
  FiX, FiPlus, FiTrash2, FiChevronUp, FiChevronDown, 
  FiDollarSign, FiCalendar, FiList, FiFileText, FiCheckCircle, FiAlertCircle 
} from "react-icons/fi";

export default function CampusSettingsModal({ trip, onClose, onRefresh, initialTab = "general" }) {
  const settings = trip.registrationSettings || {};
  const [activeTab, setActiveTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // General Settings State
  const [openDate, setOpenDate] = useState(settings.openDate ? settings.openDate.split('T')[0] : "");
  const [closeDate, setCloseDate] = useState(settings.closeDate ? settings.closeDate.split('T')[0] : "");
  const [capacity, setCapacity] = useState(settings.capacity ?? 50);

  // Budget & Payment Plan State
  const [totalFee, setTotalFee] = useState(settings.totalFee ?? 18000);
  const [confirmationFee, setConfirmationFee] = useState(settings.confirmationFee ?? 1000);

  const defaultInstallmentNames = ["1st Installment", "2nd Installment", "Final Installment"];
  const existingInstallments = trip.paymentPlanConfig || [];
  const [installments, setInstallments] = useState(() => {
    return defaultInstallmentNames.map((name, idx) => {
      const existing = existingInstallments.find(inst => inst.name === name) || existingInstallments[idx];
      return {
        name,
        amount: existing?.amount ?? (idx === 0 ? 5000 : idx === 1 ? 6000 : 6000),
        dueDate: existing?.dueDate ? existing.dueDate.split('T')[0] : ""
      };
    });
  });

  // Registration Form Fields State
  const defaultBaseFields = [
    { name: "name", label: "Full Name", type: "text", required: true, options: [] },
    { name: "studentId", label: "Student ID / Roll No.", type: "text", required: true, options: [] },
    { name: "year", label: "Year", type: "select", required: true, options: ["1st Year", "2nd Year", "3rd Year", "4th Year"] },
    { name: "department", label: "Department", type: "select", required: true, options: ["Computer Engineering", "Information Technology", "Mechanical Engineering", "Civil Engineering", "Electronics"] },
    { name: "studentPhone", label: "Student Phone Number", type: "tel", required: true, options: [] },
    { name: "parentPhone", label: "Parent/Guardian Phone Number", type: "tel", required: true, options: [] },
    { name: "email", label: "Email", type: "email", required: true, options: [] },
    { name: "emergencyContactName", label: "Emergency Contact Name", type: "text", required: false, options: [] },
    { name: "emergencyContactNumber", label: "Emergency Contact Number", type: "tel", required: false, options: [] },
    { name: "emergencyContactRelationship", label: "Emergency Contact Relationship", type: "text", required: false, options: [] },
    { name: "foodAllergy", label: "Food Allergy / Dietary Restrictions", type: "textarea", required: false, options: [] },
    { name: "medicalInfo", label: "Medical / Other Important Information", type: "textarea", required: false, options: [] }
  ];

  const [formFields, setFormFields] = useState(
    settings.formFields && settings.formFields.length > 0 ? settings.formFields : defaultBaseFields
  );

  // Documents Config State
  const [documentsConfig, setDocumentsConfig] = useState(
    trip.documentsConfig && trip.documentsConfig.length > 0 ? trip.documentsConfig : [
      { documentType: "Aadhaar Card", required: true, acceptedFileTypes: ["pdf", "jpg", "png"], maxFileSize: 5 },
      { documentType: "College ID", required: true, acceptedFileTypes: ["pdf", "jpg", "png"], maxFileSize: 5 },
      { documentType: "Parent Consent / Undertaking Form", required: true, acceptedFileTypes: ["pdf"], maxFileSize: 5 }
    ]
  );

  // Payment Balance Calculations
  const parsedTotal = Math.max(0, Number(totalFee) || 0);
  const parsedConf = Math.max(0, Number(confirmationFee) || 0);
  const installmentsSum = installments.reduce((sum, inst) => sum + (Math.max(0, Number(inst.amount) || 0)), 0);
  const totalAllocated = parsedConf + installmentsSum;
  const balanceDiff = parsedTotal - totalAllocated;
  const isBalanced = balanceDiff === 0 && parsedTotal > 0;

  const updateInstallment = (index, key, value) => {
    setInstallments(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  // Form Field Management
  const addField = () => {
    const newFieldId = `custom_${Date.now()}`;
    setFormFields(prev => [
      ...prev,
      { name: newFieldId, label: "Custom Field", type: "text", required: false, options: [] }
    ]);
  };

  const updateField = (index, key, value) => {
    setFormFields(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const removeField = (index) => {
    setFormFields(prev => prev.filter((_, i) => i !== index));
  };

  const moveField = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === formFields.length - 1) return;
    setFormFields(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + direction];
      copy[index + direction] = temp;
      return copy;
    });
  };

  // Document Management
  const addDocument = () => {
    setDocumentsConfig(prev => [
      ...prev,
      { documentType: "New Document", required: false, acceptedFileTypes: ["pdf", "jpg", "png"], maxFileSize: 5 }
    ]);
  };

  const updateDocument = (index, key, value) => {
    setDocumentsConfig(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const removeDocument = (index) => {
    setDocumentsConfig(prev => prev.filter((_, i) => i !== index));
  };

  // Save Handler with strict validation
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaveError(null);

    // Validation: Budget and Payment Plan
    if (parsedTotal <= 0) {
      setSaveError("Total fee per student must be greater than zero.");
      setActiveTab("payment");
      return;
    }

    if (parsedConf > parsedTotal) {
      setSaveError("Confirmation fee cannot exceed the total fee.");
      setActiveTab("payment");
      return;
    }

    if (balanceDiff !== 0) {
      const errorMsg = balanceDiff > 0
        ? `Payment plan does not match total trip fee. Remaining amount to allocate: ₹${balanceDiff.toLocaleString()}`
        : `Payment plan exceeds total trip fee by ₹${Math.abs(balanceDiff).toLocaleString()}`;
      setSaveError(errorMsg);
      setActiveTab("payment");
      return;
    }

    // Validation: Form Fields
    const seenNames = new Set();
    for (let i = 0; i < formFields.length; i++) {
      const field = formFields[i];
      if (!field.label || !field.label.trim()) {
        setSaveError(`Field #${i + 1} has an empty label.`);
        setActiveTab("fields");
        return;
      }
      const fieldName = (field.name || field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_')).trim();
      if (seenNames.has(fieldName)) {
        setSaveError(`Duplicate field identifier '${fieldName}' found. Please use unique labels.`);
        setActiveTab("fields");
        return;
      }
      seenNames.add(fieldName);
      if (field.type === 'select' && (!field.options || field.options.length === 0 || field.options.every(o => !o || !o.trim()))) {
        setSaveError(`Dropdown field '${field.label}' must have at least one option.`);
        setActiveTab("fields");
        return;
      }
    }

    // Prepare Payload
    const payload = {
      openDate: openDate || null,
      closeDate: closeDate || null,
      capacity: parseInt(capacity) || 0,
      totalFee: parsedTotal,
      confirmationFee: parsedConf,
      paymentPlanConfig: installments.map(inst => ({
        name: inst.name,
        amount: Number(inst.amount) || 0,
        dueDate: inst.dueDate ? new Date(inst.dueDate).toISOString() : null
      })),
      formFields: formFields.map(f => ({
        ...f,
        name: (f.name || f.label.toLowerCase().replace(/[^a-z0-9_]/g, '_')).trim()
      })),
      documentsConfig
    };

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/registration-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onRefresh();
        onClose();
      } else {
        setSaveError(data.message || "Failed to update settings");
      }
    } catch (err) {
      setSaveError(err.message || "Network error updating settings");
    } finally {
      setSaving(false);
    }
  };  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl my-6 flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0a101f]">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Campus Registration & Payment Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage budget, payment plan, registration form, and documents</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0f172a] px-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "general"
                ? "border-indigo-600 text-indigo-600 dark:text-white bg-white dark:bg-slate-800/40"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FiCalendar /> General Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payment")}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "payment"
                ? "border-indigo-600 text-indigo-600 dark:text-white bg-white dark:bg-slate-800/40"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FiDollarSign /> Budget & Payment Plan
            {!isBalanced && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "fields"
                ? "border-indigo-600 text-indigo-600 dark:text-white bg-white dark:bg-slate-800/40"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FiList /> Registration Form Fields ({formFields.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === "documents"
                ? "border-indigo-600 text-indigo-600 dark:text-white bg-white dark:bg-slate-800/40"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <FiFileText /> Required Documents ({documentsConfig.length})
          </button>
        </div>

        {/* Error Alert */}
        {saveError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <FiAlertCircle className="shrink-0 text-base" />
            <span className="font-semibold">{saveError}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-700 dark:text-slate-300">

          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registration Timeline & Capacity</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Registration Opens</label>
                    <input 
                      type="date" 
                      value={openDate} 
                      onChange={(e) => setOpenDate(e.target.value)} 
                      className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Registration Closes</label>
                    <input 
                      type="date" 
                      value={closeDate} 
                      onChange={(e) => setCloseDate(e.target.value)} 
                      className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Student Capacity</label>
                    <input 
                      type="number" 
                      min="1"
                      value={capacity} 
                      onChange={(e) => setCapacity(e.target.value)} 
                      className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Maximum approved participants</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET & 4-PART PAYMENT PLAN */}
          {activeTab === "payment" && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Trip & Budget Summary Widget */}
              <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Trip & Budget Summary</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">Canonical single source of truth</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white dark:bg-[#131c31] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Total Fee (per student)</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">₹</span>
                      <input 
                        type="number" 
                        min="0"
                        value={totalFee} 
                        onChange={(e) => setTotalFee(e.target.value)}
                        className="w-full bg-transparent font-black text-lg text-slate-900 dark:text-white border-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#131c31] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirmation Fee (₹)</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">₹</span>
                      <input 
                        type="number" 
                        min="0"
                        value={confirmationFee} 
                        onChange={(e) => setConfirmationFee(e.target.value)}
                        className="w-full bg-transparent font-black text-lg text-indigo-600 dark:text-indigo-400 border-0 focus:outline-none"
                      />
                    </div>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Paid at registration via Razorpay</span>
                  </div>

                  <div className="bg-white dark:bg-[#131c31] p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Remaining Balance</label>
                    <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                      ₹{Math.max(0, parsedTotal - parsedConf).toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">Split across 3 installments</span>
                  </div>
                </div>

                {/* Balance Status Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
                  isBalanced
                    ? "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400"
                    : balanceDiff > 0
                    ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400"
                    : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                }`}>
                  <div className="flex items-center gap-2">
                    {isBalanced ? <FiCheckCircle className="text-base" /> : <FiAlertCircle className="text-base" />}
                    <div>
                      <p className="font-bold">
                        {isBalanced 
                          ? "Payment Plan Balanced" 
                          : balanceDiff > 0
                          ? `Payment plan does not match total trip fee`
                          : `Payment plan exceeds total trip fee`}
                      </p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Confirmation (₹{parsedConf.toLocaleString()}) + 3 Installments (₹{installmentsSum.toLocaleString()}) = ₹{totalAllocated.toLocaleString()} of ₹{parsedTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!isBalanced && (
                    <div className="text-right font-black text-sm">
                      {balanceDiff > 0 ? (
                        <span>Allocate ₹{balanceDiff.toLocaleString()}</span>
                      ) : (
                        <span>Exceeds by ₹{Math.abs(balanceDiff).toLocaleString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 4-Section Canonical Plan Configuration */}
              <div className="bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Payment Plan Configuration (Exactly 4 Payment Sections)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Confirmation Fee is collected upon registration submission. The remaining balance is distributed across 1st Installment, 2nd Installment, and Final Installment.
                </p>

                <div className="space-y-3 pt-2">
                  {/* Section 1: Confirmation Fee (Read-only representation from above) */}
                  <div className="p-4 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">1</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">Confirmation Fee</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                            At Registration
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Collected via Razorpay Test Mode checkout</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900 dark:text-white">₹{parsedConf.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Sections 2-4: 1st, 2nd, Final Installments */}
                  {installments.map((inst, idx) => (
                    <div key={idx} className="p-4 bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">{idx + 2}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase">{inst.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {idx === 0 ? "First scheduled trip installment" : idx === 1 ? "Mid-term trip installment" : "Remaining balance final installment"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                          <input 
                            type="number"
                            min="0"
                            value={inst.amount}
                            onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                            className="w-32 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Due Date</label>
                          <input 
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
                            className="w-40 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REGISTRATION FORM FIELDS */}
          {activeTab === "fields" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Configure Student Registration Fields</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Control field labels, order, input types, and required status seen by students</p>
                </div>
                <button 
                  type="button" 
                  onClick={addField} 
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <FiPlus /> Add Field
                </button>
              </div>

              <div className="space-y-3">
                {formFields.map((field, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl items-start">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1 mt-1 shrink-0">
                      <button 
                        type="button" 
                        onClick={() => moveField(idx, -1)} 
                        className="p-1 rounded bg-white dark:bg-[#131c31] text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 border border-slate-200 dark:border-slate-700 cursor-pointer" 
                        disabled={idx === 0}
                        title="Move Up"
                      >
                        <FiChevronUp />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => moveField(idx, 1)} 
                        className="p-1 rounded bg-white dark:bg-[#131c31] text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 border border-slate-200 dark:border-slate-700 cursor-pointer" 
                        disabled={idx === formFields.length - 1}
                        title="Move Down"
                      >
                        <FiChevronDown />
                      </button>
                    </div>

                    {/* Field Editor */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Field Label *</label>
                        <input 
                          type="text" 
                          value={field.label} 
                          onChange={(e) => updateField(idx, 'label', e.target.value)} 
                          className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Field Type</label>
                        <select 
                          value={field.type || 'text'} 
                          onChange={(e) => updateField(idx, 'type', e.target.value)} 
                          className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="text">Text Input</option>
                          <option value="email">Email</option>
                          <option value="tel">Phone Number</option>
                          <option value="textarea">Multiline Text</option>
                          <option value="select">Dropdown</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <input 
                          type="checkbox" 
                          id={`req_${idx}`}
                          checked={field.required} 
                          onChange={(e) => updateField(idx, 'required', e.target.checked)} 
                          className="rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0" 
                        />
                        <label htmlFor={`req_${idx}`} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                          Required Field
                        </label>
                      </div>

                      {field.type === 'select' && (
                        <div className="md:col-span-4 mt-1 bg-white dark:bg-[#131c31] p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                            Dropdown Options (comma-separated)
                          </label>
                          <input 
                            type="text" 
                            value={Array.isArray(field.options) ? field.options.join(", ") : ""} 
                            onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} 
                            placeholder="e.g. Option 1, Option 2, Option 3"
                            className="w-full bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-indigo-500 focus:outline-none" 
                          />
                        </div>
                      )}
                    </div>

                    <button 
                      type="button" 
                      onClick={() => removeField(idx)} 
                      className="p-2 text-slate-400 hover:text-rose-500 mt-5 transition cursor-pointer"
                      title="Remove Field"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: REQUIRED DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Required Student Documents</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Documents students must upload to complete registration verification</p>
                </div>
                <button 
                  type="button" 
                  onClick={addDocument} 
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <FiPlus /> Add Document
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documentsConfig.map((doc, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-[#0a101f] border border-slate-200 dark:border-slate-800 rounded-xl flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Document Name *</label>
                        <input 
                          type="text" 
                          value={doc.documentType} 
                          onChange={(e) => updateDocument(idx, 'documentType', e.target.value)} 
                          className="w-full bg-white dark:bg-[#131c31] border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white font-semibold focus:border-indigo-500 focus:outline-none" 
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`doc_req_${idx}`}
                          checked={doc.required} 
                          onChange={(e) => updateDocument(idx, 'required', e.target.checked)} 
                          className="rounded bg-white dark:bg-[#131c31] border-slate-300 dark:border-slate-700 text-indigo-600" 
                        />
                        <label htmlFor={`doc_req_${idx}`} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer">
                          Strictly Required for Approval
                        </label>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeDocument(idx)} 
                      className="text-slate-400 hover:text-rose-500 mt-5 p-2 transition cursor-pointer"
                      title="Remove Document"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0a101f] flex justify-between items-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === "payment" && (
              <span className={isBalanced ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                {isBalanced ? "✓ Ready to save: Plan is balanced" : "⚠️ Plan must be balanced before saving"}
              </span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSave} 
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Configuration..." : "Save Settings"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
