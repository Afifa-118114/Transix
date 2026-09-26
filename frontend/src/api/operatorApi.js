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

export const getOperatorBookings = async (token) => {
  const res = await axios.get(`${API}/operator/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOperatorAllVendorRequests = async (token) => {
  const res = await axios.get(`${API}/operator/all-vendor-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOperatorConversations = async (token) => {
  const res = await axios.get(`${API}/operator/conversations`, {
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

export const getTripMessages = async (tripId, token) => {
  const res = await axios.get(`${API}/operator/trips/${tripId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendTripMessage = async (tripId, data, token) => {
  const res = await axios.post(`${API}/operator/trips/${tripId}/messages`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getUnreadMessageCount = async (tripId, token) => {
  const res = await axios.get(`${API}/operator/trips/${tripId}/messages/unread`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const markMessagesRead = async (tripId, token) => {
  const res = await axios.patch(`${API}/operator/trips/${tripId}/messages/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

// ==========================================
// CAMPUS GROUP FLEET VENDOR APIS
// ==========================================

export const getTripFleetVendors = async (tripId, token) => {
  const res = await axios.get(`${API}/operator/trips/${tripId}/fleet-vendors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendFleetVendorRequests = async (tripId, vendorIdsData, token) => {
  const vendorIds = Array.isArray(vendorIdsData)
    ? vendorIdsData
    : (vendorIdsData?.vendorIds ? vendorIdsData.vendorIds : []);
  const res = await axios.post(
    `${API}/operator/trips/${tripId}/fleet-vendor-requests`,
    { vendorIds },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const getTripFleetVendorRequests = async (tripId, token) => {
  const res = await axios.get(`${API}/operator/trips/${tripId}/fleet-vendor-requests`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const selectFleetVendor = async (tripId, requestId, token) => {
  const res = await axios.post(
    `${API}/operator/trips/${tripId}/fleet-vendor-selection`,
    { requestId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const requestFleetVendorConfirmation = async (tripId, requestId, token) => {
  const res = await axios.post(
    `${API}/operator/trips/${tripId}/fleet-vendor-confirmation-request`,
    { requestId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

export const getAllVendors = async (params = {}, token) => {
  const res = await axios.get(`${API}/operator/vendors`, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getOperatorVendorRequestMessages = async (requestId, token) => {
  const res = await axios.get(`${API}/operator/vendor-requests/${requestId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const sendOperatorVendorRequestMessage = async (requestId, message, token) => {
  const res = await axios.post(
    `${API}/operator/vendor-requests/${requestId}/messages`,
    { message },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
};

// ==========================================
// VENDOR PORTAL APIS (Isolated Vendor Session)
// ==========================================

export const vendorLogin = async (credentials) => {
  const res = await axios.post(`${API}/vendor/auth/login`, credentials);
  return res.data;
};

export const getVendorMe = async (vendorToken) => {
  const res = await axios.get(`${API}/vendor/me`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  return res.data;
};

export const searchConnectedVendors = async (q = "") => {
  const res = await axios.get(`${API}/vendor/search`, {
    params: { q },
  });
  return res.data;
};

export const getActiveRequestVendors = async () => {
  const res = await axios.get(`${API}/vendor/active-vendors`);
  return res.data;
};

export const getVendorPortalRequests = async (params = {}, vendorToken) => {
  const res = await axios.get(`${API}/vendor/requests`, {
    params,
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  return res.data;
};

export const getVendorRequestDetails = async (requestId, vendorToken) => {
  const res = await axios.get(`${API}/vendor/requests/${requestId}`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  return res.data;
};

export const acceptVendorRequest = async (requestId, vendorToken) => {
  const res = await axios.post(
    `${API}/vendor/requests/${requestId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${vendorToken}` } }
  );
  return res.data;
};

export const rejectVendorRequest = async (requestId, payload, vendorToken) => {
  const res = await axios.post(
    `${API}/vendor/requests/${requestId}/reject`,
    payload,
    { headers: { Authorization: `Bearer ${vendorToken}` } }
  );
  return res.data;
};

export const submitVendorResponse = async (requestId, data, vendorToken) => {
  const res = await axios.post(
    `${API}/vendor/requests/${requestId}/response`,
    data,
    { headers: { Authorization: `Bearer ${vendorToken}` } }
  );
  return res.data;
};

export const confirmVendorRequest = async (requestId, action, vendorToken) => {
  const res = await axios.post(
    `${API}/vendor/requests/${requestId}/confirm`,
    { action },
    { headers: { Authorization: `Bearer ${vendorToken}` } }
  );
  return res.data;
};

export const getVendorRequestMessages = async (requestId, vendorToken) => {
  const res = await axios.get(`${API}/vendor/requests/${requestId}/messages`, {
    headers: { Authorization: `Bearer ${vendorToken}` },
  });
  return res.data;
};

export const sendVendorRequestMessage = async (requestId, message, vendorToken) => {
  const res = await axios.post(
    `${API}/vendor/requests/${requestId}/messages`,
    { message },
    { headers: { Authorization: `Bearer ${vendorToken}` } }
  );
  return res.data;
};
