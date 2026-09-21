import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCheckCircle, FiClock, FiMapPin, FiNavigation } from "react-icons/fi";
import { FaTrain } from "react-icons/fa6";

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState("train");

  return (
    <section className="relative overflow-hidden bg-[#faf9f5] pt-12 pb-24 lg:pt-16 lg:pb-32 font-sans antialiased text-[#1A1A1A]">
      {/* Wispr Flow Atmospheric Ambient Blooms */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#f4c5a8]/35 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 -left-32 h-[450px] w-[450px] rounded-full bg-[#a7e5d3]/30 blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-32 h-[420px] w-[420px] rounded-full bg-[#c8b8e0]/35 blur-[130px]"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        {/* Category Tag (Wispr Flow: WISPR FLOW DICTATION style) */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-[#ffffff]/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[1.2px] text-[#4e4e4e] backdrop-blur-xs shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#034F46]" />
          <span>Intelligent Rail & Transit OS</span>
        </div>

        {/* Signature Editorial Headline (EB Garamond with Italic contrast) */}
        <h1
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="mt-6 text-4xl sm:text-6xl lg:text-[76px] font-[300] leading-[1.04] tracking-[-1.5px] text-[#0c0a09]"
        >
          Don’t stress the route,
          <br />
          <em className="font-normal italic text-[#0c0a09]">just enjoy the journey.</em>
        </h1>

        {/* Subhead with text-wrap: balance */}
        <p className="mx-auto mt-6 max-w-2xl text-[17px] sm:text-[19px] font-[400] leading-[1.5] tracking-[0.1px] text-[#4e4e4e]">
          The AI travel operating system that transforms chaotic schedules, multi-city rail
          connections, and hotels into effortless, cinematic itineraries.
        </p>

        {/* Action Button Group */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-7 py-3.5 text-[15px] font-semibold text-[#ffffff] shadow-sm transition-all hover:bg-[#0c0a09] hover:shadow-md active:scale-[0.98]"
          >
            <span>Start Planning for Free</span>
            <FiArrowRight className="text-base transition-transform duration-200 group-hover:translate-x-1" />
          </Link>

          <Link
            to="/travel-options?source=New%20Delhi&destination=Varanasi"
            className="inline-flex items-center gap-2 rounded-full border border-[#d6d3d1] bg-[#ffffff]/70 px-6 py-3.5 text-[15px] font-medium text-[#1A1A1A] backdrop-blur-xs transition hover:bg-[#ffffff] hover:border-[#0c0a09] active:scale-[0.98]"
          >
            <FaTrain className="text-xs text-[#034F46]" />
            <span>Explore Train Routes</span>
          </Link>
        </div>

        {/* Platform & Trust Badges */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[12px] font-medium text-[#777169]">
          <span className="flex items-center gap-1.5">
            <FiCheckCircle className="text-[#16a34a] text-xs" />
            No credit card required
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <FiCheckCircle className="text-[#16a34a] text-xs" />
            Real-time Indian Railways schedules
          </span>
        </div>

        {/* ========================================================= */}
        {/* WISPR FLOW SIGNATURE WAVEFORM ANIMATION ADAPTED FOR TRANSIX */}
        {/* ========================================================= */}
        <div className="relative mt-16 sm:mt-20 w-full overflow-hidden rounded-3xl border border-[#e7e5e4] bg-[#ffffff] p-6 sm:p-10 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          {/* Header inside the interactive transformation arena */}
          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between border-b border-[#f0efed] pb-5 gap-3">
            <div className="text-left">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-[#777169]">
                Live Transformation Engine
              </span>
              <h3 className="text-base font-semibold text-[#0c0a09]">
                From Raw Route Chaos to Synchronized Precision
              </h3>
            </div>

            {/* Travel Mode Pills */}
            <div className="flex items-center gap-1 rounded-full border border-[#e7e5e4] bg-[#f8f7f2] p-1 text-xs font-semibold text-[#4e4e4e]">
              <button
                onClick={() => setActiveTab("train")}
                className={`rounded-full px-3 py-1 transition ${
                  activeTab === "train"
                    ? "bg-white text-[#0c0a09] shadow-xs"
                    : "hover:text-[#0c0a09]"
                }`}
              >
                Express Rail
              </button>
              <button
                onClick={() => setActiveTab("multi")}
                className={`rounded-full px-3 py-1 transition ${
                  activeTab === "multi"
                    ? "bg-white text-[#0c0a09] shadow-xs"
                    : "hover:text-[#0c0a09]"
                }`}
              >
                Multi-Modal
              </button>
            </div>
          </div>

          {/* SVG Curvature Animation Ribbon (The Wispr Flow Metaphor) */}
          <div className="relative min-h-[220px] sm:min-h-[260px] w-full flex items-center justify-center overflow-hidden py-4">
            {/* SVG Wave Canvas */}
            <svg
              className="absolute inset-0 h-full w-full pointer-events-none"
              viewBox="0 0 1000 240"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Chaotic Undulating Track (Left) */}
              <path
                id="raw-route-curve"
                d="M 10 160 C 140 220, 240 80, 380 140 C 440 165, 480 130, 500 120"
                stroke="#e7e5e4"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="none"
              />

              {/* Smooth Confident Transit Ribbon (Right) */}
              <path
                id="clean-route-curve"
                d="M 500 120 C 580 100, 720 120, 990 120"
                stroke="#1A1A1A"
                strokeWidth="2"
                fill="none"
              />

              {/* Animated Text along Raw Curve */}
              <text fontSize="13" fontWeight="500" fill="#1A1A1A" opacity="0.35">
                <textPath xlinkHref="#raw-route-curve" startOffset="0%">
                  Wait, what train leaves Delhi? Is Vande Bharat better? Where do we stay on night
                  2? How do we transfer from station to hotel? 15 tabs open and confused...
                  <animate
                    attributeName="startOffset"
                    from="0%"
                    to="-100%"
                    dur="25s"
                    repeatCount="indefinite"
                  />
                </textPath>
              </text>

              {/* Animated Text along Clean Transit Curve */}
              <text fontSize="13.5" fontWeight="600" fill="#034F46">
                <textPath xlinkHref="#clean-route-curve" startOffset="0%">
                  ✦ Vande Bharat Express (NDLS 06:00 → BSB 14:00) • Confirmed 2A • Heritage Haveli
                  Checked-in • Sunset Aarti at 18:30 • Zero friction.
                  <animate
                    attributeName="startOffset"
                    from="-100%"
                    to="0%"
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </textPath>
              </text>
            </svg>

            {/* Center: The Transix AI Route Core Pill (Floating Wispr Flow style dock) */}
            <div className="relative z-10 mx-auto flex items-center gap-3 rounded-full border border-[#034F46]/20 bg-[#034F46] px-5 py-2.5 text-white shadow-[0_8px_24px_rgba(3,79,70,0.25)]">
              {/* Pulsing signal dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#34d399] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10b981]" />
              </span>

              {/* Animated Equalizer Waveform bars */}
              <div className="flex items-center gap-0.5 h-4">
                <span className="w-1 bg-[#FFFFEB] rounded-full animate-[pulse_1s_infinite_100ms] h-3" />
                <span className="w-1 bg-[#FFFFEB] rounded-full animate-[pulse_1s_infinite_300ms] h-5" />
                <span className="w-1 bg-[#FFFFEB] rounded-full animate-[pulse_1s_infinite_200ms] h-2.5" />
                <span className="w-1 bg-[#FFFFEB] rounded-full animate-[pulse_1s_infinite_400ms] h-4" />
                <span className="w-1 bg-[#FFFFEB] rounded-full animate-[pulse_1s_infinite_150ms] h-3" />
              </div>

              <span className="text-xs font-semibold tracking-wide text-[#FFFFEB]">
                TRANSIX ROUTE ENGINE
              </span>
            </div>
          </div>

          {/* Interactive Synthesized Card Mockup (Wispr Flow app preview card) */}
          <div className="mt-4 rounded-2xl border border-[#e7e5e4] bg-[#faf9f5] p-4 sm:p-6 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e5e4] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#034F46] text-white">
                  <FaTrain className="text-base" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0c0a09]">
                      22436 Vande Bharat Express
                    </span>
                    <span className="rounded-md bg-[#16a34a]/10 px-2 py-0.5 text-[11px] font-bold text-[#16a34a]">
                      On Time
                    </span>
                  </div>
                  <span className="text-xs text-[#777169]">
                    New Delhi (NDLS) → Varanasi Junction (BSB) • 540 km
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full border border-[#d6d3d1] bg-white px-3 py-1 text-xs font-medium text-[#292524]">
                  <FiClock className="text-xs text-[#777169]" /> 8h 00m Duration
                </span>
                <Link
                  to="/travel-options?source=New%20Delhi&destination=Varanasi"
                  className="rounded-full bg-[#1A1A1A] px-3.5 py-1 text-xs font-semibold text-white transition hover:bg-black"
                >
                  View Details
                </Link>
              </div>
            </div>

            {/* Seamless 3-Step Journey Timeline Preview */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[#e7e5e4] bg-white p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169]">
                  Step 1 • 06:00 AM
                </span>
                <p className="mt-1 font-semibold text-xs text-[#0c0a09]">
                  Departure from New Delhi (Platform 1)
                </p>
                <p className="text-[11px] text-[#777169]">Breakfast served onboard in Executive Class</p>
              </div>

              <div className="rounded-xl border border-[#e7e5e4] bg-white p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#777169]">
                  Step 2 • 02:00 PM
                </span>
                <p className="mt-1 font-semibold text-xs text-[#0c0a09]">
                  Arrival Varanasi & Station Cab
                </p>
                <p className="text-[11px] text-[#777169]">Private transfer waiting at Exit Gate 3</p>
              </div>

              <div className="rounded-xl border border-[#e7e5e4] bg-white p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#034F46]">
                  Step 3 • 06:30 PM
                </span>
                <p className="mt-1 font-semibold text-xs text-[#0c0a09]">
                  Ganga Aarti Private Wooden Boat
                </p>
                <p className="text-[11px] text-[#777169]">Curated evening experience reserved</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
