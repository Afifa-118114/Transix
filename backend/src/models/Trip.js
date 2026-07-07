const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
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
      enum: ["Draft", "Generated", "Booked"],
      default: "Draft",
    },

    aiGenerated: {
      type: Boolean,
      default: false,
    },

    itinerary: {
      type: Object,
    },

    budgetBreakdown: {
      type: Object,
    },

    tips: {
      type: [String],
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Trip", tripSchema);
