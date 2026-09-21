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

export const getTripById = async (tripId, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get(`${API}/trips/${tripId}`, { headers });
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

export const getAllTrips = async (token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get(`${API}/trips`, { headers });
  return res.data;
};

export const deleteTrip = async (tripId, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.delete(`${API}/trips/${tripId}`, { headers });
  return res.data;
};
