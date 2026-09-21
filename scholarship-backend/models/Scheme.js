const mongoose = require("mongoose");

const SchemeSchema = new mongoose.Schema({
  schemeId: { type: String, required: true, unique: true, index: true },
  schemeName: { type: String, required: true },
  schemeType: {
    type: String,
    enum: ["CENTRAL", "STATE", "FELLOWSHIP", "AICTE", "SPECIAL_DISABILITY"],
    default: "CENTRAL",
    index: true,
  },
  ministry: { type: String, default: "Ministry of Tribal Affairs / MoE" },
  description: { type: String },
  targetCategory: [{ type: String }], // ["ST"], ["SC", "ST"], ["ALL"]
  academicLevels: [{ type: String }], // ["ug", "pg", "phd", "diploma"]
  maxIncome: { type: Number, default: 250000 },
  active: { type: Boolean, default: true, index: true },
  academicYear: { type: String, default: "2026-2027", index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Scheme", SchemeSchema);
