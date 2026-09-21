import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiCompass, FiLayers, FiMenu, FiX } from "react-icons/fi";
import logo from "../../assets/logo/logo.png";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("transit");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Floating Island Navbar (Wispr Flow style capsule) */}
      <header
        className={`sticky top-3 z-40 mx-auto w-full max-w-6xl px-4 transition-all duration-300 ${
          scrolled ? "top-2" : "top-4"
        }`}
      >
        <div
          className={`flex items-center justify-between rounded-full border border-[#e7e5e4] bg-[#ffffff]/85 px-4 sm:px-6 py-2.5 backdrop-blur-md transition-all duration-200 ${
            scrolled
              ? "shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
              : "shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
          }`}
        >
          {/* Left: Brand & Mode Selector */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logo} alt="Transix" className="h-7 w-auto object-contain" />
              <span className="font-sans text-[17px] font-bold tracking-tight text-[#0c0a09]">
                Transix
              </span>
            </Link>

            {/* Mode Switcher Pill Tabs (Wispr Flow: Dictation | Notetaker style) */}
            <div className="hidden md:flex items-center rounded-full border border-[#e7e5e4] bg-[#f5f4ef] p-0.5 text-[12px] font-medium text-[#777169]">
              <button
                type="button"
                onClick={() => setActiveTab("transit")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all ${
                  activeTab === "transit"
                    ? "bg-[#ffffff] font-semibold text-[#0c0a09] shadow-xs"
                    : "hover:text-[#0c0a09]"
                }`}
              >
                <FiCompass className="text-xs" />
                <span>Smart Transit</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ai")}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-all ${
                  activeTab === "ai"
                    ? "bg-[#ffffff] font-semibold text-[#0c0a09] shadow-xs"
                    : "hover:text-[#0c0a09]"
                }`}
              >
                <FiLayers className="text-xs" />
                <span>AI Tour Builder</span>
              </button>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-[#4e4e4e]">
            <a href="#features" className="transition hover:text-[#0c0a09]">
              How it Works
            </a>
            <Link to="/travel-options" className="transition hover:text-[#0c0a09]">
              Train Routes
            </Link>
            <a href="#why-transix" className="transition hover:text-[#0c0a09]">
              Why Transix
            </a>
            <Link to="/builder" className="transition hover:text-[#0c0a09]">
              Itinerary Board
            </Link>
          </nav>

          {/* Right: Auth & CTA */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-[14px] font-medium text-[#292524] transition hover:text-[#0c0a09] px-2 py-1"
            >
              Sign in
            </Link>

            <Link
              to="/register"
              className="group relative inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 sm:px-5 py-2 text-[13px] font-semibold text-[#ffffff] transition-all hover:bg-[#0c0a09] active:scale-[0.98] shadow-xs"
            >
              <span>Plan for free</span>
              <FiArrowRight className="text-xs transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7e5e4] text-[#1A1A1A] lg:hidden hover:bg-[#f5f5f5]"
            >
              {mobileMenuOpen ? <FiX className="text-lg" /> : <FiMenu className="text-lg" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="mt-2 rounded-2xl border border-[#e7e5e4] bg-[#ffffff] p-5 shadow-lg lg:hidden font-sans">
            <div className="flex flex-col gap-3 text-[15px] font-medium text-[#292524]">
              <Link
                to="/travel-options"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#0c0a09]"
              >
                Train Routes & Schedules
              </Link>
              <Link
                to="/builder"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#0c0a09]"
              >
                Tour Builder
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#0c0a09]"
              >
                How it Works
              </a>
              <hr className="border-[#e7e5e4] my-1" />
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-full bg-[#1A1A1A] py-2.5 text-center text-sm font-semibold text-white"
              >
                Plan your trip for free
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
