const path = require("path");
const fs = require("fs");
const axios = require("axios");
const GuideApplication = require("../models/GuideApplication");
const { cloudinary } = require("../middleware/uploadMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

/**
 * Upload single guide verification document (PDF only, max 10MB)
 * POST /api/guide/upload-document
 */
const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("No document file uploaded. Please select a PDF file.", 400);
  }

  const file = req.file;

  // Strict PDF validation on backend
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith(".pdf");
  if (!isPdfMime && !isPdfExt) {
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    throw new AppError("Only PDF files are accepted. JPG, JPEG, PNG, and other formats are not permitted.", 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    if (file.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    throw new AppError("File size exceeds the 10 MB limit.", 400);
  }

  let cloudinaryResult = null;
  const cleanBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniquePublicId = `${Date.now()}_${cleanBase}.pdf`;

  // Upload to Cloudinary (raw resource for PDF)
  try {
    if (file.path && fs.existsSync(file.path)) {
      cloudinaryResult = await cloudinary.uploader.upload(file.path, {
        folder: "transix/guide_documents",
        resource_type: "raw",
        public_id: uniquePublicId,
      });
    }
  } catch (cErr) {
    console.warn("Cloudinary upload notice (using local fallback if needed):", cErr.message);
  }

  const localFileName = file.filename || path.basename(file.path || uniquePublicId);
  const finalPublicId = cloudinaryResult?.public_id || `local_${localFileName}`;
  const finalUrl = cloudinaryResult?.secure_url || `/uploads/guide_documents/${localFileName}`;
  const previewUrl = `/api/guide/documents/preview?publicId=${encodeURIComponent(finalPublicId)}`;

  res.status(200).json({
    success: true,
    message: "Document uploaded successfully",
    document: {
      url: finalUrl,
      publicId: finalPublicId,
      fileName: file.originalname,
      fileType: "application/pdf",
      size: file.size,
      previewUrl: previewUrl,
    },
  });
});

/**
 * Stream / Preview secure guide verification document
 * GET /api/guide/documents/preview
 */
