const mongoose = require("mongoose");

const SchemeRuleSchema = new mongoose.Schema({
  schemeId: { type: String, required: true, index: true },
  ruleVersion: { type: String, default: "2026.1", index: true },
  eligibilityRules: {
    maxIncome: { type: Number },
    categories: [{ type: String }],
    courses: [{ type: String }],
    academicLevels: [{ type: String }],
    genderRestriction: { type: String, default: "ALL" }, // ALL, FEMALE_ONLY, MALE_ONLY
    minMarksPercentage: { type: Number, default: 0 },
    stateDomicile: { type: String, default: "ANY" },
    disabilityRequired: { type: Boolean, default: false },
    firstGraduateBonus: { type: Boolean, default: false },
  },
  requiredDocuments: [{ type: String }], // ["ms10", "ms12", "community", "income"]
  deadlines: {
    applicationDeadline: { type: Date },
    collegeVerificationDeadline: { type: Date },
    ministryScrutinyDeadline: { type: Date },
  },
  selectionRules: {
    method: { type: String, default: "MERIT_AND_MEANS" },
    quotaLimit: { type: Number },
  },
  continuationRules: {
    minAttendance: { type: Number, default: 75 },
    minPassMarks: { type: Number, default: 50 },
  },
  budget: {
    allocatedBudget: { type: Number },
    utilizedBudget: { type: Number, default: 0 },
    financialYear: { type: String, default: "2026-2027" },
  },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTo: { type: Date },
  approvedBy: { type: String, default: "Ministry Admin" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SchemeRule", SchemeRuleSchema);
