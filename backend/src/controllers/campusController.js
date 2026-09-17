const Trip = require("../models/Trip");
const CampusRegistration = require("../models/CampusRegistration");
const crypto = require("crypto");
const { generateTripPlan } = require("../services/aiService");
const { getDestinationImage } = require("../services/imageService");

// 1. Create a new Campus Trip
exports.createCampusTrip = async (req, res) => {
  try {
    const { source, destination, startDate, endDate, travelers, budget, organizationDetails, duration, travelMode, hotelType, educationalRequirements, inclusions, exclusions, mealInclusions } = req.body;

    if (!educationalRequirements || !Array.isArray(educationalRequirements) || educationalRequirements.length === 0) {
      return res.status(400).json({ success: false, message: "Campus Trips require at least one educational or industry visit." });
    }

    // Generate unique IV code
    const orgPrefix = organizationDetails?.name 
      ? organizationDetails.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "") 
      : "CAMP";
    const destPrefix = destination.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "");
    const randomStr = crypto.randomBytes(2).toString("hex").toUpperCase();
    const joinCode = `${orgPrefix}-${destPrefix}-${randomStr}`;

    const tripData = {
      source: source || "Origin",
      destination,
      startDate,
      endDate,
      travelers,
      budget,
      currency: "INR",
      travelMode: travelMode || "Train",
      hotelType: hotelType || "Standard",
      foodPreference: "Any",
      tripType: "Friends",
      interests: ["Group Travel", "Education"],
      priority: "Medium",
      purpose: "Campus IV",
      tripCategory: "CAMPUS",
      campusConfig: {
        budgetPerStudent: budget,
        expectedParticipants: travelers,
        educationalRequirements: educationalRequirements || [],
        inclusions: inclusions || {},
        exclusions: exclusions || [],
        mealInclusions: mealInclusions || {}
      }
    };

    const [aiData, heroImage] = await Promise.all([
      generateTripPlan(tripData),
      getDestinationImage(destination),
    ]);

    if (!aiData || !aiData.days || aiData.days.length === 0) {
      const errorMessage = aiData?.validation?.errors?.map(e => e.message).join(" ") || "Could not generate a valid itinerary for the given constraints.";
      return res.status(400).json({ success: false, message: errorMessage });
    }

    const numDays = aiData.days.length;
    let finalEndDate = endDate;
    if (!finalEndDate && startDate) {
      const s = new Date(startDate);
      if (!isNaN(s.getTime())) {
        s.setUTCDate(s.getUTCDate() + numDays - 1);
        finalEndDate = s.toISOString().split("T")[0];
      }
    }

    const newTrip = new Trip({
      user: req.user.id,
      coordinatorId: req.user.id,
      tripCategory: "CAMPUS",
      joinCode,
      destination,
      heroImage,
      source: tripData.source,
      startDate,
      endDate: finalEndDate,
      duration: `${numDays} Days`,
      travelers,
      budget,
      currency: "INR",
      travelMode: tripData.travelMode,
      hotelType: tripData.hotelType,
      tripType: tripData.tripType,
      foodPreference: tripData.foodPreference,
      interests: tripData.interests,
      priority: tripData.priority,
      purpose: tripData.purpose,
      campusConfig: tripData.campusConfig,
      organizationDetails,
      registrationSettings: {
        capacity: travelers,
      },
      status: "Generated",
      aiGenerated: true,
      itinerary: aiData.days.map((day) => ({
        ...day,
        plan: (day.plan || []).map(p => ({
          ...p,
          id: p.id || `itin_${crypto.randomUUID()}`
        }))
      })),
      staySegments: aiData.staySegments || [],
      travelLegs: aiData.travelLegs || [],
      validation: aiData.validation || null,
      budgetBreakdown: aiData.budgetBreakdown,
      tips: aiData.tips,
      summary: aiData.summary,
    });

    await newTrip.save();

    res.status(201).json({ success: true, trip: newTrip });
  } catch (error) {
    console.error("Create Campus Trip Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create campus trip" });
  }
};

