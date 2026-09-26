import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import {
  FiCompass,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiShield,
  FiCalendar,
  FiArrowLeft,
  FiExternalLink,
  FiInfo,
} from "react-icons/fi";
import { getGuideApplicationStatus } from "../../api/guideApi";

const TIMELINE_STAGES = [
  {
    key: "APPLICATION_SUBMITTED",
    title: "Application Submitted",
    description: "Your guide verification application has been submitted and registered in the Transix system.",
  },
  {
    key: "DOCUMENT_REVIEW",
    title: "Document Review",
    description: "Verification team inspects your government ID, regional credentials, and uploaded proof.",
  },
  {
    key: "INTERVIEW",
    title: "Interview",
    description: "A professional interaction to assess regional route expertise, safety readiness, and communication.",
  },
  {
    key: "REFERENCE_VERIFICATION",
    title: "Experience / Reference Verification",
    description: "Validation of previous tour operator associations, institutions, or professional references.",
  },
  {
    key: "FINAL_REVIEW",
    title: "Final Review",
    description: "Compliance validation by Transix Head of Guide Operations.",
  },
  {
    key: "APPROVED",
    title: "Guide Profile Approved",
    description: "Transix Certified Guide badge activation and assignment dispatch eligibility.",
  },
];

export default function GuideVerificationStatusPage() {
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        setLoading(true);
        // Try fetching from backend
        if (id) {
          const res = await getGuideApplicationStatus(id);
          if (isMounted && res.success && res.application) {
            setApplication(res.application);
            setLoading(false);
            return;
          }
        }

        // Fallback: check local storage cached application
        const localCached = localStorage.getItem("transix_latest_guide_app");
        if (localCached && isMounted) {
          const parsed = JSON.parse(localCached);
          if (!id || parsed._id === id || parsed.applicationNumber === id) {
            setApplication(parsed);
            setLoading(false);
            return;
          }
        }

        if (isMounted) {
          setError("Application details could not be found.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Status load error:", err);
        // Try local storage fallback
        const localCached = localStorage.getItem("transix_latest_guide_app");
        if (localCached && isMounted) {
          try {
            const parsed = JSON.parse(localCached);
            setApplication(parsed);
            setLoading(false);
            return;
          } catch (e) {
            // ignore
          }
        }
        if (isMounted) {
          setError(err.response?.data?.message || "Failed to load application status.");
          setLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Determine stage status: COMPLETED, CURRENT (IN_PROGRESS), or UPCOMING (PENDING)
  const getStageState = (stageKey) => {
    if (!application) {
      if (stageKey === "APPLICATION_SUBMITTED") return "COMPLETED";
      if (stageKey === "DOCUMENT_REVIEW") return "CURRENT";
      return "PENDING";
    }

    // Check application timeline if available
    const foundStage = application.timeline?.find((t) => t.key === stageKey);
    if (foundStage) {
      if (foundStage.status === "COMPLETED") return "COMPLETED";
      if (foundStage.status === "IN_PROGRESS") return "CURRENT";
      return "PENDING";
    }

    if (application.currentStage === stageKey) return "CURRENT";

    // Default stage progression
    const order = [
      "APPLICATION_SUBMITTED",
      "DOCUMENT_REVIEW",
      "INTERVIEW",
      "REFERENCE_VERIFICATION",
      "FINAL_REVIEW",
      "APPROVED",
    ];
    const currentIndex = order.indexOf(application.currentStage || "APPLICATION_SUBMITTED");
    const stageIndex = order.indexOf(stageKey);

    if (stageIndex < currentIndex) return "COMPLETED";
    if (stageIndex === currentIndex) return "CURRENT";
    return "PENDING";
  };

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col justify-between">
      <PublicNavbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="text-center py-20">
            <div className="h-10 w-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Retrieving verification status...
            </p>
          </div>
        ) : error && !application ? (
          <div className="bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
            <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              <FiInfo />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Application Not Found
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6">
              {error}
            </p>
            <Link
              to="/join-as-guide"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition"
            >
              <FiArrowLeft />
              <span>Back to Guide Application</span>
            </Link>
          </div>
        ) : (
          <div>
            {/* Header Banner */}
            <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-3">
                    <FiCheckCircle className="text-emerald-600 dark:text-emerald-400" />
                    <span>Application Submitted</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Guide Verification Status
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                    Your guide application has been submitted successfully. Our team will review your information and contact you for the next verification steps.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 sm:text-right shrink-0">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Application Reference
                  </p>
                  <p className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {application.applicationNumber || id}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Submitted on:{" "}
                    {new Date(application.createdAt || Date.now()).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Applicant Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Applicant</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {application.fullName}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Email</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {application.email}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Phone</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {application.phone}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Region</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {application.city}
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Progress Timeline */}
            <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Verification Progress Timeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Follow each phase of your guide verification workflow
                </p>
              </div>

              <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {TIMELINE_STAGES.map((stage, idx) => {
                  const state = getStageState(stage.key);
                  const isCompleted = state === "COMPLETED";
                  const isCurrent = state === "CURRENT";
                  const isPending = state === "PENDING";

                  return (
                    <div key={stage.key} className="relative group">
                      {/* Timeline marker */}
                      <div
                        className={`absolute -left-6 sm:-left-8 top-0.5 h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isCompleted
                            ? "bg-emerald-500 text-white shadow-xs"
                            : isCurrent
                            ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60"
                            : "bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {isCompleted ? (
                          <FiCheckCircle className="text-sm" />
                        ) : isCurrent ? (
                          <div className="h-2 w-2 bg-white rounded-full animate-ping" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Content */}
                      <div
                        className={`p-4 sm:p-5 rounded-2xl border transition ${
                          isCurrent
                            ? "border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/30"
                            : isCompleted
                            ? "border-emerald-100 dark:border-emerald-950/40 bg-emerald-50/20 dark:bg-emerald-950/10"
                            : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <h3
                            className={`text-sm sm:text-base font-bold ${
                              isCurrent
                                ? "text-indigo-600 dark:text-indigo-400"
                                : isCompleted
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {stage.title}
                          </h3>

                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                                : isCurrent
                                ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 animate-pulse"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isCompleted
                              ? "Completed"
                              : isCurrent
                              ? "In Review"
                              : "Upcoming Stage"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {stage.description}
                        </p>

                        {/* Additional Stage-Specific Notice */}
                        {stage.key === "INTERVIEW" && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Note on Interview Scheduling:
                            </span>{" "}
                            Our team will coordinate the interaction date directly with you via email ({application.email}) once document verification is cleared. No action is required from you right now.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Steps & Support Info Card */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg mb-8">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0 text-indigo-300">
                  <FiShield />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">
                    What happens next?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    Transix verification coordinators review government IDs and tourism registrations within <strong>24 to 48 business hours</strong>. You will receive email notifications at each milestone.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Questions about your application? Contact our Guide Desk at{" "}
                    <span className="text-indigo-300 font-semibold underline">guides@transix.com</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Return / Navigation actions */}
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
              >
                <FiArrowLeft className="text-sm" />
                <span>Return to Transix Home</span>
              </Link>

              <Link
                to="/join-as-guide"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Submit another application
              </Link>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
