import { useState, useEffect } from "react";

export function getOperatorTheme() {
  try {
    return localStorage.getItem("operator_theme") || "light";
  } catch {
    return "light";
  }
}

export function setOperatorTheme(theme) {
  try {
    localStorage.setItem("operator_theme", theme);
    window.dispatchEvent(new CustomEvent("operator_theme_change", { detail: theme }));
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch {}
}

export function useOperatorTheme() {
  const [theme, setThemeState] = useState(getOperatorTheme);

  useEffect(() => {
    // Initial sync with documentElement
    const initial = getOperatorTheme();
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const handleThemeChange = (e) => {
      const newTheme = e.detail || getOperatorTheme();
      setThemeState(newTheme);
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    window.addEventListener("operator_theme_change", handleThemeChange);
    return () => window.removeEventListener("operator_theme_change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setOperatorTheme(next);
    setThemeState(next);
  };

  return { theme, isDark: theme === "dark", toggleTheme, setTheme: setOperatorTheme };
}
