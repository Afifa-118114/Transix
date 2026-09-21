import React from "react";
import logo from "../../assets/logo/logo.png";

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0b0f19]/70 backdrop-blur-md py-12 px-6 sm:px-8 lg:px-12">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
        {/* Left side: Brand identity & Tagline */}
        <div className="flex flex-col items-center sm:items-start space-y-1">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="Transix Logo"
              className="h-5 w-auto object-contain dark:brightness-0 dark:invert"
            />
            <span className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              TRANSIX
            </span>
          </div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Your Journey, Organized.
          </p>
        </div>

        {/* Right side: Copyright & Legal */}
        <div className="flex flex-col items-center sm:items-end text-center sm:text-right space-y-1">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            © 2026 Transix
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="hover:text-slate-600 dark:hover:text-slate-300 transition cursor-default">
              Privacy
            </span>
            <span>·</span>
            <span className="hover:text-slate-600 dark:hover:text-slate-300 transition cursor-default">
              Terms
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
