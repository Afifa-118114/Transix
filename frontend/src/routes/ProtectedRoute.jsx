import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If user's role is not allowed, redirect them to their native dashboard
    if (user.role === "operator") {
      return <Navigate to="/operator/dashboard" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}

export default ProtectedRoute;
