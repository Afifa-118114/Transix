import React from "react";
import { Sparkles } from "lucide-react";
import HeroJourneyMap from "./HeroJourneyMap";

export default function HeroSection() {
  // Deterministic static configuration for headline character animation
  const HEADLINE_WORDS = [
    { word: "Personalized", gradient: false, startIndex: 0 },
    { word: "Journeys.", gradient: false, startIndex: 13 },
    { word: "Intelligent", gradient: true, startIndex: 23 },
    { word: "Operation.", gradient: true, startIndex: 35 },
  ];

  return (
    <section
      id="home"
      className="relative w-full min-h-[100svh] lg:h-[100svh] lg:max-h-[100svh] pt-20 sm:pt-22 lg:pt-24 pb-0 px-4 sm:px-6 lg:px-8 flex flex-col justify-between overflow-hidden bg-[#f8faff] dark:bg-[#0b0f19]"
    >
      {/* 
        Subtle Background Light Layer
        Clean, spacious, uncrowded upper hero background
      */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft atmospheric ambient glow */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[650px] h-[280px] bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 
        =========================================================
        UPPER HERO CONTENT: CLEAN, DOMINANT, SPACIOUS
        Heading sits directly on Hero background - NO rounded box,
        NO translucent panel, NO background border, NO glow container.
        Strictly ONE single line on desktop.
        =========================================================
      */}
      <div className="relative z-20 w-full max-w-6xl mx-auto flex flex-col items-center text-center flex-shrink-0 pt-1 sm:pt-2">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-indigo-200/70 dark:border-indigo-800/70 bg-white/90 dark:bg-indigo-950/60 backdrop-blur-md shadow-xs mb-2.5 sm:mb-3.5 animate-in fade-in duration-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin-slow" />
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
            AI-POWERED TRAVEL PLANNING & OPERATIONS
          </span>
        </div>

        {/* 
          Headline: "Personalized Journeys. Intelligent Operation."
          Strictly one single line on desktop (lg:whitespace-nowrap lg:flex-nowrap).
          Completely clean background - no box, no border, no glow panel behind text.
        */}
        <h1 className="w-full max-w-6xl mx-auto text-2xl sm:text-3xl md:text-4xl lg:text-[2.35rem] xl:text-[2.85rem] 2xl:text-[3.2rem] font-extrabold tracking-tight text-center leading-[1.2] flex flex-wrap lg:flex-nowrap items-center justify-center lg:whitespace-nowrap select-none">
          {HEADLINE_WORDS.map((item, wordIdx) => (
            <React.Fragment key={wordIdx}>
              <span
                className={`inline-block whitespace-nowrap ${
                  item.gradient
                    ? "hero-gradient-text"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {item.word.split("").map((char, charIdx) => (
                  <span
                    key={charIdx}
                    className="hero-char"
                    style={{
                      "--char-index": item.startIndex + charIdx,
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>
              {wordIdx < HEADLINE_WORDS.length - 1 && (
                <span className="inline-block">&nbsp;</span>
              )}
            </React.Fragment>
          ))}
        </h1>
      </div>

      {/* 
        =========================================================
        BREATHING SPACE & LOWER PORTION:
        Option 2 (Floating Destination Cards) + Option 4 (Photographic Landscape Blend)
        Labels sit above route; visual brought up to eliminate empty gap.
        =========================================================
      */}
      <div className="relative z-10 w-full mt-3 sm:mt-4 lg:mt-5 flex-1 min-h-0 flex flex-col justify-end overflow-hidden">
        <HeroJourneyMap />
      </div>
    </section>
  );
}

