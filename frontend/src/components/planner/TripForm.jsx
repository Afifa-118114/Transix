import { useState } from "react";
import { generateAITrip } from "../../api/tripApi";

const TripForm = ({ setTrip }) => {
  const [loading, setLoading] = useState(false);

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
    interests: "",
    priority: "Comfort",
    purpose: "Vacation",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log("Submit clicked");

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const payload = {
        ...form,
        interests: form.interests.split(",").map((i) => i.trim()),
        travelers: Number(form.travelers),
        budget: Number(form.budget),
      };

      console.log(payload);

      console.log("TOKEN =", token);

      const res = await generateAITrip(payload, token);
      console.log("API RESPONSE:", res);
      console.log("TRIP:", res.trip);

      localStorage.setItem("currentTrip", JSON.stringify(res.trip));

      setTrip(res.trip);

      console.log(res);
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-3xl shadow space-y-4"
    >
      <h2 className="text-xl font-bold">Plan Your Trip</h2>

      {/* GRID */}
      <div className="grid grid-cols-2 gap-4">
        <input
          name="source"
          placeholder="Source"
          onChange={handleChange}
          className="p-3 border rounded-xl"
          required
        />

        <input
          name="destination"
          placeholder="Destination"
          onChange={handleChange}
          className="p-3 border rounded-xl"
          required
        />

        <input
          type="date"
          name="startDate"
          onChange={handleChange}
          className="p-3 border rounded-xl"
          required
        />

        <input
          type="date"
          name="endDate"
          onChange={handleChange}
          className="p-3 border rounded-xl"
          required
        />

        <input
          name="travelers"
          type="number"
          placeholder="Travelers"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        />

        <input
          name="budget"
          type="number"
          placeholder="Budget"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        />

        {/* SELECTS */}
        <select
          name="travelMode"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        >
          <option>Train</option>
          <option>Flight</option>
          <option>Bus</option>
          <option>Car</option>
        </select>

        <select
          name="hotelType"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        >
          <option>Budget</option>
          <option>Standard</option>
          <option>Luxury</option>
        </select>

        <select
          name="foodPreference"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        >
          <option>Veg</option>
          <option>Non-Veg</option>
          <option>Vegan</option>
          <option>Any</option>
        </select>

        <select
          name="tripType"
          onChange={handleChange}
          className="p-3 border rounded-xl"
        >
          <option>Solo</option>
          <option>Family</option>
          <option>Friends</option>
          <option>Couple</option>
          <option>Business</option>
        </select>
      </div>

      {/* INTERESTS */}
      <input
        name="interests"
        placeholder="Interests (comma separated)"
        onChange={handleChange}
        className="w-full p-3 border rounded-xl"
      />

      {/* BUTTON */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl"
      >
        {loading ? "Generating..." : "Generate AI Trip"}
      </button>
    </form>
  );
};

export default TripForm;
