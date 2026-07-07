import { Routes, Route, Navigate } from "react-router-dom";

import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import TripPlanner from "../pages/TripPlanner";
import TripDetails from "../pages/TripDetails";
import SavedTrips from "../pages/SavedTrips";
import Profile from "../pages/Profile";
import Map from "../pages/Map";
import DetailedItinerary from "../pages/DetailedItinerary";
import HotelDetails from "../pages/HotelDetails";
import ProtectedRoute from "./ProtectedRoute";
import TravelDetails from "../pages/TravelDetails";
import FoodDining from "../pages/FoodDining";
import Essentials from "../pages/Essentials";

function AppRoutes() {
  return (
    <Routes>
      {/* Redirect root */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Protected Routes */}
      <Route
        path="/planner"
        element={
          <ProtectedRoute>
            <TripPlanner />
          </ProtectedRoute>
        }
      />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id"
        element={
          <ProtectedRoute>
            <TripDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute>
            <SavedTrips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <Map />
          </ProtectedRoute>
        }
      />
      <Route path="/itinerary/:tripId" element={<DetailedItinerary />} />
      <Route path="/hotel-details" element={<HotelDetails />} />{" "}
      <Route path="/travel-details" element={<TravelDetails />} />
      <Route path="/food" element={<FoodDining />} />
      <Route path="/essentials" element={<Essentials />} />
    </Routes>
  );
}

export default AppRoutes;
