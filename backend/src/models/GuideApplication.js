const mongoose = require("mongoose");

const DocumentMetaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, trim: true, default: "" },
    fileName: { type: String, trim: true, default: "" },
    fileType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const TimelineStageSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: [
        "APPLICATION_SUBMITTED",
        "DOCUMENT_REVIEW",
        "INTERVIEW",
        "REFERENCE_VERIFICATION",
        "FINAL_REVIEW",
        "APPROVED",
      ],
      required: true,
    },
    label: { type: String, required: true },
    status: {
      type: String,
      enum: ["COMPLETED", "IN_PROGRESS", "PENDING", "REJECTED"],
      default: "PENDING",
    },
    completedAt: { type: Date, default: null },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const GuideApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    // Section 1: Guide Details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
      trim: true,
    },
    primaryRegion: {
      type: String,
      required: true,
      trim: true,
    },

    // Availability
    availability: {
      type: String,
      enum: ["Full-time", "Part-time", "Weekends", "On Request"],
      required: true,
    },
    preferredGroupSize: {
      type: String,
      enum: ["1–5 people", "6–10 people", "11–20 people", "20+ people", "Campus Trips"],
      required: true,
    },

    // Guiding Experience (NO Primary Specialization)
    guidingExperience: {
      type: String,
      enum: [
        "Less than 1 year",
        "1–2 years",
        "3–5 years",
        "6–10 years",
        "10+ years — Senior Leader",
      ],
      required: true,
    },

    // Languages Spoken (Multi-select)
    languages: {
      type: [String],
      required: true,
      default: [],
    },
    customLanguages: {
      type: String,
      trim: true,
      default: "",
    },

    // Bio
    bio: {
      type: String,
      required: true,
      trim: true,
    },

    // Geographical Knowledge (States Covered)
    geographicalKnowledge: {
      states: {
        type: [String],
        required: true,
        validate: {
          validator: function (v) {
            return Array.isArray(v) && v.length > 0;
          },
          message: "At least one Indian state must be selected for geographical knowledge.",
        },
      },
    },

    // Section 2: Verification Details - Identity Documents
    documents: {
      aadhaar: {
        type: DocumentMetaSchema,
        required: true,
      },
      drivingLicense: {
        type: DocumentMetaSchema,
        required: true,
      },
      passport: {
        type: DocumentMetaSchema,
        default: null,
      },
    },

    // Tourism / Guide License
    tourismLicenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    guideLicenseDocument: {
      type: DocumentMetaSchema,
      default: null,
    },

    // Professional Experience
    professionalExperience: {
      workedWith: {
        type: [String],
        required: true,
        default: [],
      },
      workedWithOther: {
        type: String,
        trim: true,
        default: "",
      },
      organizations: {
        type: String,
        trim: true,
        default: "",
      },
      experienceDetails: {
        type: String,
        trim: true,
        default: "",
      },
      experienceProof: {
        type: DocumentMetaSchema,
        default: null,
      },
    },

    // Professional References (Optional)
    references: {
      name: { type: String, trim: true, default: "" },
      contact: { type: String, trim: true, default: "" },
      relationship: {
        type: String,
        enum: [
          "",
          "Previous Tour Operator",
          "Tourism Company",
          "Hotel / Resort",
          "Tourism Organization",
          "Other",
        ],
        default: "",
      },
    },

    // Final Declaration
    declarationAgreed: {
      type: Boolean,
      required: true,
      default: false,
    },
    declarationAgreedAt: {
      type: Date,
      default: Date.now,
    },

    // Verification Workflow State
    verificationStatus: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    verificationDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timeline: [TimelineStageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuideApplication", GuideApplicationSchema, "guideapplications");
