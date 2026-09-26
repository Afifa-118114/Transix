const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

const isConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
console.log("Cloudinary configured:", isConfigured);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let format = undefined; // For raw, format shouldn't be overridden typically, but we can set it
    let resource_type = "auto";
    
    if (file.mimetype === "application/pdf") {
      format = "pdf";
      resource_type = "raw"; // RAW is required for PDFs to download/preview natively
    } else if (file.mimetype === "image/png") {
      format = "png";
    } else if (file.mimetype === "image/jpeg" || file.mimetype === "image/jpg") {
      format = "jpg";
    }

    const isGuide = req.baseUrl?.includes("guide") || req.originalUrl?.includes("guide");
    const folder = isGuide ? "transix/guide_documents" : "transix/campus_documents";

    return {
      folder,
      format: format,
      resource_type: resource_type,
      public_id: `${Date.now()}_${file.originalname.replace(/\.[^/.]+$/, "")}${resource_type === 'raw' ? '.pdf' : ''}`,
    };
  },
});

const upload = multer({ storage: storage });

const fs = require("fs");
const path = require("path");

const guidePdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/guide_documents");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const cleanBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${cleanBase}.pdf`);
  },
});

const guidePdfFileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfExt = file.originalname && file.originalname.toLowerCase().endsWith(".pdf");
  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    const err = new Error("Only PDF files are accepted. JPG, JPEG, PNG, and other formats are not permitted.");
    err.status = 400;
    err.code = "INVALID_FILE_TYPE";
    cb(err, false);
  }
};

const guidePdfUpload = multer({
  storage: guidePdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: guidePdfFileFilter,
});

const guideUpload = guidePdfUpload;

module.exports = { upload, guideUpload, guidePdfUpload, cloudinary };

