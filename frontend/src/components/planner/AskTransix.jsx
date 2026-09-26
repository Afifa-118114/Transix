import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ArrowUp,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  SendHorizonal,
  LoaderCircle,
  StopCircle,
  Trash2,
} from "lucide-react";
import {
  generateAITrip,
  chatWithTripAssistant,
} from "../../api/tripApi";
import { normalizeTrip } from "../../utils/formatTrip";
import { clearInventoryCache } from "../../services/inventoryService";
import toast from "react-hot-toast";
import axios from "axios";

const LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
  { value: "gu", label: "Gujarati" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
  { value: "ur", label: "Urdu" },
];

const QUICK_ACTIONS = [
  "Reduce my budget",
  "Add adventure activities",
  "Change hotel",
  "Show nearby attractions",
  "Change travel dates",
  "Make the trip cheaper",
];

const SESSION_KEY = "transix_assistant_session_v1";
const SPEECH_LANGUAGE_MAP = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  gu: "gu-IN",
  bn: "bn-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  pa: "pa-IN",
  ur: "ur-IN",
};

const detectSpeechLanguage = (text, fallback = "en") => {
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
  if (/[\u0600-\u06FF]/.test(text)) return "ur";
  if (/[\u0900-\u097F]/.test(text)) {
    return /\b(आहे|आहेत|मला|आणि|काय)\b/.test(text) ? "mr" : "hi";
  }
  return fallback;
};

const getSpeechLanguage = (selectedLanguage) => {
  if (selectedLanguage && selectedLanguage !== "auto") {
    return SPEECH_LANGUAGE_MAP[selectedLanguage] || "en-IN";
  }

  const preferred = localStorage.getItem("transix_voice_language") || "en";
  return SPEECH_LANGUAGE_MAP[preferred] || "en-IN";
};

const getSpeechRecognitionLanguage = (selectedLanguage) => {
  if (selectedLanguage && selectedLanguage !== "auto") {
    return SPEECH_LANGUAGE_MAP[selectedLanguage] || "en-IN";
  }

  const preferred = localStorage.getItem("transix_voice_language") || "en";
  return SPEECH_LANGUAGE_MAP[preferred] || "en-IN";
};

