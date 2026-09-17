const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  documentType: { type: String, required: true }, // e.g. Aadhaar, College ID
  fileUrl: { type: String, required: true },
  status: {
    type: String,
    enum: ["UPLOADED", "UNDER_REVIEW", "VERIFIED", "REJECTED"],
    default: "UPLOADED"
  },
  rejectionReason: String,
  verifiedAt: Date
});

const paymentSchema = new mongoose.Schema({
  installmentId: mongoose.Schema.Types.ObjectId,
  name: String,
  amount: Number,
  dueDate: Date,
  status: {
    type: String,
    enum: ["PENDING", "PAID", "FAILED"],
    default: "PENDING"
  },
  paymentReference: String, // Razorpay payment ID
  paidDate: Date
});

const campusRegistrationSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  status: {
    type: String,
    enum: ["DRAFT", "REGISTERED", "DOCUMENTS_PENDING", "PAYMENT_PENDING", "PARTIALLY_PAID", "COMPLETED", "UNDER_REVIEW", "WAITLISTED", "REJECTED", "CANCELLED"],
    default: "DRAFT"
  },
  studentInfo: {
    type: Map,
    of: String
  },
  documents: [documentSchema],
  payments: [paymentSchema]
}, { timestamps: true });

// Prevent duplicate registrations
campusRegistrationSchema.index({ tripId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("CampusRegistration", campusRegistrationSchema);
