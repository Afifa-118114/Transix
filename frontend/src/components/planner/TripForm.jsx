import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { generateAITrip } from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import { useTheme } from "../../context/ThemeContext";
import toast from "react-hot-toast";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { FiSun, FiMoon, FiHome } from "react-icons/fi";

const QUESTIONS = [
  {
    id: "source",
    title: "Where are you travelling from?",
    subtitle: "Enter the city or transit hub you'll start your journey from.",
    placeholder: "Type a city, airport, or place...",
    suggestions: ["Mumbai", "Delhi", "Pune", "Bengaluru"],
    multi: false,
  },
  {
    id: "destination",
    title: "Where would you like to go?",
    subtitle: "Tell me a destination, region, or style of place you're interested in.",
    placeholder: "Where do you want to go?",
    suggestions: ["Goa", "Kerala", "Manali", "Jaipur", "Kashmir"],
    multi: false,
  },
  {
    id: "dates",
    title: "When do you want to travel?",
    subtitle: "Provide your start and end dates, or an approximate window.",
    placeholder: "e.g. Next weekend, or 15 Dec - 21 Dec...",
    suggestions: ["Next weekend", "15 Dec – 21 Dec", "1 Jan - 5 Jan"],
    multi: false,
  },
  {
    id: "budget",
    title: "What's your total trip budget?",
    subtitle: "Enter your approximate budget for the entire trip in Indian Rupees.",
    placeholder: "Enter total budget, e.g. ₹50,000...",
    suggestions: ["₹20,000", "₹50,000", "₹1,00,000", "₹2,00,000"],
    multi: false,
  },
  {
    id: "travelers",
    title: "How many people are travelling?",
    subtitle: "Specify the number of travelers joining this trip.",
    placeholder: "Enter number, e.g. 2 or 4...",
    suggestions: ["1", "2", "3", "4", "5+"],
    multi: false,
  },
  {
    id: "travelMode",
    title: "How would you prefer to travel?",
    subtitle: "Select your preferred primary mode of transit.",
    placeholder: "Tell me how you'd like to travel...",
    suggestions: ["Train", "Flight", "Bus", "Car", "No preference"],
    multi: false,
  },
  {
    id: "stay",
    title: "What type of accommodation do you prefer?",
    subtitle: "Choose the comfort level that matches your expectation.",
    placeholder: "e.g. Budget, Comfort, Luxury, Resort...",
    suggestions: ["Budget", "Comfort", "Premium", "Luxury", "No preference"],
    multi: false,
  },
  {
    id: "dining",
    title: "What are your dining preferences?",
    subtitle: "Any culinary or dietary guidelines to keep in mind.",
    placeholder: "Any dietary preferences?",
    suggestions: ["Vegetarian", "Non-Vegetarian", "Jain", "Vegan", "No preference"],
    multi: false,
  },
  {
    id: "travelerType",
    title: "Who are you travelling with?",
    subtitle: "This helps us personalize activity recommendations and pace.",
    placeholder: "e.g. Family, Friends, Solo...",
    suggestions: ["Just me", "Couple", "Family", "Friends", "Group"],
    multi: false,
  },
  {
    id: "interests",
    title: "What would you like to experience on this trip?",
    subtitle: "Choose what interests you, or tell me in your own words.",
    placeholder: "Nature, Adventure, Food, Culture...",
    suggestions: [
      "Nature",
      "Adventure",
      "Beaches",
      "Food",
      "Culture",
      "History",
      "Shopping",
      "Nightlife",
      "Spiritual",
      "Relaxation",
      "Photography",
    ],
    multi: true,
  },
];

const loadingPhases = [
  "Analyzing destination & travel preferences...",
  "Querying transit schedules & connections...",
  "Curating top-rated stays & properties...",
  "Balancing day-by-day pacing & activities...",
  "Synthesizing your intelligent travel masterplan...",
];

