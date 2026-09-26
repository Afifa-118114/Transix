import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import HeroSection from "../../components/public/HeroSection";
import JourneyWorkflowSection from "../../components/public/JourneyWorkflowSection";
import BeyondPackagesSection from "../../components/public/BeyondPackagesSection";
import WhyTransixSection from "../../components/public/WhyTransixSection";
import SampleJourneysSection from "../../components/public/SampleJourneysSection";
import PublicCTASection from "../../components/public/PublicCTASection";
import PublicFooter from "../../components/public/PublicFooter";

export default function LandingPage({ defaultSection }) {
  const location = useLocation();

  useEffect(() => {
    const targetId = defaultSection || location.hash.replace("#", "");
    if (targetId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const navOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo(0, 0);
    }
  }, [defaultSection, location.hash]);

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Navbar */}
      <PublicNavbar />

      {/* Main Landing Sections in exact required hierarchy */}
      <main>
        {/* 1. Hero (Heading, Description + Atmospheric Journey Map) */}
        <HeroSection />

        {/* 2. End-to-End Journey Workflow */}
        <JourneyWorkflowSection />

        {/* 3. Beyond Fixed Packages */}
        <BeyondPackagesSection />

        {/* 4. Why Transix (Unified 8 Capabilities) */}
        <WhyTransixSection />

        {/* 5. Sample Trips */}
        <SampleJourneysSection />

        {/* 6. Final CTA */}
        <PublicCTASection />
      </main>

      {/* 7. Footer */}
      <PublicFooter />
    </div>
  );
}
