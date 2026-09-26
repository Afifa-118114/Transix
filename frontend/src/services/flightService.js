import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const searchFlights = async (source, destination, date) => {
  const { data } = await axios.get(`${API}/flights/search`, {
    params: {
      origin: source,
      destination,
      ...(date ? { travelDate: date } : {}),
    },
  });

  return data;
};
