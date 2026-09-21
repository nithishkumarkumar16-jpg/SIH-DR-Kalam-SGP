const mongoose = require("mongoose");

const CollegeSchema = new mongoose.Schema({
  collegeId: { type: String, required: true, unique: true, index: true },
  collegeName: { type: String, required: true, trim: true },
  institutionType: { type: String, default: "Government / Aided" },
  address: { type: String, trim: true },
  district: { type: String, required: true, index: true },
  state: { type: String, required: true, default: "Tamil Nadu", index: true },
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  status: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "PENDING_APPROVAL"],
    default: "ACTIVE",
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

CollegeSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("College", CollegeSchema);