export default function TripForm({ setTrip }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [clarification, setClarification] = useState(null);

  // Review & Edit state
  const [showSummary, setShowSummary] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  const [answers, setAnswers] = useState({
    source: "",
    destination: "",
    startDate: "",
    endDate: "",
    durationStr: "",
    budget: "",
    travelers: "",
    travelMode: "",
    stay: "",
    dining: "",
    travelerType: "",
    interests: [],
    interestsStr: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentIdx, clarification, showSummary, isReviewing, editingQuestionId]);

  const isGeneratingRef = useRef(false);

  // Restore pending trip intent or complete pre-saved questionnaire responses
  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedPayload = sessionStorage.getItem("transix_saved_payload");
    const savedAnswers = sessionStorage.getItem("transix_saved_answers");

    // If user filled out entire questionnaire and just authenticated:
    if (savedPayload && token && !isGeneratingRef.current) {
      sessionStorage.removeItem("transix_saved_payload");
      sessionStorage.removeItem("transix_saved_answers");
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch (e) {}
      }
      toast.success("Restored your preferences! Generating your itinerary...", { icon: "✨" });
      executeGenerate(JSON.parse(savedPayload), token);
      return;
    }

    // If user entered initial parameters from landing page hero planner:
    try {
      const stored = sessionStorage.getItem("transix_pending_plan");
      if (stored) {
        const plan = JSON.parse(stored);
        sessionStorage.removeItem("transix_pending_plan");

        const daysMatch = plan.duration?.toString().match(/\d+/);
        const days = daysMatch ? parseInt(daysMatch[0], 10) : 7;

        const start = new Date();
        start.setDate(start.getDate() + 7);
        const end = new Date(start);
        end.setDate(start.getDate() + days);
        const formatYMD = (d) => d.toISOString().split("T")[0];

        const travMatch = plan.travelers?.toString().match(/\d+/);
        const numTravelers = travMatch ? parseInt(travMatch[0], 10) : 2;

        setAnswers((prev) => ({
          ...prev,
          destination: plan.destination || prev.destination,
          travelers: numTravelers,
          durationStr: `${days} Days`,
          startDate: formatYMD(start),
          endDate: formatYMD(end),
          budget: plan.budget || 50000,
          travelMode: plan.travelMode || "Train",
          stay: "Standard",
          dining: "Any",
          travelerType: numTravelers === 1 ? "Just me" : numTravelers === 2 ? "Couple" : "Family",
          interests: ["Sightseeing", "Nature"],
          interestsStr: "Sightseeing, Nature",
        }));

        toast.success(`Starting planner for ${plan.destination} (${days} Days, ${numTravelers} Travelers)!`, {
          icon: "✨",
        });
      }
    } catch (e) {
      console.warn("Failed to restore pending plan intent", e);
    }
  }, []);

  useEffect(() => {
    let interval = null;
    if (loading) {
      setLoadingPhaseIndex(0);
      interval = setInterval(() => {
        setLoadingPhaseIndex((prev) => (prev + 1) % loadingPhases.length);
      }, 2200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  const activeQuestion = editingQuestionId
    ? QUESTIONS.find((q) => q.id === editingQuestionId)
    : QUESTIONS[currentIdx];

  const handleSuggestionClick = (sug) => {
    if (activeQuestion.multi) {
      const arr = inputValue.split(",").map((i) => i.trim()).filter(Boolean);
      const exists = arr.some((item) => item.toLowerCase() === sug.toLowerCase());
      if (exists) {
        setInputValue(arr.filter((i) => i.toLowerCase() !== sug.toLowerCase()).join(", "));
      } else {
        setInputValue([...arr, sug].join(", "));
      }
    } else {
      setInputValue(sug);
    }
    textareaRef.current?.focus();
  };

  const handleEditClick = (qId) => {
    setEditingQuestionId(qId);
    setClarification(null);

    // Pre-fill input value
    let val = "";
    if (qId === "dates") val = answers.durationStr || `${answers.startDate} to ${answers.endDate}`;
    else if (qId === "interests") val = answers.interestsStr;
    else val = answers[qId]?.toString() || "";

    setInputValue(val);
  };

  const handlePrevStep = () => {
    if (editingQuestionId) {
      setEditingQuestionId(null);
      setInputValue("");
      setClarification(null);
      return;
    }
    if (currentIdx > 0) {
      const prevIdx = currentIdx - 1;
      const prevQ = QUESTIONS[prevIdx];
      setCurrentIdx(prevIdx);
      setClarification(null);
      let val = "";
      if (prevQ.id === "dates") val = answers.durationStr || (answers.startDate ? `${answers.startDate} to ${answers.endDate}` : "");
      else if (prevQ.id === "interests") val = answers.interestsStr || answers.interests?.join(", ") || "";
      else val = answers[prevQ.id]?.toString() || "";
      setInputValue(val);
    }
  };

  const validateAndStore = () => {
    if (!inputValue.trim()) return;

    const val = inputValue.trim().toLowerCase();
    let nextAnswers = { ...answers };
    let needsClarification = false;
    let clarMsg = "";

    switch (activeQuestion.id) {
      case "source":
        if (val === "india" || val === "abroad") {
          needsClarification = true;
          clarMsg = "Which city will you be travelling from?";
        } else {
          nextAnswers.source = inputValue.trim();
        }
        break;
      case "destination":
        if (val === "somewhere nice" || val.length < 3) {
          needsClarification = true;
          clarMsg = "Do you have a specific destination in mind, or a region you'd like to explore?";
        } else {
          nextAnswers.destination = inputValue.trim();
        }
        break;
      case "dates":
        const dateMatch = inputValue.match(/\d{1,2}\s+[a-zA-Z]+/g) || inputValue.match(/\d{4}-\d{2}-\d{2}/g);
        if (dateMatch && dateMatch.length >= 2) {
          nextAnswers.durationStr = inputValue.trim();
          try {
            let s = new Date(dateMatch[0] + (dateMatch[0].match(/\d{4}/) ? "" : " 2026"));
            let e = new Date(dateMatch[1] + (dateMatch[1].match(/\d{4}/) ? "" : " 2026"));
            if (isNaN(s.getTime()) || isNaN(e.getTime())) {
              nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split("T")[0];
              nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 17)).toISOString().split("T")[0];
            } else {
              const formatYMD = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${day}`;
              };
              nextAnswers.startDate = formatYMD(s);
              nextAnswers.endDate = formatYMD(e);
            }
          } catch (e) {
            nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split("T")[0];
            nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 17)).toISOString().split("T")[0];
          }
        } else if (val.includes("next weekend")) {
          nextAnswers.durationStr = inputValue.trim();
          nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split("T")[0];
          nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split("T")[0];
        } else {
          needsClarification = true;
          clarMsg = "What dates would you like to travel? Please share your start and end dates or approximate window.";
        }
        break;
      case "budget":
        const numMatch = val.match(/\d+/g);
        if (val === "cheap" || val === "affordable" || !numMatch) {
          needsClarification = true;
          clarMsg = "Could you give an approximate budget in rupees? For example, ₹30,000, ₹50,000 or ₹1,00,000.";
        } else {
          let numStr = numMatch.join("");
          if (val.includes("k")) numStr += "000";
          if (val.includes("lakh")) numStr += "00000";
          const numeric = parseInt(numStr, 10);
          if (numeric > 0) {
            nextAnswers.budget = numeric;
          } else {
            needsClarification = true;
            clarMsg = "Please enter a valid amount.";
          }
        }
        break;
      case "travelers":
        const tMatch = val.match(/\d+/);
        if (val.includes("just me") || val === "one") {
          nextAnswers.travelers = 1;
        } else if (val.includes("couple") || val === "two") {
          nextAnswers.travelers = 2;
        } else if (val.includes("many")) {
          needsClarification = true;
          clarMsg = "How many travelers will be joining the trip?";
        } else if (tMatch) {
          nextAnswers.travelers = parseInt(tMatch[0], 10);
        } else {
          needsClarification = true;
          clarMsg = "Please specify a number.";
        }

        // Conflict check against travelerType
        if (!needsClarification && nextAnswers.travelerType) {
          const typeVal = nextAnswers.travelerType.toLowerCase();
          let inferred = 0;
          if (typeVal.includes("couple") || typeVal.includes("wife") || typeVal.includes("husband")) inferred = 2;
          if (typeVal.includes("just me") || typeVal.includes("alone") || typeVal.includes("solo")) inferred = 1;

          if (inferred > 0 && nextAnswers.travelers && inferred !== nextAnswers.travelers) {
            needsClarification = true;
            clarMsg = `You selected "${nextAnswers.travelerType}" earlier, but now mentioned ${nextAnswers.travelers} travelers. Which is correct?`;
          }
        }
        break;
      case "travelMode":
        nextAnswers.travelMode = inputValue.trim();
        break;
      case "stay":
        nextAnswers.stay = inputValue.trim();
        break;
      case "dining":
        nextAnswers.dining = inputValue.trim();
        break;
      case "travelerType":
        let inferredType = 0;
        if (val.includes("couple") || val.includes("wife") || val.includes("husband")) inferredType = 2;
        if (val.includes("just me") || val.includes("alone") || val.includes("solo")) inferredType = 1;

        if (inferredType > 0 && answers.travelers && inferredType !== Number(answers.travelers)) {
          needsClarification = true;
          clarMsg = `You mentioned ${answers.travelers} travelers earlier, but I understood ${inferredType} people from this answer. Which is correct?`;
        } else {
          nextAnswers.travelerType = inputValue.trim();
        }
        break;
      case "interests":
        nextAnswers.interestsStr = inputValue.trim();
        nextAnswers.interests = inputValue.split(",").map((i) => i.trim()).filter(Boolean);
        break;
      default:
        break;
    }

    if (needsClarification) {
      setClarification(clarMsg);
    } else {
      setClarification(null);
      setAnswers(nextAnswers);

      if (editingQuestionId) {
        setEditingQuestionId(null);
        setInputValue("");
      } else {
        if (currentIdx < QUESTIONS.length - 1) {
          const nextIdx = currentIdx + 1;
          setCurrentIdx(nextIdx);
          const nextQ = QUESTIONS[nextIdx];
          let val = "";
          if (nextQ.id === "dates") val = nextAnswers.durationStr || "";
          else if (nextQ.id === "interests") val = nextAnswers.interestsStr || "";
          else val = nextAnswers[nextQ.id]?.toString() || "";
          setInputValue(val);
        } else {
          setShowSummary(true);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      validateAndStore();
    }
  };

  const executeGenerate = async (payloadToUse, authToken) => {
    isGeneratingRef.current = true;
    try {
      setLoading(true);
      const res = await generateAITrip(payloadToUse, authToken);
      if (res?.trip) {
        clearInventoryCache();
        const normalized = normalizeTrip(res.trip);
        localStorage.setItem("currentTrip", JSON.stringify(normalized));
        localStorage.removeItem("transix_builder_trip");
        if (setTrip) setTrip(normalized);
        window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: normalized }));
        toast.success(`Itinerary created for ${normalized.destination}!`, { icon: "✨" });
      }
    } catch (err) {
      console.error("Trip generation error:", err);
      toast.error(err.response?.data?.message || "Failed to generate itinerary. Please try again.");
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const handleGenerate = async () => {
    if (loading || isGeneratingRef.current) return;
    const mapEnum = (val, validOptions, defaultOption) => {
      if (!val) return defaultOption;
      const normalized = val.toLowerCase();

      for (const opt of validOptions) {
        if (normalized.includes(opt.toLowerCase())) return opt;
      }

      if (validOptions.includes("Solo") && (normalized.includes("just me") || normalized.includes("alone"))) return "Solo";
      if (validOptions.includes("Veg") && normalized === "vegetarian") return "Veg";
      if (validOptions.includes("Non-Veg") && normalized === "non-vegetarian") return "Non-Veg";
      if (validOptions.includes("Standard") && (normalized.includes("comfort") || normalized.includes("premium"))) return "Standard";
      if (validOptions.includes("Any") && normalized.includes("no preference")) return "Any";

      return defaultOption;
    };

    const payload = {
      source: answers.source,
      destination: answers.destination,
      startDate: answers.startDate,
      endDate: answers.endDate,
      travelers: Number(answers.travelers) || 2,
      budget: Number(answers.budget) || 50000,
      currency: "INR",
      travelMode: mapEnum(answers.travelMode, ["Flight", "Train", "Bus", "Car"], "Train"),
      hotelType: mapEnum(answers.stay, ["Budget", "Standard", "Luxury"], "Standard"),
      foodPreference: mapEnum(answers.dining, ["Veg", "Non-Veg", "Vegan", "Any"], "Any"),
      tripType: mapEnum(answers.travelerType, ["Solo", "Family", "Friends", "Couple", "Business"], "Family"),
      interests: answers.interests.length > 0 ? answers.interests : ["Sightseeing"],
      priority: "Comfort",
      purpose: "Vacation",
    };

    const token = localStorage.getItem("token");
    if (!token) {
      sessionStorage.setItem("transix_saved_answers", JSON.stringify(answers));
      sessionStorage.setItem("transix_saved_payload", JSON.stringify(payload));
      toast("Please sign in or create an account to finalize and save your personalized itinerary.", {
        icon: "🔐",
        duration: 4000,
      });
      navigate("/login", { state: { from: "/home", hasPendingGeneration: true } });
      return;
    }

    await executeGenerate(payload, token);
  };

  // -------------------------------------------------------------
  // RENDER: Loading State (Matches Landing Page Theme - No Green)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center px-4 py-12 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
        <div className="relative w-full rounded-3xl border border-indigo-100/90 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl shadow-indigo-500/5 dark:shadow-black/40 overflow-hidden p-10 sm:p-16 text-center flex flex-col items-center justify-center min-h-[380px]">
          {/* Subtle Indigo Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[200px] bg-indigo-500/[0.06] dark:bg-indigo-500/[0.1] rounded-full blur-3xl pointer-events-none" />

          <div className="relative mb-6">
            <div className="h-12 w-12 rounded-full border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 animate-spin" />
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 absolute inset-0 m-auto" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
            Synthesizing Masterplan
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
            Understanding your journey...
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto transition-all duration-300">
            {loadingPhases[loadingPhaseIndex]}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Summary Screen (Matches Landing Page Theme)
  // -------------------------------------------------------------
  if (showSummary && !isReviewing) {
    return (
      <div className="flex justify-center px-4 py-8 max-w-2xl mx-auto w-full animate-in fade-in duration-300">
        <div className="w-full bg-white dark:bg-[#131b2e] border border-indigo-100/90 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-500/5 dark:shadow-black/40">
          <div className="text-center pb-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Here is what I understand</span>
            </h2>
            <div className="text-lg font-medium text-slate-800 dark:text-slate-200 mt-3 flex items-center justify-center gap-3">
              <span>{answers.source}</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{answers.destination}</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 py-2">
            {[
              { label: "Travel dates", val: answers.durationStr || "Dates selected", id: "dates" },
              {
                label: "Travelers",
                val: `${answers.travelers} Travelers · ${answers.travelerType || "General"}`,
                id: "travelers",
              },
              { label: "Total budget", val: `₹${Number(answers.budget).toLocaleString()}`, id: "budget" },
              { label: "Transport preference", val: answers.travelMode, id: "travelMode" },
              { label: "Accommodation", val: answers.stay, id: "stay" },
              { label: "Dining", val: answers.dining, id: "dining" },
              {
                label: "Experiences",
                val: answers.interests.length ? answers.interests.join(" · ") : answers.interestsStr || "None specified",
                id: "interests",
              },
            ].map((item) => (
              <div key={item.id} className="py-3.5 flex items-center justify-between group">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5 font-bold">
                    {item.label}
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">
                    {item.val}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReviewing(true);
                    setShowSummary(false);
                    setEditingQuestionId(item.id);
                    setInputValue(
                      item.id === "budget"
                        ? answers.budget.toString()
                        : item.id === "travelers"
                        ? answers.travelers.toString()
                        : answers[item.id] || ""
                    );
                  }}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-2xs cursor-pointer"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setIsReviewing(true);
                setShowSummary(false);
              }}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all w-full sm:w-auto shadow-2xs cursor-pointer"
            >
              Review All Details
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-8 py-3 text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
            >
              <span>Create My Itinerary</span>
              <Sparkles className="w-4 h-4 text-indigo-200" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Review Screen (Matches Landing Page Theme)
  // -------------------------------------------------------------
  if (isReviewing && !editingQuestionId) {
    return (
      <div className="flex flex-col max-w-2xl mx-auto px-4 py-8 w-full animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#131b2e] border border-indigo-100/90 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-indigo-500/5 dark:shadow-black/40">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Questionnaire
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Review All Details
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsReviewing(false);
                setShowSummary(true);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition cursor-pointer shadow-2xs"
            >
              Close Review
            </button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {QUESTIONS.map((q) => {
              let val = "";
              if (q.id === "dates") val = answers.durationStr || `${answers.startDate} to ${answers.endDate}`;
              else if (q.id === "interests") val = answers.interestsStr || answers.interests?.join(", ");
              else val = answers[q.id];

              return (
                <div
                  key={q.id}
                  className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4"
                >
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                      {q.title}
                    </h3>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {val || "Not specified"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEditClick(q.id)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-500 transition shadow-2xs cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsReviewing(false);
                setShowSummary(true);
              }}
              className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-8 py-3 text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Looks Good</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Prompt Composer (Full Light & Dark Mode)
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] sm:min-h-[calc(100vh-8rem)] max-w-2xl sm:max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 justify-between">
      {/* Top Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          {/* Left: Navigation Buttons (Home + Previous) */}
          <div className="flex items-center gap-2">
            {/* Back to Home Button */}
            <Link
              to="/"
              title="Return to Transix Home"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition shadow-2xs cursor-pointer"
            >
              <FiHome className="text-sm" />
              <span>Home</span>
            </Link>

            {/* Previous Step Button */}
            {(currentIdx > 0 || editingQuestionId) && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{editingQuestionId ? "Cancel Edit" : "Previous"}</span>
              </button>
            )}
          </div>

          {/* Right: Theme Toggle + Stepper Progress */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131b2e] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs cursor-pointer"
            >
              {isDark ? <FiSun className="text-sm text-amber-400" /> : <FiMoon className="text-sm text-slate-600" />}
            </button>

            {/* Stepper info */}
            {!editingQuestionId && (
              <div className="flex items-center gap-2.5">
                <div className="w-16 sm:w-24 h-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(((currentIdx + 1) / QUESTIONS.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                  {currentIdx + 1} / {QUESTIONS.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Question Area */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2]">
            {clarification ? clarification : activeQuestion.title}
          </h1>

          {!clarification && activeQuestion.subtitle && (
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed mt-2.5 max-w-xl">
              {activeQuestion.subtitle}
            </p>
          )}

          {clarification && (
            <div className="mt-3.5">
              <span className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-4 py-1.5 inline-flex items-center gap-2 font-medium">
                <span>Please clarify your answer above</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Composer Section */}
      <div className="w-full">
        {/* Suggestion Chips */}
        {activeQuestion.suggestions && activeQuestion.suggestions.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                {activeQuestion.multi ? "Select multiple or type:" : "Suggested"}
              </span>
              {activeQuestion.multi && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Tap to add or remove
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              {activeQuestion.suggestions.map((sug) => {
                const isSelected = activeQuestion.multi
                  ? inputValue
                      .split(",")
                      .map((i) => i.trim().toLowerCase())
                      .includes(sug.toLowerCase())
                  : inputValue.trim().toLowerCase() === sug.toLowerCase();

                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSuggestionClick(sug)}
                    className={`rounded-2xl px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border border-indigo-600 shadow-md shadow-indigo-600/25 scale-[1.02]"
                        : "bg-white dark:bg-[#131b2e] border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/40 hover:-translate-y-0.5 shadow-2xs"
                    }`}
                  >
                    {sug}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Premium AI Prompt Box (Theme Responsive) */}
        <div className="relative bg-white dark:bg-[#131b2e] border-2 border-indigo-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-3xl p-5 sm:p-7 shadow-xl shadow-indigo-500/5 dark:shadow-black/40 transition-all duration-200">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={clarification ? "Type your clarified answer..." : activeQuestion.placeholder}
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 border-none outline-none resize-none text-base sm:text-lg font-medium leading-relaxed min-h-[75px] sm:min-h-[90px] py-1"
            rows={1}
            autoFocus
          />

          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
              <span>Return ↵ to submit</span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-600">
                · Shift + Return for new line
              </span>
            </div>

            <button
              type="button"
              onClick={validateAndStore}
              disabled={!inputValue.trim()}
              className={`rounded-2xl px-6 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-2 ${
                inputValue.trim()
                  ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-600/25 active:scale-95 cursor-pointer"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>
                {editingQuestionId
                  ? "Save Change"
                  : currentIdx === QUESTIONS.length - 1
                  ? "Complete"
                  : "Continue"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
