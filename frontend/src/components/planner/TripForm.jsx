import { useState } from "react";
import { generateAITrip } from "../../api/tripApi";

const TripForm = ({ setTrip }) => {
  const [loading, setLoading] = useState(false);
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

  const [form, setForm] = useState({
    source: "",
    destination: "",
    startDate: "",
    endDate: "",
    travelers: 1,
    budget: "",
    currency: "INR",
    travelMode: "Train",
    hotelType: "Standard",
    foodPreference: "Veg",
    tripType: "Family",
    interests: [],
    priority: "Comfort",
    purpose: "Vacation",
  });

  const handleChange = (e) => {
    const { name, value, options } = e.target;

    if (name === "interests") {
      const selected = Array.from(options)
        .filter((option) => option.selected)
        .map((option) => option.value);

      setForm({
        ...form,
        interests: selected,
      });
    } else {
      setForm({
        ...form,
        [name]: value,
      });
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Submit clicked");

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const payload = {
        ...form,
        interests: form.interests,
        travelers: Number(form.travelers),
        budget: Number(form.budget),
      };

      console.log(payload);

      console.log("TOKEN =", token);

      const res = await generateAITrip(payload, token);

      localStorage.setItem("currentTrip", JSON.stringify(res.trip));

      setTrip(res.trip);
    } catch (err) {
      console.log("Full Error:", err);

      if (err.response) {
        console.log("Status:", err.response.status);
        console.log("Response:", err.response.data);
      } else if (err.request) {
        console.log("Request:", err.request);
      } else {
        console.log("Message:", err.message);
      }
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
    <div className="flex justify-center px-6 py-10 translate-y-3 ">
      <form
        onSubmit={handleSubmit}
        className="w-[900px] max-w-5xl h-[450px] rounded-3xl border border-white/30 bg-gradient-to-br from-indigo-50 via-white to-blue-200 p-10 shadow-2xl backdrop-blur-lg"
      >
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-800">Plan Your Trip</h2>

          <p className="mt-2 text-blue-700">
            Tell us your preferences and let AI build your perfect itinerary.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 place-items-center">
          <input
            name="source"
            placeholder="Source"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
            required
          />

          <input
            name="destination"
            placeholder="Destination"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
            required
          />

          <input
            type="date"
            name="startDate"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
            required
          />

          <input
            type="date"
            name="endDate"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
            required
          />

          <input
            type="number"
            name="travelers"
            placeholder="Travelers"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <input
            type="number"
            name="budget"
            placeholder="Budget"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          />

          <select
            name="travelMode"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          >
            <option>Train</option>
            <option>Flight</option>
            <option>Bus</option>
            <option>Car</option>
          </select>

          <select
            name="hotelType"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          >
            <option>Budget</option>
            <option>Standard</option>
            <option>Luxury</option>
          </select>

          <select
            name="foodPreference"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          >
            <option>Veg</option>
            <option>Non-Veg</option>
            <option>Vegan</option>
            <option>Any</option>
          </select>

          <select
            name="tripType"
            onChange={handleChange}
            className="w-[350px] rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition-all focus:border-[#5B4BFF] focus:ring-4 focus:ring-indigo-100"
          >
            <option>Solo</option>
            <option>Family</option>
            <option>Friends</option>
            <option>Couple</option>
            <option>Business</option>
          </select>

          <div className="md:col-span-2 mt-3">
            <label className="mb-4 block text-base font-semibold text-gray-700 translate-x-2">
              Select Interests
            </label>

            <div className="mt-3 grid grid-cols-8 gap-2 translate-x-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`h-7 rounded-full text-sm font-medium transition-all duration-200
      ${
        form.interests.includes(interest)
          ? "bg-gradient-to-br from-indigo-400 via-white to-blue-700 text-black shadow-md"
          : "border border-gray-300 bg-white text-gray-700 hover:border-[#3d2cfc] hover:text-[#5B4BFF]"
      }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="submit"
            disabled={loading}
            className="w-[600px] rounded-xl bg-gradient-to-br from-indigo-400 via-white to-blue-700 text-black shadow-md py-3 font-semibold text-black transition duration-300 hover:scale-[1.02] hover:bg-[#4A3EE6] disabled:cursor-not-allowed disabled:opacity-70 translate-y-5"
          >
            {loading ? "Generating..." : "Generate AI Trip"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TripForm;
