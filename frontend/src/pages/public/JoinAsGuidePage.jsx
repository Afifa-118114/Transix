import React, { useState } from "react";
import { Link } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import {
  FiCompass,
  FiAward,
  FiShield,
  FiDollarSign,
  FiCheckCircle,
  FiArrowRight,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiBriefcase
} from "react-icons/fi";
import toast from "react-hot-toast";

const SPECIALTIES = [
  "Heritage & History",
  "Trekking & Wilderness",
  "Culinary & Food Walks",
  "Cultural & Spiritual",
  "Wildlife Safaris",
  "Photography & Arts",
  "Adventure Sports",
];

const POPULAR_LANGUAGES = [
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Kannada",
  "Bengali",
  "French",
  "German",
  "Spanish"
];

export default function JoinAsGuidePage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    experienceYears: "3-5 years",
    languages: ["English", "Hindi"],
    specialty: "Heritage & History",
    licenseNumber: "",
    bio: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = (lang) => {
    if (form.languages.includes(lang)) {
      setForm({ ...form, languages: form.languages.filter((l) => l !== lang) });
    } else {
      setForm({ ...form, languages: [...form.languages, lang] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.city) {
      toast.error("Please fill in all required contact and location fields.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);

      // Persist guide application locally
      try {
        const existing = JSON.parse(localStorage.getItem("transix_guide_applications") || "[]");
        existing.push({ ...form, submittedAt: new Date().toISOString() });
        localStorage.setItem("transix_guide_applications", JSON.stringify(existing));
      } catch (err) {
        // quiet
      }

      toast.success("Guide application submitted for verification!", { icon: "🎉" });
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col justify-between">
      <PublicNavbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-4">
            <FiCompass className="text-sm" />
            <span>Transix Certified Guide Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Lead Journeys with <br />
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Transix Intelligence
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Connect directly with travelers, campus cohorts, and tour operators looking for verified, knowledgeable local leaders across India and abroad.
          </p>
        </div>

        {/* Benefits Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 text-xl">
              <FiAward />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Verified Badge
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Earn official Transix verification that establishes trust with institutions and independent travelers.
            </p>
          </div>

          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 text-xl">
              <FiDollarSign />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Direct Engagements
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Get matched for campus tours, VIP heritage walks, and multi-day expeditions with transparent terms.
            </p>
          </div>

          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 text-xl">
              <FiShield />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              Full Schedule Sync
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Real-time daily schedule coordination, participant rosters, and instant emergency broadcasts.
            </p>
          </div>
        </div>

        {/* Form or Submitted State */}
        {submitted ? (
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto shadow-lg">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-5 text-3xl">
              <FiCheckCircle />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Application Received!
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Thank you for applying to join the Transix Guide Network, <span className="font-bold text-slate-800 dark:text-slate-200">{form.fullName}</span>. Our verification coordinator will review your credentials and reach out to <span className="font-bold text-indigo-600 dark:text-indigo-400">{form.email}</span> within 24 to 48 hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition"
              >
                Return to Transix Home
              </Link>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Edit Details
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-lg"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Guide Onboarding & Verification Form
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-8">
              Fill in your professional background to begin the onboarding verification flow.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Full Name *
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a] transition">
                  <FiUser className="text-slate-400 text-base shrink-0" />
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Anand Menon"
                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Email Address *
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a] transition">
                  <FiMail className="text-slate-400 text-base shrink-0" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="anand@guidekerala.com"
                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Phone Number *
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a] transition">
                  <FiPhone className="text-slate-400 text-base shrink-0" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Primary Region / City */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Primary Region or City *
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a] transition">
                  <FiMapPin className="text-slate-400 text-base shrink-0" />
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Kochi, Kerala / Jaipur, Rajasthan"
                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Experience Years */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Guiding Experience
                </label>
                <select
                  value={form.experienceYears}
                  onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                >
                  <option value="1-2 years">1-2 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="6-10 years">6-10 years</option>
                  <option value="10+ years">10+ years (Senior Leader)</option>
                </select>
              </div>

              {/* Specialization */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Primary Specialization
                </label>
                <select
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                >
                  {SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>
                      {spec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Languages Multi-select Chips */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_LANGUAGES.map((lang) => {
                  const selected = form.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selected
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {lang} {selected ? "✓" : "+"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* License or Gov ID Number (Optional) */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Tourism License / Regional Guide Reg. Number (Optional)
              </label>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a] transition">
                <FiBriefcase className="text-slate-400 text-base shrink-0" />
                <input
                  type="text"
                  value={form.licenseNumber}
                  onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                  placeholder="e.g. MOT/REG/2023/KL-492"
                  className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            {/* Bio / Highlights */}
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Brief Bio & Tour Highlights
              </label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Share your favorite routes, stories you love telling, or special regional access..."
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0f172a] transition"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {loading ? "Submitting Application..." : "Submit Guide Application →"}
              </button>
            </div>
          </form>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
