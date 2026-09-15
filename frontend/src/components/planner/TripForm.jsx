import { useState, useEffect, useRef } from "react";
import { generateAITrip } from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import toast from "react-hot-toast";
import { Sparkles, ArrowRight, User, Send } from "lucide-react";

const QUESTIONS = [
  {
    id: "source",
    title: "Where are you travelling from?",
    subtitle: "Enter the city you'll start your journey from.",
    placeholder: "Type a city, airport, or place...",
    suggestions: ["Mumbai", "Delhi", "Pune", "Bengaluru"],
    multi: false,
  },
  {
    id: "destination",
    title: "Where would you like to go?",
    subtitle: "Tell me a destination, region, or even a type of place you're interested in.",
    placeholder: "Where do you want to go?",
    suggestions: ["Goa", "Kerala", "Manali", "Jaipur", "Kashmir"],
    multi: false,
  },
  {
    id: "dates",
    title: "When do you want to travel?",
    subtitle: "Tell me your start and end dates. I'll calculate the trip duration for you.",
    placeholder: "e.g. Next weekend, or 15 Dec - 21 Dec...",
    suggestions: ["Next weekend", "15 Dec – 21 Dec", "1 Jan - 5 Jan"],
    multi: false,
  },
  {
    id: "budget",
    title: "What's your total trip budget?",
    subtitle: "Enter the approximate total amount you want to spend for the entire trip, in Indian Rupees.",
    placeholder: "Enter your total budget, e.g. ₹50,000...",
    suggestions: ["₹20,000", "₹50,000", "₹1,00,000", "₹2,00,000"],
    multi: false,
  },
  {
    id: "travelers",
    title: "How many people are travelling?",
    subtitle: "Tell me the total number of travelers.",
    placeholder: "Enter a number, e.g. 4...",
    suggestions: ["1", "2", "3", "4", "5+"],
    multi: false,
  },
  {
    id: "travelMode",
    title: "How would you prefer to travel?",
    subtitle: "",
    placeholder: "Tell me how you'd like to travel...",
    suggestions: ["Train", "Flight", "Bus", "Car", "No preference"],
    multi: false,
  },
  {
    id: "stay",
    title: "What type of accommodation do you prefer?",
    subtitle: "",
    placeholder: "e.g. Budget, Luxury, Resort...",
    suggestions: ["Budget", "Comfort", "Premium", "Luxury", "No preference"],
    multi: false,
  },
  {
    id: "dining",
    title: "What are your dining preferences?",
    subtitle: "",
    placeholder: "Any dietary preferences?",
    suggestions: ["Vegetarian", "Non-Vegetarian", "Jain", "Vegan", "No preference"],
    multi: false,
  },
  {
    id: "travelerType",
    title: "Who are you travelling with?",
    subtitle: "",
    placeholder: "e.g. Family, Friends, Solo...",
    suggestions: ["Just me", "Couple", "Family", "Friends", "Group"],
    multi: false,
  },
  {
    id: "interests",
    title: "What would you like to experience on this trip?",
    subtitle: "Choose what interests you, or tell me in your own words.",
    placeholder: "Nature, Adventure, Food...",
    suggestions: ["Nature", "Adventure", "Beaches", "Food", "Culture", "History", "Shopping", "Nightlife", "Spiritual", "Relaxation", "Photography"],
    multi: true,
  },
];

const loadingPhases = [
  "Analyzing destination & travel preferences...",
  "Querying transit schedules...",
  "Selecting top-rated stays...",
  "Optimizing day-by-day itinerary...",
  "Finalizing your intelligent travel plan...",
];

