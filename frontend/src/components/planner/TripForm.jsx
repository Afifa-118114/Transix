import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { generateAITrip } from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import toast from "react-hot-toast";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Calendar,
  Users,
  Wallet,
  Car,
  Plane,
  Train,
  Bus,
  Hotel,
  Utensils,
  Compass,
  MapPin,
  Pencil,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { getPlaceImage } from "../../api/placeApi";
import defaultHotelBg from "../../assets/activities/hotel.jpg";

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
  const [destinationHeroImage, setDestinationHeroImage] = useState(null);

  useEffect(() => {
    if (answers.destination && showSummary) {
      let isMounted = true;
      getPlaceImage(answers.destination)
        .then((img) => {
          if (isMounted && img) setDestinationHeroImage(img);
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [answers.destination, showSummary]);

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

  const activeIndex = editingQuestionId
    ? QUESTIONS.findIndex((q) => q.id === editingQuestionId)
    : currentIdx;
  const promptNumber = (activeIndex >= 0 ? activeIndex : 0) + 1;
  const imageSrc = `/prompt${promptNumber}-removebg-preview.png`;

  const getAnswerDisplay = (q) => {
    if (q.id === "dates") {
      return answers.durationStr || (answers.startDate && answers.endDate ? `${answers.startDate} to ${answers.endDate}` : answers.dates || "");
    }
    if (q.id === "interests") {
      return answers.interestsStr || (Array.isArray(answers.interests) && answers.interests.length > 0 ? answers.interests.join(", ") : "");
    }
    if (q.id === "budget" && answers.budget) {
      return `₹${Number(answers.budget).toLocaleString("en-IN")}`;
    }
    if (q.id === "travelers" && answers.travelers) {
      return `${answers.travelers} ${Number(answers.travelers) === 1 ? "Person" : "People"}`;
    }
    return answers[q.id] || "";
  };

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
    setShowSummary(false);
    setIsReviewing(false);
    setClarification(null);

    // Pre-fill input value
    let val = "";
    if (qId === "dates") val = answers.durationStr || (answers.startDate && answers.endDate ? `${answers.startDate} to ${answers.endDate}` : "");
    else if (qId === "interests") val = answers.interestsStr || (Array.isArray(answers.interests) ? answers.interests.join(", ") : "");
    else if (qId === "budget") val = answers.budget ? answers.budget.toString() : "";
    else if (qId === "travelers") val = answers.travelers ? answers.travelers.toString() : "";
    else val = answers[qId]?.toString() || "";

    setInputValue(val);
  };

  const handlePrevStep = () => {
    if (editingQuestionId) {
      setEditingQuestionId(null);
      const curQ = QUESTIONS[currentIdx];
      let val = "";
      if (curQ.id === "dates") val = answers.durationStr || "";
      else if (curQ.id === "interests") val = answers.interestsStr || "";
      else val = answers[curQ.id]?.toString() || "";
      setInputValue(val);
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
        setShowSummary(true);
        setIsReviewing(false);
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
  // RENDER: Loading State (Matches Trip.com Theme)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 bg-[#F8FAFC] dark:bg-[#0B0F19] animate-in fade-in duration-300">
        <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131b2e] shadow-xl shadow-blue-500/5 dark:shadow-black/40 overflow-hidden p-8 sm:p-14 text-center flex flex-col items-center justify-center min-h-[380px]">
          {/* Subtle Blue Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[200px] bg-blue-500/[0.05] dark:bg-blue-500/[0.08] rounded-full blur-3xl pointer-events-none" />

          <div className="relative mb-6">
            <div className="h-12 w-12 rounded-full border-4 border-blue-100 dark:border-blue-950 border-t-[#006CE4] animate-spin" />
            <Sparkles className="w-5 h-5 text-[#006CE4] dark:text-blue-400 absolute inset-0 m-auto" />
          </div>

          <span className="text-xs font-bold uppercase tracking-widest text-[#006CE4] dark:text-blue-400 mb-2">
            Synthesizing Masterplan
          </span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white mb-3 tracking-tight">
            Understanding your journey...
          </h3>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto transition-all duration-300 leading-relaxed">
            {loadingPhases[loadingPhaseIndex]}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Summary Screen (Trip.com Inspired UI/UX Design)
  // -------------------------------------------------------------
  if (showSummary && !isReviewing) {
    const getTransitIcon = (mode) => {
      const m = mode?.toLowerCase() || "";
      if (m.includes("flight") || m.includes("plane")) return Plane;
      if (m.includes("bus")) return Bus;
      if (m.includes("train")) return Train;
      return Car;
    };

    // Organized into 3 clean, aesthetic rows
    const row1 = [
      {
        id: "dates",
        label: "Travel dates",
        val: answers.durationStr || (answers.startDate && answers.endDate ? `${answers.startDate} – ${answers.endDate}` : "Flexible dates"),
        sub: answers.durationStr ? "Custom duration" : "Scheduled dates",
        icon: Calendar,
      },
      {
        id: "travelers",
        label: "Travelers",
        val: `${answers.travelers || 1} ${Number(answers.travelers) === 1 ? "Traveler" : "Travelers"}${answers.travelerType ? ` · ${answers.travelerType}` : ""}`,
        sub: answers.travelerType ? `Traveling as ${answers.travelerType.toLowerCase()}` : "Party size",
        icon: Users,
      },
      {
        id: "budget",
        label: "Total budget",
        val: answers.budget ? `₹${Number(answers.budget).toLocaleString("en-IN")}` : "Flexible",
        sub:
          answers.budget && answers.travelers && Number(answers.travelers) > 1
            ? `Approx. ₹${Math.round(Number(answers.budget) / Number(answers.travelers)).toLocaleString("en-IN")} / traveler`
            : "Total estimated budget",
        icon: Wallet,
      },
    ];

    const row2 = [
      {
        id: "travelMode",
        label: "Transport preference",
        val: answers.travelMode || "Any mode",
        sub: "Primary transit method",
        icon: getTransitIcon(answers.travelMode),
      },
      {
        id: "stay",
        label: "Accommodation",
        val: answers.stay || "Standard",
        sub: "Preferred stay comfort",
        icon: Hotel,
      },
      {
        id: "dining",
        label: "Dining preference",
        val: answers.dining || "No preference",
        sub: "Culinary & dietary notes",
        icon: Utensils,
      },
    ];

    const interestsList = answers.interests?.length
      ? answers.interests
      : answers.interestsStr
      ? answers.interestsStr.split(",").map((s) => s.trim()).filter(Boolean)
      : ["Sightseeing & Leisure"];

    return (
      <div className="h-screen max-h-screen w-full flex flex-col items-center justify-center px-4 sm:px-8 py-2 bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-hidden animate-in fade-in duration-300">
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
          {/* 1. Trip.com Signature Blue Hero Card with Image inside (Slightly Wider than White Card) */}
          <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-[#0052cc] via-[#006CE4] to-[#0047b3] shadow-lg shadow-blue-600/20 text-white min-h-[145px] sm:min-h-[165px] flex flex-col justify-between p-4 sm:p-5 pb-8 sm:pb-10">
            {/* Blended Travel Photo on the right side */}
            <div className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-1/2 pointer-events-none overflow-hidden">
              <img
                src={destinationHeroImage || defaultHotelBg}
                alt={answers.destination || "Destination"}
                className="w-full h-full object-cover object-center opacity-40 mix-blend-overlay transition-opacity duration-700"
              />
              {/* Radiant Gradient Fading Left-to-Right */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#0052cc] via-[#006CE4]/75 to-transparent" />
            </div>

            {/* Subtle decorative ambient glow */}
            <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />

            {/* Top Bar on Blue Card: Clean Route Pill only */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white text-xs font-bold shadow-2xs transition">
                <MapPin className="w-3.5 h-3.5 text-blue-200" />
                <span>{answers.source || "Origin"}</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-200" />
                <span className="text-white font-extrabold">{answers.destination || "Destination"}</span>
              </div>
            </div>

            {/* Hero Title & Sub-Guarantees */}
            <div className="relative z-10 my-1 sm:my-1.5">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Every check-in is a new beginning
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm font-medium mt-0.5 max-w-xl">
                Your personalized masterplan for <span className="text-white font-bold underline decoration-blue-300">{answers.destination || "your journey"}</span> is ready for review.
              </p>

              {/* Guarantees / Trust Badges */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mt-2 text-[11px] sm:text-xs font-semibold text-blue-100">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>100% Tailored Route</span>
                </span>
                <span className="text-blue-300/60 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Smart Scheduling</span>
                </span>
                <span className="text-blue-300/60 hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-200" />
                  <span>Best Price & Pacing</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2. White Interactive Card Overlapping the Blue Banner (Slightly narrower for stepped Trip.com look) */}
          <div className="relative -mt-6 sm:-mt-8 z-20 w-[94%] sm:w-[93%] bg-white dark:bg-[#131b2e] rounded-2xl sm:rounded-3xl shadow-xl shadow-blue-900/10 border border-slate-200/90 dark:border-slate-800 p-3.5 sm:p-4.5 transition-all">
            {/* White Card Title Strip */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80 mb-2.5">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Here is what I understand</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#006CE4] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    7 Parameters
                  </span>
                </h2>
              </div>
            </div>

            {/* 3 Structured Rows of Parameter Cards */}
            <div className="space-y-2 sm:space-y-2.5">
              {/* ROW 1: Dates, Travelers, Budget (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {row1.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 hover:bg-blue-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200/70 hover:border-blue-200 dark:border-slate-800 dark:hover:border-blue-800 transition-all flex items-start justify-between gap-2 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-1">
                        {/* Slightly Blue Tinted Icon Container */}
                        <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-[#006CE4] dark:text-blue-400 shadow-2xs mt-0.5">
                          <IconComponent className="w-4 h-4 text-[#006CE4] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                            {item.label}
                          </div>
                          <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                            {item.val}
                          </div>
                          {item.sub && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditClick(item.id)}
                        className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#006CE4] hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 transition shadow-2xs cursor-pointer shrink-0 mt-0.5"
                      >
                        <Pencil className="w-2.5 h-2.5 text-[#006CE4]" />
                        <span>Edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ROW 2: Transport, Stay, Dining (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {row2.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 hover:bg-blue-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200/70 hover:border-blue-200 dark:border-slate-800 dark:hover:border-blue-800 transition-all flex items-start justify-between gap-2 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-1">
                        {/* Slightly Blue Tinted Icon Container */}
                        <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-[#006CE4] dark:text-blue-400 shadow-2xs mt-0.5">
                          <IconComponent className="w-4 h-4 text-[#006CE4] dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
                            {item.label}
                          </div>
                          <div className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white truncate">
                            {item.val}
                          </div>
                          {item.sub && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                              {item.sub}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEditClick(item.id)}
                        className="flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#006CE4] hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 transition shadow-2xs cursor-pointer shrink-0 mt-0.5"
                      >
                        <Pencil className="w-2.5 h-2.5 text-[#006CE4]" />
                        <span>Edit</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ROW 3: Experiences & Vibe (Prominent Full Width Row) */}
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 hover:bg-blue-50/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-200/70 hover:border-blue-200 dark:border-slate-800 dark:hover:border-blue-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 group">
                <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                  {/* Slightly Blue Tinted Icon Container */}
                  <div className="w-8 h-8 rounded-lg bg-[#EBF3FF] dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shrink-0 text-[#006CE4] dark:text-blue-400 shadow-2xs">
                    <Compass className="w-4 h-4 text-[#006CE4] dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-[9.5px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-0.5">
                      EXPERIENCES & INTERESTS
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {interestsList.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleEditClick("interests")}
                  className="flex items-center gap-1 self-start sm:self-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-[#006CE4] hover:border-blue-300 dark:hover:text-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 transition shadow-2xs cursor-pointer shrink-0"
                >
                  <Pencil className="w-2.5 h-2.5 text-[#006CE4]" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Footer Action Row */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2.5 mt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsReviewing(true);
                  setShowSummary(false);
                }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all w-full sm:w-auto shadow-2xs cursor-pointer"
              >
                Review All Details
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-xl bg-[#006CE4] hover:bg-[#005bb5] text-white px-7 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
              >
                <span>Create My Itinerary</span>
                <Sparkles className="w-3.5 h-3.5 text-blue-100" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Review Screen (Trip.com UI/UX Design)
  // -------------------------------------------------------------
  if (isReviewing && !editingQuestionId) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4 py-8 bg-[#F8FAFC] dark:bg-[#0B0F19] overflow-y-auto animate-in fade-in duration-300">
        <div className="w-full max-w-2xl bg-white dark:bg-[#131b2e] border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all my-auto">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/80 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#006CE4] dark:text-blue-400">
                Questionnaire
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] dark:text-white tracking-tight">
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

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
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
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#006CE4] dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500 transition shadow-2xs cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsReviewing(false);
                setShowSummary(true);
              }}
              className="rounded-xl bg-[#006CE4] hover:bg-[#005bb5] text-white px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-xs active:scale-[0.98] transition flex items-center gap-2 cursor-pointer"
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
  // RENDER: Prompt Composer (Trip.com UI/UX Design)
  // -------------------------------------------------------------
  const summaryItems = [
    { id: "source", label: "From", val: answers.source },
    { id: "destination", label: "Destination", val: answers.destination },
    {
      id: "dates",
      label: "Travel dates",
      val: answers.durationStr || (answers.startDate && answers.endDate ? `${answers.startDate} to ${answers.endDate}` : ""),
    },
    {
      id: "travelers",
      label: "Travelers",
      val: answers.travelers ? `${answers.travelers} ${Number(answers.travelers) === 1 ? "Person" : "People"}${answers.travelerType ? ` · ${answers.travelerType}` : ""}` : "",
    },
    {
      id: "budget",
      label: "Budget",
      val: answers.budget ? `₹${Number(answers.budget).toLocaleString()}` : "",
    },
    { id: "travelMode", label: "Mode", val: answers.travelMode },
    { id: "stay", label: "Accommodation", val: answers.stay },
    { id: "dining", label: "Dining", val: answers.dining },
    {
      id: "interests",
      label: "Experiences",
      val: answers.interests?.length ? answers.interests.join(", ") : answers.interestsStr || "",
    },
  ];

  return (
    <div
      className="relative w-full h-screen max-h-screen flex bg-white dark:bg-[#0b0f19] overflow-hidden"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* Main Center Area: Prompt Composer */}
      <div className="relative flex-1 h-full flex flex-col justify-between max-w-2xl sm:max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 overflow-hidden">
        {/* Hero Centered Illustration (Bigger scale, centered, seamless transparent background) */}
        <div className="flex-1 flex items-center justify-center overflow-hidden select-none pointer-events-none z-0 my-auto py-1 sm:py-2">
          <AnimatePresence mode="wait">
            <motion.img
              key={promptNumber}
              src={imageSrc}
              onError={(e) => {
                if (!e.target.src.includes("-removebg-preview")) {
                  e.target.src = `/prompt${promptNumber}-removebg-preview.png`;
                }
              }}
              alt={activeQuestion.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-[400px] sm:h-[480px] md:h-[560px] lg:h-[640px] max-h-[62vh] w-auto max-w-none object-contain -translate-x-[18%] sm:-translate-x-[20%] select-none drop-shadow-none"
            />
          </AnimatePresence>
        </div>

        {/* Editing Mode Banner */}
        {editingQuestionId && (
          <div className="mb-2 flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shrink-0 z-20">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              <span>✏️ Editing your answer for:</span>
              <span className="font-bold underline">{activeQuestion.title}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingQuestionId(null);
                setShowSummary(true);
                setIsReviewing(false);
              }}
              className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              Cancel Edit
            </button>
          </div>
        )}

        {/* Active Question directly above the prompt box */}
        <div className="relative z-10 shrink-0 mb-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={`question-${activeQuestion.id}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mb-1"
            >
              <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A] dark:text-white tracking-tight leading-snug">
                {clarification ? clarification : activeQuestion.title}
              </h1>

              {!clarification && activeQuestion.subtitle && (
                <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 font-normal mt-1 leading-relaxed">
                  {activeQuestion.subtitle}
                </p>
              )}

              {clarification && (
                <div className="mt-2">
                  <span className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-full px-3 py-1 inline-flex items-center gap-1.5 font-medium">
                    <span>Please clarify your answer above</span>
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky Bottom Section: Suggestions & Prompt Box */}
        <div className="shrink-0 sticky bottom-0 pt-1 pb-3 bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-sm z-20 space-y-2">
          {/* Suggestion Chips */}
          {activeQuestion.suggestions && activeQuestion.suggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#94A3B8] dark:text-slate-500">
                  {activeQuestion.multi ? "Select multiple or type:" : "Suggested"}
                </span>
                {activeQuestion.multi && (
                  <span className="text-[11px] text-[#94A3B8] font-medium">
                    Tap to add or remove
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-[#006CE4] text-white border border-[#006CE4] shadow-xs font-semibold"
                          : "bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 text-[#334155] dark:text-slate-300 hover:border-[#006CE4]/40 hover:text-[#006CE4] hover:bg-[#EFF6FF] dark:hover:bg-slate-700/80"
                      }`}
                    >
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Trip.com AI Prompt Box */}
          <div className="relative bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#CBD5E1] dark:hover:border-slate-600 focus-within:border-[#006CE4] dark:focus-within:border-[#006CE4] focus-within:ring-3 focus-within:ring-[#006CE4]/10 rounded-xl p-3 sm:p-3.5 shadow-xs transition-all duration-150">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={clarification ? "Type your clarified answer..." : activeQuestion.placeholder}
              className="w-full bg-transparent text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] dark:placeholder:text-slate-500 border-none outline-none resize-none text-sm sm:text-[15px] font-normal leading-relaxed min-h-[44px] sm:min-h-[50px] py-0.5"
              rows={1}
              autoFocus
            />

            <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-[#F1F5F9] dark:border-slate-700/80">
              <div className="flex items-center gap-2">
                {(currentIdx > 0 || editingQuestionId) && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#475569] dark:text-slate-300 hover:bg-[#F8FAFC] hover:text-[#0F172A] transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{editingQuestionId ? "Cancel Edit" : "Previous"}</span>
                  </button>
                )}
                <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] font-medium">
                  <span>Return ↵ to submit</span>
                  <span className="hidden sm:inline text-[#CBD5E1]">· Shift + Return for new line</span>
                </div>
              </div>

              <button
                type="button"
                onClick={validateAndStore}
                disabled={!inputValue.trim()}
                className={`rounded-lg px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 ${
                  inputValue.trim()
                    ? "bg-[#006CE4] hover:bg-[#005bb5] text-white shadow-xs active:scale-[0.98] cursor-pointer"
                    : "bg-[#F1F5F9] dark:bg-slate-800 text-[#94A3B8] dark:text-slate-500 cursor-not-allowed"
                }`}
              >
                <span>
                  {editingQuestionId
                    ? "Save Change"
                    : currentIdx === QUESTIONS.length - 1
                    ? "Complete"
                    : "Continue"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Subtle Compact Trip Summary Panel */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-68 shrink-0 h-screen border-l border-slate-100 dark:border-slate-800/60 bg-slate-50/20 dark:bg-slate-900/10 p-5 justify-between z-20 overflow-y-auto custom-scrollbar select-none">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800/70">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 block mb-0.5">
                Overview
              </span>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wider uppercase">
                Your Journey
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-[#006CE4] dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 px-2 py-0.5 rounded-full">
              {summaryItems.filter((i) => Boolean(i.val)).length}/{summaryItems.length}
            </span>
          </div>

          {/* Key Attribute Rows */}
          <div className="space-y-3">
            {summaryItems.map((item) => {
              const hasVal = Boolean(item.val);
              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-start text-left py-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {item.label}
                    </span>
                    {hasVal && (
                      <button
                        type="button"
                        onClick={() => handleEditClick(item.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-[#006CE4] dark:text-blue-400 hover:underline font-medium transition cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5">
                    {hasVal ? (
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                        {item.val}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400/80 dark:text-slate-600 font-normal italic block">
                        Not selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
