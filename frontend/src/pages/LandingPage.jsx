import LandingNavbar from "../components/landing/LandingNavbar";
import HeroSection from "../components/landing/HeroSection";
import PartnerTicker from "../components/landing/PartnerTicker";
import SpeedComparisonSection from "../components/landing/SpeedComparisonSection";
import FeatureShowcase from "../components/landing/FeatureShowcase";
import PopularRoutes from "../components/landing/PopularRoutes";
import TestimonialsSection from "../components/landing/TestimonialsSection";
import FaqSection from "../components/landing/FaqSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf9f5] font-sans antialiased text-[#1A1A1A] selection:bg-[#f4c5a8]/40 selection:text-[#0c0a09]">
      {/* 1. Floating Capsule Navbar */}
      <LandingNavbar />

      {/* 2. Hero Section with Wispr Flow Waveform Transformation Animation */}
      <HeroSection />

      {/* 3. Infinite Monochrome Partner & Rail API Marquee */}
      <PartnerTicker />

      {/* 4. Speed Comparison Duel (10x Faster Than Manual Planning) */}
      <SpeedComparisonSection />

      {/* 5. Interactive App & Module Morphing Showcase */}
      <FeatureShowcase />

      {/* 6. Iconic Expeditions & Rail Corridors */}
      <PopularRoutes />

      {/* 7. Wall of Trust & Traveler Stories */}
      <TestimonialsSection />

      {/* 8. Interactive FAQ Accordion */}
      <FaqSection />

      {/* 9. Pre-Footer Call to Action & Rich Directory Footer */}
      <LandingFooter />
    </div>
  );
}
