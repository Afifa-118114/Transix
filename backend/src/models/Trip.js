const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    tripCategory: {
      type: String,
      enum: ["PERSONAL", "CAMPUS"],
      default: "PERSONAL",
    },

    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    organizationDetails: {
      name: String,
      orgType: String,
      contactInfo: String,
    },

    campusConfig: {
      budgetPerStudent: Number,
      accommodationBudgetPerStudent: Number,
      expectedParticipants: Number,
      educationalRequirements: [{
        institutionName: String,
        institutionType: String,
        notes: String
      }],
      inclusions: {
        accommodation: { type: Boolean, default: true },
        travel: { type: Boolean, default: true },
        localTransport: { type: Boolean, default: true },
        activities: { type: Boolean, default: true }
      },
      exclusions: [String],
      mealInclusions: {
        breakfast: { type: Boolean, default: true },
        lunch: { type: Boolean, default: true },
        dinner: { type: Boolean, default: true }
      }
    },

    registrationSettings: {
      openDate: Date,
      closeDate: Date,
      capacity: Number,
      totalFee: Number,
      confirmationFee: { type: Number, default: 0 },
      eligibility: String,
      requiredInfo: [String],
      formFields: [{
        name: String,
        label: String,
        type: { type: String, default: 'text' },
        required: { type: Boolean, default: false },
        options: [String]
      }],
    },

    documentsConfig: [{
      documentType: String,
      required: Boolean,
      acceptedFileTypes: [String],
      maxFileSize: Number,
    }],

    paymentPlanConfig: [{
      name: String,
      amount: Number,
      dueDate: Date,
    }],

    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    source: {
      type: String,
      required: true,
      trim: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    heroImage: {
      type: String,
      default: null,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: String,
    },

    travelers: {
      type: Number,
      required: true,
      min: 1,
    },

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
    },

    travelMode: {
      type: String,
      enum: ["Flight", "Train", "Bus", "Car"],
      required: true,
    },

    hotelType: {
      type: String,
      enum: ["Budget", "Standard", "Luxury"],
      required: true,
    },

    foodPreference: {
      type: String,
      enum: ["Veg", "Non-Veg", "Vegan", "Any"],
      default: "Any",
    },

    tripType: {
      type: String,
      enum: ["Solo", "Family", "Friends", "Couple", "Business"],
      required: true,
    },

    interests: {
      type: [String],
      required: true,
    },

    priority: {
      type: String,
      required: true,
    },

    purpose: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Draft", "Generated", "Booked", "BOOKED", "Finalized", "Confirmed", "CONFIRMED"],
      default: "Draft",
    },

    isBooked: {
      type: Boolean,
      default: false,
    },

    bookingSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    operatorAccess: {
      enabled: {
        type: Boolean,
        default: false,
      },
      operatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      grantedAt: {
        type: Date,
        default: null,
      },
    },

    studentAccess: {
      enabled: {
        type: Boolean,
        default: false,
      },
      grantedAt: {
        type: Date,
        default: null,
      },
    },

    announcements: [{
      message: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date,
      active: {
        type: Boolean,
        default: true
      }
    }],

    aiGenerated: {
      type: Boolean,
      default: false,
    },

    itinerary: {
      type: Array,
      default: [],
    },

    staySegments: {
      type: Array,
      default: [],
    },

    travelLegs: {
      type: Array,
      default: [],
    },

    busRequirements: {
      type: Array,
      default: [],
    },

    campusTransportPlan: {
      type: Object,
      default: null,
    },

    localTransportPreference: {
      type: Object,
      default: null,
    },

    validation: {
      type: Object,
      default: null,
    },

    budgetBreakdown: {
      type: Object,
    },

    tips: {
      type: [String],
    },

    guideRequirement: {
      required: { type: Boolean, default: false },
      numberOfGuides: { type: String, default: "1" },
      genderPreference: {
        type: String,
        enum: ["Male", "Female", "Either"],
        default: "Either",
      },
      preferredLanguages: [{ type: String }],
      specialNotes: { type: String, default: "" },
      status: {
        type: String,
        enum: ["none", "pending", "guide_selected", "confirmed"],
        default: "none",
      },
      selectedGuides: [{ type: String }],
      finalizedGuides: [
        {
          guideId: String,
          fullName: String,
          price: Number,
          currency: { type: String, default: "INR" },
          availability: String,
          status: { type: String, default: "Confirmed" },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Trip", tripSchema);
