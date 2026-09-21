import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import PublicNavbar from "../../components/public/PublicNavbar";
import PublicFooter from "../../components/public/PublicFooter";
import {
  FiCompass,
  FiAward,
  FiDollarSign,
  FiShield,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiMapPin,
  FiClock,
  FiUsers,
  FiBriefcase,
  FiFileText,
  FiUploadCloud,
  FiFile,
  FiCheck,
  FiX,
  FiArrowRight,
  FiArrowLeft,
  FiAlertCircle,
  FiEye,
  FiRefreshCw,
  FiGlobe,
  FiCheckCircle,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { uploadGuideDocument, submitGuideApplication, getDocumentPreviewUrl } from "../../api/guideApi";
import DocumentPreviewModal from "../../components/common/DocumentPreviewModal";

// Languages specification
const LANGUAGES_LIST = [
  "English",
  "Hindi",
  "Malayalam",
  "Tamil",
  "Kannada",
  "Bengali",
  "Marathi",
  "Gujarati",
  "French",
  "German",
  "Spanish",
  "Other",
];

// Availability options
const AVAILABILITY_OPTIONS = ["Full-time", "Part-time", "Weekends", "On Request"];

// Group size options
const GROUP_SIZE_OPTIONS = [
  "1–5 people",
  "6–10 people",
  "11–20 people",
  "20+ people",
  "Campus Trips",
];

// Guiding experience options (NO Primary Specialization)
const EXPERIENCE_YEARS_OPTIONS = [
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "6–10 years",
  "10+ years — Senior Leader",
];

// Indian States and Union Territories for Geographical Knowledge
const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Popular quick select states
const POPULAR_STATES = [
  "Kerala",
  "Rajasthan",
  "Goa",
  "Karnataka",
  "Himachal Pradesh",
  "Uttarakhand",
  "Tamil Nadu",
  "Maharashtra",
  "Delhi",
  "Jammu and Kashmir",
];

// Worked with options
const WORKED_WITH_OPTIONS = [
  "Tour Operator / Travel Agency",
  "Hotel / Resort",
  "Tourism Company",
  "School / College / Campus Trips",
  "Freelance / Independent Guide",
  "Local Tourism Organization",
  "Other",
];

// Reference relationships
const RELATIONSHIP_OPTIONS = [
  "Previous Tour Operator",
  "Tourism Company",
  "Hotel / Resort",
  "Tourism Organization",
  "Other",
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function JoinAsGuidePage() {
  const navigate = useNavigate();

  // Active step: 1 = Guide Details, 2 = Verification Details
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // Section 1: Guide Details
    fullName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    primaryRegion: "",
    availability: "Full-time",
    preferredGroupSize: "6–10 people",
    guidingExperience: "3–5 years",
    languages: ["English", "Hindi"],
    customLanguages: "",
    bio: "",
    selectedStates: ["Kerala"],

    // Section 2: Verification Details
    tourismLicenseNumber: "",
    workedWith: ["Freelance / Independent Guide"],
    workedWithOther: "",
    organizations: "",
    experienceDetails: "",
    referenceName: "",
    referenceContact: "",
    referenceRelationship: "",
    declarationAgreed: false,
  });

  // Uploaded Cloudinary documents metadata
  const [uploadedDocuments, setUploadedDocuments] = useState({
    aadhaar: null, // { url, publicId, fileName, fileType, size }
    drivingLicense: null,
    passport: null,
    guideLicenseDocument: null,
    experienceProof: null,
  });

  // Uploading state per document key
  const [uploadingState, setUploadingState] = useState({
    aadhaar: false,
    drivingLicense: false,
    passport: false,
    guideLicenseDocument: false,
    experienceProof: false,
  });

  // In-app document preview modal state
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url, fileName, fileType }

  // State search term for Geographical Knowledge
  const [stateSearch, setStateSearch] = useState("");

  // Validation errors
  const [errors, setErrors] = useState({});

  // Input refs for file uploads
  const aadhaarInputRef = useRef(null);
  const drivingLicenseInputRef = useRef(null);
  const passportInputRef = useRef(null);
  const guideLicenseInputRef = useRef(null);
  const experienceProofInputRef = useRef(null);

  // Toggle Language
  const handleToggleLanguage = (lang) => {
    setFormData((prev) => {
      const exists = prev.languages.includes(lang);
      const updated = exists
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang];
      return {
        ...prev,
        languages: updated,
        customLanguages: updated.includes("Other") ? prev.customLanguages : "",
      };
    });
    if (errors.languages) {
      setErrors((prev) => ({ ...prev, languages: null }));
    }
  };

  // Toggle State in Geographical Knowledge
  const handleToggleState = (stateName) => {
    setFormData((prev) => {
      const exists = prev.selectedStates.includes(stateName);
      const updated = exists
        ? prev.selectedStates.filter((s) => s !== stateName)
        : [...prev.selectedStates, stateName];
      return { ...prev, selectedStates: updated };
    });
    if (errors.selectedStates) {
      setErrors((prev) => ({ ...prev, selectedStates: null }));
    }
  };

  // Toggle Worked With
  const handleToggleWorkedWith = (item) => {
    setFormData((prev) => {
      const exists = prev.workedWith.includes(item);
      const updated = exists
        ? prev.workedWith.filter((w) => w !== item)
        : [...prev.workedWith, item];
      return {
        ...prev,
        workedWith: updated,
        workedWithOther: updated.includes("Other") ? prev.workedWithOther : "",
      };
    });
    if (errors.workedWith) {
      setErrors((prev) => ({ ...prev, workedWith: null }));
    }
  };

  // Handle Document Upload directly to Cloudinary
  const handleFileUpload = async (key, file) => {
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(`Invalid format for ${file.name}. Accepted formats: PDF, JPG, JPEG, PNG.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size exceeds 10MB limit (${formatFileSize(file.size)}).`);
      return;
    }

    // Create immediate local object URL for instant, zero-latency preview
    const localBlobUrl = URL.createObjectURL(file);

    try {
      setUploadingState((prev) => ({ ...prev, [key]: true }));

      const res = await uploadGuideDocument(file);

      if (res.success && res.document) {
        const previewUrl =
          res.document.previewUrl ||
          getDocumentPreviewUrl(res.document.publicId, res.document.url);

        setUploadedDocuments((prev) => ({
          ...prev,
          [key]: {
            ...res.document,
            previewUrl,
            blobUrl: localBlobUrl,
          },
        }));
        if (errors[key]) {
          setErrors((prev) => ({ ...prev, [key]: null }));
        }
        toast.success(`Attached ${res.document.fileName || file.name}`);
      } else {
        toast.error(res.message || "Failed to upload document.");
      }
    } catch (err) {
      console.error(`Upload error for ${key}:`, err);
      toast.error(err.response?.data?.message || err.message || "Failed to upload document to Cloudinary.");
    } finally {
      setUploadingState((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Remove Document
  const handleRemoveDocument = (key, e) => {
    e.stopPropagation();
    setUploadedDocuments((prev) => ({ ...prev, [key]: null }));
  };

  // Validate Step 1
  const validateStep1 = () => {
    const errs = {};

    if (!formData.fullName.trim()) errs.fullName = "Full Name is required";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errs.email = "Email address is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      errs.email = "Please enter a valid email address";
    }

    const phoneRegex = /^[+]?[\d\s-]{7,18}$/;
    if (!formData.phone.trim()) {
      errs.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errs.phone = "Please enter a valid phone number";
    }

    if (!formData.dateOfBirth) {
      errs.dateOfBirth = "Date of Birth is required";
    }

    if (!formData.primaryRegion.trim()) {
      errs.primaryRegion = "Primary Region / City is required";
    }

    if (!formData.languages || formData.languages.length === 0) {
      errs.languages = "Please select at least one language";
    } else if (formData.languages.includes("Other") && !formData.customLanguages.trim()) {
      errs.customLanguages = "Please specify the language(s)";
    }

    if (!formData.selectedStates || formData.selectedStates.length === 0) {
      errs.selectedStates = "Please select at least one Indian state for geographical knowledge";
    }

    if (!formData.bio.trim()) {
      errs.bio = "Brief bio & tour highlights is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate Step 2
  const validateStep2 = () => {
    const errs = {};

    // Aadhaar is mandatory
    if (!uploadedDocuments.aadhaar || !uploadedDocuments.aadhaar.url) {
      errs.aadhaar = "Aadhaar Card upload is mandatory";
    }

    // Driving License is mandatory
    if (!uploadedDocuments.drivingLicense || !uploadedDocuments.drivingLicense.url) {
      errs.drivingLicense = "Driving License upload is mandatory";
    }

    // Professional Experience
    if (!formData.workedWith || formData.workedWith.length === 0) {
      errs.workedWith = "Please select at least one professional experience option";
    } else if (formData.workedWith.includes("Other") && !formData.workedWithOther.trim()) {
      errs.workedWithOther = "Please specify your other experience";
    }

    // Declaration Checkbox
    if (!formData.declarationAgreed) {
      errs.declarationAgreed = "You must confirm accuracy before submitting";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Proceed from Step 1 to Step 2
  const handleProceedToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      const formElem = document.getElementById("guide-form-container");
      if (formElem) {
        formElem.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      toast.error("Please fill in all required fields in Guide Details.");
    }
  };

  // Final Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const isStep1Valid = validateStep1();
    const isStep2Valid = validateStep2();

    if (!isStep1Valid) {
      setCurrentStep(1);
      toast.error("Please resolve the required fields in Guide Details first.");
      return;
    }

    if (!isStep2Valid) {
      toast.error("Please provide mandatory identity documents and accept the declaration.");
      return;
    }

    // Check if any file is still uploading
    const isUploading = Object.values(uploadingState).some(Boolean);
    if (isUploading) {
      toast.error("Please wait until all documents finish uploading.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        primaryRegion: formData.primaryRegion.trim(),
        availability: formData.availability,
        preferredGroupSize: formData.preferredGroupSize,
        guidingExperience: formData.guidingExperience,
        languages: formData.languages,
        customLanguages: formData.customLanguages.trim(),
        bio: formData.bio.trim(),
        geographicalKnowledge: {
          states: formData.selectedStates,
        },
        documents: {
          aadhaar: uploadedDocuments.aadhaar,
          drivingLicense: uploadedDocuments.drivingLicense,
          passport: uploadedDocuments.passport || null,
        },
        tourismLicenseNumber: formData.tourismLicenseNumber.trim(),
        guideLicenseDocument: uploadedDocuments.guideLicenseDocument || null,
        professionalExperience: {
          workedWith: formData.workedWith,
          workedWithOther: formData.workedWithOther.trim(),
          organizations: formData.organizations.trim(),
          experienceDetails: formData.experienceDetails.trim(),
          experienceProof: uploadedDocuments.experienceProof || null,
        },
        references: {
          name: formData.referenceName.trim(),
          contact: formData.referenceContact.trim(),
          relationship: formData.referenceRelationship,
        },
        declarationAgreed: true,
      };

      const res = await submitGuideApplication(payload);

      if (res.success && res.application) {
        try {
          localStorage.setItem(
            "transix_latest_guide_app",
            JSON.stringify(res.application)
          );
        } catch (e) {
          // ignore
        }

        toast.success("Application submitted successfully for verification!", {
          icon: "🛡️",
          duration: 4000,
        });

        // Navigate to the verification status page
        navigate(`/guide/verification-status/${res.application._id}`);
      } else {
        toast.error(res.message || "Failed to submit guide application.");
      }
    } catch (err) {
      console.error("Submission failed:", err);
      toast.error(err.response?.data?.message || err.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reusable Document Upload & Preview Card Component
  const renderDocumentCard = ({
    docKey,
    title,
    isMandatory,
    acceptedText = "PDF, JPG, JPEG, PNG (Max 10MB)",
    inputRef,
  }) => {
    const doc = uploadedDocuments[docKey];
    const isUploading = uploadingState[docKey];
    const errorMsg = errors[docKey];
    const isImage = doc?.fileType?.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(doc?.fileName || doc?.url || "");

    return (
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          errorMsg
            ? "border-rose-400 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20"
            : doc
            ? "border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-[#131b2e] shadow-xs"
            : "border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-indigo-300"
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h4>
            {isMandatory ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase">
                Required *
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-semibold">
                Optional
              </span>
            )}
          </div>

          {doc && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <FiCheck className="text-xs" />
              <span>Ready</span>
            </span>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(docKey, e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {/* State: Uploading */}
        {isUploading ? (
          <div className="flex items-center justify-center gap-3 p-6 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20">
            <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Uploading document to secure Cloudinary vault...
            </span>
          </div>
        ) : doc ? (
          /* State: Uploaded with Compact Preview Card */
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3 min-w-0">
              {/* Thumbnail preview if image, icon if PDF */}
              {isImage && doc.url ? (
                <div
                  onClick={() =>
                    setPreviewDoc({
                      title,
                      fileName: doc.fileName,
                      fileType: doc.fileType,
                      url: doc.url,
                      previewUrl:
                        doc.previewUrl || getDocumentPreviewUrl(doc.publicId, doc.url),
                      blobUrl: doc.blobUrl,
                    })
                  }
                  className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer group relative"
                  title="Click to preview"
                >
                  <img
                    src={doc.blobUrl || doc.url}
                    alt={doc.fileName || title}
                    className="h-full w-full object-cover group-hover:scale-105 transition"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                    <FiEye />
                  </div>
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shrink-0">
                  <FiFileText />
                </div>
              )}

              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                  {doc.fileName || `${title}.pdf`}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {doc.size ? formatFileSize(doc.size) : "Cloudinary Verified"} • Ready for review
                </p>
              </div>
            </div>

            {/* Action buttons: [ Preview ] [ Replace ] [ Remove ] */}
            <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  setPreviewDoc({
                    title,
                    fileName: doc.fileName,
                    fileType: doc.fileType,
                    url: doc.url,
                    previewUrl:
                      doc.previewUrl || getDocumentPreviewUrl(doc.publicId, doc.url),
                    blobUrl: doc.blobUrl,
                  })
                }
                className="px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer flex items-center gap-1"
              >
                <FiEye className="text-xs" />
                <span>Preview</span>
              </button>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                title="Replace document"
              >
                <FiRefreshCw className="text-[10px]" />
                <span>Replace</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleRemoveDocument(docKey, e)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition cursor-pointer"
                title="Remove document"
              >
                <FiX className="text-sm" />
              </button>
            </div>
          </div>
        ) : (
          /* State: Empty Dropzone */
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(docKey, e.dataTransfer.files[0]);
              }
            }}
            className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 dark:border-slate-700/80 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition text-center"
          >
            <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 text-lg">
              <FiUploadCloud />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Click to upload or drag & drop
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{acceptedText}</p>
          </div>
        )}

        {errorMsg && (
          <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1 font-medium">
            <FiAlertCircle className="shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}
      </div>
    );
  };

  // Filtered Indian states for search
  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearch.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-[#f8faff] dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col justify-between">
      {/* 1. Header Navigation — EXACT AS REFERENCE */}
      <PublicNavbar />

      <main className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        {/* ============================================================ */}
        {/* 2. TOP PORTION (HERO + THREE CARDS) — EXACT AS SCREENSHOT */}
        {/* ============================================================ */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-4">
            <FiCompass className="text-sm" />
            <span>Transix Certified Guide Network</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Lead Journeys with <br />
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Transix Intelligence
            </span>
          </h1>

          {/* Description */}
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Connect directly with travelers, campus cohorts, and tour operators looking for verified, knowledgeable local leaders across India and abroad.
          </p>
        </div>

        {/* Three Benefit Cards — EXACT AS SCREENSHOT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {/* Card 1: Verified Badge */}
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

          {/* Card 2: Direct Engagements */}
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

          {/* Card 3: Full Schedule Sync */}
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

        {/* ============================================================ */}
        {/* 3. FORM STARTS DIRECTLY BELOW THE THREE CARDS */}
        {/* ============================================================ */}
        <div id="guide-form-container" className="scroll-mt-24">
          {/* Progress Indicator: ONLY TWO SECTIONS */}
          <div className="mb-8">
            <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2 sm:gap-6 max-w-lg mx-auto">
                {/* Step 1 Button */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                    currentStep === 1
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                      currentStep === 1
                        ? "bg-white text-indigo-600"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    01
                  </span>
                  <span className="text-xs sm:text-sm whitespace-nowrap">Guide Details</span>
                </button>

                <span className="text-slate-300 dark:text-slate-700 font-bold shrink-0">→</span>

                {/* Step 2 Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) {
                      setCurrentStep(2);
                    } else {
                      toast.error("Please fill in the required Guide Details first.");
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                    currentStep === 2
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                      currentStep === 2
                        ? "bg-white text-indigo-600"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    02
                  </span>
                  <span className="text-xs sm:text-sm whitespace-nowrap">Verification Details</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} noValidate>
            {/* ============================================================ */}
            {/* SECTION 1 — GUIDE DETAILS */}
            {/* ============================================================ */}
            {currentStep === 1 && (
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-sm animate-fadeIn">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Guide Details
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Fill in your professional background to begin the guide verification process.
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                      Section 01 of 02
                    </span>
                  </div>
                </div>

                {/* GROUP A — PERSONAL INFORMATION */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiUser className="text-sm" />
                    <span>Personal Information</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:bg-white dark:focus-within:bg-[#0f172a] ${
                          errors.fullName
                            ? "border-rose-400 focus-within:border-rose-500"
                            : "border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-600"
                        }`}
                      >
                        <FiUser className="text-slate-400 text-base shrink-0" />
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => {
                            setFormData({ ...formData, fullName: e.target.value });
                            if (errors.fullName) setErrors({ ...errors, fullName: null });
                          }}
                          placeholder="e.g. Anand Menon"
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                      {errors.fullName && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.fullName}</p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:bg-white dark:focus-within:bg-[#0f172a] ${
                          errors.email
                            ? "border-rose-400 focus-within:border-rose-500"
                            : "border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-600"
                        }`}
                      >
                        <FiMail className="text-slate-400 text-base shrink-0" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => {
                            setFormData({ ...formData, email: e.target.value });
                            if (errors.email) setErrors({ ...errors, email: null });
                          }}
                          placeholder="anand@example.com"
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email}</p>
                      )}
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:bg-white dark:focus-within:bg-[#0f172a] ${
                          errors.phone
                            ? "border-rose-400 focus-within:border-rose-500"
                            : "border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-600"
                        }`}
                      >
                        <FiPhone className="text-slate-400 text-base shrink-0" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData({ ...formData, phone: e.target.value });
                            if (errors.phone) setErrors({ ...errors, phone: null });
                          }}
                          placeholder="+91 98765 43210"
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.phone}</p>
                      )}
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Date of Birth <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:bg-white dark:focus-within:bg-[#0f172a] ${
                          errors.dateOfBirth
                            ? "border-rose-400 focus-within:border-rose-500"
                            : "border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-600"
                        }`}
                      >
                        <FiCalendar className="text-slate-400 text-base shrink-0" />
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => {
                            setFormData({ ...formData, dateOfBirth: e.target.value });
                            if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: null });
                          }}
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                      {errors.dateOfBirth && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.dateOfBirth}</p>
                      )}
                    </div>

                    {/* Primary Region / City */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Primary Region / City <span className="text-rose-500">*</span>
                      </label>
                      <div
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:bg-white dark:focus-within:bg-[#0f172a] ${
                          errors.primaryRegion
                            ? "border-rose-400 focus-within:border-rose-500"
                            : "border-slate-200 dark:border-slate-700/80 focus-within:border-indigo-600"
                        }`}
                      >
                        <FiMapPin className="text-slate-400 text-base shrink-0" />
                        <input
                          type="text"
                          value={formData.primaryRegion}
                          onChange={(e) => {
                            setFormData({ ...formData, primaryRegion: e.target.value });
                            if (errors.primaryRegion) setErrors({ ...errors, primaryRegion: null });
                          }}
                          placeholder="e.g. Fort Kochi, Kerala / Jaipur, Rajasthan"
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                      {errors.primaryRegion && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">{errors.primaryRegion}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* GROUP B — AVAILABILITY */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiClock className="text-sm" />
                    <span>Availability & Cohort</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Guide Availability */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Guide Availability <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {AVAILABILITY_OPTIONS.map((opt) => {
                          const active = formData.availability === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFormData({ ...formData, availability: opt })}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                                active
                                  ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                                  : "border-slate-200 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preferred Group Size */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Preferred Group Size <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.preferredGroupSize}
                        onChange={(e) =>
                          setFormData({ ...formData, preferredGroupSize: e.target.value })
                        }
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                      >
                        {GROUP_SIZE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* GROUP C — GUIDING EXPERIENCE (NO Primary Specialization) */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiBriefcase className="text-sm" />
                    <span>Guiding Experience</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Guiding Experience <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.guidingExperience}
                      onChange={(e) =>
                        setFormData({ ...formData, guidingExperience: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                    >
                      {EXPERIENCE_YEARS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* GROUP D — GEOGRAPHICAL KNOWLEDGE / STATES COVERED (MANDATORY) */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Geographical Knowledge / States Covered <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select at least 1 state for automated trip matching
                    </span>
                  </div>

                  {/* Selected States Badges */}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 min-h-[36px] p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/40 dark:bg-slate-900/30">
                    {formData.selectedStates.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">
                        No states selected yet. Pick from popular states below or search.
                      </span>
                    ) : (
                      formData.selectedStates.map((st) => (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
                        >
                          <span>{st}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleState(st)}
                            className="hover:text-rose-500 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Popular Quick Select States */}
                  <div className="mb-3">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Popular Hubs:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_STATES.map((st) => {
                        const selected = formData.selectedStates.includes(st);
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleToggleState(st)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              selected
                                ? "bg-indigo-600 text-white shadow-2xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                          >
                            {st} {selected ? "✓" : "+"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Search and Browse All Indian States */}
                  <div className="mt-3">
                    <input
                      type="text"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search and select other Indian states/UTs (e.g. Goa, Ladakh, Gujarat)..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 mb-2"
                    />

                    {stateSearch.trim() && (
                      <div className="max-h-36 overflow-y-auto p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] shadow-md flex flex-wrap gap-1.5">
                        {filteredStates.length > 0 ? (
                          filteredStates.map((st) => {
                            const selected = formData.selectedStates.includes(st);
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleToggleState(st)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition ${
                                  selected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                                }`}
                              >
                                {st} {selected ? "✓" : "+"}
                              </button>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 p-2">No matching states found.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {errors.selectedStates && (
                    <p className="mt-1.5 text-xs text-rose-500 font-medium">
                      {errors.selectedStates}
                    </p>
                  )}
                </div>

                {/* GROUP E — LANGUAGES SPOKEN */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Languages Spoken <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Multi-select fluent languages
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {LANGUAGES_LIST.map((lang) => {
                      const selected = formData.languages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => handleToggleLanguage(lang)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selected
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          <span>{lang}</span>
                          {selected ? <FiCheck className="text-xs" /> : <span>+</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Dynamic conditional input for "Other" language */}
                  {formData.languages.includes("Other") && (
                    <div className="mt-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 animate-fadeIn">
                      <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                        Please specify language(s) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customLanguages}
                        onChange={(e) => {
                          setFormData({ ...formData, customLanguages: e.target.value });
                          if (errors.customLanguages) setErrors({ ...errors, customLanguages: null });
                        }}
                        placeholder="e.g. Japanese, Konkani, Urdu, Italian"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                      />
                      {errors.customLanguages && (
                        <p className="mt-1 text-xs text-rose-500 font-medium">
                          {errors.customLanguages}
                        </p>
                      )}
                    </div>
                  )}

                  {errors.languages && (
                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.languages}</p>
                  )}
                </div>

                {/* GROUP F — BIO */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Brief Bio & Tour Highlights <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => {
                      setFormData({ ...formData, bio: e.target.value });
                      if (errors.bio) setErrors({ ...errors, bio: null });
                    }}
                    placeholder="Tell us about your guiding experience, local knowledge, notable tours and what makes your tours unique."
                    className={`w-full p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:bg-white dark:focus:bg-[#0f172a] ${
                      errors.bio
                        ? "border-rose-400 focus:border-rose-500"
                        : "border-slate-200 dark:border-slate-700/80 focus:border-indigo-600"
                    }`}
                  />
                  {errors.bio && (
                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.bio}</p>
                  )}
                </div>

                {/* Section 1 Footer Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleProceedToStep2}
                    className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/25 active:scale-95 transition cursor-pointer flex items-center gap-2"
                  >
                    <span>Proceed to Verification Details</span>
                    <FiArrowRight className="text-sm" />
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* SECTION 2 — VERIFICATION DETAILS */}
            {/* ============================================================ */}
            {currentStep === 2 && (
              <div className="bg-white dark:bg-[#131b2e] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-sm animate-fadeIn">
                <div className="border-b border-slate-100 dark:border-slate-800/80 pb-5 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Verification Details
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Provide the information and documents required for Transix to verify your guide profile.
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                      Section 02 of 02
                    </span>
                  </div>
                </div>

                {/* IDENTITY VERIFICATION (MANDATORY AADHAAR, MANDATORY DL, OPTIONAL PASSPORT) */}
                <div className="mb-8">
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <FiShield className="text-sm" />
                      <span>Identity Verification</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload your identification documents for Transix verification. Both Aadhaar Card and Driving License are required.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
                    {/* A. Aadhaar Card — Mandatory */}
                    <div>
                      {renderDocumentCard({
                        docKey: "aadhaar",
                        title: "Aadhaar Card",
                        isMandatory: true,
                        acceptedText: "PDF, JPG, JPEG, PNG (Max 10MB)",
                        inputRef: aadhaarInputRef,
                      })}
                    </div>

                    {/* B. Driving License — Mandatory */}
                    <div>
                      {renderDocumentCard({
                        docKey: "drivingLicense",
                        title: "Driving License",
                        isMandatory: true,
                        acceptedText: "PDF, JPG, JPEG, PNG (Max 10MB)",
                        inputRef: drivingLicenseInputRef,
                      })}
                    </div>

                    {/* C. Passport — Optional */}
                    <div className="sm:col-span-2">
                      {renderDocumentCard({
                        docKey: "passport",
                        title: "Passport",
                        isMandatory: false,
                        acceptedText: "Optional: PDF, JPG, JPEG, PNG (Max 10MB)",
                        inputRef: passportInputRef,
                      })}
                    </div>
                  </div>
                </div>

                {/* TOURISM / GUIDE LICENSE */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiAward className="text-sm" />
                    <span>Tourism / Regional License</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* License Number */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Tourism License / Regional Reg. Number <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 transition focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-[#0f172a]">
                        <FiAward className="text-slate-400 text-base shrink-0" />
                        <input
                          type="text"
                          value={formData.tourismLicenseNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, tourismLicenseNumber: e.target.value })
                          }
                          placeholder="e.g. MOT/REG/2024/KL-184"
                          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* License Document Upload */}
                    <div>
                      {renderDocumentCard({
                        docKey: "guideLicenseDocument",
                        title: "Guide License Document",
                        isMandatory: false,
                        acceptedText: "Accepted: PDF, JPG, JPEG, PNG",
                        inputRef: guideLicenseInputRef,
                      })}
                    </div>
                  </div>
                </div>

                {/* PROFESSIONAL EXPERIENCE */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiBriefcase className="text-sm" />
                    <span>Professional Experience</span>
                  </h3>

                  {/* Worked With Multi-select */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Worked With <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {WORKED_WITH_OPTIONS.map((item) => {
                        const checked = formData.workedWith.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => handleToggleWorkedWith(item)}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                              checked
                                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200"
                                : "border-slate-200 dark:border-slate-700/80 bg-slate-50/30 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                            }`}
                          >
                            <div
                              className={`h-4 w-4 rounded flex items-center justify-center border text-[10px] transition ${
                                checked
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                              }`}
                            >
                              {checked && <FiCheck />}
                            </div>
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Conditional "Other" input for worked with */}
                    {formData.workedWith.includes("Other") && (
                      <div className="mt-3 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 animate-fadeIn">
                        <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-1.5">
                          Please specify <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.workedWithOther}
                          onChange={(e) => {
                            setFormData({ ...formData, workedWithOther: e.target.value });
                            if (errors.workedWithOther) setErrors({ ...errors, workedWithOther: null });
                          }}
                          placeholder="e.g. Archaeological Survey, Eco-Tourism Board, Adventure Club"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                        />
                        {errors.workedWithOther && (
                          <p className="mt-1 text-xs text-rose-500 font-medium">
                            {errors.workedWithOther}
                          </p>
                        )}
                      </div>
                    )}

                    {errors.workedWith && (
                      <p className="mt-1.5 text-xs text-rose-500 font-medium">{errors.workedWith}</p>
                    )}
                  </div>

                  {/* Organization / Company Name(s) */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Organization / Company Name(s) <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.organizations}
                      onChange={(e) =>
                        setFormData({ ...formData, organizations: e.target.value })
                      }
                      placeholder="e.g. Kerala Backwaters Tours, Taj Experiences, Mountain Trails"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0f172a] transition"
                    />
                  </div>

                  {/* Experience Details */}
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Experience Details <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={formData.experienceDetails}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceDetails: e.target.value })
                      }
                      placeholder="Describe your previous guiding or tourism-related experience."
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0f172a] transition"
                    />
                  </div>

                  {/* Experience / Employment Proof */}
                  <div>
                    {renderDocumentCard({
                      docKey: "experienceProof",
                      title: "Experience / Employment Proof",
                      isMandatory: false,
                      acceptedText: "Experience certificate, Employment letter, Guide ID (PDF/JPG/PNG)",
                      inputRef: experienceProofInputRef,
                    })}
                  </div>
                </div>

                {/* PROFESSIONAL REFERENCES — OPTIONAL */}
                <div className="mb-8 pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <FiUsers className="text-sm" />
                      <span>Professional References</span>
                    </h3>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Optional
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Reference Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Reference Name
                      </label>
                      <input
                        type="text"
                        value={formData.referenceName}
                        onChange={(e) =>
                          setFormData({ ...formData, referenceName: e.target.value })
                        }
                        placeholder="e.g. Rajiv Varma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0f172a] transition"
                      />
                    </div>

                    {/* Reference Contact */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Reference Contact
                      </label>
                      <input
                        type="text"
                        value={formData.referenceContact}
                        onChange={(e) =>
                          setFormData({ ...formData, referenceContact: e.target.value })
                        }
                        placeholder="Phone or Email"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-[#0f172a] transition"
                      />
                    </div>

                    {/* Reference Relationship */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Reference Relationship
                      </label>
                      <select
                        value={formData.referenceRelationship}
                        onChange={(e) =>
                          setFormData({ ...formData, referenceRelationship: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50 text-xs sm:text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                      >
                        <option value="">Select relationship</option>
                        {RELATIONSHIP_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* FINAL DECLARATION */}
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80">
                  <div
                    className={`p-5 rounded-2xl border transition ${
                      errors.declarationAgreed
                        ? "border-rose-300 dark:border-rose-900/80 bg-rose-50/30 dark:bg-rose-950/20"
                        : "border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20"
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.declarationAgreed}
                        onChange={(e) => {
                          setFormData({ ...formData, declarationAgreed: e.target.checked });
                          if (errors.declarationAgreed) {
                            setErrors({ ...errors, declarationAgreed: null });
                          }
                        }}
                        className="mt-0.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                      />
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        I confirm that the information provided is accurate and belongs to me. I understand that Transix may verify my identity, professional credentials and guiding experience before approving my guide profile.{" "}
                        <span className="text-rose-500 font-bold">*</span>
                      </span>
                    </label>

                    {errors.declarationAgreed && (
                      <p className="mt-2 text-xs text-rose-500 font-medium flex items-center gap-1">
                        <FiAlertCircle />
                        <span>{errors.declarationAgreed}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Area */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      const formElem = document.getElementById("guide-form-container");
                      if (formElem) {
                        formElem.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
                  >
                    <FiArrowLeft className="text-sm" />
                    <span>Back to Guide Details</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting for Verification...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Verification</span>
                        <FiShield className="text-sm" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>

      {/* ============================================================ */}
      {/* IN-APP DOCUMENT PREVIEW MODAL */}
      {/* ============================================================ */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title}
        fileName={previewDoc?.fileName}
        fileType={previewDoc?.fileType}
        url={previewDoc?.url}
        previewUrl={previewDoc?.previewUrl}
        blobUrl={previewDoc?.blobUrl}
      />

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