const parseBudgetNumber = (text) => {
  const normalized = text.toLowerCase();
  const spokenAmount = [
    [/\bthirty\s+thousand\b/i, 30000],
    [/तीस\s+हजार/i, 30000],
    [/ત્રીસ\s+હજાર/i, 30000],
    [/ত্রিশ\s+হাজার/i, 30000],
    [/முப்பது\s+ஆயிரம்/i, 30000],
    [/ముప్పై\s+వేలు/i, 30000],
    [/ಮೂವತ್ತು\s+ಸಾವಿರ/i, 30000],
    [/(?:മുപ്പത്\s+ആയിരം|മുപ്പതിനായിരം)/i, 30000],
    [/ਤੀਹ\s+ਹਜ਼ਾਰ/i, 30000],
    [/تیس\s+ہزار/i, 30000],
  ].find(([pattern]) => pattern.test(normalized));
  if (spokenAmount) return spokenAmount[1];

  const match = normalized.match(/\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;

  const value = Number.parseFloat(match[0].replace(/,/g, ""));
  const multiplier = /\blakhs?\b|लाख|લાખ/i.test(normalized)
    ? 100000
    : /\b(?:thousand|k)\b|हजार|હજાર|হাজার|ஆயிரம்|వేలు|ಸಾವಿರ|ആയിരം|ਹਜ਼ਾਰ|ہزار/i.test(normalized)
      ? 1000
      : 1;
  const numeric = value * multiplier;
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
};

const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

export default function AskTransix({ trip, setTrip }) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [language, setLanguage] = useState("auto");
  const [loading, setLoading] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [voiceError, setVoiceError] = useState("");
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (error) {
      console.warn("AskTransix session restore failed:", error);
    }

    return [
      {
        id: "assistant-welcome",
        role: "assistant",
        text: "Hi! I can help refine your trip, adjust the budget, or suggest better options for your journey.",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const currentOpIdRef = useRef(null);
  const messageSequenceRef = useRef(0);
  const voiceActivityRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const chatGenerationRef = useRef(0);
  const voiceStateRef = useRef("idle");
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);
  const initialAssistantMessageRef = useRef({
    id: "assistant-welcome",
    role: "assistant",
    text: "Hi! I can help refine your trip, adjust the budget, or suggest better options for your journey.",
    timestamp: new Date().toISOString(),
  });

  const updateVoiceState = (nextState) => {
    voiceStateRef.current = nextState;
    setVoiceState(nextState);
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);
  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(messages.slice(-30)));
    } catch (error) {
      console.warn("AskTransix session save failed:", error);
    }
  }, [messages]);

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const appendMessage = (role, text) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        role,
        text,
        timestamp: new Date().toISOString(),
      },
    ]);
    return id;
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition may already have ended.
      }
      recognitionRef.current = null;
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.onstart = null;
        speechSynthesisRef.current.onend = null;
        speechSynthesisRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
    }

    voiceActivityRef.current = false;
    setVoiceBusy(false);
    speechSynthesisRef.current = null;
    setSpeakingMessageId(null);
    updateVoiceState("idle");
    setVoiceError("");
  };

  const playAssistantResponse = (text, messageId) => {
    if (!text || !messageId) return;
    if (typeof window === "undefined" || !window.speechSynthesis || typeof window.SpeechSynthesisUtterance !== "function") {
      setVoiceError("Voice playback isn't supported in this browser.");
      updateVoiceState("idle");
      return;
    }

    if (speakingMessageId === messageId) {
      stopVoice();
      return;
    }

    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.onstart = null;
      speechSynthesisRef.current.onend = null;
      speechSynthesisRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    const activeLanguage = getSpeechLanguage(language);
    utterance.lang = activeLanguage;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => {
      updateVoiceState("speaking");
      setSpeakingMessageId(messageId);
      setVoiceError("");
    };
    utterance.onend = () => {
      setSpeakingMessageId(null);
      speechSynthesisRef.current = null;
      updateVoiceState("idle");
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
      speechSynthesisRef.current = null;
      updateVoiceState("idle");
      setVoiceError("Voice playback isn't available. You can continue with text chat.");
    };

    speechSynthesisRef.current = utterance;
    updateVoiceState("idle");
    window.speechSynthesis.speak(utterance);
  };

  const parseBudgetIntent = (text) => {
    const normalized = text.toLowerCase();
    const isBudgetChange = /(?:\b(?:reduce|decrease|cut|lower|adjust|set|change)\b.{0,30}\bbudget\b|\bbudget\b.{0,30}\b(?:reduce|decrease|cut|lower|adjust|set|change)\b|make\s+(?:the\s+)?trip\s+cheaper|cheaper\s+trip|बज(?:े)?ट.{0,24}(?:कम|कमी|घटा|कर दो|करें|रखो|करा)|(?:कम|कमी|घटा).{0,12}बज(?:े)?ट|બજેટ.{0,24}(?:ઓછું|ઘટાડ|કરો)|(?:কম|কমান).{0,12}বাজেট|বাজেট.{0,20}(?:কম|কমান|করুন)|(?:பட்ஜெட்.{0,16}(?:குறைக்க|குறை|செய்)|(?:குறைக்க|குறை).{0,12}பட்ஜெட்)|(?:బడ్జెట్.{0,16}(?:తగ్గించ|చేయి)|తగ్గించ.{0,12}బడ్జెట్)|(?:ಬಜೆಟ್.{0,16}(?:ಕಡಿಮೆ|ಮಾಡಿ)|ಕಡಿಮೆ.{0,12}ಬಜೆಟ್)|(?:ബജറ്റ്.{0,16}(?:കുറയ്ക്ക|ചെയ്യൂ)|കുറയ്ക്ക.{0,12}ബജറ്റ്)|(?:ਬਜਟ.{0,16}(?:ਘਟਾ|ਘੱਟ|ਕਰੋ)|(?:ਘਟਾ|ਘੱਟ).{0,12}ਬਜਟ)|(?:بجٹ.{0,16}(?:کم|کریں)|کم.{0,12}بجٹ))/i.test(normalized);
    if (!isBudgetChange || /what is my current budget|current budget|how much is my budget|budget right now/i.test(normalized)) return null;

    const explicitNumber = parseBudgetNumber(normalized);
    if (explicitNumber) return { needsClarification: false, budget: explicitNumber };

    return {
      needsClarification: true,
      budget: null,
    };
  };

  const parseBudgetUpdateRequest = (text, history = []) => {
    const amountOnly = /^\s*(?:(?:₹|rs\.?|inr)\s*)?\d[\d,.]*(?:\s*(?:k|lakhs?))?\s*$/i.test(text)
      || /^(?:thirty\s+thousand|तीस\s+हजार|ત્રીસ\s+હજાર|ত্রিশ\s+হাজার|முப்பது\s+ஆயிரம்|ముప్పై\s+వేలు|ಮೂವತ್ತು\s+ಸಾವಿರ|மുപ്പത്\s+ஆയிரம்|முப்பതിനாயிரம்|ਤੀਹ\s+ਹਜ਼ਾਰ|تیس\s+ہزار)[.!?।]*$/i.test(text.trim());
    if (!amountOnly) return false;

    const previousBudgetRequest = history.some((item) => item.role === "user" && parseBudgetIntent(item.text));
    const latestAssistantReply = [...history].reverse().find((item) => item.role === "assistant")?.text || "";
    return previousBudgetRequest && /(budget|amount|target|रक्कम|बजेट|राशि|कितना|कितनी|કેટલો|કેટલી|લક્ષ્ય|લક્ષ્યાંક|রাশি|কত|தொகை|எவ்வளவு|మొత్తం|ఎంత|ಮೊತ್ತ|ಎಷ್ಟು|തുക|എത്ര|ਰਕਮ|ਕਿੰਨਾ|رقم|کتنا|کتنی)/i.test(latestAssistantReply);
  };

  const executeBudgetUpdate = async (newBudget) => {
    if (!trip) {
      appendMessage("assistant", "I need an active trip to update the budget.");
      setLoading(false);
      setVoiceState("idle");
      return;
    }

    const token = localStorage.getItem("token");
    const opId = Date.now().toString();
    currentOpIdRef.current = opId;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const payload = {
      source: trip.source,
      destination: trip.destination,
      heroImage: trip.heroImage,
      startDate: trip.startDate ? trip.startDate.split("T")[0] : trip.startDate,
      endDate: trip.endDate ? trip.endDate.split("T")[0] : trip.endDate,
      travelers: trip.travelers,
      budget: newBudget,
      currency: trip.currency || "INR",
      travelMode: trip.travelMode,
      hotelType: trip.hotelType,
      foodPreference: trip.foodPreference,
      tripType: trip.tripType,
      interests: trip.interests,
      priority: trip.priority,
      purpose: trip.purpose,
    };

    try {
      setLoading(true);
      setVoiceState("thinking");
      const res = await generateAITrip(payload, token, controller.signal);

      if (currentOpIdRef.current !== opId) return;

      if (res?.trip) {
        clearInventoryCache();
        const normalized = normalizeTrip(res.trip);
        localStorage.setItem("currentTrip", JSON.stringify(normalized));
        localStorage.removeItem("transix_builder_trip");

        if (setTrip) setTrip(normalized);
        window.dispatchEvent(new CustomEvent("transix_trip_updated", { detail: normalized }));

        const updateMessage = `Budget updated successfully. I’ve adjusted the trip toward ${formatCurrency(newBudget)} while keeping the itinerary aligned with your current trip.`;
        const assistantMessageId = appendMessage("assistant", updateMessage);
        toast.success(`Trip updated for ${formatCurrency(newBudget)}.`, { icon: "✨" });
        if (voiceMode) void playAssistantResponse(updateMessage, assistantMessageId);
      } else {
        appendMessage("assistant", "I couldn’t update the itinerary right now. Please try again.");
        toast.error("Failed to update itinerary. Please try again.");
      }
    } catch (error) {
      if (axios.isCancel(error) || error.name === "CanceledError") {
        return;
      }
      console.error("Budget update failed:", error);
      appendMessage("assistant", "Sorry, I couldn’t complete that itinerary update. Please try again.");
      setVoiceState("idle");
      toast.error(error.response?.data?.message || "Failed to update itinerary. Please try again.");
    } finally {
      if (currentOpIdRef.current === opId) {
        currentOpIdRef.current = null;
      }
      setLoading(false);
      if (!voiceMode) setVoiceState("idle");
    }
  };

  const processMessage = async (messageText) => {
    const text = String(messageText || "").trim();
    if (!text || loading || voiceBusy || voiceActivityRef.current || requestInFlightRef.current) return;
    requestInFlightRef.current = true;

    appendMessage("user", text);
    setInputValue("");
    setLoading(true);
    updateVoiceState("sending");
    setVoiceError("");

    stopVoice();
    updateVoiceState("sending");

    const budgetIntent = parseBudgetIntent(text);
    const budgetFollowUp = parseBudgetUpdateRequest(text, messages);
    const directBudget = budgetIntent?.budget || (budgetFollowUp ? parseBudgetNumber(text) : null);
    const cheaperTripRequest = /make\s+(?:the\s+)?trip\s+cheaper|cheaper\s+trip/i.test(text);
    const targetBudget = directBudget || (cheaperTripRequest && Number(trip?.budget) > 0 ? Math.round(Number(trip.budget) * 0.8) : null);

    if (targetBudget) {
      try {
        await executeBudgetUpdate(targetBudget);
      } finally {
        requestInFlightRef.current = false;
      }
      return;
    }

    const requestGeneration = chatGenerationRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = localStorage.getItem("token");
      const response = await chatWithTripAssistant(
        {
          message: text,
          language,
          trip: trip ? {
            source: trip.source,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate,
            travelers: trip.travelers,
            budget: trip.budget,
            currency: trip.currency || "INR",
            hotelType: trip.hotelType,
            travelMode: trip.travelMode,
            foodPreference: trip.foodPreference,
            interests: trip.interests,
            purpose: trip.purpose,
          } : null,
          history: messages.slice(-5).map((item) => ({ role: item.role, text: item.text })),
        },
        token,
        controller.signal
      );

      if (requestGeneration !== chatGenerationRef.current) return;
      const assistantReply = response?.reply || "Sorry, I couldn't process that message right now. Please try again.";
      const assistantMessageId = appendMessage("assistant", assistantReply);
      setLoading(false);
      if (voiceMode) {
        void playAssistantResponse(assistantReply, assistantMessageId);
      } else {
        setVoiceState("idle");
      }
    } catch (error) {
      if (requestGeneration !== chatGenerationRef.current || axios.isCancel(error) || error.name === "CanceledError") return;
      console.error("Assistant chat request failed:", error);
      const fallback = "I couldn't reach the AI assistant. Please try again.";
      appendMessage("assistant", fallback);
      setLoading(false);
      setVoiceState("idle");
      voiceActivityRef.current = false;
      toast.error(error?.response?.data?.message || fallback);
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      requestInFlightRef.current = false;
    }
  };

  const handleSuggestionClick = (sug) => {
    if (requestInFlightRef.current || loading) return;
    setInputValue(sug);
    processMessage(sug);
  };

  const clearChat = () => {
    chatGenerationRef.current += 1;
    stopVoice();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    voiceActivityRef.current = false;
    setVoiceBusy(false);
    setSpeakingMessageId(null);
    updateVoiceState("idle");
    setVoiceError("");
    setMessages([initialAssistantMessageRef.current]);
    setInputValue("");
    setLoading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setShowClearConfirmation(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      processMessage(inputValue);
    }
  };

  const startVoiceCapture = () => {
    if (voiceActivityRef.current || requestInFlightRef.current || loading) return;

    const SpeechRecognitionCtor = typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;

    if (!SpeechRecognitionCtor) {
      updateVoiceState("idle");
      setVoiceError("Voice input isn't supported in this browser. Please use Chrome or type your message.");
      return;
    }

    stopVoice();
    setVoiceError("");

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getSpeechRecognitionLanguage(language);
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      voiceActivityRef.current = true;
      setVoiceBusy(true);
      setVoiceError("");
      updateVoiceState("recording");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      if (!transcript) return;
      updateVoiceState("processing");
      setInputValue(transcript);
      const detectedLanguage = language === "auto"
        ? detectSpeechLanguage(transcript, localStorage.getItem("transix_voice_language") || "en")
        : language;
      localStorage.setItem("transix_voice_language", detectedLanguage);
      voiceActivityRef.current = false;
      setVoiceBusy(false);
      recognition.stop();
      void processMessage(transcript);
    };

    recognition.onerror = (event) => {
      const errorMessage = event.error === "not-allowed"
        ? "Microphone permission is required for voice input."
        : event.error === "no-speech"
          ? "Couldn't hear that. Please try again."
          : "Couldn't hear that. Please try again.";
      updateVoiceState("idle");
      setVoiceBusy(false);
      voiceActivityRef.current = false;
      recognitionRef.current = null;
      setVoiceError(errorMessage);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      voiceActivityRef.current = false;
      setVoiceBusy(false);
      if (voiceStateRef.current === "recording") updateVoiceState("idle");
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      voiceActivityRef.current = false;
      setVoiceBusy(false);
      updateVoiceState("idle");
      setVoiceError("Couldn't hear that. Please try again.");
    }
  };

  const microphoneSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const activeLanguage = language === "auto" ? "Auto Detect" : LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || "Auto Detect";
  const voiceStatusText = voiceState === "recording"
    ? "Recording..."
    : voiceState === "processing"
      ? "Processing voice..."
      : voiceState === "sending"
        ? "Sending message..."
        : voiceState === "thinking"
          ? "Assistant is thinking..."
          : voiceState === "speaking"
            ? "Speaking..."
            : voiceState === "error"
              ? "Voice unavailable; text chat is ready"
              : microphoneSupported
                ? `Microphone available · Voice output ${voiceMode ? "on" : "off"}`
                : "Voice input isn't supported in this browser";

  if (!expanded) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] sm:w-[560px]">
        <button
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between rounded-full bg-slate-900 px-6 py-3 text-white shadow-xl shadow-slate-900/20 transition hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-slate-900"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-bold">Transix Assistant</span>
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" aria-label="Online" />
          </div>
          <ArrowUp className="h-4 w-4 opacity-60" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px] dark:bg-black/20" />

      <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] -translate-x-1/2 sm:bottom-6 sm:w-[620px]">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#131b2e]">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Transix Assistant</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/70">
                <Languages className="h-3.5 w-3.5 text-slate-500" />
                <select
                  aria-label="Select response language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="bg-transparent text-[11px] font-semibold text-slate-700 outline-none dark:text-slate-200"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                aria-pressed={voiceMode}
                aria-label={`Voice mode ${voiceMode ? "on" : "off"}`}
                onClick={() => setVoiceMode((enabled) => !enabled)}
                className={`flex h-8 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold transition ${
                  voiceMode
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {voiceMode ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>Voice {voiceMode ? "On" : "Off"}</span>
              </button>

              <button
                type="button"
                aria-label={voiceState === "recording" ? "Stop recording" : "Start voice recording"}
                title={voiceState === "recording" ? "Stop recording and transcribe" : "Record a voice message"}
                disabled={loading || ["processing", "sending", "thinking"].includes(voiceState)}
                onClick={() => (voiceState === "recording" ? stopVoice() : startVoiceCapture())}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition ${
                  voiceState === "recording"
                    ? "border-rose-400 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
                }`}
              >
                {voiceState === "recording"
                  ? <MicOff className="h-3.5 w-3.5" />
                  : ["processing", "sending", "thinking"].includes(voiceState)
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    : <Mic className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                title="Clear chat"
                aria-label="Clear chat"
                onClick={() => setShowClearConfirmation(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                aria-label="Close assistant"
                onClick={() => setExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showClearConfirmation && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4" role="presentation">
              <div role="dialog" aria-modal="true" aria-labelledby="clear-chat-title" className="w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p id="clear-chat-title" className="text-sm font-semibold text-slate-900 dark:text-white">Clear this conversation?</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowClearConfirmation(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
                  <button type="button" onClick={clearChat} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Clear</button>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-[56vh] overflow-y-auto p-3 sm:p-4">
            {voiceError && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
                {voiceError}
              </div>
            )}

            <div className="space-y-3">
              {messages.map((message, idx) => (
                <div
                  key={message.id ? `${message.id}-${idx}` : `msg-${idx}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div>{message.text}</div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span
                        className={`text-[10px] ${
                          message.role === "user" ? "text-indigo-100" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {message.role === "assistant" && (
                        <button
                          type="button"
                          aria-label={speakingMessageId === message.id && voiceState === "speaking" ? "Stop assistant audio" : "Play assistant response"}
                          title={speakingMessageId === message.id && voiceState === "speaking" ? "Stop playback" : "Play response"}
                          onClick={() => {
                            if (speakingMessageId === message.id && voiceState === "speaking") stopVoice();
                            else void playAssistantResponse(message.text, message.id);
                          }}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-700 dark:hover:text-white"
                        >
                          {speakingMessageId === message.id && voiceState === "speaking"
                            ? <VolumeX className="h-3.5 w-3.5" />
                            : <Volume2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin text-indigo-500" />
                      {voiceState === "speaking" ? "Speaking..." : "Transix Assistant is thinking..."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => handleSuggestionClick(action)}
                  disabled={loading || voiceBusy}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {action}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-2 focus-within:border-indigo-500 dark:border-slate-700 dark:bg-slate-900">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Type your message"
                placeholder="Type your message..."
                rows={1}
                className="max-h-[120px] min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              />

              <button
                type="button"
                aria-label={voiceState === "speaking" ? "Stop assistant audio" : "Stop recording"}
                onClick={stopVoice}
                disabled={!( ["recording", "speaking"].includes(voiceState))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {voiceState === "speaking" ? <VolumeX className="h-4 w-4" /> : <StopCircle className="h-4 w-4" />}
              </button>

              <button
                type="button"
                aria-label="Send message"
                onClick={() => processMessage(inputValue)}
                disabled={!inputValue.trim() || loading || voiceBusy}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  inputValue.trim() && !loading
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                }`}
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span>Language: {activeLanguage}</span>
              <span className="flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                {voiceStatusText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