// 2. Get user's related Campus Trips
exports.getMyCampusTrips = async (req, res) => {
  try {
    const userId = req.user.id;

    // Trips where user is Coordinator
    const coordinatedTrips = await Trip.find({
      tripCategory: "CAMPUS",
      coordinatorId: userId
    }).sort({ createdAt: -1 });

    // Registrations where user is Participant
    const registrations = await CampusRegistration.find({ userId })
      .populate("tripId")
      .sort({ createdAt: -1 });

    const participatedTrips = registrations.map(reg => reg.tripId).filter(Boolean);

    res.status(200).json({
      success: true,
      coordinatedTrips,
      participatedTrips
    });
  } catch (error) {
    console.error("Get My Campus Trips Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch campus trips" });
  }
};

// 3. Get single Campus Trip by ID
exports.getCampusTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);

    if (!trip || trip.tripCategory !== "CAMPUS") {
      return res.status(404).json({ success: false, message: "Campus trip not found" });
    }

    // Check relationship
    let relationship = "NONE";
    let registration = null;
    if (trip.coordinatorId.toString() === req.user.id.toString()) {
      relationship = "COORDINATOR";
    } else {
      const reg = await CampusRegistration.findOne({ tripId: id, userId: req.user.id });
      if (reg) {
        relationship = "PARTICIPANT";
        registration = reg;
      }
    }

    res.status(200).json({ success: true, trip, relationship, registration });
  } catch (error) {
    console.error("Get Campus Trip Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch trip" });
  }
};

// 4. Finalize IV
exports.finalizeCampusTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });

    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    if (!trip.itinerary || trip.itinerary.length === 0) {
      return res.status(400).json({ success: false, message: "Cannot finalize: Itinerary is incomplete." });
    }

    if (trip.validation && trip.validation.valid === false) {
      return res.status(400).json({ success: false, message: "Cannot finalize: Itinerary has validation errors." });
    }

    trip.status = "Finalized";
    await trip.save();

    res.status(200).json({ success: true, trip, message: "IV Finalized" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to finalize" });
  }
};

// 5. Update Registration Config (Open/Close, Config)
exports.updateRegistrationConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { openDate, closeDate, capacity, totalFee, confirmationFee, eligibility, requiredInfo, formFields, documentsConfig, paymentPlanConfig } = req.body;
    
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    trip.registrationSettings = { openDate, closeDate, capacity, totalFee, confirmationFee, eligibility, requiredInfo, formFields };
    if (documentsConfig) trip.documentsConfig = documentsConfig;
    if (paymentPlanConfig) trip.paymentPlanConfig = paymentPlanConfig;

    await trip.save();
    res.status(200).json({ success: true, trip, message: "Configuration updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update configuration" });
  }
};

// 5a. Add Announcement
exports.addAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, expiresAt } = req.body;
    
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    trip.announcements.push({ message, expiresAt });
    await trip.save();
    
    res.status(200).json({ success: true, announcements: trip.announcements, message: "Announcement added" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add announcement" });
  }
};

// 5b. Toggle Announcement
exports.toggleAnnouncement = async (req, res) => {
  try {
    const { id, annId } = req.params;
    const { active } = req.body;
    
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    const announcement = trip.announcements.id(annId);
    if (!announcement) return res.status(404).json({ success: false, message: "Announcement not found" });

    if (active !== undefined) announcement.active = active;
    
    await trip.save();
    res.status(200).json({ success: true, announcements: trip.announcements, message: "Announcement updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update announcement" });
  }
};

// 5c. Update Student Access
exports.updateStudentAccess = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    trip.studentAccess = {
      enabled,
      grantedAt: enabled ? new Date() : null
    };
    
    await trip.save();
    res.status(200).json({ success: true, studentAccess: trip.studentAccess, message: "Student access updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update student access" });
  }
};

