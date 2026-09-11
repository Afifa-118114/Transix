import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getDashboardStats = async (token) => {
  const res = await axios.get(`${API}/operator/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOperatorTrips = async (token) => {
  const res = await axios.get(`${API}/operator/trips`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOperatorTripDetails = async (tripId, token) => {
  const res = await axios.get(`${API}/operator/trips/${tripId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateBookingStatus = async (bookingId, data, token) => {
  const res = await axios.patch(`${API}/operator/bookings/${bookingId}/status`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const updateTripOperationalStatus = async (tripId, data, token) => {
  const res = await axios.patch(`${API}/operator/trips/${tripId}/status`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
