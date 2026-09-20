const Trip = require("../models/Trip");
const CampusRegistration = require("../models/CampusRegistration");
const User = require("../models/User");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const axios = require("axios");
const Razorpay = require("razorpay");
const { generateTripPlan } = require("../services/aiService");
const { getDestinationImage } = require("../services/imageService");
const { resolveCityToState } = require("../services/locationService");

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
        accommodationBudgetPerStudent: (() => {
          let durationDays = 10;
          if (req.body.startDate && req.body.endDate) {
            const start = new Date(req.body.startDate);
            const end = new Date(req.body.endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              durationDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            }
          } else if (req.body.duration) {
            const match = String(req.body.duration).match(/\d+/);
            if (match) durationDays = parseInt(match[0], 10);
          }
          return Math.min(budget, durationDays * 1000, 10000);
        })(),
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
    const trip = await Trip.findById(id).populate("coordinatorId", "name email phone");

    if (!trip || trip.tripCategory !== "CAMPUS") {
      return res.status(404).json({ success: false, message: "Campus trip not found" });
    }

    // Check relationship
    let relationship = "NONE";
    let registration = null;
    const coordinatorUserId = trip.coordinatorId?._id ? trip.coordinatorId._id.toString() : trip.coordinatorId?.toString();
    if (coordinatorUserId && coordinatorUserId === req.user.id.toString()) {
      relationship = "COORDINATOR";
    } else {
      const reg = await CampusRegistration.findOne({ tripId: id, userId: req.user.id });
      if (reg) {
        relationship = "PARTICIPANT";
        registration = reg;
      }
    }

    // Ensure campusTransportPlan is populated with resolved operational route
    if (!trip.campusTransportPlan || !trip.campusTransportPlan.route) {
      const isCampus = trip.tripCategory === "CAMPUS" || Boolean(trip.campusConfig?.expectedParticipants);
      if (isCampus) {
        const originRes = await resolveCityToState(trip.source);
        const destRes = await resolveCityToState(trip.destination);
        const total = trip.campusConfig?.expectedParticipants || trip.travelers || 200;
        const cap = Number(trip.campusTransportPlan?.capacityPerVehicle || 25);
        const veh = Number(trip.campusTransportPlan?.vehiclesRequired || Math.ceil(total / cap));

        const updatedPlan = {
          ...(trip.campusTransportPlan || {}),
          vehiclesRequired: veh,
          vehicleType: trip.campusTransportPlan?.vehicleType || "Coach",
          comfort: trip.campusTransportPlan?.comfort || "AC",
          capacityPerVehicle: cap,
          totalTravelers: total,
          studentsCount: trip.campusTransportPlan?.studentsCount ?? total,
          teachersStaffCount: trip.campusTransportPlan?.teachersStaffCount ?? 0,
          luggageCount: trip.campusTransportPlan?.luggageCount ?? total,
          status: trip.campusTransportPlan?.status || (trip.status === "Finalized" ? "CONFIRMED" : "PENDING"),
          route: {
            originCity: originRes?.city || trip.source,
            originState: originRes?.state || "",
            destinationCity: destRes?.city || trip.destination,
            destinationState: destRes?.state || "",
          },
        };
        trip.campusTransportPlan = updatedPlan;
        await Trip.updateOne({ _id: trip._id }, { $set: { campusTransportPlan: updatedPlan } });
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

// 5. Update Registration Config (Open/Close, Config, Payment Plan, Form Fields)
exports.updateRegistrationConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { openDate, closeDate, capacity, totalFee, confirmationFee, eligibility, requiredInfo, formFields, documentsConfig, paymentPlanConfig } = req.body;
    
    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    const parsedTotalFee = Number(totalFee) >= 0 ? Number(totalFee) : (trip.registrationSettings?.totalFee || 0);
    const parsedConfirmationFee = Number(confirmationFee) >= 0 ? Number(confirmationFee) : (trip.registrationSettings?.confirmationFee || 0);

    if (parsedConfirmationFee > parsedTotalFee) {
      return res.status(400).json({
        success: false,
        message: "Confirmation fee cannot exceed the total trip fee per student."
      });
    }

    // Validate Payment Plan if supplied
    if (paymentPlanConfig && Array.isArray(paymentPlanConfig)) {
      if (paymentPlanConfig.length !== 3) {
        return res.status(400).json({
          success: false,
          message: "Payment plan must configure exactly three installments (1st Installment, 2nd Installment, Final Installment)."
        });
      }

      const installmentNames = ["1st Installment", "2nd Installment", "Final Installment"];
      for (let i = 0; i < paymentPlanConfig.length; i++) {
        const inst = paymentPlanConfig[i];
        if (!inst.name || !installmentNames.includes(inst.name)) {
          inst.name = installmentNames[i];
        }
        const instAmount = Number(inst.amount);
        if (isNaN(instAmount) || instAmount < 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid amount for ${inst.name}.`
          });
        }
      }

      const sumInstallments = paymentPlanConfig.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);
      const totalAllocated = parsedConfirmationFee + sumInstallments;

      if (totalAllocated !== parsedTotalFee) {
        const diff = parsedTotalFee - totalAllocated;
        return res.status(400).json({
          success: false,
          message: diff > 0 
            ? `Payment plan does not match total trip fee. Remaining amount to allocate: ₹${diff.toLocaleString()}`
            : `Payment plan exceeds total trip fee by ₹${Math.abs(diff).toLocaleString()}`
        });
      }

      trip.paymentPlanConfig = paymentPlanConfig.map(inst => ({
        name: inst.name,
        amount: Number(inst.amount),
        dueDate: inst.dueDate ? new Date(inst.dueDate) : null
      }));
    }

    // Validate Form Fields if supplied
    if (formFields && Array.isArray(formFields)) {
      const seenNames = new Set();
      for (const field of formFields) {
        if (!field.label || !field.label.trim()) {
          return res.status(400).json({ success: false, message: "Field label cannot be empty." });
        }
        const fieldName = (field.name || field.label.toLowerCase().replace(/[^a-z0-9_]/g, '_')).trim();
        if (seenNames.has(fieldName)) {
          return res.status(400).json({ success: false, message: `Duplicate field identifier '${fieldName}' found.` });
        }
        seenNames.add(fieldName);
        field.name = fieldName;
        if (field.type === 'select' && (!field.options || field.options.length === 0 || field.options.every(o => !o || !o.trim()))) {
          return res.status(400).json({ success: false, message: `Dropdown field '${field.label}' must have at least one option.` });
        }
      }
      trip.registrationSettings.formFields = formFields;
    }

    trip.registrationSettings.openDate = openDate ? new Date(openDate) : trip.registrationSettings?.openDate;
    trip.registrationSettings.closeDate = closeDate ? new Date(closeDate) : trip.registrationSettings?.closeDate;
    trip.registrationSettings.capacity = capacity !== undefined ? Number(capacity) : trip.registrationSettings?.capacity;
    trip.registrationSettings.totalFee = parsedTotalFee;
    trip.registrationSettings.confirmationFee = parsedConfirmationFee;
    if (eligibility !== undefined) trip.registrationSettings.eligibility = eligibility;
    if (requiredInfo !== undefined) trip.registrationSettings.requiredInfo = requiredInfo;
    if (documentsConfig && Array.isArray(documentsConfig)) trip.documentsConfig = documentsConfig;

    await trip.save();
    res.status(200).json({ success: true, trip, message: "Configuration updated successfully." });
  } catch (error) {
    console.error("updateRegistrationConfig error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update configuration" });
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

    const participants = await CampusRegistration.find({ tripId: id }).populate("userId", "name email phone");
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
    const { inclusions, exclusions, mealInclusions, accommodationBudgetPerStudent, budgetPerStudent } = req.body;

    const trip = await Trip.findOne({ _id: id, coordinatorId: req.user.id, tripCategory: "CAMPUS" });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or unauthorized" });

    if (!trip.campusConfig) trip.campusConfig = {};
    if (inclusions) trip.campusConfig.inclusions = inclusions;
    if (exclusions) trip.campusConfig.exclusions = exclusions;
    if (mealInclusions) trip.campusConfig.mealInclusions = mealInclusions;
    if (budgetPerStudent !== undefined && budgetPerStudent !== null) {
      trip.campusConfig.budgetPerStudent = Number(budgetPerStudent);
    }
    // Always derive canonical accommodation budget per student based on trip duration
    const durationDays = (() => {
      if (trip.startDate && trip.endDate) {
        const start = new Date(trip.startDate);
        const end = new Date(trip.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
      }
      if (Array.isArray(trip.itinerary) && trip.itinerary.length > 0) return trip.itinerary.length;
      if (trip.duration) {
        const match = String(trip.duration).match(/\d+/);
        if (match) return parseInt(match[0], 10);
      }
      return 10;
    })();
    const studentBudget = trip.campusConfig.budgetPerStudent || trip.budget || 15000;
    trip.campusConfig.accommodationBudgetPerStudent = Math.min(studentBudget, durationDays * 1000, 10000);

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

  const hasDetails = reg.studentInfo && (reg.studentInfo instanceof Map ? reg.studentInfo.size > 0 : Object.keys(reg.studentInfo).length > 0);
  if (!hasDetails) return "DRAFT";

  const requiredDocs = trip.documentsConfig?.filter(d => d.required) || [];
  const hasAllDocs = requiredDocs.every(d => 
    reg.documents?.some(rd => rd.documentType === d.documentType && ["UNDER_REVIEW", "VERIFIED"].includes(rd.status))
  );

  if (requiredDocs.length > 0 && !hasAllDocs) return "DOCUMENTS_PENDING";

  const confirmationFee = trip.registrationSettings?.confirmationFee || 0;
  const totalPaid = (reg.payments?.filter(p => p.status === "PAID").reduce((sum, p) => sum + p.amount, 0) || 0) +
    (reg.confirmationPayment?.status === "PAID" && !reg.payments?.some(p => p.name === "Confirmation Fee" && p.status === "PAID") ? (reg.confirmationPayment.amount || 0) : 0);

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
    const { id, docId, regId } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    // Allow both the student owner and the coordinator to preview
    const isCoordinator = trip.coordinatorId?.toString() === userId.toString();
    const query = isCoordinator 
      ? (regId ? { _id: regId, tripId: id } : { tripId: id, "documents._id": docId }) 
      : { tripId: id, userId };
    const reg = await CampusRegistration.findOne(query);
    if (!reg) return res.status(404).json({ success: false, message: "Registration not found" });

    const doc = reg.documents.id(docId);
    if (!doc || !doc.fileUrl) return res.status(404).json({ success: false, message: "Document not found" });

    let downloadUrl = doc.fileUrl;
    if (doc.fileUrl.includes("res.cloudinary.com")) {
      const match = doc.fileUrl.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) {
        const resourceType = match[1];
        const publicIdWithExt = match[2];

        if (resourceType === "raw") {
          // Cloudinary RAW resources retain the file extension as part of public_id
          downloadUrl = cloudinary.utils.private_download_url(publicIdWithExt, "", {
            resource_type: "raw",
            type: "upload"
          });
        } else {
          // IMAGE or other resource types expect public_id without extension and format separately
          const lastDot = publicIdWithExt.lastIndexOf(".");
          if (lastDot !== -1) {
            const publicId = publicIdWithExt.substring(0, lastDot);
            const format = publicIdWithExt.substring(lastDot + 1);
            downloadUrl = cloudinary.utils.private_download_url(publicId, format, {
              resource_type: resourceType,
              type: "upload"
            });
          } else {
            downloadUrl = cloudinary.utils.private_download_url(publicIdWithExt, "", {
              resource_type: resourceType,
              type: "upload"
            });
          }
        }
      }
    }

    const cloudinaryRes = await axios.get(downloadUrl, { responseType: "stream" });
    let contentType = cloudinaryRes.headers["content-type"];
    if (!contentType || contentType === "application/octet-stream" || contentType === "text/plain") {
      if (doc.fileUrl.toLowerCase().endsWith(".pdf")) {
        contentType = "application/pdf";
      } else if (doc.fileUrl.toLowerCase().endsWith(".png")) {
        contentType = "image/png";
      } else if (doc.fileUrl.toLowerCase().endsWith(".jpg") || doc.fileUrl.toLowerCase().endsWith(".jpeg")) {
        contentType = "image/jpeg";
      }
    }
    res.setHeader("Content-Type", contentType);
    cloudinaryRes.data.pipe(res);
  } catch (error) {
    console.error("Preview Document Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to load document preview" });
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

// 13. Create Razorpay Payment Order (Participant - Confirmation Fee)
exports.createPaymentOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Check student registration state
    if (reg.status === "DRAFT") {
      return res.status(400).json({ success: false, message: "Please submit student registration details first" });
    }

    const requiredDocs = trip.documentsConfig?.filter(d => d.required) || [];
    const hasAllDocs = requiredDocs.every(d => 
      reg.documents?.some(rd => rd.documentType === d.documentType && ["UNDER_REVIEW", "VERIFIED"].includes(rd.status))
    );
    if (requiredDocs.length > 0 && !hasAllDocs) {
      return res.status(400).json({ success: false, message: "Please upload all required documents before paying the confirmation fee" });
    }

    // Check if already paid
    if (reg.confirmationPayment?.status === "PAID" || reg.payments?.some(p => p.name === "Confirmation Fee" && p.status === "PAID")) {
      return res.status(400).json({ success: false, message: "Confirmation fee has already been paid" });
    }

    const confirmationFee = trip.registrationSettings?.confirmationFee || 0;
    if (confirmationFee <= 0) {
      return res.status(400).json({ success: false, message: "No confirmation fee is required for this trip" });
    }

    const amountInPaise = Math.round(confirmationFee * 100);
    if (amountInPaise < 100) {
      return res.status(400).json({ success: false, message: "Invalid confirmation fee amount" });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({ success: false, message: "Razorpay credentials not configured on server" });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    const receiptId = `c_${id.toString().slice(-8)}_${reg._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
      notes: {
        tripId: id.toString(),
        registrationId: reg._id.toString(),
        userId: userId.toString(),
        feeType: "CONFIRMATION_FEE"
      }
    });

    // Store Razorpay order in confirmationPayment on existing registration
    reg.confirmationPayment = {
      amount: confirmationFee,
      razorpayOrderId: order.id,
      status: "PENDING"
    };
    await reg.save();

    res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error.message || error);
    res.status(500).json({ success: false, message: error.message || "Failed to create payment order" });
  }
};

// 14. Verify Razorpay Payment (Participant - Confirmation Fee)
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing required payment verification parameters" });
    }

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    const reg = await CampusRegistration.findOne({ tripId: id, userId });
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Verify order ID matches server-stored order ID on this registration
    const serverOrderId = reg.confirmationPayment?.razorpayOrderId;
    if (!serverOrderId || serverOrderId !== razorpay_order_id) {
      return res.status(400).json({ success: false, message: "Order ID mismatch with registration record" });
    }

    // Mandatory Cryptographic HMAC-SHA256 signature verification
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${serverOrderId}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      if (reg.confirmationPayment) {
        reg.confirmationPayment.status = "FAILED";
        await reg.save();
      }
      return res.status(400).json({ success: false, message: "Payment signature verification failed. Invalid or tampered transaction." });
    }

    // Payment authentic: update confirmationPayment object
    reg.confirmationPayment.status = "PAID";
    reg.confirmationPayment.razorpayPaymentId = razorpay_payment_id;
    reg.confirmationPayment.razorpaySignature = razorpay_signature;
    reg.confirmationPayment.paidAt = new Date();

    // Ensure confirmation payment is recorded in reg.payments for ledger and history
    const confirmationFee = trip.registrationSettings?.confirmationFee || reg.confirmationPayment.amount;
    const existingPaymentRecord = reg.payments?.find(p => p.name === "Confirmation Fee");
    if (existingPaymentRecord) {
      existingPaymentRecord.status = "PAID";
      existingPaymentRecord.amount = confirmationFee;
      existingPaymentRecord.paymentReference = razorpay_payment_id;
      existingPaymentRecord.paidDate = new Date();
    } else {
      if (!reg.payments) reg.payments = [];
      reg.payments.push({
        name: "Confirmation Fee",
        amount: confirmationFee,
        status: "PAID",
        paymentReference: razorpay_payment_id,
        paidDate: new Date()
      });
    }

    // Whenever confirmation fee payment is verified, registration is submitted for coordinator review (PENDING)
    reg.coordinatorReview = {
      ...(reg.coordinatorReview ? (reg.coordinatorReview.toObject?.() || reg.coordinatorReview) : {}),
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null
    };

    // Evaluate registration status according to existing status engine
    reg.status = evaluateRegistrationStatus(reg, trip);
    await reg.save();

    res.status(200).json({
      success: true,
      registration: reg,
      message: "Confirmation payment verified successfully. Registration submitted for coordinator review!"
    });
  } catch (error) {
    console.error("Verify Payment Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to verify payment" });
  }
};