// 6. Join IV by Code
exports.joinCampusTrip = async (req, res) => {
  try {
    const { joinCode } = req.body;
    const userId = req.user.id;

    const trip = await Trip.findOne({ joinCode, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Invalid IV Code" });

    // Check if registration is open
    const now = new Date();
    const settings = trip.registrationSettings;
    if (!settings || trip.status !== "Finalized") {
      return res.status(400).json({ success: false, message: "Registration is not open yet" });
    }
    if (settings.openDate && now < new Date(settings.openDate)) {
      return res.status(400).json({ success: false, message: "Registration has not opened yet" });
    }
    if (settings.closeDate && now > new Date(settings.closeDate)) {
      return res.status(400).json({ success: false, message: "Registration is closed" });
    }

    // Check capacity
    const currentCount = await CampusRegistration.countDocuments({ tripId: trip._id });
    if (settings.capacity && currentCount >= settings.capacity) {
      return res.status(400).json({ success: false, message: "Capacity reached" });
    }

    // Check if already registered
    const existing = await CampusRegistration.findOne({ tripId: trip._id, userId });
    if (existing) {
      return res.status(400).json({ success: false, message: "You are already registered" });
    }

    // Initialize installments based on config
    const payments = [];
    if (trip.paymentPlanConfig) {
      trip.paymentPlanConfig.forEach(plan => {
        payments.push({
          installmentId: plan._id,
          name: plan.name,
          amount: plan.amount,
          dueDate: plan.dueDate,
          status: "PENDING"
        });
      });
    }

    const reg = new CampusRegistration({
      tripId: trip._id,
      userId,
      status: "DRAFT", // Can be submitted once details/docs are uploaded
      payments
    });

    await reg.save();

    res.status(201).json({ success: true, registration: reg, tripId: trip._id, message: "Successfully joined" });
  } catch (error) {
    console.error("Join IV Error:", error);
    res.status(500).json({ success: false, message: "Failed to join IV" });
  }
};

// 7. Get Participants (Coordinator)
exports.getParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: "Unauthorized" });

    const participants = await CampusRegistration.find({ tripId: id }).populate("userId", "name email");
    res.status(200).json({ success: true, participants });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch participants" });
  }
};

// 8. Verify/Reject Document
exports.updateDocumentStatus = async (req, res) => {
  try {
    const { id, regId, docId } = req.params;
    const { status, rejectionReason } = req.body;

    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: "Unauthorized" });

    const reg = await CampusRegistration.findOne({ _id: regId, tripId: id });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    const doc = reg.documents.id(docId);
    if (!doc) return res.status(404).json({ success: false, message: "Document not found" });

    doc.status = status;
    if (status === "REJECTED") doc.rejectionReason = rejectionReason;
    if (status === "VERIFIED") doc.verifiedAt = new Date();

    await reg.save();
    res.status(200).json({ success: true, registration: reg });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update document" });
  }
};

// 9. Update Campus Config (Inclusions/Exclusions)
exports.updateCampusConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { inclusions, exclusions, mealInclusions } = req.body;

    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    if (inclusions) trip.campusConfig.inclusions = inclusions;
    if (exclusions) trip.campusConfig.exclusions = exclusions;
    if (mealInclusions) trip.campusConfig.mealInclusions = mealInclusions;

    // We must manually mark the nested object as modified so mongoose saves it
    trip.markModified('campusConfig');

    await trip.save();
    res.status(200).json({ success: true, trip, message: "Campus configuration updated" });

  } catch (error) {
    console.error("Update Campus Config Error:", error);
    res.status(500).json({ success: false, message: "Failed to update campus config" });
  }
};

// Helper to evaluate and update status
const evaluateRegistrationStatus = (reg, trip) => {
  if (["CANCELLED", "REJECTED", "WAITLISTED"].includes(reg.status)) return reg.status;

  const hasDetails = reg.studentInfo && Object.keys(reg.studentInfo).length > 0;
  if (!hasDetails) return "DRAFT";

  const requiredDocs = trip.documentsConfig?.filter(d => d.required) || [];
  const hasAllDocs = requiredDocs.every(d => 
    reg.documents?.some(rd => rd.documentType === d.documentType && ["UNDER_REVIEW", "VERIFIED"].includes(rd.status))
  );

  if (requiredDocs.length > 0 && !hasAllDocs) return "DOCUMENTS_PENDING";

  const confirmationFee = trip.registrationSettings?.confirmationFee || 0;
  const totalPaid = reg.payments?.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0) || 0;

  if (confirmationFee > 0 && totalPaid < confirmationFee) return "PAYMENT_PENDING";

  return "COMPLETED";
};

