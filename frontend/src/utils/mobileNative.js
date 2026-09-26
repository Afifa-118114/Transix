import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

/**
 * Initializes native Android device integrations if running inside Capacitor
 * @param {object} options
 * @param {function} options.onNavigateBack - callback when back button is pressed
 * @param {boolean} options.isDarkMode - current theme
 */
export const initMobileNative = ({ onNavigateBack, isDarkMode = true } = {}) => {
  if (!Capacitor.isNativePlatform()) return () => {};

  // 1. Hide splash screen smoothly
  SplashScreen.hide().catch(() => {});

  // 2. Configure Status Bar
  try {
    StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    }).catch(() => {});

    StatusBar.setBackgroundColor({
      color: isDarkMode ? "#0b0f19" : "#ffffff",
    }).catch(() => {});

    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  } catch (err) {
    // quiet
  }

  // 3. Android Hardware Back Button listener
  let backListener = null;
  try {
    backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
      // Check if any open modals or overlays exist in DOM
      const hasOpenModal = document.querySelector('[role="dialog"], .fixed.inset-0.z-50');
      if (hasOpenModal) {
        // Try pressing Escape to close modal
        const escEvent = new KeyboardEvent("keydown", { key: "Escape", code: "Escape" });
        window.dispatchEvent(escEvent);
        return;
      }

      if (onNavigateBack && typeof onNavigateBack === "function") {
        onNavigateBack(canGoBack);
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapApp.minimizeApp().catch(() => {});
      }
    });
  } catch (err) {
    // quiet
  }

  return () => {
    if (backListener && backListener.remove) {
      backListener.remove();
    }
  };
};

/**
 * Update Status Bar color dynamically upon theme change
 */
export const updateMobileStatusBar = (isDark) => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    }).catch(() => {});

    StatusBar.setBackgroundColor({
      color: isDark ? "#0b0f19" : "#ffffff",
    }).catch(() => {});
  } catch (err) {}
};
