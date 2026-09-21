import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Upload single guide verification document to Cloudinary
 * @param {File} file
 */
export const uploadGuideDocument = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API}/guide/upload-document`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

/**
 * Get secure preview stream URL for Cloudinary document
 * @param {string} publicId
 * @param {string} url
 */
export const getDocumentPreviewUrl = (publicId, url) => {
  if (!publicId && !url) return "";
  const params = new URLSearchParams();
  if (publicId) params.append("publicId", publicId);
  if (url) params.append("url", url);
  return `${API}/guide/documents/preview?${params.toString()}`;
};

/**
 * Submit guide application for verification
 * @param {object} applicationData
 */
export const submitGuideApplication = async (applicationData) => {
  const response = await axios.post(`${API}/guide/apply`, applicationData, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

/**
 * Get guide application status and timeline by ID or applicationNumber
 * @param {string} id
 */
export const getGuideApplicationStatus = async (id) => {
  const response = await axios.get(`${API}/guide/status/${id}`);
  return response.data;
};
