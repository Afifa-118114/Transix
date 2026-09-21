import { useState } from "react";
import { Link } from "react-router-dom";
import { FiClock, FiMapPin, FiStar, FiCalendar, FiArrowRight, FiShield } from "react-icons/fi";
import { FaTrain, FaHotel, FaUtensils, FaMapLocationDot } from "react-icons/fa6";
import trainImg from "../../assets/travel/train.jpg";

export default function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState("rail");

  const tabs = [
    { id: "rail", label: "Express Rail Engine", icon: <FaTrain /> },
    { id: "ai", label: "AI Itinerary Concierge", icon: <FiCalendar /> },
    { id: "stays", label: "Station-Sync'd Stays", icon: <FaHotel /> },
    { id: "map", label: "Interactive Route Map", icon: <FaMapLocationDot /> },
  ];

  return (
    <section id="features" className="relative bg-[#faf9f5] py-24 sm:py-32 font-sans antialiased text-[#1A1A1A]">
      <div className="mx-auto max-w-6xl px-4 text-center">
        {/* Pill Tag */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-white px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#4e4e4e] shadow-xs">
          <span>The Travel OS Modules</span>
        </div>

        {/* Headline */}
        <h2
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="mt-6 text-4xl sm:text-6xl font-[300] leading-[1.08] tracking-[-1px] text-[#0c0a09]"
        >
          Everything in sync.
          <br />
          <em className="font-normal italic text-[#0c0a09]">Nothing left to chance.</em>
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg text-[#4e4e4e]">
          Switch between modules to see how Transix eliminates travel stress across every stage of
          your journey.
        </p>

        {/* Capsule Tab Switcher (Wispr Flow style) */}
        <div className="mt-10 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#e7e5e4] bg-[#f0efed] p-1.5 shadow-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-[#1A1A1A] text-white shadow-sm"
                  : "text-[#4e4e4e] hover:text-[#0c0a09]"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Interactive Dynamic Stage Card */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-[#e7e5e4] bg-white p-6 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.03)] text-left">
          {/* TAB 1: EXPRESS RAIL ENGINE */}
          {activeTab === "rail" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#034F46]">
                  Module 01 • Rail Synchronization
                </span>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-3xl font-[300] text-[#0c0a09] leading-tight"
                >
                  Real-time timetables with buffer intelligence.
                </h3>
                <p className="text-sm text-[#4e4e4e] leading-relaxed">
                  Never get stranded by unrealistic connection times. Transix analyzes train
                  punctuality, coach class allocations, and automatically recommends whether
                  Executive Chair (EC), 2A, or 3A best fits your route.
                </p>
                <div className="pt-2">
                  <Link
                    to="/travel-options"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0c0a09] underline underline-offset-4 hover:text-[#034F46]"
                  >
                    Search live train routes →
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#e7e5e4] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034F46] text-white font-bold text-sm">
                      VB
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0c0a09]">22436 Vande Bharat Express</h4>
                      <p className="text-xs text-[#777169]">New Delhi (NDLS) → Varanasi Jn (BSB)</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Daily • 99% Punctual
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-[#e7e5e4] bg-white p-3">
                    <span className="text-[10px] uppercase font-bold text-[#777169]">Departure</span>
                    <p className="mt-1 text-base font-extrabold text-[#0c0a09]">06:00 AM</p>
                    <span className="text-[11px] text-[#777169]">NDLS Platform 1</span>
                  </div>

                  <div className="rounded-xl border border-[#e7e5e4] bg-white p-3">
                    <span className="text-[10px] uppercase font-bold text-[#777169]">Duration</span>
                    <p className="mt-1 text-base font-extrabold text-[#034F46]">8h 00m</p>
                    <span className="text-[11px] text-[#777169]">Non-stop Express</span>
                  </div>

                  <div className="rounded-xl border border-[#e7e5e4] bg-white p-3">
                    <span className="text-[10px] uppercase font-bold text-[#777169]">Arrival</span>
                    <p className="mt-1 text-base font-extrabold text-[#0c0a09]">02:00 PM</p>
                    <span className="text-[11px] text-[#777169]">BSB Platform 8</span>
                  </div>
                </div>

                {/* Coach Class Selectors */}
                <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-[#e7e5e4]">
                  <span className="rounded-lg border border-[#034F46] bg-[#034F46]/5 px-3 py-1.5 text-xs font-bold text-[#034F46]">
                    Executive Chair (EC) • ₹3,310
                  </span>
                  <span className="rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#4e4e4e]">
                    Chair Car (CC) • ₹1,750
                  </span>
                  <span className="rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-xs font-medium text-[#4e4e4e]">
                    Meal: Included
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI ITINERARY CONCIERGE */}
          {activeTab === "ai" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#034F46]">
                  Module 02 • Generative Itineraries
                </span>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-3xl font-[300] text-[#0c0a09] leading-tight"
                >
                  Personalized day plans powered by Gemini AI.
                </h3>
                <p className="text-sm text-[#4e4e4e] leading-relaxed">
                  No generic Wikipedia lists. Transix generates chronological timelines considering
                  sunset timings, peak temple crowds, authentic food stalls, and walking distances.
                </p>
                <div className="pt-2">
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0c0a09] underline underline-offset-4 hover:text-[#034F46]"
                  >
                    Generate a sample itinerary →
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-3">
                <div className="rounded-xl border border-[#e7e5e4] bg-[#faf9f5] p-4 flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#034F46] text-xs font-bold text-white">
                    01
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[#777169]">
                        Morning • 06:30 AM
                      </h4>
                      <span className="text-xs font-bold text-[#034F46]">★ 4.9 (12.4k reviews)</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-[#0c0a09]">
                      Subah-e-Banaras Sunrise Boat on Assi Ghat
                    </p>
                    <p className="mt-1 text-xs text-[#777169]">
                      Traditional morning ragas and Vedic chanting while rowing past Chet Singh Ghat.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e7e5e4] bg-[#faf9f5] p-4 flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-xs font-bold text-white">
                    02
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[#777169]">
                        Afternoon • 01:00 PM
                      </h4>
                      <span className="text-xs font-bold text-amber-600">Local Culinary Gem</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-[#0c0a09]">
                      Blue Lassi & Kashi Chaat Bhandar
                    </p>
                    <p className="mt-1 text-xs text-[#777169]">
                      Handmade Tamatar Chaat and authentic clay-cup Malaiyo in the historic alleys.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e7e5e4] bg-[#faf9f5] p-4 flex items-start gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#034F46] text-xs font-bold text-white">
                    03
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wide text-[#777169]">
                        Evening • 06:45 PM
                      </h4>
                      <span className="text-xs font-bold text-emerald-600">Reserved Spot</span>
                    </div>
                    <p className="mt-0.5 text-sm font-semibold text-[#0c0a09]">
                      Dashashwamedh Ghat Maha Aarti VIP Viewing
                    </p>
                    <p className="mt-1 text-xs text-[#777169]">
                      Exclusive upper terrace seats with unobstructed river view of the brass lamps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STATION-SYNC'D STAYS */}
          {activeTab === "stays" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#034F46]">
                  Module 03 • Logistics-First Hotels
                </span>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-3xl font-[300] text-[#0c0a09] leading-tight"
                >
                  Hotels positioned for seamless train departures.
                </h3>
                <p className="text-sm text-[#4e4e4e] leading-relaxed">
                  Transix filters out hotels with poor transit access. Every recommendation includes
                  driving distance to the station and luggage storage policy for early checkouts.
                </p>
                <div className="pt-2">
                  <Link
                    to="/hotel-details"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0c0a09] underline underline-offset-4 hover:text-[#034F46]"
                  >
                    View hotel integration details →
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-5">
                  <span className="rounded-md bg-[#034F46]/10 px-2 py-0.5 text-[10px] font-bold text-[#034F46]">
                    8 mins from Varanasi Jn
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-[#0c0a09]">BrijRama Palace Heritage</h4>
                  <p className="text-xs text-[#777169] mt-1">Direct private riverboat transfer from Ghat</p>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#e7e5e4]">
                    <span className="text-xs font-bold text-[#0c0a09]">₹14,200 / night</span>
                    <span className="text-xs font-semibold text-emerald-700">★ 4.9</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-5">
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    12 mins from Station
                  </span>
                  <h4 className="mt-2 text-sm font-bold text-[#0c0a09]">Taj Ganges Varanasi</h4>
                  <p className="text-xs text-[#777169] mt-1">12 acres of tranquil gardens in Cantonment</p>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#e7e5e4]">
                    <span className="text-xs font-bold text-[#0c0a09]">₹9,800 / night</span>
                    <span className="text-xs font-semibold text-emerald-700">★ 4.8</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE ROUTE MAP */}
          {activeTab === "map" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#034F46]">
                  Module 04 • Geospatial Routing
                </span>
                <h3
                  style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
                  className="text-3xl font-[300] text-[#0c0a09] leading-tight"
                >
                  Map-centric trip visualization.
                </h3>
                <p className="text-sm text-[#4e4e4e] leading-relaxed">
                  Interactive Leaflet map overlays your train tracks, station checkpoints, and
                  sightseeing markers in a unified geographic view.
                </p>
                <div className="pt-2">
                  <Link
                    to="/map"
                    className="inline-flex items-center gap-2 text-xs font-bold text-[#0c0a09] underline underline-offset-4 hover:text-[#034F46]"
                  >
                    Open interactive map →
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-6 text-center">
                <div className="flex h-48 w-full items-center justify-center rounded-xl bg-gradient-to-tr from-[#034F46]/10 to-[#f4c5a8]/20 border border-[#e7e5e4]">
                  <div className="flex flex-col items-center gap-2 text-center p-4">
                    <FaMapLocationDot className="text-3xl text-[#034F46]" />
                    <span className="text-xs font-bold text-[#0c0a09]">
                      Multi-Stop Geospatial Rail Corridor
                    </span>
                    <span className="text-[11px] text-[#777169]">
                      Delhi (NDLS) ─── Agra Cantt (AGC) ─── Varanasi (BSB)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
