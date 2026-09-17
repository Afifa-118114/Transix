import React, { useState } from "react";
import { FiX, FiPlus, FiTrash2, FiChevronUp, FiChevronDown } from "react-icons/fi";

export default function CampusSettingsModal({ trip, onClose, onRefresh }) {
  const settings = trip.registrationSettings || {};
  
  const [formFields, setFormFields] = useState(settings.formFields && settings.formFields.length > 0 ? settings.formFields : [
    { name: "name", label: "Full Name", type: "text", required: true, options: [] },
    { name: "studentId", label: "Student ID / Roll No.", type: "text", required: true, options: [] },
    { name: "year", label: "Year", type: "select", required: true, options: ["1st Year", "2nd Year", "3rd Year", "4th Year"] },
    { name: "department", label: "Department", type: "select", required: true, options: ["Computer Engineering", "Information Technology"] },
    { name: "phone", label: "Student Phone Number", type: "tel", required: true, options: [] },
    { name: "parentPhone", label: "Parent/Guardian Phone Number", type: "tel", required: true, options: [] },
    { name: "email", label: "Email", type: "email", required: true, options: [] },
    { name: "emergencyContact", label: "Emergency Contact Details", type: "textarea", required: false, options: [] },
    { name: "allergies", label: "Food Allergy / Dietary Restrictions", type: "text", required: false, options: [] }
  ]);
  
  const [documentsConfig, setDocumentsConfig] = useState(trip.documentsConfig && trip.documentsConfig.length > 0 ? trip.documentsConfig : [
    { documentType: "Aadhaar Card", required: true, acceptedFileTypes: ["pdf", "jpg", "png"], maxFileSize: 5 },
    { documentType: "College ID", required: true, acceptedFileTypes: ["pdf", "jpg", "png"], maxFileSize: 5 },
    { documentType: "Parent Consent Form", required: true, acceptedFileTypes: ["pdf"], maxFileSize: 5 }
  ]);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      openDate: formData.get('openDate'),
      closeDate: formData.get('closeDate'),
      capacity: parseInt(formData.get('capacity')) || 0,
      totalFee: parseFloat(formData.get('totalFee')) || 0,
      confirmationFee: parseFloat(formData.get('confirmationFee')) || 0,
      formFields,
      documentsConfig
    };
    
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips/${trip._id}/registration-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onRefresh();
        onClose();
      } else {
        alert("Failed to update settings");
      }
    } catch (err) {
      alert("Error updating settings");
    }
  };

  const addField = () => {
    setFormFields([...formFields, { name: `custom_${Date.now()}`, label: "New Field", type: "text", required: false, options: [] }]);
  };

  const updateField = (index, key, value) => {
    const updated = [...formFields];
    updated[index][key] = value;
    setFormFields(updated);
  };

  const removeField = (index) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const moveField = (index, direction) => {
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === formFields.length - 1) return;
    const updated = [...formFields];
    const temp = updated[index];
    updated[index] = updated[index + direction];
    updated[index + direction] = temp;
    setFormFields(updated);
  };

  const addDocument = () => {
    setDocumentsConfig([...documentsConfig, { documentType: "New Document", required: false, acceptedFileTypes: [], maxFileSize: 5 }]);
  };

  const updateDocument = (index, key, value) => {
    const updated = [...documentsConfig];
    updated[index][key] = value;
    setDocumentsConfig(updated);
  };

  const removeDocument = (index) => {
    setDocumentsConfig(documentsConfig.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#131c31] border border-slate-800 rounded-2xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-[#131c31] z-10">
          <h3 className="text-lg font-black text-white">Campus Registration Settings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><FiX /></button>
        </div>
        
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8 text-slate-300">
          {/* Basic Settings */}
          <section>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Basic Settings</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Opens</label>
                <input type="date" name="openDate" defaultValue={settings.openDate ? settings.openDate.split('T')[0] : ''} className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Registration Closes</label>
                <input type="date" name="closeDate" defaultValue={settings.closeDate ? settings.closeDate.split('T')[0] : ''} className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Capacity</label>
                <input type="number" name="capacity" defaultValue={settings.capacity || 0} required className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Fee per Student (₹)</label>
                <input type="number" name="totalFee" defaultValue={settings.totalFee || 0} required className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Confirmation Fee (₹)</label>
                <input type="number" name="confirmationFee" defaultValue={settings.confirmationFee || 0} required className="w-full bg-[#0a101f] border border-slate-700 rounded-xl p-2.5 text-sm text-white" />
              </div>
            </div>
          </section>

          {/* Form Fields */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registration Form Fields</h4>
              <button type="button" onClick={addField} className="text-xs flex items-center gap-1 font-bold text-indigo-400 hover:text-indigo-300">
                <FiPlus /> Add Field
              </button>
            </div>
            
            <div className="space-y-3">
              {formFields.map((field, idx) => (
                <div key={idx} className="flex flex-col md:flex-row gap-3 p-4 bg-[#0a101f] border border-slate-800 rounded-xl items-start">
                  <div className="flex flex-col gap-1 mt-1">
                    <button type="button" onClick={() => moveField(idx, -1)} className="text-slate-500 hover:text-white disabled:opacity-30" disabled={idx === 0}><FiChevronUp /></button>
                    <button type="button" onClick={() => moveField(idx, 1)} className="text-slate-500 hover:text-white disabled:opacity-30" disabled={idx === formFields.length - 1}><FiChevronDown /></button>
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Label</label>
                      <input type="text" value={field.label} onChange={(e) => updateField(idx, 'label', e.target.value)} className="w-full bg-[#131c31] border border-slate-700 rounded-lg p-2 text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Type</label>
                      <select value={field.type} onChange={(e) => updateField(idx, 'type', e.target.value)} className="w-full bg-[#131c31] border border-slate-700 rounded-lg p-2 text-xs text-white">
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="textarea">Long Text</option>
                        <option value="select">Dropdown</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} className="rounded bg-[#131c31] border-slate-700" />
                      <label className="text-[10px] font-bold text-slate-400">Required</label>
                    </div>
                    
                    {field.type === 'select' && (
                      <div className="md:col-span-4 mt-2">
                        <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Options (comma separated)</label>
                        <input type="text" value={field.options.join(", ")} onChange={(e) => updateField(idx, 'options', e.target.value.split(',').map(s=>s.trim()))} className="w-full bg-[#131c31] border border-slate-700 rounded-lg p-2 text-xs text-white" />
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={() => removeField(idx)} className="text-slate-500 hover:text-rose-500 mt-5 p-2"><FiTrash2 /></button>
                </div>
              ))}
            </div>
          </section>

          {/* Documents */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Required Documents</h4>
              <button type="button" onClick={addDocument} className="text-xs flex items-center gap-1 font-bold text-indigo-400 hover:text-indigo-300">
                <FiPlus /> Add Document
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {documentsConfig.map((doc, idx) => (
                <div key={idx} className="p-4 bg-[#0a101f] border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Document Name</label>
                      <input type="text" value={doc.documentType} onChange={(e) => updateDocument(idx, 'documentType', e.target.value)} className="w-full bg-[#131c31] border border-slate-700 rounded-lg p-2 text-xs text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={doc.required} onChange={(e) => updateDocument(idx, 'required', e.target.checked)} className="rounded bg-[#131c31] border-slate-700" />
                      <label className="text-[10px] font-bold text-slate-400">Required Document</label>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeDocument(idx)} className="text-slate-500 hover:text-rose-500 mt-5 p-2"><FiTrash2 /></button>
                </div>
              ))}
            </div>
          </section>
        </form>

        <div className="p-6 border-t border-slate-800 bg-[#131c31] flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-900/50 transition">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
