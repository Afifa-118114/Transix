import { Link } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";
import logo from "../../assets/logo/logo.png";

export default function LandingFooter() {
  return (
    <footer className="bg-[#faf9f5] border-t border-[#e7e5e4] font-sans antialiased text-[#1A1A1A]">
      {/* High-Impact Pre-Footer Section (Wispr Flow style) */}
      <div className="mx-auto max-w-5xl px-4 py-24 sm:py-32 text-center">
        <h2
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
          className="text-4xl sm:text-6xl lg:text-7xl font-[300] tracking-[-1.5px] text-[#0c0a09] leading-[1.06]"
        >
          Your next journey,
          <br />
          <em className="font-normal italic text-[#0c0a09]">completely planned in 30 seconds.</em>
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-[#4e4e4e] leading-relaxed">
          Join thousands of travelers experiencing stress-free multi-modal rail expeditions across
          India.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-8 py-4 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-black hover:shadow-md active:scale-98"
          >
            <span>Start Planning for Free</span>
            <FiArrowRight className="transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            to="/travel-options"
            className="inline-flex items-center gap-2 rounded-full border border-[#d6d3d1] bg-white px-7 py-4 text-[15px] font-medium text-[#1A1A1A] transition hover:border-[#0c0a09] active:scale-98"
          >
            <span>Search Train Routes</span>
          </Link>
        </div>

        <p className="mt-4 text-xs text-[#777169]">
          100% Free to plan • No credit card required
        </p>
      </div>

      {/* Main 4-Column Directory */}
      <div className="border-t border-[#e7e5e4] bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Transix" className="h-7 w-auto object-contain" />
              <span className="text-lg font-bold tracking-tight text-[#0c0a09]">Transix</span>
            </Link>
            <p className="text-xs text-[#777169] max-w-sm leading-relaxed">
              The intelligent multi-modal travel operating system. Synchronizing express trains,
              curated stays, and cinematic itineraries.
            </p>
            {/* Live Operational Status */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e7e5e4] bg-[#faf9f5] px-3 py-1 text-[11px] font-medium text-[#4e4e4e]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Railway APIs & Systems Operational</span>
            </div>
          </div>

          {/* Col 1: Travel Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c0a09]">Modules</h4>
            <ul className="space-y-2 text-xs text-[#777169]">
              <li>
                <Link to="/travel-options" className="hover:text-[#0c0a09] transition">
                  Express Rail Timetables
                </Link>
              </li>
              <li>
                <Link to="/builder" className="hover:text-[#0c0a09] transition">
                  Tour Builder Board
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-[#0c0a09] transition">
                  Interactive Route Map
                </Link>
              </li>
              <li>
                <Link to="/hotel-details" className="hover:text-[#0c0a09] transition">
                  Station Stays
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Popular Expeditions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c0a09]">Popular Routes</h4>
            <ul className="space-y-2 text-xs text-[#777169]">
              <li>
                <Link
                  to="/travel-options?source=New%20Delhi&destination=Varanasi"
                  className="hover:text-[#0c0a09] transition"
                >
                  Delhi to Varanasi (Vande Bharat)
                </Link>
              </li>
              <li>
                <Link
                  to="/travel-options?source=Mumbai&destination=Goa"
                  className="hover:text-[#0c0a09] transition"
                >
                  Mumbai to Goa (Konkan Vista)
                </Link>
              </li>
              <li>
                <Link
                  to="/travel-options?source=New%20Delhi&destination=Agra"
                  className="hover:text-[#0c0a09] transition"
                >
                  Delhi to Agra (Gatimaan)
                </Link>
              </li>
              <li>
                <Link
                  to="/travel-options?source=New%20Delhi&destination=Jaipur"
                  className="hover:text-[#0c0a09] transition"
                >
                  Golden Triangle Circuit
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#0c0a09]">Account</h4>
            <ul className="space-y-2 text-xs text-[#777169]">
              <li>
                <Link to="/login" className="hover:text-[#0c0a09] transition">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#0c0a09] transition">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/saved" className="hover:text-[#0c0a09] transition">
                  Saved Trips
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#0c0a09] transition">
                  Profile & Preferences
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mx-auto mt-12 max-w-6xl px-4 pt-8 border-t border-[#e7e5e4] flex flex-col sm:flex-row items-center justify-between text-xs text-[#777169] gap-4">
          <p>© 2026 Transix Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#0c0a09] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#0c0a09] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#0c0a09] cursor-pointer">Security & SOC2</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
