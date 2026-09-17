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
  payments: [paymentSchema],
  confirmationPayment: {
    amount: Number,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING"
    },
    paidAt: Date
  },
  coordinatorReview: {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: Date,
    rejectionReason: String
  },
  coordinatorMessage: {
    message: String,
    updatedAt: Date,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  }
}, { timestamps: true });

// Prevent duplicate registrations
campusRegistrationSchema.index({ tripId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("CampusRegistration", campusRegistrationSchema);
