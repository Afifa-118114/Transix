import axios from "axios";

const API = "http://localhost:5000/api";

export const generateAITrip = async (tripData, token) => {
  const res = await axios.post(`${API}/ai/generate-trip`, tripData, {
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
