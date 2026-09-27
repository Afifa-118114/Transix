import { Capacitor } from "@capacitor/core";

/**
 * Transix Centralized API Configuration
 * Configured for Android Mobile Device & Web development using host IPv4: 192.168.93.99:5000
 */

const DEFAULT_LAN_HOST = "http://192.168.93.99:5000";

const getInitialBaseUrl = () => {
  // 1. Runtime override stored on device (e.g. if Wi-Fi IP changes)
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("transix_mobile_backend_url");
    if (customUrl && customUrl.trim()) {
      const clean = customUrl.trim().replace(/\/+$/, "");
      return clean.endsWith("/api") ? clean : `${clean}/api`;
    }
  }

  // 2. Use environment variable
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    // On native mobile devices, localhost / 127.0.0.1 / 10.0.2.2 cannot reach physical PC server
    if (
      Capacitor.isNativePlatform() &&
      (cleanUrl.includes("localhost") || cleanUrl.includes("127.0.0.1") || cleanUrl.includes("10.0.2.2"))
    ) {
      cleanUrl = cleanUrl
        .replace("localhost:5000", "192.168.93.99:5000")
        .replace("127.0.0.1:5000", "192.168.93.99:5000")
        .replace("10.0.2.2:5000", "192.168.93.99:5000");
    }
    return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
  }

  // 3. Fallbacks based on platform
  if (Capacitor.isNativePlatform()) {
    return `${DEFAULT_LAN_HOST}/api`;
  }

  return `${DEFAULT_LAN_HOST}/api`;
};

export const API_BASE_URL = getInitialBaseUrl();

/**
 * Root URL of the backend (without `/api` suffix)
 * e.g. "http://192.168.93.99:5000"
 */
export const BACKEND_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, "");

/**
 * Resolves an API path cleanly against API_BASE_URL
 * @param {string} path - e.g. "/trips" or "trips"
 * @returns {string} - full URL
 */
export const resolveApiUrl = (path = "") => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Set custom mobile backend URL (e.g. if Wi-Fi router assigns a different IP)
 * @param {string} url - e.g. "http://192.168.93.99:5000"
 */
export const setMobileBackendUrl = (url) => {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("transix_mobile_backend_url", url.trim());
    } else {
      localStorage.removeItem("transix_mobile_backend_url");
    }
  }
};

export default API_BASE_URL;
