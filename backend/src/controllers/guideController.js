const axios = require("axios");
const { cloudinary } = require("../middleware/uploadMiddleware");
const GuideApplication = require("../models/GuideApplication");

const extractDocMeta = (file) => {
  if (!file) return null;
  const url = file.path || file.secure_url || file.url || "";
  const publicId = file.filename || file.public_id || "";
  const mimeType = file.mimetype || file.fileType || "";
  const isPdf = mimeType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

  let signedUrl = "";
  if (publicId) {
    try {
      signedUrl = cloudinary.utils.private_download_url(publicId, "", {
        resource_type: isPdf ? "raw" : "image",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      });
    } catch (e) {
      // ignore
    }
  }

  return {
    url,
    signedUrl: signedUrl || url,
    publicId,
    fileName: file.originalname || file.fileName || "",
    fileType: mimeType,
    size: file.size || 0,
  };
};

/**
 * POST /api/guide/upload-document
 * Uploads a document to Cloudinary and returns metadata & secure URL for preview
 */
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document file provided for upload.",
      });
    }

    const document = extractDocMeta(req.file);

    res.status(200).json({
      success: true,
      message: "Document uploaded successfully.",
      document,
    });
  } catch (error) {
    console.error("Guide Document Upload Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload document.",
    });
  }
};

/**
 * POST /api/guide/apply
 * Submits a new Guide Application for verification
 */
exports.applyGuide = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      primaryRegion,
      city,
      availability,
      preferredGroupSize,
      guidingExperience,
      experienceYears,
      languages,
      customLanguages,
      otherLanguages,
      bio,
      geographicalKnowledge,
      documents,
      tourismLicenseNumber,
      guideLicenseDocument,
      professionalExperience,
      references,
      declarationAgreed,
    } = req.body;

    const resolvedRegion = (primaryRegion || city || "").trim();
    const resolvedGuidingExp = guidingExperience || experienceYears || "";
    const resolvedCustomLang = (customLanguages || otherLanguages || "").trim();

    // Required Field Validations
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: "Full Name is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: "A valid Email Address is required." });
    }

    const phoneRegex = /^[+]?[\d\s-]{7,18}$/;
    if (!phone || !phoneRegex.test(phone.trim())) {
      return res.status(400).json({ success: false, message: "A valid Phone Number is required." });
    }

    if (!dateOfBirth) {
      return res.status(400).json({ success: false, message: "Date of Birth is required." });
    }

    if (!resolvedRegion) {
      return res.status(400).json({ success: false, message: "Primary Region / City is required." });
    }

    const validAvailability = ["Full-time", "Part-time", "Weekends", "On Request"];
    if (!availability || !validAvailability.includes(availability)) {
      return res.status(400).json({ success: false, message: "Please select a valid guide availability." });
    }

    const validGroupSizes = ["1–5 people", "6–10 people", "11–20 people", "20+ people", "Campus Trips"];
    if (!preferredGroupSize || !validGroupSizes.includes(preferredGroupSize)) {
      return res.status(400).json({ success: false, message: "Please select a preferred group size." });
    }

    const validExpYears = [
      "Less than 1 year",
      "1–2 years",
      "3–5 years",
      "6–10 years",
      "10+ years — Senior Leader",
    ];
    if (!resolvedGuidingExp || !validExpYears.includes(resolvedGuidingExp)) {
      return res.status(400).json({ success: false, message: "Please select your guiding experience." });
    }

    // Languages validation
    const parsedLanguages = Array.isArray(languages) ? languages : [];
    if (parsedLanguages.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least one language." });
    }

    if (parsedLanguages.includes("Other") && !resolvedCustomLang) {
      return res.status(400).json({
        success: false,
        message: "Please specify the other language(s) you speak.",
      });
    }

    // Geographical Knowledge validation (Mandatory at least 1 Indian state)
    const states = geographicalKnowledge?.states || [];
    if (!Array.isArray(states) || states.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one Indian state in Geographical Knowledge.",
      });
    }

    if (!bio || !bio.trim()) {
      return res.status(400).json({ success: false, message: "Brief Bio & Tour Highlights is required." });
    }

    // Identity Documents Validation
    if (!documents || !documents.aadhaar || !documents.aadhaar.url) {
      return res.status(400).json({
        success: false,
        message: "Aadhaar Card document upload is mandatory.",
      });
    }

    if (!documents.drivingLicense || !documents.drivingLicense.url) {
      return res.status(400).json({
        success: false,
        message: "Driving License document upload is mandatory.",
      });
    }

    // Professional Experience Validation
    const workedWith = professionalExperience?.workedWith || [];
    if (!Array.isArray(workedWith) || workedWith.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one professional experience option.",
      });
    }

    if (workedWith.includes("Other") && !professionalExperience?.workedWithOther?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please specify your other professional experience details.",
      });
    }

    // Declaration Validation
    const agreed = declarationAgreed === true || declarationAgreed === "true";
    if (!agreed) {
      return res.status(400).json({
        success: false,
        message: "You must confirm the accuracy of information and agree to the verification declaration.",
      });
    }

    // Generate unique application tracking number
    const rand = Math.floor(100000 + Math.random() * 900000);
    const applicationNumber = `TG-${new Date().getFullYear()}-${rand}`;

    // Initialize clean verification timeline
    const timeline = [
      {
        key: "APPLICATION_SUBMITTED",
        label: "Application Submitted",
        status: "COMPLETED",
        completedAt: new Date(),
        note: "Your application has been received and registered in the Transix Guide Network registry.",
      },
      {
        key: "DOCUMENT_REVIEW",
        label: "Document Review",
        status: "IN_PROGRESS",
        completedAt: null,
        note: "Transix verification team is reviewing your Aadhaar, driving license, and credentials.",
      },
      {
        key: "INTERVIEW",
        label: "Interview",
        status: "PENDING",
        completedAt: null,
        note: "A coordinator will reach out to schedule your professional interaction session after document review.",
      },
      {
        key: "REFERENCE_VERIFICATION",
        label: "Experience / Reference Verification",
        status: "PENDING",
        completedAt: null,
        note: "Past tour leadership, operator engagements, and reference details verification.",
      },
      {
        key: "FINAL_REVIEW",
        label: "Final Review",
        status: "PENDING",
        completedAt: null,
        note: "Final compliance signoff by Transix Head of Guide Operations.",
      },
      {
        key: "APPROVED",
        label: "Guide Profile Approved",
        status: "PENDING",
        completedAt: null,
        note: "Guide profile badge activation and assignment dispatch eligibility.",
      },
    ];

    const application = new GuideApplication({
      applicationNumber,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      dateOfBirth,
      primaryRegion: resolvedRegion,
      availability,
      preferredGroupSize,
      guidingExperience: resolvedGuidingExp,
      languages: parsedLanguages,
      customLanguages: resolvedCustomLang,
      bio: bio.trim(),
      geographicalKnowledge: { states },
      documents: {
        aadhaar: documents.aadhaar,
        drivingLicense: documents.drivingLicense,
        passport: documents.passport || null,
      },
      tourismLicenseNumber: tourismLicenseNumber ? tourismLicenseNumber.trim() : "",
      guideLicenseDocument: guideLicenseDocument || null,
      professionalExperience: {
        workedWith,
        workedWithOther: professionalExperience.workedWithOther ? professionalExperience.workedWithOther.trim() : "",
        organizations: professionalExperience.organizations ? professionalExperience.organizations.trim() : "",
        experienceDetails: professionalExperience.experienceDetails ? professionalExperience.experienceDetails.trim() : "",
        experienceProof: professionalExperience.experienceProof || null,
      },
      references: {
        name: references?.name ? references.name.trim() : "",
        contact: references?.contact ? references.contact.trim() : "",
        relationship: references?.relationship || "",
      },
      declarationAgreed: true,
      declarationAgreedAt: new Date(),
      verificationStatus: "pending",
      timeline,
    });

    await application.save();

    res.status(201).json({
      success: true,
      message: "Guide application submitted successfully for verification.",
      application: {
        _id: application._id,
        applicationNumber: application.applicationNumber,
        fullName: application.fullName,
        email: application.email,
        phone: application.phone,
        primaryRegion: application.primaryRegion,
        verificationStatus: application.verificationStatus,
        createdAt: application.createdAt,
        timeline: application.timeline,
      },
    });
  } catch (error) {
    console.error("Guide Application Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit guide application",
    });
  }
};

