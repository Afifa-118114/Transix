import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const generateAITrip = async (tripData, token) => {
  const res = await axios.post(`${API}/ai/generate-trip`, tripData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const updateTrip = async (tripId, tripData, token) => {
  const res = await axios.put(`${API}/trips/${tripId}`, tripData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

export const regenerateDay = async (tripId, day, token) => {
  const res = await axios.post(
    `${API}/trips/${tripId}/regenerate-day`,
    { day },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};
