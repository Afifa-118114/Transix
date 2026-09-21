import { useState, useEffect } from "react";
import {
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiCheckCircle,
  FiSave,
  FiSliders,
  FiAward,
  FiCompass,
  FiHeart,
  FiCoffee,
} from "react-icons/fi";
import {
  FaTrainSubway,
  FaPlaneDeparture,
  FaHotel,
  FaUtensils,
  FaLeaf,
  FaPassport,
} from "react-icons/fa6";
import toast from "react-hot-toast";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useTripBuilder } from "../context/TripBuilderContext";

export default function Profile() {
  const { user, token, login } = useAuth();
  const { trip, setTrip } = useTripBuilder();

  // Load profile state
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("transix_user_profile");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      fullName: user?.name || "Devendra Sharma",
      email: user?.email || "devendra.sharma@transix.in",
      phone: user?.phone || "+91 98201 45892",
      city: "Mumbai, Maharashtra",
      irctcId: "DEV_SHARMA_IRCTC",
      gender: "Male",
      dob: "1994-06-18",
      emergencyContactName: "Pooja Sharma",
      emergencyContactPhone: "+91 98201 45893",
      travelMode: "Train",
      berthPreference: "Lower Berth / Window",
      railClass: "Executive Chair Car (EC)",
      dietaryPreference: "Pure Vegetarian",
      hotelType: "Heritage & Boutique",
      travelPace: "Relaxed & Immersive",
      smsAlerts: true,
      emailItineraries: true,
    };
  });

  const [activeTab, setActiveTab] = useState("preferences"); // preferences, credentials, settings

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("transix_user_profile", JSON.stringify(profile));

    // Update auth user if available
    if (user) {
      const updatedUser = { ...user, name: profile.fullName, email: profile.email };
      login(updatedUser, token);
    }

    toast.success("Profile and travel preferences updated successfully!");
  };

  const getInitials = (name) => {
    if (!name) return "TX";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout trip={trip} setTrip={setTrip}>
      <div className="min-h-screen bg-white text-stone-900 pb-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          {/* Header Section */}
          <div className="border-b border-stone-200 pb-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#034F46]/10 text-[#034F46]">
                <FiUser className="text-sm" />
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                Traveler Profile &amp; Preferences
              </h1>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Manage your personal transit identity, rail pass credentials, booking defaults, and AI planning priorities
            </p>
          </div>

          {/* User Hero Card */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/70 p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#034F46] text-white shadow-md">
                <span className="font-serif text-2xl font-bold tracking-wider">
                  {getInitials(profile.fullName)}
                </span>
              </div>

              {/* User Bio */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h2 className="font-serif text-xl font-bold text-stone-900">
                        {profile.fullName}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
                        <FiCheckCircle className="text-[10px]" />
                        <span>Verified Explorer</span>
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{profile.city}</p>
                  </div>

                  {/* Tier Badge */}
                  <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 self-center sm:self-auto">
                    <FiAward className="text-amber-700" />
                    <span>Transix Premier Passholder</span>
                  </div>
                </div>

                {/* Contact Meta */}
                <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <FiMail className="text-stone-400" />
                    <span>{profile.email}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiPhone className="text-stone-400" />
                    <span>{profile.phone}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-stone-500">
                    <FaPassport className="text-stone-400" />
                    <span>IRCTC: {profile.irctcId}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Travel Footprint Metrics */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-stone-200/80 pt-4 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Expeditions</span>
                <p className="font-serif text-lg font-bold text-stone-900">14</p>
                <p className="text-[10px] text-stone-500">Completed Tours</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rail Distance</span>
                <p className="font-serif text-lg font-bold text-[#034F46]">8,420 km</p>
                <p className="text-[10px] text-stone-500">Kaggle Verified</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Carbon Saved</span>
                <p className="font-serif text-lg font-bold text-emerald-700">740 kg</p>
                <p className="text-[10px] text-stone-500">vs Flight Equivalent</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Pass Points</span>
                <p className="font-serif text-lg font-bold text-amber-800">3,250</p>
                <p className="text-[10px] text-stone-500">Eco Transit Credits</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex items-center gap-2 border-b border-stone-200 pb-1">
            <button
              onClick={() => setActiveTab("preferences")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "preferences"
                  ? "border-[#034F46] text-[#034F46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <FiSliders className="text-xs" />
              <span>Travel &amp; Transit Preferences</span>
            </button>
            <button
              onClick={() => setActiveTab("credentials")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "credentials"
                  ? "border-[#034F46] text-[#034F46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <FaPassport className="text-xs" />
              <span>Identity &amp; IRCTC Credentials</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition ${
                activeTab === "settings"
                  ? "border-[#034F46] text-[#034F46]"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <FiShield className="text-xs" />
              <span>Booking Notifications</span>
            </button>
          </div>

          {/* Tab Content Form */}
          <form onSubmit={handleSave} className="mt-6 space-y-6">
            {/* TAB 1: PREFERENCES */}
            {activeTab === "preferences" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <FaTrainSubway className="text-sm text-[#034F46]" />
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Rail &amp; Journey Priorities
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Preferred Primary Travel Mode
                      </label>
                      <select
                        name="travelMode"
                        value={profile.travelMode}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Train">High-Speed &amp; Scenic Rail (Recommended)</option>
                        <option value="Flight">Flight + Rail Multi-Modal</option>
                        <option value="Bus">Intercity Road Coach</option>
                      </select>
                      <p className="mt-1 text-[11px] text-stone-400">
                        Default transit selection in AI generator and tour planner
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Preferred Train Travel Class
                      </label>
                      <select
                        name="railClass"
                        value={profile.railClass}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Executive Chair Car (EC)">Executive Chair Car (EC / Vande Bharat)</option>
                        <option value="AC First Class (1A)">AC First Class (1A / Rajdhani)</option>
                        <option value="AC 2-Tier (2A)">AC 2-Tier (2A)</option>
                        <option value="AC 3-Tier (3A)">AC 3-Tier (3A Comfort)</option>
                        <option value="AC Chair Car (CC)">AC Chair Car (CC)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Berth &amp; Seating Allocation
                      </label>
                      <select
                        name="berthPreference"
                        value={profile.berthPreference}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Lower Berth / Window">Lower Berth / Panoramic Window</option>
                        <option value="Side Lower">Side Lower Berth</option>
                        <option value="Middle Berth">Middle Berth</option>
                        <option value="Upper Berth">Upper Berth</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Travel Pace
                      </label>
                      <select
                        name="travelPace"
                        value={profile.travelPace}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Relaxed & Immersive">Relaxed &amp; Immersive (2-3 stops daily)</option>
                        <option value="Balanced Explorer">Balanced Explorer (4-5 stops daily)</option>
                        <option value="Rapid Expedition">Rapid Expedition (High intensity)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                    <FaHotel className="text-sm text-[#034F46]" />
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Stay &amp; Dining Defaults
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Hotel &amp; Accommodation Category
                      </label>
                      <select
                        name="hotelType"
                        value={profile.hotelType}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Heritage & Boutique">Heritage Havelis &amp; Boutique Stays</option>
                        <option value="5-Star Luxury">5-Star Luxury Resorts</option>
                        <option value="Premium Comfort">Premium Comfort Hotels (4-Star)</option>
                        <option value="Budget Explorer">Budget Explorer / Hostels</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        Dietary Preference
                      </label>
                      <select
                        name="dietaryPreference"
                        value={profile.dietaryPreference}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                      >
                        <option value="Pure Vegetarian">Pure Vegetarian</option>
                        <option value="Jain Food">Jain Preparation (No Onion/Garlic)</option>
                        <option value="Non-Vegetarian">Non-Vegetarian / Regional Specialties</option>
                        <option value="Vegan">Plant-Based / Vegan</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CREDENTIALS */}
            {activeTab === "credentials" && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <FaPassport className="text-sm text-[#034F46]" />
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    Official Transit Identity
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Full Name (as per Govt ID)
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={profile.fullName}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      IRCTC Registered User ID
                    </label>
                    <input
                      type="text"
                      name="irctcId"
                      value={profile.irctcId}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold font-mono text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-stone-400">
                      Used to pre-fill 1-click booking on IRCTC official portal
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={profile.dob}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={profile.gender}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Transgender">Transgender</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      name="emergencyContactName"
                      value={profile.emergencyContactName}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Emergency Contact Phone
                    </label>
                    <input
                      type="text"
                      name="emergencyContactPhone"
                      value={profile.emergencyContactPhone}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50/70 px-3.5 py-2 text-xs font-semibold text-stone-800 focus:border-[#034F46] focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SETTINGS & NOTIFICATIONS */}
            {activeTab === "settings" && (
              <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                  <FiShield className="text-sm text-[#034F46]" />
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    Transit Alerts &amp; Communication
                  </h3>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-50">
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        Real-Time Platform &amp; Delay SMS Alerts
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Receive instant dispatch alerts for scheduled train departures and platform allocations
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="smsAlerts"
                      checked={profile.smsAlerts}
                      onChange={handleChange}
                      className="h-4 w-4 accent-[#034F46] rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 cursor-pointer hover:bg-stone-50">
                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        Itinerary PDF &amp; Ticket Synchronization
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Send comprehensive offline itinerary packets to {profile.email}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="emailItineraries"
                      checked={profile.emailItineraries}
                      onChange={handleChange}
                      className="h-4 w-4 accent-[#034F46] rounded"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-between border-t border-stone-200 pt-5">
              <p className="text-xs text-stone-400">
                All preferences sync immediately across your tours and AI itinerary generation.
              </p>
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-[#034F46] px-6 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#023c35]"
              >
                <FiSave className="text-sm" />
                <span>Save Traveler Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
