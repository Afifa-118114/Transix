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
import StayPlanPage from "../pages/StayPlanPage";
import ProtectedRoute from "./ProtectedRoute";
import FoodDining from "../pages/FoodDining";
import Essentials from "../pages/Essentials";
import TravelOptionsPage from "../pages/TravelOptionsPage";
import OperatorDashboard from "../pages/operator/OperatorDashboard";
import OperatorTripList from "../pages/operator/OperatorTripList";
import OperatorTripDetails from "../pages/operator/OperatorTripDetails";
import OperatorVendors from "../pages/operator/OperatorVendors";
import OperatorBookings from "../pages/operator/OperatorBookings";
import OperatorActivities from "../pages/operator/OperatorActivities";
import OperatorVendorRequests from "../pages/operator/OperatorVendorRequests";
import OperatorChatPage from "../pages/operator/OperatorChatPage";
import DemoVendorPortal from "../pages/vendor/DemoVendorPortal";

import TourBuilder from "../pages/TourBuilder";
import CampusLanding from "../pages/CampusLanding";
import CampusCreate from "../pages/CampusCreate";
import CoordinatorDashboard from "../pages/CoordinatorDashboard";
import ParticipantDashboard from "../pages/ParticipantDashboard";

import LandingPage from "../pages/public/LandingPage";
import SampleItineraryPage from "../pages/public/SampleItineraryPage";
import JoinAsGuidePage from "../pages/public/JoinAsGuidePage";
import GuideVerificationStatusPage from "../pages/public/GuideVerificationStatusPage";
import GuidePortalPage from "../pages/guide/GuidePortalPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Showcase Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/journey-flow" element={<LandingPage defaultSection="journey-flow" />} />
      <Route path="/adaptive-travel" element={<LandingPage defaultSection="adaptive-travel" />} />
      <Route path="/why-transix" element={<LandingPage defaultSection="why-transix" />} />
      <Route path="/features" element={<LandingPage defaultSection="why-transix" />} />
      <Route path="/explore" element={<LandingPage defaultSection="why-transix" />} />
      <Route path="/sample-trips" element={<LandingPage defaultSection="sample-trips" />} />
      <Route path="/sample-trips/:id" element={<SampleItineraryPage />} />
      <Route path="/join-as-guide" element={<JoinAsGuidePage />} />
      <Route path="/guide/verification-status" element={<GuideVerificationStatusPage />} />
      <Route path="/guide/verification-status/:id" element={<GuideVerificationStatusPage />} />
      <Route path="/join-as-guide/status/:id" element={<GuideVerificationStatusPage />} />
      <Route path="/journey" element={<Navigate to="/home" replace />} />

      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Itinerary Planner Route — Questionnaire accessible prior to auth */}
      <Route path="/planner" element={<TripPlanner />} />

      {/* Protected Routes */}
      <Route
        path="/home"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/builder"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <TourBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-trip"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <TourBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tour-builder"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <TourBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip/:id"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <TripDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/saved"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
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
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <Map />
          </ProtectedRoute>
        }
      />
      <Route path="/itinerary/:tripId" element={<DetailedItinerary />} />
      <Route path="/itinerary/:tripId/stays" element={<StayPlanPage />} />
      <Route path="/hotel-details" element={<HotelDetails />} />
      <Route path="/food" element={<FoodDining />} />
      <Route path="/essentials" element={<Essentials />} />
      <Route path="/travel-options" element={<TravelOptionsPage />} />
      
      {/* Campus Trip Routes */}
      <Route
        path="/campus"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <CampusLanding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/create"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <CampusCreate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/:id/dashboard"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/campus/:id/participant"
        element={
          <ProtectedRoute allowedRoles={["traveler", "admin"]}>
            <ParticipantDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Operator Routes */}
      <Route path="/operator/dashboard" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorDashboard /></ProtectedRoute>} />
      <Route path="/operator/trips" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorTripList /></ProtectedRoute>} />
      <Route path="/operator/trips/:tripId" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorTripDetails /></ProtectedRoute>} />
      <Route path="/operator/bookings" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorBookings /></ProtectedRoute>} />
      <Route path="/operator/activities" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorActivities /></ProtectedRoute>} />
      <Route path="/operator/vendor-requests" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorVendorRequests /></ProtectedRoute>} />
      <Route path="/operator/chat" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorChatPage /></ProtectedRoute>} />
      <Route path="/operator/vendors" element={<ProtectedRoute allowedRoles={["operator", "admin"]}><OperatorVendors /></ProtectedRoute>} />

      {/* Demo Vendor Portal Route */}
      <Route path="/vendor/requests" element={<DemoVendorPortal />} />

      {/* Guide Portal Routes */}
      <Route path="/guide/portal" element={<GuidePortalPage />} />
      <Route path="/guide-portal" element={<GuidePortalPage />} />
    </Routes>
  );
}

export default AppRoutes;
