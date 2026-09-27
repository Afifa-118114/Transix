import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiPlus,
  FiArrowRight,
  FiShield,
  FiCheckCircle,
  FiStar,
  FiMapPin,
  FiCalendar,
  FiBriefcase,
  FiAward,
  FiFileText,
  FiSearch,
  FiClock,
  FiX,
  FiExternalLink,
} from "react-icons/fi";
import DashboardLayout from "../layouts/DashboardLayout";

// Pre-curated Popular Campus IV Programs adhering to Trip.com card system
const POPULAR_CAMPUS_PROGRAMS = [
  {
    id: "blr-tech",
    title: "Bengaluru Tech & AI Innovation Hub",
    destination: "Bengaluru, Karnataka",
    category: "Computer Science & IT",
    duration: "4 Days / 3 Nights",
    rating: 4.9,
    reviewsCount: 312,
    badge: "Trending #1",
    badgeType: "accent", // accent orange
    pricePerStudent: 7499,
    originalPrice: 9999,
    image:
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80",
    industryVisits: ["Infosys Campus Walkthrough", "ISRO Heritage Center", "AI Cloud Incubation Lab"],
    inclusions: ["3-Star Hotel Twin Sharing", "AC Volvo Bus", "All Breakfasts & Dinners", "Industry Entry Permits"],
    description:
      "Comprehensive technology exposure visit covering India's silicon capital. Students engage with senior engineers and explore live cloud data center infrastructures."
  },
  {
    id: "pune-auto",
    title: "Pune Automotive & Robotics Corridor",
    destination: "Pune, Maharashtra",
    category: "Mechanical & Robotics",
    duration: "4 Days / 3 Nights",
    rating: 4.8,
    reviewsCount: 245,
    badge: "Faculty Choice",
    badgeType: "primary", // primary blue
    pricePerStudent: 6899,
    originalPrice: 8999,
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
    industryVisits: ["Automotive Assembly Line", "CNC Precision Machining Center", "Clean EV Battery Lab"],
    inclusions: ["Industrial Zone Stay", "Private Coach", "Safety PPE Kits", "Plant Engineer Sessions"],
    description:
      "Hands-on manufacturing tour through Maharashtra's automotive belt, featuring live robotic welding, vehicle endurance testing, and green mobility production."
  },
  {
    id: "manali-eco",
    title: "Himachal Hydro-Power & Ecology Field Study",
    destination: "Manali & Kullu Valley",
    category: "Civil, Environmental & MBA",
    duration: "5 Days / 4 Nights",
    rating: 4.9,
    reviewsCount: 420,
    badge: "Top Rated",
    badgeType: "success", // success green
    pricePerStudent: 8999,
    originalPrice: 11999,
    image:
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80",
    industryVisits: ["Atal Tunnel Engineering Complex", "Larji Hydroelectric Station", "Sustainable Himalayan Forestry Center"],
    inclusions: ["Mountain Resort Accommodation", "Campfire Networking", "Certified Safety Guides", "Cold Climate Transport"],
    description:
      "Unmatched civil engineering marvels paired with ecological conservation research in high-altitude terrain. Ideal for interdisciplinary college batches."
  },
  {
    id: "hyd-pharma",
    title: "Hyderabad Genome Valley & Pharma Hub",
    destination: "Hyderabad, Telangana",
    category: "Biotechnology & Pharmacy",
    duration: "3 Days / 2 Nights",
    rating: 4.8,
    reviewsCount: 189,
    badge: "Best Value",
    badgeType: "accent",
    pricePerStudent: 5999,
    originalPrice: 7999,
    image:
      "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80",
    industryVisits: ["Biopharma Formulation Plant", "Vaccine Innovation Center", "T-Hub Tech Incubator"],
    inclusions: ["Twin-Share Corporate Stay", "AC Transit Fleet", "Q&A with Lead Scientists", "Certificate of Participation"],
    description:
      "Deep dive into pharmaceutical formulations, regulatory microbiology standards, and startup incubation ecosystems across Genome Valley."
  }
];

