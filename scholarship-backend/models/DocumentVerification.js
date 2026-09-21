const mongoose = require("mongoose");

const DocumentVerificationSchema = new mongoose.Schema({
  verificationId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  documentType: {
    type: String,
    enum: ["ms10", "ms12", "community", "income", "bankPassbook", "bonafide", "other"],
    required: true,
    index: true,
  },
  // Extracted OCR fields metadata only (never raw files)
  extractedFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  confidence: { type: Number, default: 0 },
  verificationStatus: {
    type: String,
    enum: ["VERIFIED", "NEEDS_REVIEW", "MISMATCH", "UNVERIFIED"],
    default: "UNVERIFIED",
    index: true,
  },
  mismatch: { type: Boolean, default: false },
  mismatchDetails: { type: String },
  reviewRequired: { type: Boolean, default: false },
  sourcePageRef: { type: String, default: "Client OCR Engine (Tesseract.js / PDF.js)" },
  version: { type: Number, default: 1 },
  versionHistory: [
    {
      version: { type: Number },
      extractedFields: { type: mongoose.Schema.Types.Mixed },
      confidence: { type: Number },
      verificationStatus: { type: String },
      mismatch: { type: Boolean },
      mismatchDetails: { type: String },
      processedAt: { type: Date },
      reason: { type: String },
    }
  ],
  processedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DocumentVerification", DocumentVerificationSchema);
