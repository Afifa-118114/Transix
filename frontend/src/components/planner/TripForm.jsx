import { useState } from "react";
import { generateAITrip } from "../../api/tripApi";

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

export default function TripForm({ setTrip }) {
  const [loading, setLoading] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        localStorage.setItem("currentTrip", JSON.stringify(res.trip));
        localStorage.removeItem("transix_builder_trip");
        setTrip(res.trip);
        // Dispatch custom event so TripBuilderContext syncs in the same tab
        window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: res.trip }));
      }
    } catch (err) {
      console.error("Trip generation error:", err);
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
    <div className="flex justify-center px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900">Plan Your AI Trip</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tell us your preferences and let our AI build your personalized itinerary
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Origin City
            </label>
            <input
              name="source"
              placeholder="e.g. Mumbai, Delhi, Bangalore"
              value={form.source}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Destination City
            </label>
            <input
              name="destination"
              placeholder="e.g. Kerala, Goa, Manali"
              value={form.destination}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Number of Travelers
            </label>
            <input
              type="number"
              min="1"
              max="20"
              name="travelers"
              value={form.travelers}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Total Budget (₹)
            </label>
            <input
              type="number"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preferred Travel Mode
            </label>
            <select
              name="travelMode"
              value={form.travelMode}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Train">Train</option>
              <option value="Flight">Flight</option>
              <option value="Bus">Bus</option>
              <option value="Car">Car</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Stay Preference
            </label>
            <select
              name="hotelType"
              value={form.hotelType}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Budget">Budget</option>
              <option value="Standard">Standard (3-4 Star)</option>
              <option value="Luxury">Luxury (5 Star)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dining Preference
            </label>
            <select
              name="foodPreference"
              value={form.foodPreference}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Veg">Vegetarian</option>
              <option value="Non-Veg">Non-Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Any">Any / Multi-Cuisine</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Travel Style
            </label>
            <select
              name="tripType"
              value={form.tripType}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            >
              <option value="Solo">Solo Traveler</option>
              <option value="Family">Family Vacation</option>
              <option value="Couple">Romantic / Couple</option>
              <option value="Friends">Group of Friends</option>
              <option value="Business">Business & Leisure</option>
            </select>
          </div>
        </div>

        {/* Interests Selector */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Select Your Travel Interests
          </label>

          <div className="flex flex-wrap gap-1.5">
            {interestOptions.map((interest) => {
              const isSelected = form.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-white hover:text-indigo-600"
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Generating Intelligent Itinerary..." : "Generate AI Trip Itinerary"}
          </button>
        </div>
      </form>
    </div>
  );
}
