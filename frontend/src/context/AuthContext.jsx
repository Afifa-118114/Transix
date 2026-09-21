import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  const login = (userData, authToken) => {
    // Clear any previous stray trip state before logging in a new user
    localStorage.removeItem("currentTrip");
    localStorage.removeItem("transix_builder_trip");
    window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: null }));

    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);

    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    
    // Completely wipe transient trip state to prevent data leakage
    localStorage.removeItem("currentTrip");
    localStorage.removeItem("transix_builder_trip");
    window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: null }));

    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