export default function TripForm({ setTrip }) {
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
    interestsStr: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentIdx, clarification, showSummary, isReviewing, editingQuestionId]);

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
    ? QUESTIONS.find(q => q.id === editingQuestionId) 
    : QUESTIONS[currentIdx];

  const handleSuggestionClick = (sug) => {
    if (activeQuestion.multi) {
      const arr = inputValue.split(",").map(i => i.trim()).filter(Boolean);
      if (arr.includes(sug)) {
        setInputValue(arr.filter(i => i !== sug).join(", "));
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
          clarMsg = "Do you already have a destination in mind, or would you like me to suggest some destinations?";
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
                nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0];
                nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 17)).toISOString().split('T')[0];
             } else {
                const formatYMD = (d) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${y}-${m}-${day}`;
                };
                nextAnswers.startDate = formatYMD(s);
                nextAnswers.endDate = formatYMD(e);
             }
           } catch(e) {
             nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 10)).toISOString().split('T')[0];
             nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 17)).toISOString().split('T')[0];
           }
        } else if (val.includes("next weekend")) {
           nextAnswers.durationStr = inputValue.trim();
           nextAnswers.startDate = new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0];
           nextAnswers.endDate = new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0];
        } else {
           needsClarification = true;
           clarMsg = "What date would you like to return? Please provide your start and end dates.";
        }
        break;
      case "budget":
        const numMatch = val.match(/\d+/g);
        if (val === "cheap" || val === "affordable" || !numMatch) {
          needsClarification = true;
          clarMsg = "Could you give me an approximate total budget in rupees? For example, ₹30,000, ₹50,000 or ₹1,00,000.";
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
           clarMsg = "I need the exact number of travelers. How many people will be joining the trip?";
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
        nextAnswers.interests = inputValue.split(",").map(i => i.trim()).filter(Boolean);
        break;
      default:
        break;
    }

    if (needsClarification) {
      setClarification(clarMsg);
    } else {
      setClarification(null);
      setAnswers(nextAnswers);
      setInputValue("");
      
      if (editingQuestionId) {
        setEditingQuestionId(null);
      } else {
        if (currentIdx < QUESTIONS.length - 1) {
          setCurrentIdx(currentIdx + 1);
        } else {
          setShowSummary(true);
        }
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      validateAndStore();
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      // Helper function to map conversational input to strict backend enums
      const mapEnum = (val, validOptions, defaultOption) => {
        if (!val) return defaultOption;
        const normalized = val.toLowerCase();
        
        for (const opt of validOptions) {
          if (normalized.includes(opt.toLowerCase())) return opt;
        }
        
        // Custom fuzzy mapping
        if (validOptions.includes("Solo") && (normalized.includes("just me") || normalized.includes("alone"))) return "Solo";
        if (validOptions.includes("Veg") && normalized === "vegetarian") return "Veg";
        if (validOptions.includes("Non-Veg") && normalized === "non-vegetarian") return "Non-Veg";
        if (validOptions.includes("Standard") && (normalized.includes("comfort") || normalized.includes("premium"))) return "Standard";
        if (validOptions.includes("Any") && normalized.includes("no preference")) return "Any";
        
        return defaultOption;
      };

      // Strict payload mapping for Zod validator
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

      const res = await generateAITrip(payload, token);
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
    }
  };

  // -------------------------------------------------------------
  // RENDER: Loading State
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center px-4 py-8 max-w-4xl mx-auto w-full">
        <div className="w-full rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#131b2e] shadow-xl overflow-hidden p-16 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-6" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Understanding your trip...</h3>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium">
            {loadingPhases[loadingPhaseIndex]}
          </p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Summary Screen
  // -------------------------------------------------------------
  if (showSummary && !isReviewing) {
    return (
      <div className="flex justify-center px-4 py-8 max-w-3xl mx-auto w-full">
        <div className="w-full">
           <div className="text-center mb-8">
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
               <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               Here's what I understand
             </h2>
             <div className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-4 flex items-center justify-center gap-3">
               <span>{answers.source}</span>
               <ArrowRight className="w-5 h-5 text-slate-400" />
               <span className="text-indigo-600 dark:text-indigo-400">{answers.destination}</span>
             </div>
           </div>
           
           <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-6">
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Travel dates</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.durationStr || "Dates selected"}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("dates"); setInputValue(answers.durationStr); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Travelers</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.travelers} Travelers · {answers.travelerType}</div>
               </div>
               <div className="flex gap-4">
                 <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("travelers"); setInputValue(answers.travelers.toString()); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit Count</button>
                 <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("travelerType"); setInputValue(answers.travelerType); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit Type</button>
               </div>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Total budget</div>
                 <div className="font-semibold text-slate-900 dark:text-white">₹{Number(answers.budget).toLocaleString()}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("budget"); setInputValue(answers.budget.toString()); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Transport</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.travelMode}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("travelMode"); setInputValue(answers.travelMode); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Accommodation</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.stay}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("stay"); setInputValue(answers.stay); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Dining</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.dining}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("dining"); setInputValue(answers.dining); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
             
             <div className="flex justify-between items-center group">
               <div>
                 <div className="text-sm font-medium text-slate-500 mb-1">Interests</div>
                 <div className="font-semibold text-slate-900 dark:text-white">{answers.interests.join(" · ")}</div>
               </div>
               <button onClick={() => { setIsReviewing(true); setShowSummary(false); setEditingQuestionId("interests"); setInputValue(answers.interestsStr); }} className="text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
             </div>
           </div>
           
           <div className="border-t border-slate-200 dark:border-slate-800 pt-8 mt-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
             <button 
               onClick={() => { setIsReviewing(true); setShowSummary(false); }}
               className="font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition"
             >
               Review All Answers
             </button>
             <button 
               onClick={handleGenerate}
               className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-2"
             >
               Create My Itinerary ✦
             </button>
           </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Review Screen
  // -------------------------------------------------------------
  if (isReviewing && !editingQuestionId) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto px-4 py-8 overflow-y-auto">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Review your details</h2>
        </div>
        
        <div className="space-y-8">
          {QUESTIONS.map(q => {
            let val = "";
            if (q.id === "dates") val = answers.durationStr || `${answers.startDate} to ${answers.endDate}`;
            else if (q.id === "interests") val = answers.interestsStr;
            else val = answers[q.id];
            
            return (
              <div key={q.id} className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-6 group">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">{q.title}</h3>
                  <p className="text-lg font-medium text-slate-900 dark:text-white">{val}</p>
                </div>
                <button 
                  onClick={() => handleEditClick(q.id)}
                  className="px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-600 hover:text-indigo-600 transition-colors"
                >
                  Edit
                </button>
              </div>
            )
          })}
        </div>
        
        <div className="mt-8 pt-4 flex justify-end">
           <button 
             onClick={() => { setIsReviewing(false); setShowSummary(true); }}
             className="px-8 py-3.5 rounded-2xl bg-slate-900 dark:bg-white font-bold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
           >
             Looks Good
           </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: Prompt Composer (Normal Flow & Isolated Edit)
  // -------------------------------------------------------------
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto px-4 py-8">
      
      {/* Header/Question Area */}
      <div className="flex-1 overflow-y-auto mb-6 flex flex-col justify-end pb-8">
        <div className="space-y-6 max-w-2xl">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
               <Sparkles className="w-4 h-4 text-white" />
             </div>
             <span className="font-bold text-indigo-600 dark:text-indigo-400">Transix</span>
           </div>
           
           <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
             {clarification ? clarification : activeQuestion.title}
           </h2>
           
           {!clarification && activeQuestion.subtitle && (
             <p className="text-lg text-slate-500 dark:text-slate-400">
               {activeQuestion.subtitle}
             </p>
           )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Area */}
      <div className="w-full animate-in slide-in-from-bottom-4 duration-500 fade-in">
        
        {/* Suggestion Chips */}
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 pl-1">
            {activeQuestion.multi ? "Try adding:" : "Suggested"}
          </p>
          <div className="flex flex-wrap gap-2">
            {activeQuestion.suggestions.map((sug) => {
              const isSelected = activeQuestion.multi 
                 ? inputValue.split(",").map(i => i.trim()).includes(sug)
                 : inputValue === sug;
                 
              return (
                <button
                  key={sug}
                  onClick={() => handleSuggestionClick(sug)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isSelected 
                     ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md scale-105' 
                     : 'bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {sug}
                </button>
              );
            })}
          </div>
        </div>

        {/* Premium AI Prompt Box */}
        <div className="relative bg-white dark:bg-[#131b2e] border border-slate-200 dark:border-slate-700 rounded-[2rem] p-4 pb-14 shadow-sm focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={clarification ? "Type your answer..." : activeQuestion.placeholder}
            className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 resize-none text-lg px-2 py-2 min-h-[60px]"
            rows={1}
            autoFocus
          />
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:inline-block mr-2 font-medium">
              Return to send <span className="opacity-50">· Shift + Return for new line</span>
            </span>
            <button 
              onClick={validateAndStore}
              disabled={!inputValue.trim()}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                inputValue.trim() 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 hover:scale-105' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
        
        {/* Step Indicator */}
        {!editingQuestionId && (
          <div className="mt-6 flex items-center justify-center">
            <span className="text-sm font-medium text-slate-400">
              Step {currentIdx + 1} of {QUESTIONS.length}
            </span>
          </div>
        )}
        
        {editingQuestionId && (
          <div className="mt-6 flex items-center justify-between px-2">
            <button 
              onClick={() => { setEditingQuestionId(null); setInputValue(""); setClarification(null); }}
              className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
            >
              Cancel Edit
            </button>
            <span className="text-sm font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full">
              Editing Answer
            </span>
          </div>
        )}
        
      </div>

    </div>
  );
}