// 10. Submit Participant Registration Details
exports.submitRegistration = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentInfo } = req.body;
    const userId = req.user.id;

    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });
    
    reg.studentInfo = studentInfo;
    reg.status = evaluateRegistrationStatus(reg, trip);
    
    await reg.save();

    res.status(200).json({ success: true, registration: reg, message: "Registration submitted successfully" });
  } catch (error) {
    console.error("Submit Registration Error:", error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: "Validation error: " + error.message });
    }
    res.status(500).json({ success: false, message: "Failed to submit registration" });
  }
};

// 11. Upload Document (Participant)
exports.uploadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;
    const userId = req.user.id;
    
    let fileUrl = req.body.fileUrl; // Fallback to existing body if not uploaded
    if (req.file && req.file.path) {
      fileUrl = req.file.path; // Cloudinary secure URL is set to req.file.path
    }

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: "File upload failed or file URL is missing" });
    }

    const trip = await Trip.findById(id);
    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    // Check if document already exists
    const existingDocIndex = reg.documents.findIndex(d => d.documentType === documentType);
    if (existingDocIndex >= 0) {
      // Update existing document
      reg.documents[existingDocIndex].fileUrl = fileUrl;
      reg.documents[existingDocIndex].status = "UNDER_REVIEW";
      reg.documents[existingDocIndex].rejectionReason = null;
    } else {
      // Add new document
      reg.documents.push({
        documentType,
        fileUrl,
        status: "UNDER_REVIEW"
      });
    }

    reg.status = evaluateRegistrationStatus(reg, trip);
    await reg.save();
    res.status(200).json({ success: true, registration: reg, message: "Document uploaded successfully" });
  } catch (error) {
    console.error("Upload Document Error:", error);
    res.status(500).json({ success: false, message: "Failed to upload document" });
  }
};

// 11.5 Preview Document (Secure)
exports.previewDocument = async (req, res) => {
  try {
    const { id, docId } = req.params;
    const userId = req.user.id;

    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    const doc = reg.documents.id(docId);
    if (!doc || !doc.fileUrl) return res.status(404).json({ success: false, message: "Document not found" });

    // Fetch the actual PDF from Cloudinary natively
    const https = require("https");
    https.get(doc.fileUrl, (cloudinaryRes) => {
      res.setHeader("Content-Type", "application/pdf");
      cloudinaryRes.pipe(res);
    }).on("error", (error) => {
      console.error("Cloudinary Fetch Error:", error);
      res.status(500).json({ success: false, message: "Failed to stream document" });
    });
  } catch (error) {
    console.error("Preview Document Error:", error);
    res.status(500).json({ success: false, message: "Failed to load document" });
  }
};

// 12. Mock Process Payment (Participant)
exports.processPayment = async (req, res) => {
  try {
    const { id, installmentId } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findById(id);
    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    const payment = reg.payments.find(p => p.installmentId.toString() === installmentId || p._id.toString() === installmentId);
    if (!payment) return res.status(404).json({ success: false, message: "Payment installment not found" });

    if (payment.status === "PAID") {
      return res.status(400).json({ success: false, message: "Installment already paid" });
    }

    // Mock successful payment
    payment.status = "PAID";
    payment.paidDate = new Date();
    payment.paymentReference = `MOCK_TXN_${Date.now()}`;

    reg.status = evaluateRegistrationStatus(reg, trip);
    await reg.save();
    res.status(200).json({ success: true, registration: reg, message: "Payment processed successfully" });
  } catch (error) {
    console.error("Process Payment Error:", error);
    res.status(500).json({ success: false, message: "Failed to process payment" });
  }
};