const previewDocument = asyncHandler(async (req, res) => {
  const { publicId, url } = req.query;

  if (!publicId && !url) {
    throw new AppError("Document identifier or URL is required for preview", 400);
  }

  // 1. Check if local copy exists on disk
  const localDir = path.join(__dirname, "../../uploads/guide_documents");
  let localFilename = "";
  if (publicId && publicId.startsWith("local_")) {
    localFilename = publicId.replace("local_", "");
  } else if (url && url.includes("/uploads/guide_documents/")) {
    localFilename = path.basename(url);
  } else if (publicId) {
    localFilename = path.basename(publicId);
  }

  if (localFilename) {
    const localPath = path.join(localDir, localFilename);
    if (fs.existsSync(localPath)) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${localFilename}"`);
      return fs.createReadStream(localPath).pipe(res);
    }
  }

  // 2. Stream from Cloudinary via signed private download URL
  if (publicId && !publicId.startsWith("local_")) {
    try {
      const downloadUrl = cloudinary.utils.private_download_url(publicId, "", {
        resource_type: "raw",
        type: "upload",
      });

      const cloudinaryRes = await axios.get(downloadUrl, { responseType: "stream" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      return cloudinaryRes.data.pipe(res);
    } catch (streamErr) {
      console.error("Cloudinary stream error:", streamErr.message);
    }
  }

  // 3. Direct accessible URL fallback
  if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
    try {
      const directRes = await axios.get(url, { responseType: "stream" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      return directRes.data.pipe(res);
    } catch (dErr) {
      return res.redirect(url);
    }
  }

  throw new AppError("Document preview could not be loaded", 404);
});

/**
 * Submit guide registration application
 * POST /api/guide/apply
 */
const submitGuideApplication = asyncHandler(async (req, res) => {
  const body = req.body;

  // 1. Validate required text fields
  if (!body.fullName || !body.fullName.trim()) {
    throw new AppError("Full name is required", 400);
  }
  if (!body.email || !body.email.trim()) {
    throw new AppError("Email address is required", 400);
  }
  if (!body.phone || !body.phone.trim()) {
    throw new AppError("Phone number is required", 400);
  }
  if (!body.dateOfBirth) {
    throw new AppError("Date of birth is required", 400);
  }
  if (!body.primaryRegion || !body.primaryRegion.trim()) {
    throw new AppError("Primary region is required", 400);
  }
  if (!body.bio || !body.bio.trim()) {
    throw new AppError("Bio and tour highlights are required", 400);
  }

  // 2. Validate mandatory documents: Aadhaar Card & Driving License
  const aadhaar = body.documents?.aadhaar;
  const drivingLicense = body.documents?.drivingLicense;

  if (!aadhaar || !aadhaar.url) {
    throw new AppError("Aadhaar Card is required. Please upload your Aadhaar Card in PDF format.", 400);
  }
  if (!drivingLicense || !drivingLicense.url) {
    throw new AppError("Driving License is required. Please upload your Driving License in PDF format.", 400);
  }

  // 3. Validate document formats (PDF only)
  const validateDocMeta = (doc, name) => {
    if (!doc) return;
    const isPdfExt = doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf");
    const isPdfType = doc.fileType === "application/pdf";
    const isPdfUrl = doc.url && doc.url.toLowerCase().includes(".pdf");
    if (!isPdfExt && !isPdfType && !isPdfUrl) {
      throw new AppError(`${name} must be in PDF format. Non-PDF formats are not permitted.`, 400);
    }
    if (doc.size && doc.size > 10 * 1024 * 1024) {
      throw new AppError(`${name} exceeds the 10 MB size limit.`, 400);
    }
  };

  validateDocMeta(aadhaar, "Aadhaar Card");
  validateDocMeta(drivingLicense, "Driving License");
  if (body.documents?.passport) validateDocMeta(body.documents.passport, "Passport");
  if (body.guideLicenseDocument) validateDocMeta(body.guideLicenseDocument, "Guide License Document");
  if (body.professionalExperience?.experienceProof) {
    validateDocMeta(body.professionalExperience.experienceProof, "Experience Proof");
  }

  // 4. Generate application number
  const appCount = await GuideApplication.countDocuments();
  const year = new Date().getFullYear();
  const applicationNumber = `TG-${year}-${String(appCount + 1).padStart(4, "0")}`;

  // 5. Build timeline stages
  const initialTimeline = [
    {
      key: "APPLICATION_SUBMITTED",
      label: "Application Submitted",
      status: "COMPLETED",
      completedAt: new Date(),
      note: "Guide registration received and queued for document inspection.",
    },
    {
      key: "DOCUMENT_REVIEW",
      label: "Document Review",
      status: "IN_PROGRESS",
      completedAt: null,
      note: "Verification team is reviewing uploaded identity and qualification PDFs.",
    },
    {
      key: "INTERVIEW",
      label: "Interview",
      status: "PENDING",
      completedAt: null,
      note: "Upcoming communication and regional routing assessment.",
    },
    {
      key: "REFERENCE_VERIFICATION",
      label: "Reference Verification",
      status: "PENDING",
      completedAt: null,
      note: "Validation of past tour operator or agency affiliations.",
    },
    {
      key: "FINAL_REVIEW",
      label: "Final Review",
      status: "PENDING",
      completedAt: null,
      note: "Final quality assurance and authorization.",
    },
    {
      key: "APPROVED",
      label: "Guide Profile Approved",
      status: "PENDING",
      completedAt: null,
      note: "Badge issuance and active directory listing.",
    },
  ];

  // 6. Create application record
  const application = await GuideApplication.create({
    applicationNumber,
    fullName: body.fullName.trim(),
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    dateOfBirth: body.dateOfBirth,
    primaryRegion: body.primaryRegion.trim(),
    availability: body.availability || "Full-time",
    preferredGroupSize: body.preferredGroupSize || "6–10 people",
    guidingExperience: body.guidingExperience || "3–5 years",
    languages: Array.isArray(body.languages) ? body.languages : ["English"],
    customLanguages: body.customLanguages || "",
    bio: body.bio.trim(),
    geographicalKnowledge: {
      states: body.geographicalKnowledge?.states || ["Kerala"],
    },
    documents: {
      aadhaar: {
        url: aadhaar.url,
        publicId: aadhaar.publicId || "",
        fileName: aadhaar.fileName || "Aadhaar_Card.pdf",
        fileType: "application/pdf",
        size: aadhaar.size || 0,
      },
      drivingLicense: {
        url: drivingLicense.url,
        publicId: drivingLicense.publicId || "",
        fileName: drivingLicense.fileName || "Driving_License.pdf",
        fileType: "application/pdf",
        size: drivingLicense.size || 0,
      },
      passport: body.documents?.passport?.url
        ? {
            url: body.documents.passport.url,
            publicId: body.documents.passport.publicId || "",
            fileName: body.documents.passport.fileName || "Passport.pdf",
            fileType: "application/pdf",
            size: body.documents.passport.size || 0,
          }
        : null,
    },
    tourismLicenseNumber: body.tourismLicenseNumber || "",
    guideLicenseDocument: body.guideLicenseDocument?.url
      ? {
          url: body.guideLicenseDocument.url,
          publicId: body.guideLicenseDocument.publicId || "",
          fileName: body.guideLicenseDocument.fileName || "Guide_License.pdf",
          fileType: "application/pdf",
          size: body.guideLicenseDocument.size || 0,
        }
      : null,
    professionalExperience: {
      workedWith: body.professionalExperience?.workedWith || ["Freelance / Independent Guide"],
      workedWithOther: body.professionalExperience?.workedWithOther || "",
      organizations: body.professionalExperience?.organizations || "",
      experienceDetails: body.professionalExperience?.experienceDetails || "",
      experienceProof: body.professionalExperience?.experienceProof?.url
        ? {
            url: body.professionalExperience.experienceProof.url,
            publicId: body.professionalExperience.experienceProof.publicId || "",
            fileName: body.professionalExperience.experienceProof.fileName || "Experience_Proof.pdf",
            fileType: "application/pdf",
            size: body.professionalExperience.experienceProof.size || 0,
          }
        : null,
    },
    references: {
      name: body.references?.name || "",
      contact: body.references?.contact || "",
      relationship: body.references?.relationship || "",
    },
    timeline: initialTimeline,
    verificationStatus: "pending",
    declarationAgreed: Boolean(body.declarationAgreed),
  });

  res.status(201).json({
    success: true,
    message: "Guide registration application submitted successfully",
    application,
  });
});

/**
 * Get guide application status and details
 * GET /api/guide/status/:id
 */
const getGuideApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let query = { $or: [{ applicationNumber: id }] };
  if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: id });
  }

  const application = await GuideApplication.findOne(query);

  if (!application) {
    throw new AppError("Guide application not found", 404);
  }

  res.status(200).json({
    success: true,
    application,
  });
});

module.exports = {
  uploadDocument,
  previewDocument,
  submitGuideApplication,
  getGuideApplicationStatus,
};
