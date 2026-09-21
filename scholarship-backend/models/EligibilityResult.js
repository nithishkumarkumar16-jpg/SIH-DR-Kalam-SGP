const mongoose = require("mongoose");

const EligibilityResultSchema = new mongoose.Schema({
  resultId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  schemeId: { type: String, required: true, index: true },
  ruleVersion: { type: String, default: "2026.1" },
  evaluationResult: {
    type: String,
    enum: ["ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW"],
    required: true,
    index: true,
  },
  matchScore: { type: Number, default: 0 },
  explanation: { type: String, required: true },
  criteriaBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  evaluatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EligibilityResult", EligibilityResultSchema);
