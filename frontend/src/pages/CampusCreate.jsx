import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function CampusCreate() {
  const navigate = useNavigate();
  const { setTrip } = useTripBuilder();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    orgName: "",
    orgType: "College/University",
    contactInfo: "",
    destination: "",
    source: "",
    duration: 5,
    startDate: "",
    endDate: "",
    travelers: 50, // Default capacity
    budget: 10000,
    accommodationBudgetPerStudent: "",
    travelMode: "Train",
    hotelType: "Standard",
    educationalRequirements: [{ institutionName: "", institutionType: "Industry/Manufacturing", notes: "" }],
    inclusions: { accommodation: true, travel: true, localTransport: true, activities: true },
    exclusions: [],
    mealInclusions: { breakfast: true, lunch: true, dinner: true }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1 && !formData.orgName) return alert("Organization name is required");
    if (step === 2 && (!formData.source || !formData.destination || !formData.startDate)) return alert("Origin, destination and dates are required");
    
    // Auto-calculate end date based on duration if not set
    if (step === 2 && formData.startDate && formData.duration && !formData.endDate) {
       const start = new Date(formData.startDate);
       start.setDate(start.getDate() + parseInt(formData.duration) - 1);
       setFormData(prev => ({ ...prev, endDate: start.toISOString().split("T")[0] }));
    }
    if (step === 3) {
      const validReqs = formData.educationalRequirements.filter(r => r.institutionName.trim() !== "");
      if (validReqs.length === 0) return alert("Please add at least one educational/industry visit requirement.");
      setFormData(prev => ({ ...prev, educationalRequirements: validReqs }));
    }
    setStep(step + 1);
  };

  const handleEduReqChange = (index, field, value) => {
    const newReqs = [...formData.educationalRequirements];
    newReqs[index][field] = value;
    setFormData(prev => ({ ...prev, educationalRequirements: newReqs }));
  };

  const addEduReq = () => {
    setFormData(prev => ({
      ...prev,
      educationalRequirements: [...prev.educationalRequirements, { institutionName: "", institutionType: "Industry/Manufacturing", notes: "" }]
    }));
  };

  const removeEduReq = (index) => {
    setFormData(prev => ({
      ...prev,
      educationalRequirements: prev.educationalRequirements.filter((_, i) => i !== index)
    }));
  };

  const toggleInclusion = (category, type) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [type]: !prev[category][type]
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      const payload = {
        organizationDetails: {
          name: formData.orgName,
          orgType: formData.orgType,
          contactInfo: formData.contactInfo
        },
        source: formData.source,
        destination: formData.destination,
        duration: formData.duration,
        startDate: formData.startDate,
        endDate: formData.endDate,
        travelers: formData.travelers,
        budget: formData.budget,
        accommodationBudgetPerStudent: Math.min(
          Number(formData.budget) || 15000,
          (Number(formData.duration) || 10) * 1000,
          10000
        ),
        travelMode: formData.travelMode,
        hotelType: formData.hotelType,
        educationalRequirements: formData.educationalRequirements,
        inclusions: formData.inclusions,
        exclusions: formData.exclusions,
        mealInclusions: formData.mealInclusions
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/campus-trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTrip(data.trip);
        // After creation, use existing itinerary engine
        navigate("/planner"); // Let the AI engine generate the itinerary, just like Personal Trips
      } else {
        setError(data.message || "Failed to create Campus Trip");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout trip={null} setTrip={() => {}}>
      <div className="flex flex-col gap-6 pb-12 max-w-2xl mx-auto mt-4">
        
        {/* Header */}
        <div>
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 transition hover:text-indigo-600"
          >
            <FiArrowLeft className="text-xs" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Organize Campus IV
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Step {step} of 4: {step === 1 ? "Organization Details" : step === 2 ? "Trip Parameters" : step === 3 ? "Educational Requirements" : "Review & Create"}
          </p>
        </div>

        {/* Steps Progress */}
        <div className="flex gap-2">
           {[1, 2, 3, 4].map(s => (
             <div key={s} className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`} />
           ))}
        </div>

        {/* Form Container */}
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xs">
          
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">College / Organization Name *</label>
                <input 
                  type="text" name="orgName" required
                  value={formData.orgName} onChange={handleChange}
                  placeholder="e.g. MHSSCE"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Organization Type</label>
                <select 
                  name="orgType" value={formData.orgType} onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option>College/University</option>
                  <option>School</option>
                  <option>Corporate</option>
                  <option>Other Group</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Coordinator Contact (Phone/Email)</label>
                <input 
                  type="text" name="contactInfo"
                  value={formData.contactInfo} onChange={handleChange}
                  placeholder="Your contact info"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button type="submit" className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                Next <FiArrowRight />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNext} className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Origin *</label>
                  <input 
                    type="text" name="source" required
                    value={formData.source} onChange={handleChange}
                    placeholder="e.g. Mumbai, Delhi"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destination *</label>
                  <input 
                    type="text" name="destination" required
                    value={formData.destination} onChange={handleChange}
                    placeholder="e.g. Manali, Kerala"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date *</label>
                  <input 
                    type="date" name="startDate" required
                    value={formData.startDate} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Days)</label>
                  <input 
                    type="number" name="duration" min="1" required
                    value={formData.duration} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Participants</label>
                  <input 
                    type="number" name="travelers" min="5" required
                    value={formData.travelers} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Overall Budget / Student (₹) *</label>
                  <input 
                    type="number" name="budget" min="1000" required
                    value={formData.budget} onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {(() => {
                const derivedAccom = Math.min(
                  Number(formData.budget) || 15000,
                  (Number(formData.duration) || 10) * 1000,
                  10000
                );
                const participants = Number(formData.travelers) || 200;
                return (
                  <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 text-[11px]">
                        Derived Accommodation Allocation
                      </span>
                      <span className="font-black text-indigo-700 dark:text-indigo-300">
                        ₹{derivedAccom.toLocaleString()} / student
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span>Max Group Accommodation Allocation ({participants} students):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{(derivedAccom * participants).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Calculated as MIN(Overall Budget, Duration × ₹1,000, ₹10,000 ceiling).
                    </p>
                  </div>
                );
              })()}
              <button type="submit" className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                Next <FiArrowRight />
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleNext} className="flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-4">Educational / Industry Visits</h3>
                <p className="text-xs text-slate-500 mb-4">Campus Trips must include at least one educational or industrial requirement.</p>
                <div className="flex flex-col gap-4">
                  {formData.educationalRequirements.map((req, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative">
                      {formData.educationalRequirements.length > 1 && (
                        <button type="button" onClick={() => removeEduReq(idx)} className="absolute top-3 right-3 text-red-500 text-xs font-bold hover:underline">Remove</button>
                      )}
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Institution Name *</label>
                          <input type="text" value={req.institutionName} required onChange={(e) => handleEduReqChange(idx, 'institutionName', e.target.value)} placeholder="e.g. VSSC / ISRO" className="w-full px-3 py-2 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
                          <select value={req.institutionType} onChange={(e) => handleEduReqChange(idx, 'institutionType', e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500">
                            <option>Industry/Manufacturing</option>
                            <option>Research/Technology</option>
                            <option>University/Institute</option>
                            <option>Government</option>
                            <option>Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                        <input type="text" value={req.notes} onChange={(e) => handleEduReqChange(idx, 'notes', e.target.value)} placeholder="Specific focus or departments to visit..." className="w-full px-3 py-2 bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500" />
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addEduReq} className="self-start text-xs font-bold text-indigo-600 hover:text-indigo-700">+ Add Another Visit</button>
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-4">Initial Inclusions</h3>
                <p className="text-xs text-slate-500 mb-4">Select what should be included in the Per-Student budget. You can adjust this later in the Planner.</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.inclusions.accommodation} onChange={() => toggleInclusion('inclusions', 'accommodation')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Accommodation
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.inclusions.travel} onChange={() => toggleInclusion('inclusions', 'travel')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Main Travel (Train/Flight)
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.inclusions.localTransport} onChange={() => toggleInclusion('inclusions', 'localTransport')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Local Transport (Bus/Cab)
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.inclusions.activities} onChange={() => toggleInclusion('inclusions', 'activities')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Standard Activities
                    </label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.mealInclusions.breakfast} onChange={() => toggleInclusion('mealInclusions', 'breakfast')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Breakfast
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.mealInclusions.lunch} onChange={() => toggleInclusion('mealInclusions', 'lunch')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Lunch
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={formData.mealInclusions.dinner} onChange={() => toggleInclusion('mealInclusions', 'dinner')} className="rounded text-indigo-600 focus:ring-indigo-500" /> Dinner
                    </label>
                  </div>
                </div>
              </div>

              <button type="submit" className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
                Review <FiArrowRight />
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4">{formData.orgName} IV to {formData.destination}</h3>
                <div className="grid grid-cols-2 gap-y-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <div><span className="text-xs uppercase text-slate-400 block mb-1">Start Date</span>{formData.startDate}</div>
                  <div><span className="text-xs uppercase text-slate-400 block mb-1">Duration</span>{formData.duration} Days</div>
                  <div><span className="text-xs uppercase text-slate-400 block mb-1">Capacity</span>{formData.travelers} Students</div>
                  <div><span className="text-xs uppercase text-slate-400 block mb-1">Per Student</span>₹{formData.budget}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold leading-relaxed border border-indigo-100 dark:border-indigo-800/50">
                <FiCheck className="text-xl shrink-0 mt-0.5" />
                <p>
                  Creating this IV will make you the Coordinator. You will then use the standard Transix itinerary planner to build the schedule. You can configure registration and invite students after the itinerary is finalized.
                </p>
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="mt-2 flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {isSubmitting ? "Generating..." : "Create IV & Generate Itinerary"}
              </button>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
