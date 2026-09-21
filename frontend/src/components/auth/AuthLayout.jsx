import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../../context/ThemeContext";
import { Sparkles, MapPin, ArrowRight } from "lucide-react";
import logo from "../../assets/logo/logo.png";

export default function AuthLayout({ children }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b0f19] transition-colors duration-300">
      
      {/* 
        =========================================================
        LEFT SIDE: TRANSIX STORY & VISUAL
        =========================================================
      */}
      <div className="relative hidden lg:flex flex-col flex-1 overflow-hidden bg-indigo-900">
        
        {/* Dynamic Atmospheric Background Image & Overlays */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&q=80&w=2000" 
            alt="Scenic Road Journey"
            className="w-full h-full object-cover object-center opacity-80 mix-blend-overlay"
          />
          {/* Light/Dark mode specific gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/85 via-slate-800/75 to-blue-950/90 dark:from-[#050b14]/95 dark:via-[#0a1128]/90 dark:to-[#050b14]/95"></div>
        </div>

        {/* 
          ORGANIC TRANSITION TO THE RIGHT FORM
          Instead of a straight line, we use an SVG fluid wave positioned at the right edge
        */}
        <div className="absolute top-0 bottom-0 right-0 w-[150px] pointer-events-none text-[#f8fafc] dark:text-[#0b0f19] transition-colors duration-300 transform translate-x-1">
          <svg preserveAspectRatio="none" viewBox="0 0 100 100" className="w-full h-full fill-current">
            <path d="M100,0 L100,100 L0,100 C30,80 70,50 30,0 Z" />
          </svg>
        </div>

        {/* Content Container */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16 text-white max-w-xl">
          
          {/* Top Brand */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Transix Logo" className="h-8 w-auto object-contain brightness-0 invert" />
            <span className="text-xl font-bold tracking-wide">TRANSIX</span>
          </div>

          {/* Middle Story & Flow */}
          <div className="my-auto">
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] mb-6">
              From fixed packages<br />
              <span className="text-indigo-200">to dynamic journeys.</span>
            </h1>
            
            <p className="text-lg text-indigo-100/80 mb-12 max-w-md font-light leading-relaxed">
              Traditional tours are built for everyone.<br />
              Transix is built for you.
            </p>

            {/* Keyword Flow Visual (Traveler -> AI -> Operator) */}
            <div className="flex flex-col gap-6 relative">
              {/* Connecting line behind nodes */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-300/50 via-slate-300/50 to-transparent"></div>
              
              <div className="flex items-center gap-5 relative group">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide text-sm mb-1 uppercase">Traveler</h3>
                  <p className="text-xs text-blue-100 font-medium">Preferences • Budget • Interests</p>
                </div>
              </div>

              <div className="flex items-center gap-5 relative group">
                <div className="w-10 h-10 rounded-full bg-blue-500/30 backdrop-blur-md border border-blue-300/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  <Sparkles className="w-4 h-4 text-blue-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide text-sm mb-1 uppercase">Transix AI</h3>
                  <p className="text-xs text-blue-100 font-medium">AI Planning • Optimization • Dynamic Adaptation</p>
                </div>
              </div>

              <div className="flex items-center gap-5 relative group">
                <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                </div>
                <div>
                  <h3 className="font-semibold text-white tracking-wide text-sm mb-1 uppercase">Operator</h3>
                  <p className="text-xs text-blue-100 font-medium">Bookings • Vendors • Schedules</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dotted Route Visual */}
          <div className="mt-auto">
            <div className="flex items-center gap-3 text-sm font-medium text-blue-100/80">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Mumbai</span>
              <div className="h-px w-8 border-t border-dashed border-blue-300/50"></div>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Goa</span>
              <div className="h-px w-8 border-t border-dashed border-blue-300/50"></div>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Kerala</span>
            </div>
          </div>

        </div>
      </div>

      {/* 
        =========================================================
        RIGHT SIDE: AUTHENTICATION FORM
        =========================================================
      */}
      <div className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-12 lg:p-16 xl:p-24 z-10 w-full lg:max-w-xl xl:max-w-2xl bg-transparent">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex lg:hidden items-center gap-3 mb-10 w-full max-w-sm">
          <img src={logo} alt="Transix Logo" className="h-8 w-auto object-contain dark:brightness-0 dark:invert" />
          <span className="text-xl font-bold tracking-wide text-slate-900 dark:text-white">TRANSIX</span>
        </div>

        {/* Theme Toggle (Right Top) */}
        <button
          onClick={toggleTheme}
          type="button"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="absolute top-6 right-6 lg:top-8 lg:right-8 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-[#131b2e]/50 backdrop-blur-md text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          {isDark ? <FiSun className="text-lg text-amber-400" /> : <FiMoon className="text-lg text-slate-700" />}
        </button>

        {/* The Form Content Wrapper */}
        <div className="w-full max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>

      </div>

    </div>
  );
}