export default function CampusLanding() {
  const navigate = useNavigate();

  // Widget active tab: 'JOIN' | 'ORGANIZE' | 'EXPLORE'
  const [activeTab, setActiveTab] = useState("JOIN");

  // Join form state
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Quick organizer form state (Tab 2)
  const [quickOrg, setQuickOrg] = useState({
    collegeName: "",
    destination: "Bengaluru",
    department: "Computer Science",
    expectedStudents: 50,
  });

  // Modal for previewing sample package details
  const [previewProgram, setPreviewProgram] = useState(null);

  const sampleCodes = [
    { code: "MHSSCE-MANALI-A1B2", label: "Manali Ecology IV" },
    { code: "VESIT-BLR-TECH", label: "Bengaluru Tech Tour" },
    { code: "IIT-PUNE-AUTO", label: "Pune Robotics IV" },
  ];

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");
      const endpoint = baseUrl.endsWith("/api")
        ? `${baseUrl}/campus-trips/join`
        : `${baseUrl}/api/campus-trips/join`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ joinCode: joinCode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigate(`/campus/${data.tripId}/participant`);
      } else {
        setError(data.message || "Invalid or expired IV code. Please check with your coordinator.");
      }
    } catch (err) {
      setError("Unable to connect to the verification server. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickOrganizeSubmit = (e) => {
    e.preventDefault();
    navigate("/campus/create", { state: { initialConfig: quickOrg } });
  };

  return (
    <DashboardLayout trip={null} setTrip={() => {}}>
      <div className="pb-16 max-w-[1200px] mx-auto text-slate-900 dark:text-slate-100">
        
        {/* ========================================================= */}
        {/* 1. HERO BANNER (Trip.com Deep Blue Gradient: #1A56DB -> #0F3D91) */}
        {/* ========================================================= */}
        <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-[#1A56DB] via-[#154BC0] to-[#0F3D91] text-white p-6 sm:p-10 lg:p-12 pb-24 sm:pb-28">
          {/* Subtle geometric travel pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-64 h-64 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            {/* Top Micro-Trust Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Campus & Industrial Tour Intelligence</span>
              <span className="opacity-60">|</span>
              <span className="text-cyan-200">500+ University Batches Coordinated</span>
            </div>

            {/* H1 - Sentence case, benefit-driven, restrained */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Student travel, faculty approvals, and industrial visits in one place
            </h1>
            
            <p className="mt-3 text-sm sm:text-base text-blue-100/90 max-w-2xl leading-relaxed">
              Curate certified industry permits, coordinate registrations, and maintain 
              live student tracking with Transix’s university-approved travel system.
            </p>

            {/* Quick stats row */}
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-blue-100/80">
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 text-sm" />
                <span>Pre-cleared Industry Visits</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 text-sm" />
                <span>Automated Faculty Approval Packs</span>
              </div>
              <div className="flex items-center gap-2">
                <FiCheckCircle className="text-emerald-400 text-sm" />
                <span>SOS Geolocation Safety</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2. ELEVATED ACTION WIDGET (Overlaps Hero by -48px / -60px) */}
        {/* ========================================================= */}
        <div className="relative z-20 -mt-16 sm:-mt-20 px-2 sm:px-6">
          <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-[#EBEBEB] dark:border-slate-800 shadow-[0_12px_32px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300">
            
            {/* Widget Horizontal Tabs (Trip.com signature tab bar) */}
            <div className="flex items-center border-b border-[#EBEBEB] dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 px-4 sm:px-6 pt-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("JOIN")}
                className={`flex items-center gap-2 pb-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "JOIN"
                    ? "border-[#287DFA] text-[#0064D2] dark:text-[#287DFA]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <FiUsers className="text-base" />
                <span>Join with IV Code</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ORGANIZE")}
                className={`flex items-center gap-2 pb-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "ORGANIZE"
                    ? "border-[#287DFA] text-[#0064D2] dark:text-[#287DFA]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <FiPlus className="text-base" />
                <span>Organize a New IV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("EXPLORE");
                  const el = document.getElementById("trending-programs");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={`flex items-center gap-2 pb-3.5 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "EXPLORE"
                    ? "border-[#287DFA] text-[#0064D2] dark:text-[#287DFA]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <FiBriefcase className="text-base" />
                <span>Explore Verified Itineraries</span>
              </button>
            </div>

            {/* Tab 1 Content: JOIN TRIP */}
            {activeTab === "JOIN" && (
              <div className="p-6 sm:p-8">
                <form onSubmit={handleJoin} className="flex flex-col lg:flex-row items-stretch gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Enter Unique IV Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => {
                          setJoinCode(e.target.value.toUpperCase());
                          if (error) setError(null);
                        }}
                        placeholder="e.g. MHSSCE-MANALI-A1B2"
                        className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287DFA] focus:border-transparent transition"
                        required
                      />
                      <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-mono">
                        [CODE]
                      </span>
                    </div>
                  </div>

                  <div className="lg:w-48 flex items-end">
                    <button
                      type="submit"
                      disabled={isJoining}
                      className="w-full h-12 px-6 rounded-xl bg-gradient-to-r from-[#287DFA] to-[#0064D2] hover:from-[#1A6FEA] hover:to-[#0055B8] text-white text-sm font-bold shadow-md hover:shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isJoining ? (
                        <span>Verifying...</span>
                      ) : (
                        <>
                          <span>Join Trip Now</span>
                          <FiArrowRight className="text-base" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {error && (
                  <div className="mt-3.5 p-3 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2">
                    <FiX className="text-sm shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Quick Code helper chips */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">Quick Demo Codes:</span>
                    {sampleCodes.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setJoinCode(item.code)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-[#0064D2] transition cursor-pointer"
                        title={item.label}
                      >
                        {item.code}
                      </button>
                    ))}
                  </div>

                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <FiShield className="text-emerald-500" /> End-to-End Encrypted Student Records
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2 Content: ORGANIZE NEW TRIP */}
            {activeTab === "ORGANIZE" && (
              <div className="p-6 sm:p-8">
                <form onSubmit={handleQuickOrganizeSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        College / University Name
                      </label>
                      <input
                        type="text"
                        required
                        value={quickOrg.collegeName}
                        onChange={(e) => setQuickOrg({ ...quickOrg, collegeName: e.target.value })}
                        placeholder="e.g. MHSSCE Engineering"
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287DFA]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Destination
                      </label>
                      <select
                        value={quickOrg.destination}
                        onChange={(e) => setQuickOrg({ ...quickOrg, destination: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287DFA]"
                      >
                        <option value="Bengaluru">Bengaluru (IT & Aerospace)</option>
                        <option value="Pune">Pune (Automotive & Robotics)</option>
                        <option value="Manali">Manali & Kullu (Hydro & Ecology)</option>
                        <option value="Hyderabad">Hyderabad (Pharma & Biotech)</option>
                        <option value="Goa">Goa (Marine Logistics & Tourism)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Target Department
                      </label>
                      <select
                        value={quickOrg.department}
                        onChange={(e) => setQuickOrg({ ...quickOrg, department: e.target.value })}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287DFA]"
                      >
                        <option value="Computer Science">Computer Science / IT</option>
                        <option value="Mechanical">Mechanical / Robotics</option>
                        <option value="Civil & Environment">Civil & Environmental</option>
                        <option value="Biotechnology">Biotechnology / Pharmacy</option>
                        <option value="Management">MBA & Commerce</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Expected Students
                      </label>
                      <input
                        type="number"
                        min="15"
                        max="300"
                        value={quickOrg.expectedStudents}
                        onChange={(e) => setQuickOrg({ ...quickOrg, expectedStudents: Number(e.target.value) })}
                        className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287DFA]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Step 1 of 4: Setup itinerary, add plant visits, configure student installments & permissions.
                    </p>

                    <button
                      type="submit"
                      className="w-full sm:w-auto h-11 px-6 rounded-xl bg-[#287DFA] hover:bg-[#0064D2] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-blue-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <span>Continue to Tour Builder</span>
                      <FiArrowRight className="text-sm" />
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. TRUST & VALUE PROPOSITION REASSURANCE STRIP (Trip.com Sec 10) */}
        {/* ========================================================= */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#EBEBEB] dark:border-slate-800 shadow-2xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#287DFA] text-xl shrink-0">
              <FiBriefcase />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Pre-Approved Industry Visits
              </h4>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Direct plant permissions for manufacturing, cloud & labs.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#EBEBEB] dark:border-slate-800 shadow-2xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#00A65E] text-xl shrink-0">
              <FiShield />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                SOS & Fleet Geotracking
              </h4>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live bus monitoring, emergency lines, and check-in badges.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#EBEBEB] dark:border-slate-800 shadow-2xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 text-xl shrink-0">
              <FiFileText />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Faculty Approval Dossier
              </h4>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                1-click PDF budget reports and HOD consent agreements.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131b2e] border border-[#EBEBEB] dark:border-slate-800 shadow-2xs flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 text-xl shrink-0">
              <FiAward />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Student Group Concessions
              </h4>
              <p className="mt-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Negotiated wholesale tier pricing for stays and transport.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. TRENDING CAMPUS IV ITINERARIES (Trip.com Repeating Cards) */}
        {/* ========================================================= */}
        <div id="trending-programs" className="mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Verified Curriculum Study Tours</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#0064D2] dark:text-[#287DFA] font-medium">
                  Academic Ready
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Field-tested itineraries with industry permissions, twin-sharing accommodations, and verified logistics.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/campus/create")}
              className="text-xs font-semibold text-[#0064D2] dark:text-[#287DFA] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Build Custom Program</span>
              <FiArrowRight className="text-xs" />
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {POPULAR_CAMPUS_PROGRAMS.map((prog) => (
              <div
                key={prog.id}
                className="group flex flex-col justify-between rounded-2xl bg-white dark:bg-[#131b2e] border border-[#EBEBEB] dark:border-slate-800 overflow-hidden shadow-2xs hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => setPreviewProgram(prog)}
              >
                {/* Card Top: Image + Pill Badges */}
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={prog.image}
                      alt={prog.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient shade over image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {/* Badge top-left */}
                    <span
                      className={`absolute top-2.5 left-2.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md text-white shadow-xs ${
                        prog.badgeType === "accent"
                          ? "bg-[#FF6600]"
                          : prog.badgeType === "success"
                          ? "bg-[#00A65E]"
                          : "bg-[#287DFA]"
                      }`}
                    >
                      {prog.badge}
                    </span>

                    {/* Category pill bottom-left */}
                    <span className="absolute bottom-2 left-2.5 text-[11px] font-medium text-white/95 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-xs">
                      {prog.category}
                    </span>
                  </div>

                  {/* Card Content Padding */}
                  <div className="p-4 space-y-2.5">
                    {/* Destination + Duration */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium truncate max-w-[140px]">
                        <FiMapPin className="text-[#287DFA] text-xs shrink-0" />
                        <span className="truncate">{prog.destination}</span>
                      </span>
                      <span className="flex items-center gap-1 font-medium shrink-0">
                        <FiCalendar className="text-xs" />
                        <span>{prog.duration}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug group-hover:text-[#0064D2] dark:group-hover:text-[#287DFA] transition-colors">
                      {prog.title}
                    </h3>

                    {/* Rating row (Trip.com Yellow Star + Score + Count) */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                        <FiStar className="text-amber-500 fill-amber-400 text-xs" />
                        <span>{prog.rating}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ({prog.reviewsCount} verified reviews)
                      </span>
                    </div>

                    {/* Industry Visits Snippet */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                        Key Industry Visits:
                      </span>
                      <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                        {prog.industryVisits.slice(0, 2).map((visit, i) => (
                          <li key={i} className="truncate flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-[#287DFA]" />
                            <span className="truncate">{visit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Price & CTA */}
                <div className="p-4 pt-0">
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">From</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{prog.pricePerStudent.toLocaleString()}
                        </span>
                        <span className="text-[11px] text-slate-400 line-through">
                          ₹{prog.originalPrice.toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#00A65E] font-semibold">
                        All Inclusions Covered
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewProgram(prog);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-[#287DFA] text-[#0064D2] hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Quick View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5. COORDINATOR WORKFLOW SECTION */}
        {/* ========================================================= */}
        <div className="mt-16 p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-[#101726] border border-[#EBEBEB] dark:border-slate-800">
          <div className="max-w-2xl">
            <span className="text-[11px] uppercase font-bold tracking-wider text-[#287DFA] mb-1 block">
              How Transix Campus Works
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              End-to-End Coordination Workflow for Colleges
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              From academic curriculum alignment to on-trip safety surveillance.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="relative flex flex-col">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0064D2] dark:text-[#287DFA] flex items-center justify-center font-bold text-sm mb-3">
                01
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Build & Select Visits</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Choose pre-cleared industrial complexes, research labs, and transit routes.
              </p>
            </div>

            <div className="relative flex flex-col">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0064D2] dark:text-[#287DFA] flex items-center justify-center font-bold text-sm mb-3">
                02
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Faculty Permission Pack</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Export verified budget breakdowns and principal approval documentation.
              </p>
            </div>

            <div className="relative flex flex-col">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0064D2] dark:text-[#287DFA] flex items-center justify-center font-bold text-sm mb-3">
                03
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student IV Code Sharing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Students enter code, verify ID proofs, and track installment payment status.
              </p>
            </div>

            <div className="relative flex flex-col">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-[#0064D2] dark:text-[#287DFA] flex items-center justify-center font-bold text-sm mb-3">
                04
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live On-Tour Tracking</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Real-time headcounts, bus GPS tracking, and instant SOS alerts for coordinators.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 6. SAMPLE PROGRAM PREVIEW MODAL */}
        {/* ========================================================= */}
        {previewProgram && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-xl max-h-[85vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="relative h-44 overflow-hidden">
                <img
                  src={previewProgram.image}
                  alt={previewProgram.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <button
                  type="button"
                  onClick={() => setPreviewProgram(null)}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition cursor-pointer"
                >
                  <FiX className="text-lg" />
                </button>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#287DFA] text-white">
                    {previewProgram.category}
                  </span>
                  <h3 className="text-lg font-bold mt-1 text-white leading-tight">
                    {previewProgram.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-200 mt-0.5">
                    <span>{previewProgram.destination}</span>
                    <span>•</span>
                    <span>{previewProgram.duration}</span>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {previewProgram.description}
                </p>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                    Confirmed Industry & Field Stops:
                  </h4>
                  <div className="space-y-1.5">
                    {previewProgram.industryVisits.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <FiCheckCircle className="text-emerald-500 shrink-0 text-sm" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider mb-2">
                    Package Inclusions:
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                    {previewProgram.inclusions.map((inc, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#287DFA]" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Institutional Rate</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-[#0064D2] dark:text-[#287DFA]">
                        ₹{previewProgram.pricePerStudent.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-400 line-through">
                        ₹{previewProgram.originalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                    Save ₹{(previewProgram.originalPrice - previewProgram.pricePerStudent).toLocaleString()} / student
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewProgram(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewProgram(null);
                    navigate("/campus/create", { state: { prefillProgram: previewProgram } });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#287DFA] hover:bg-[#0064D2] text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <span>Customize this IV for your College</span>
                  <FiArrowRight />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
