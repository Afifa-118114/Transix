import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FiSun, FiMoon, FiMenu, FiX, FiCompass, FiArrowRight } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import logo from "../../assets/logo/logo.png";

// Exact required labels & order:
// Home | Journey Flow | Adaptive Travel | Why Transix | Sample Trips
const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "journey-flow", label: "Journey Flow" },
  { id: "adaptive-travel", label: "Adaptive Travel" },
  { id: "why-transix", label: "Why Transix" },
  { id: "sample-trips", label: "Sample Trips" },
];

export default function PublicNavbar() {
  const { isDark, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const navigate = useNavigate();
  const location = useLocation();

  // Plan My Trip flow: reuses existing planner with auth persistence
  const handlePlanMyTrip = () => {
    setMobileMenuOpen(false);
    try {
      localStorage.removeItem("currentTrip");
      localStorage.removeItem("transix_builder_trip");
    } catch (_) {}

    const planIntent = {
      destination: "Kerala",
      duration: "7 days",
      travelers: "4 people",
      timestamp: Date.now(),
      autoGenerate: false,
    };

    sessionStorage.setItem("transix_pending_plan", JSON.stringify(planIntent));
    navigate("/planner");
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // ScrollSpy: identify active section
      const scrollPosition = window.scrollY + 120;
      if (window.scrollY < 200) {
        setActiveSection("home");
        return;
      }
      for (let i = NAV_ITEMS.length - 1; i >= 1; i--) {
        const item = NAV_ITEMS[i];
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(item.id);
          return;
        }
      }
      setActiveSection("home");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    setMobileMenuOpen(false);
    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      return;
    }
    if (sectionId === "home") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link
          to="/"
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/35 transition-all">
            <div className="h-full w-full bg-white dark:bg-[#0f172a] rounded-[10px] flex items-center justify-center overflow-hidden">
              <img
                src={logo}
                alt="Transix Logo"
                className="h-6 w-auto object-contain dark:brightness-0 dark:invert transition-transform group-hover:scale-105"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              TRANSIX
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 -mt-1">
              Travel Intelligence
            </span>
          </div>
        </Link>

        {/* Center: Navigation Links in exact required order */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-800/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 shadow-2xs">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? "text-indigo-600 dark:text-white bg-white/90 dark:bg-slate-700/90 shadow-2xs font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Side: [ Theme Toggle ] [ Join as Guide ] [ Plan My Trip ] [ Sign In ] */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            {isDark ? <FiSun className="text-sm text-amber-400" /> : <FiMoon className="text-sm" />}
          </button>

          {/* Join as Guide Button */}
          <Link
            to="/join-as-guide"
            className="px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition shadow-2xs cursor-pointer flex items-center gap-1.5"
          >
            <FiCompass className="text-sm text-indigo-600 dark:text-indigo-400" />
            Join as Guide
          </Link>

          {/* Primary Action: Plan My Trip */}
          <button
            type="button"
            onClick={handlePlanMyTrip}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-600/25 active:scale-95 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>Plan My Trip</span>
            <FiArrowRight className="text-xs" />
          </button>

          {/* Sign In Button */}
          <Link
            to="/login"
            className="px-3.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition shadow-2xs cursor-pointer flex items-center gap-1"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
          >
            {isDark ? <FiSun className="text-base text-amber-400" /> : <FiMoon className="text-base" />}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <FiX className="text-xl" /> : <FiMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden px-4 pt-3 pb-6 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 shadow-xl flex flex-col gap-3">
          <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-left px-3 py-2 rounded-lg text-sm font-semibold transition ${
                  activeSection === item.id
                    ? "text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-950 font-bold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            {/* Mobile Plan My Trip Button */}
            <button
              type="button"
              onClick={handlePlanMyTrip}
              className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
            >
              <span>Plan My Trip</span>
              <FiArrowRight className="text-xs" />
            </button>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/join-as-guide"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/50 text-xs font-bold text-indigo-700 dark:text-indigo-300"
              >
                Join as Guide
              </Link>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-2xs"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
