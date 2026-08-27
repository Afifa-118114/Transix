import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const searchTrains = async (source, destination, date) => {
  const { data } = await axios.get(`${API}/trains/search`, {
    params: {
      source,
      destination,
      ...(date ? { date } : {}),
    },
  });

  return data;
};
