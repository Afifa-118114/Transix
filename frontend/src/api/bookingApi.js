import axios from "axios";

const API = import.meta.env.VITE_API_URL;

/**
 * Prebook entire tour (Hotels + Flights/Trains)
 * Initiates Razorpay Order and locks inventory
 */
export const prebookTour = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/bookings/orchestrator/prebook`, payload, { headers });
  return res.data;
};

/**
 * Confirm tour booking after Razorpay payment verification
 */
export const confirmTourBooking = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/bookings/orchestrator/confirm`, payload, { headers });
  return res.data;
};

/**
 * Get master booking status, PNRs, and voucher URLs
 */
export const getTourBookingStatus = async (tripId, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get(`${API}/bookings/orchestrator/trip/${tripId}`, { headers });
  return res.data;
};

/**
 * Direct Hotel Prebook (LiteAPI / Nuitee)
 */
export const prebookHotel = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/hotels/prebook`, payload, { headers });
  return res.data;
};

/**
 * Direct Hotel Booking Confirmation
 */
export const confirmHotel = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/hotels/book`, payload, { headers });
  return res.data;
};

/**
 * Operator One-Click Automated Booking
 */
export const operatorAutoBookTour = async (payload, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.post(`${API}/bookings/orchestrator/operator-auto-book`, payload, { headers });
  return res.data;
};

