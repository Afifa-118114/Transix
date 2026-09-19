import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const getNotifications = async (token) => {
  const res = await axios.get(`${API}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const getUnreadNotificationCount = async (token) => {
  const res = await axios.get(`${API}/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const markNotificationRead = async (notificationId, token) => {
  const res = await axios.patch(`${API}/notifications/${notificationId}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

export const markAllNotificationsRead = async (token) => {
  const res = await axios.patch(`${API}/notifications/read-all`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