// 15. Approve Participant Registration (Coordinator)
exports.approveRegistration = async (req, res) => {
  try {
    const { id, regId } = req.params;
    const coordinatorId = req.user.id;

    const trip = await Trip.findOne({ _id: id, coordinatorId, tripCategory: "CAMPUS" });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Campus trip not found or unauthorized" });
    }

    const reg = await CampusRegistration.findOne({ _id: regId, tripId: id });
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    // Validation 1: Student details submitted
    const hasDetails = reg.studentInfo && (reg.studentInfo instanceof Map ? reg.studentInfo.size > 0 : Object.keys(reg.studentInfo).length > 0);
    if (!hasDetails) {
      return res.status(400).json({ success: false, message: "Cannot approve student: Student registration details are missing." });
    }

    // Validation 2: Required documents uploaded and verified
    const requiredDocs = trip.documentsConfig?.filter(d => d.required) || [];
    const missingOrUnverifiedDocs = [];

    if (requiredDocs.length > 0) {
      for (const reqDoc of requiredDocs) {
        const typeName = reqDoc.name || reqDoc.documentType;
        const uploaded = reg.documents?.find(d => d.documentType === typeName);
        if (!uploaded) {
          missingOrUnverifiedDocs.push(`${typeName} (Not uploaded)`);
        } else if (uploaded.status !== "VERIFIED") {
          missingOrUnverifiedDocs.push(`${typeName} (${uploaded.status})`);
        }
      }
    } else if (reg.documents && reg.documents.length > 0) {
      // If trip doesn't have documentsConfig predefined, all submitted student documents must be verified
      for (const doc of reg.documents) {
        if (doc.status !== "VERIFIED") {
          missingOrUnverifiedDocs.push(`${doc.documentType} (${doc.status})`);
        }
      }
    }

    if (missingOrUnverifiedDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot approve yet. Missing document verification: ${missingOrUnverifiedDocs.join(", ")}`
      });
    }

    // Validation 3: Confirmation payment verified
    const confirmationFee = trip.registrationSettings?.confirmationFee || 0;
    if (confirmationFee > 0) {
      const isPaid = reg.confirmationPayment?.status === "PAID" || reg.payments?.some(p => p.name === "Confirmation Fee" && p.status === "PAID");
      if (!isPaid) {
        return res.status(400).json({
          success: false,
          message: "Cannot approve student: Confirmation fee payment has not been verified."
        });
      }
    }

    // All checks passed -> approve
    reg.coordinatorReview = {
      status: "APPROVED",
      reviewedBy: coordinatorId,
      reviewedAt: new Date(),
      rejectionReason: undefined
    };

    await reg.save();

    res.status(200).json({
      success: true,
      registration: reg,
      message: "Student registration approved successfully. Participation is now confirmed."
    });
  } catch (error) {
    console.error("Approve Registration Error:", error);
    res.status(500).json({ success: false, message: "Failed to approve registration" });
  }
};

// 16. Reject Participant Registration (Coordinator)
exports.rejectRegistration = async (req, res) => {
  try {
    const { id, regId } = req.params;
    const coordinatorId = req.user.id;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: "A reason for rejection is required." });
    }

    const trip = await Trip.findOne({ _id: id, coordinatorId, tripCategory: "CAMPUS" });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Campus trip not found or unauthorized" });
    }

    const reg = await CampusRegistration.findOne({ _id: regId, tripId: id });
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    reg.coordinatorReview = {
      status: "REJECTED",
      rejectionReason: rejectionReason.trim(),
      reviewedBy: coordinatorId,
      reviewedAt: new Date()
    };

    await reg.save();

    res.status(200).json({
      success: true,
      registration: reg,
      message: "Student registration marked as rejected."
    });
  } catch (error) {
    console.error("Reject Registration Error:", error);
    res.status(500).json({ success: false, message: "Failed to reject registration" });
  }
};

// 17. Update Personal Coordinator Message for Participant
exports.updateCoordinatorMessage = async (req, res) => {
  try {
    const { id, regId } = req.params;
    const coordinatorId = req.user.id;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty." });
    }

    const trip = await Trip.findOne({ _id: id, coordinatorId, tripCategory: "CAMPUS" });
    if (!trip) {
      return res.status(404).json({ success: false, message: "Campus trip not found or unauthorized" });
    }

    const reg = await CampusRegistration.findOne({ _id: regId, tripId: id });
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    reg.coordinatorMessage = {
      message: message.trim(),
      updatedAt: new Date(),
      updatedBy: coordinatorId
    };

    await reg.save();

    res.status(200).json({
      success: true,
      registration: reg,
      message: "Coordinator message sent successfully."
    });
  } catch (error) {
    console.error("Update Coordinator Message Error:", error);
    res.status(500).json({ success: false, message: "Failed to update coordinator message" });
  }
};
