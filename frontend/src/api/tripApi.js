import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const generateAITrip = async (tripData, token, signal) => {
  const res = await axios.post(`${API}/ai/generate-trip`, tripData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  return res.data;
};

export const getUserTrips = async (token) => {
  const res = await axios.get(`${API}/trips`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
};

export const getTripDetails = async (tripId, token) => {
  const res = await axios.get(`${API}/trips/${tripId}`, {
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

export const finalizeTrip = async (tripId, token) => {
  const res = await axios.post(
    `${API}/trips/${tripId}/finalize`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const updateOperatorAccess = async (tripId, enabled, token) => {
  const res = await axios.patch(
    `${API}/trips/${tripId}/operator-access`,
    { enabled },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
};

export const getTripBookings = async (tripId, token) => {
  const res = await axios.get(`${API}/trips/${tripId}/bookings`, {
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

export const syncItinerary = async (tripId, newStaySegments, token) => {
  const res = await axios.post(
    `${API}/trips/${tripId}/sync-itinerary`,
    { newStaySegments },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return res.data;
};

export const suggestSmartShift = async (tripId, itemId, token) => {
  const res = await axios.post(
    `${API}/trips/${tripId}/smartshift/suggest`,
    { itemId },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
};

export const applySmartShift = async (tripId, itemId, alternative, token) => {
  const res = await axios.post(
    `${API}/trips/${tripId}/smartshift/apply`,
    { itemId, alternative },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data;
};

export const getTripMessages = async (tripId, token) => {
  const res = await axios.get(`${API}/trips/${tripId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendTripMessage = async (tripId, data, token) => {
  const res = await axios.post(`${API}/trips/${tripId}/messages`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getUnreadMessageCount = async (tripId, token) => {
  const res = await axios.get(`${API}/trips/${tripId}/messages/unread`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const markMessagesRead = async (tripId, token) => {
  const res = await axios.patch(`${API}/trips/${tripId}/messages/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
