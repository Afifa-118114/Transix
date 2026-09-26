const mongoose = require("mongoose");

const GuideProfileSchema = new mongoose.Schema(
  {
    guideId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: String,
    },
    primaryRegion: {
      type: String,
      trim: true,
      index: true,
    },
    availability: {
      type: String,
      enum: ["Full-time", "Part-time", "Weekends", "On Request"],
      default: "Full-time",
    },
    preferredGroupSize: {
      type: String,
      enum: ["1–5 people", "6–10 people", "11–20 people", "20+ people", "Campus Trips"],
      default: "6–10 people",
    },
    guidingExperience: {
      type: String,
      trim: true,
    },
    languages: {
      type: [String],
      default: [],
    },
    customLanguages: {
      type: [String],
      default: [],
    },
    bio: {
      type: String,
      trim: true,
    },
    geographicalKnowledge: {
      states: {
        type: [String],
        default: [],
        index: true,
      },
    },
    documents: {
      aadhaar: {
        url: String,
        publicId: String,
        fileName: String,
        fileType: String,
      },
      drivingLicense: {
        url: String,
        publicId: String,
        fileName: String,
        fileType: String,
      },
      passport: {
        url: String,
        publicId: String,
        fileName: String,
        fileType: String,
      },
    },
    credentials: {
      tourismLicenseNumber: {
        type: String,
        trim: true,
      },
      guideLicenseDocument: {
        type: String,
        trim: true,
      },
    },
    professionalExperience: {
      workedWith: [String],
      organizations: [String],
      experienceDetails: String,
      experienceProof: String,
    },
    references: [
      {
        name: String,
        contact: String,
        relationship: String,
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true,
    },
    verificationDetails: {
      identityVerified: { type: Boolean, default: true },
      credentialsVerified: { type: Boolean, default: true },
      experienceVerified: { type: Boolean, default: true },
      interviewCompleted: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GuideProfile", GuideProfileSchema, "guideprofiles");
