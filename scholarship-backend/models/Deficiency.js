const mongoose = require("mongoose");

const DEFICIENCY_TYPES = [
  "MISSING_DOCUMENT",
  "UNCLEAR_DOCUMENT",
  "OCR_REVIEW",
  "DATA_MISMATCH",
  "INVALID_INFORMATION",
  "ELIGIBILITY_REVIEW",
  "OTHER"
];

const DeficiencySchema = new mongoose.Schema({
  deficiencyId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  documentType: { type: String },
  type: {
    type: String,
    enum: DEFICIENCY_TYPES,
    required: true,
  },
  description: { type: String, required: true },
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "BLOCKING"],
    default: "HIGH",
  },
  status: {
    type: String,
    enum: ["OPEN", "RESOLVED"],
    default: "OPEN",
    index: true,
  },
  createdBy: { type: String, required: true },
  createdByRole: { type: String, required: true },
  assignedTo: { type: String, required: true },
  resolutionNote: { type: String },
  resolvedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Deficiency: mongoose.model("Deficiency", DeficiencySchema),
  DEFICIENCY_TYPES,
};
