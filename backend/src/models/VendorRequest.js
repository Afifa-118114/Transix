const mongoose = require("mongoose");

const VendorRequestSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    // Canonical fleetRequirementId (maps to BookingRequirement)
    fleetRequirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequirement",
      index: true,
    },
    // Retain bookingRequirementId for backwards compatibility
    bookingRequirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequirement",
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: ["GROUP_FLEET"],
      default: "GROUP_FLEET",
    },

    // Canonical Route
    route: {
      originCity: { type: String, trim: true },
      originState: { type: String, trim: true },
      destinationCity: { type: String, trim: true },
      destinationState: { type: String, trim: true },
    },

    // Canonical Travelers
    travelers: {
      total: { type: Number, default: 0 },
      students: { type: Number, default: 0 },
      staff: { type: Number, default: 0 },
    },

    tripType: {
      type: String,
      default: "Campus",
      trim: true,
    },
    duration: {
      type: String,
      default: "Multi-day",
      trim: true,
    },

    // Canonical Fleet Requirement
    fleetRequirement: {
      vehicleCategory: { type: String, trim: true },
      vehicleCount: { type: Number, default: 1 },
      minimumCapacityPerVehicle: { type: Number, default: 25 },
      totalCapacityRequired: { type: Number, default: 25 },
      ac: { type: Boolean, default: true },
      driverIncluded: { type: Boolean, default: true },
      groupTransport: { type: Boolean, default: true },
      multiDay: { type: Boolean, default: true },
    },

    // Canonical Preferences
    preferences: {
      ac: { type: Boolean, default: true },
      vehicleCategory: { type: String, trim: true },
      groupTransport: { type: Boolean, default: true },
      driverIncluded: { type: Boolean, default: true },
      multiDay: { type: Boolean, default: true },
    },

    // Canonical Requested Response specifications
    requestedResponse: {
      availability: { type: Boolean, default: true },
      vehicleAllocation: { type: Boolean, default: true },
      quotation: { type: Boolean, default: true },
      notes: { type: Boolean, default: true },
    },

    status: {
      type: String,
      enum: [
        "SENT",
        "VIEWED",
        "ACCEPTED",
        "REJECTED",
        "RESPONDED",
        "AWAITING_OPERATOR_REVIEW",
        "UNAVAILABLE",
        "SELECTED",
        "CONFIRMATION_REQUESTED",
        "CONFIRMED",
        "DECLINED",
        "CANCELLED",
      ],
      default: "SENT",
      index: true,
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },

    // Snapshot preserved for compatibility
    requestSnapshot: {
      originCity: String,
      destinationCity: String,
      originState: String,
      destinationState: String,
      travelStartDate: Date,
      travelEndDate: Date,
      totalTravelers: Number,
      studentsCount: Number,
      teachersStaffCount: Number,
      vehiclesRequired: Number,
      capacityPerVehicle: Number,
      vehicleType: String,
      comfort: String,
      luggageCount: Number,
      requiredCapabilities: {
        intercity: { type: Boolean, default: true },
        multiDay: { type: Boolean, default: true },
        groupTransport: { type: Boolean, default: true },
        driverIncluded: { type: Boolean, default: true },
      },
      notes: String,
    },

    // Canonical Response Object
    response: {
      availability: {
        type: String,
        enum: ["AVAILABLE", "PARTIALLY_AVAILABLE", "UNAVAILABLE"],
      },
      rejectionReason: {
        type: String,
        trim: true,
      },
      rejectionMessage: {
        type: String,
        trim: true,
      },
      vehicles: [
        {
          category: { type: String, trim: true },
          count: { type: Number, default: 1 },
          seatsPerVehicle: { type: Number, default: 0 },
          totalCapacity: { type: Number, default: 0 },
        },
      ],
      quotation: {
        baseAmount: { type: Number, default: 0 },
        additionalCharges: { type: Number, default: 0 },
        totalAmount: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
      },
      driverIncluded: {
        type: Boolean,
        default: true,
      },
      notes: {
        type: String,
        trim: true,
      },
      // Backwards-compatibility fields
      vehiclesAvailable: Number,
      quote: Number,
      quoteCurrency: {
        type: String,
        default: "INR",
      },
      respondedAt: Date,
    },

    confirmation: {
      status: {
        type: String,
        enum: ["PENDING", "CONFIRMED", "DECLINED"],
      },
      confirmationReference: String,
      confirmedAt: Date,
    },
  },
  { timestamps: true }
);

// Prevent duplicate active requests to the same vendor for the same trip fleet requirement
VendorRequestSchema.index(
  { tripId: 1, vendorId: 1, requestType: 1 },
  { unique: true }
);

module.exports = mongoose.model("VendorRequest", VendorRequestSchema, "vendorrequests");
