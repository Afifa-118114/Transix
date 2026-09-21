import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateAITrip } from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";

const interestOptions = [
  "Nature",
  "Adventure",
  "History",
  "Culture",
  "Food",
  "Shopping",
  "Photography",
  "Beaches",
  "Mountains",
  "Wildlife",
  "Museums",
  "Cafes",
  "Nightlife",
  "Hidden Gems",
  "Relaxation",
];

const loadingPhases = [
  "Analyzing destination & travel preferences...",
  "Querying railway timetable & transit schedules...",
  "Selecting top-rated stays & verified landmarks...",
  "Optimizing day-by-day itinerary & timings...",
  "Finalizing your intelligent travel plan...",
];

export default function TripForm({ setTrip }) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [loading, setLoading] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);

  const [form, setForm] = useState({
    source: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 2,
    budget: 50000,
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    foodPreference: "Veg",
    tripType: "Family",
    interests: ["Nature", "Food", "Sightseeing"],
    priority: "Comfort",
    purpose: "Vacation",
  });

  useEffect(() => {
    let interval = null;
    if (loading) {
      setLoadingPhaseIndex(0);
      interval = setInterval(() => {
        setLoadingPhaseIndex((prev) => (prev + 1) % loadingPhases.length);
      }, 2200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.source.trim() || !form.destination.trim()) {
        toast.error("Please enter both origin and destination cities.");
        return;
      }
    }
    if (step === 2) {
      if (!form.startDate || !form.endDate) {
        toast.error("Please choose both start and end dates.");
        return;
      }
      if (new Date(form.startDate) > new Date(form.endDate)) {
        toast.error("End date cannot be earlier than start date.");
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.source || !form.destination) {
      toast.error("Please provide both Origin and Destination cities");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const payload = {
        ...form,
        travelers: Number(form.travelers) || 2,
        budget: Number(form.budget) || 50000,
      };

      const res = await generateAITrip(payload, token);
      if (res?.trip) {
        clearInventoryCache();
        const normalized = normalizeTrip(res.trip);
        localStorage.setItem("currentTrip", JSON.stringify(normalized));
        localStorage.removeItem("transix_builder_trip");
        if (setTrip) setTrip(normalized);
        window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: normalized }));
        toast.success(`Itinerary created for ${normalized.destination}!`);
      }
    } catch (err) {
      console.error("Trip generation error:", err);
      toast.error(err.response?.data?.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh] px-4 py-8 font-sans antialiased text-[#111827]">
      {/* Frameless Container (Matches User's Clean Reference Style) */}
      <div className="w-full max-w-[420px]">
        {/* Subtle Step Dots */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {[...Array(totalSteps)].map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i + 1
                  ? "w-6 bg-[#18181b]"
                  : step > i + 1
                  ? "w-2 bg-[#18181b]/50"
                  : "w-1.5 bg-[#e5e7eb]"
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* ========================================================= */}
            {/* STEP 1: ORIGIN & DESTINATION */}
            {/* ========================================================= */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Header (Clean, bold, centered like screenshot) */}
                <div className="text-center">
                  <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111827]">
                    Where to?
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6b7280]">
                    Enter your departure and destination cities.
                  </p>
                </div>

                {/* 2 Inputs (Reference input styling) */}
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Origin City
                    </label>
                    <input
                      name="source"
                      placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                      value={form.source}
                      onChange={handleChange}
                      autoFocus
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Destination City
                    </label>
                    <input
                      name="destination"
                      placeholder="e.g. Varanasi, Goa, Jaipur"
                      value={form.destination}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* STEP 2: DATES OF TRAVEL */}
            {/* ========================================================= */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111827]">
                    When are you traveling?
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6b7280]">
                    Select your departure and return dates.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* STEP 3: TRAVELERS & BUDGET */}
            {/* ========================================================= */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111827]">
                    Who & What Budget?
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6b7280]">
                    How many people and your overall budget in INR.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Number of Travelers
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      name="travelers"
                      value={form.travelers}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Total Budget (₹)
                    </label>
                    <input
                      type="number"
                      name="budget"
                      step="5000"
                      value={form.budget}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* STEP 4: TRANSIT & STAY PREFERENCES */}
            {/* ========================================================= */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111827]">
                    Transit & Stay Style
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6b7280]">
                    Select your preferred travel mode and accommodation type.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Primary Travel Mode
                    </label>
                    <select
                      name="travelMode"
                      value={form.travelMode}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    >
                      <option value="Train">Express Rail (Vande Bharat / Rajdhani)</option>
                      <option value="Flight">Flight</option>
                      <option value="Bus">Bus</option>
                      <option value="Car">Private Cab</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Stay Preference
                    </label>
                    <select
                      name="hotelType"
                      value={form.hotelType}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    >
                      <option value="Standard">Standard (3-4 Star Comfort)</option>
                      <option value="Luxury">Luxury & Heritage (5 Star)</option>
                      <option value="Budget">Budget / Hostel (Transit-friendly)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================= */}
            {/* STEP 5: DINING & INTERESTS */}
            {/* ========================================================= */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center">
                  <h2 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#111827]">
                    Dining & Interests
                  </h2>
                  <p className="mt-1.5 text-sm text-[#6b7280]">
                    Customize your food preferences and experiences.
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Dining Preference
                    </label>
                    <select
                      name="foodPreference"
                      value={form.foodPreference}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    >
                      <option value="Veg">Vegetarian</option>
                      <option value="Non-Veg">Non-Vegetarian</option>
                      <option value="Vegan">Vegan</option>
                      <option value="Any">Any / Local Specialties</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Travel Group Style
                    </label>
                    <select
                      name="tripType"
                      value={form.tripType}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#111827] shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition focus:border-[#18181b] focus:ring-1 focus:ring-[#18181b]"
                    >
                      <option value="Family">Family Vacation</option>
                      <option value="Solo">Solo Traveler</option>
                      <option value="Couple">Romantic / Couple</option>
                      <option value="Friends">Group of Friends</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#111827] mb-2">
                      Experience Interests
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {interestOptions.slice(0, 10).map((interest) => {
                        const isSelected = form.interests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              isSelected
                                ? "bg-[#18181b] text-white"
                                : "border border-[#e5e7eb] bg-white text-[#4b5563] hover:border-[#18181b] hover:text-[#111827]"
                            }`}
                          >
                            {isSelected && <FiCheck className="inline text-xs mr-1" />}
                            <span>{interest}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons (Matches reference screenshot's solid black button) */}
          <div className="mt-8 flex flex-col gap-3">
            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="w-full rounded-xl bg-[#18181b] hover:bg-black py-3.5 text-sm font-semibold text-white shadow-xs transition active:scale-[0.99]"
              >
                Continue
              </button>
            ) : loading ? (
              <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-xs font-semibold text-[#111827]">
                    {loadingPhases[loadingPhaseIndex]}
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#18181b] hover:bg-black py-3.5 text-sm font-semibold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-50"
              >
                Synthesize Itinerary
              </button>
            )}

            {/* Back Button */}
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-center text-xs font-medium text-[#6b7280] hover:text-[#111827] transition py-1"
              >
                Back to previous question
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
