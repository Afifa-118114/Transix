import axios from "axios";

const rawApi = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_BASE = rawApi.replace(/\/api\/?$/, "") + "/api/guides";

const authHeaders = (token) => ({
  headers: {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  },
});

/**
 * Get geographically matched guides for a trip
 */
export async function getMatchedGuidesForTrip(tripId, token) {
  const res = await axios.get(`${API_BASE}/match/${tripId}`, authHeaders(token));
  return res.data;
}

/**
 * Operator creates a Guide Request
 */
export async function createGuideRequest(tripId, guideId, requirementOverride, token) {
  const res = await axios.post(
    `${API_BASE}/requests`,
    { tripId, guideId, requirementOverride },
    authHeaders(token)
  );
  return res.data;
}

/**
 * Get all guide requests sent for a trip
 */
export async function getTripGuideRequests(tripId, token) {
  const res = await axios.get(`${API_BASE}/requests/trip/${tripId}`, authHeaders(token));
  return res.data;
}

/**
 * Operator selects one or more guides for a trip
 */
export async function selectGuidesForTrip(tripId, guideIds, token) {
  const res = await axios.post(
    `${API_BASE}/select`,
    { tripId, guideIds },
    authHeaders(token)
  );
  return res.data;
}

/**
 * Finalize Guide arrangement for the trip
 */
export async function finalizeTripGuides(tripId, token) {
  const res = await axios.post(
    `${API_BASE}/finalize`,
    { tripId },
    authHeaders(token)
  );
  return res.data;
}

/**
 * Search 100 Guide Profiles
 */
export async function searchGuideProfiles(params = {}) {
  const res = await axios.get(`${API_BASE}/search`, { params });
  return res.data;
}

/**
 * Guide Login (1-click with guideId or email/password)
 */
export async function guideLogin(credentials) {
  const res = await axios.post(`${API_BASE}/auth/login`, credentials);
  return res.data;
}

/**
 * Get authenticated guide profile
 */
export async function getGuideMe(guideToken) {
  const res = await axios.get(`${API_BASE}/auth/me`, authHeaders(guideToken));
  return res.data;
}

/**
 * Get requests for Guide Portal (Marketplace inbox view: returns all requests by default)
 */
export async function getGuidePortalRequests(guideToken, guideId) {
  const params = {};
  if (guideId) {
    params.guideId = guideId;
  }
  const res = await axios.get(`${API_BASE}/portal/requests`, {
    params,
    ...authHeaders(guideToken),
  });
  return res.data;
}

/**
 * Get single guide request details with authenticated guide profile
 */
export async function getGuideRequestDetails(requestId, guideToken) {
  const res = await axios.get(`${API_BASE}/portal/requests/${requestId}`, authHeaders(guideToken));
  return res.data;
}

/**
 * Guide accepts or rejects a request
 */
export async function respondToGuideRequest(requestId, payload, guideToken) {
  const res = await axios.post(
    `${API_BASE}/portal/respond/${requestId}`,
    payload,
    authHeaders(guideToken)
  );
  return res.data;
}
