import { useState } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiX, FiArrowRight, FiZap } from "react-icons/fi";
import { FaTrain } from "react-icons/fa6";

export default function SpeedComparisonSection() {
  const [activeSpeed, setActiveSpeed] = useState("transix");

  return (
    <section className="relative overflow-hidden bg-[#034F46] py-24 sm:py-32 font-sans antialiased text-[#FFFFEB]">
      {/* Subtle organic texture or ambient blur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-1/4 h-[500px] w-[500px] rounded-full bg-[#10b981]/15 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/4 h-[450px] w-[450px] rounded-full bg-[#012b26]/50 blur-[130px]"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 text-center">
        {/* Category Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[1.4px] text-[#FFFFEB]">
          <FiZap className="text-amber-300 text-xs" />
          <span>Velocity & Precision</span>
        </div>

        {/* Headline in EB Garamond */}
        <h2
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-[300] leading-[1.05] tracking-[-1px] text-[#FFFFEB]"
        >
          10x faster
          <br />
          <em className="font-normal italic text-[#FFFFEB]">than manual travel planning.</em>
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[#FFFFEB]/80 leading-relaxed">
          Travel planning shouldn't feel like a second job. Transix synchronizes national rail
          timetables, walking radiuses, and stays at the speed of thought.
        </p>

        {/* Speed Duel Cards Container */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
          {/* Card 1: The Old Way (Manual Spreadsheet Nightmare) */}
          <div className="relative rounded-3xl border border-white/10 bg-black/20 p-8 sm:p-10 backdrop-blur-md transition hover:border-white/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-300">
                  The Old Way
                </span>
                <h3 className="mt-1 text-xl font-semibold text-[#FFFFEB]">
                  Spreadsheet & 14 Open Tabs
                </h3>
              </div>
              <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-200">
                18+ Hours of Effort
              </span>
            </div>

            {/* Pain Points */}
            <ul className="mt-7 space-y-4 text-sm text-[#FFFFEB]/70">
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 mt-0.5">
                  <FiX className="text-xs" />
                </div>
                <span>
                  Searching 3 different railway apps to find which station has Vande Bharat berths.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 mt-0.5">
                  <FiX className="text-xs" />
                </div>
                <span>
                  Booking a hotel only to discover it's 18 km away from your departure platform.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 mt-0.5">
                  <FiX className="text-xs" />
                </div>
                <span>
                  Manually guessing traffic buffers for late-night station connections.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/20 text-rose-300 mt-0.5">
                  <FiX className="text-xs" />
                </div>
                <span>
                  Scattered PDF tickets, booking references, and Google Maps pins everywhere.
                </span>
              </li>
            </ul>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-[#FFFFEB]/60">
              Average traveler spends <strong className="text-white">1,080 minutes</strong> planning a 5-day multi-city expedition manually.
            </div>
          </div>

          {/* Card 2: The Transix AI Way */}
          <div className="relative rounded-3xl border border-[#10b981]/30 bg-gradient-to-b from-[#023b34] to-[#012b26] p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition hover:border-[#10b981]/50">
            {/* Top Recommended Tag */}
            <div className="absolute -top-3.5 right-8 rounded-full bg-[#10b981] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-[#012b26]">
              Instant Intelligence
            </div>

            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  Transix OS
                </span>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Synchronized Route Synthesis
                </h3>
              </div>
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-200">
                30 Seconds
              </span>
            </div>

            {/* Wins */}
            <ul className="mt-7 space-y-4 text-sm text-[#FFFFEB]">
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300 mt-0.5">
                  <FiCheck className="text-xs font-bold" />
                </div>
                <span>
                  <strong>Instant Rail Matching:</strong> Automatically compares Vande Bharat, Rajdhani, and express lines with real travel times.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300 mt-0.5">
                  <FiCheck className="text-xs font-bold" />
                </div>
                <span>
                  <strong>Station Proximity Stays:</strong> Stays are geocoded and ranked by distance to your train terminal.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300 mt-0.5">
                  <FiCheck className="text-xs font-bold" />
                </div>
                <span>
                  <strong>Buffer Safety Engine:</strong> Auto-calculates realistic 45-min arrival and transfer buffers so you never miss a connection.
                </span>
              </li>

              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300 mt-0.5">
                  <FiCheck className="text-xs font-bold" />
                </div>
                <span>
                  <strong>Interactive Timeline Board:</strong> Drag, swap, or regenerate any day with Gemini AI in real-time.
                </span>
              </li>
            </ul>

            <div className="mt-8 flex items-center justify-between pt-2">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-full bg-[#FFFFEB] px-6 py-2.5 text-xs font-bold text-[#034F46] transition-all hover:bg-white active:scale-98"
              >
                <span>Experience the Speed</span>
                <FiArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="text-xs text-[#FFFFEB]/60 font-medium">Free for travelers</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