/**
 * GET /api/guide/status/:id
 * Retrieves verification status and timeline for a guide application
 */
exports.getGuideStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let query = {};
    if (id.startsWith("TG-")) {
      query = { applicationNumber: id };
    } else if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id };
    } else {
      return res.status(404).json({
        success: false,
        message: "Guide application not found.",
      });
    }

    // Exclude publicId or internal security fields
    const application = await GuideApplication.findOne(query).select(
      "-documents.aadhaar.publicId -documents.drivingLicense.publicId -documents.passport.publicId -guideLicenseDocument.publicId -professionalExperience.experienceProof.publicId"
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Guide application not found.",
      });
    }

    res.status(200).json({
      success: true,
      application,
    });
  } catch (error) {
    console.error("Get Guide Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve guide application status",
    });
  }
};

/**
 * GET /api/guide/documents/preview
 * Streams document preview with Content-Type and inline disposition for PDFs and images
 */
exports.previewDocument = async (req, res) => {
  try {
    const { publicId, url } = req.query;

    let targetPublicId = publicId;
    let resourceType = "raw";

    if (!targetPublicId && url) {
      const match = url.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
      if (match) {
        resourceType = match[1];
        targetPublicId = match[2];
      }
    }

    if (!targetPublicId) {
      return res.status(400).json({ success: false, message: "Document identifier missing." });
    }

    const isPdf = targetPublicId.toLowerCase().endsWith(".pdf") || url?.toLowerCase().endsWith(".pdf");
    if (!resourceType || resourceType === "auto") {
      resourceType = isPdf ? "raw" : "image";
    }

    let downloadUrl = "";
    if (url && (resourceType === "image" || url.includes("/image/upload/"))) {
      downloadUrl = url;
    } else if (resourceType === "raw" || isPdf) {
      downloadUrl = cloudinary.utils.private_download_url(targetPublicId, "", {
        resource_type: "raw",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      });
    } else {
      downloadUrl = url || cloudinary.url(targetPublicId, { resource_type: "image", secure: true });
    }

    const cloudinaryRes = await axios.get(downloadUrl, { responseType: "stream" });
    let contentType = cloudinaryRes.headers["content-type"];
    if (!contentType || contentType === "application/octet-stream" || contentType === "text/plain") {
      if (isPdf) {
        contentType = "application/pdf";
      } else if (targetPublicId.toLowerCase().endsWith(".png")) {
        contentType = "image/png";
      } else if (targetPublicId.toLowerCase().endsWith(".jpg") || targetPublicId.toLowerCase().endsWith(".jpeg")) {
        contentType = "image/jpeg";
      }
    }

    res.setHeader("Content-Type", contentType || (isPdf ? "application/pdf" : "image/jpeg"));
    res.setHeader("Content-Disposition", "inline");
    cloudinaryRes.data.pipe(res);
  } catch (error) {
    console.error("Guide Preview Document Error:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to load document preview" });
  }
};

