const mongoose = require("mongoose");

const StatusHistorySchema = new mongoose.Schema({
  historyId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  previousStatus: { type: String },
  newStatus: { type: String, required: true, index: true },
  changedBy: { type: String, required: true },
  changedByRole: { type: String, required: true },
  reason: { type: String, required: true },
  source: { type: String, default: "SGP_INTERNAL" }, // "SGP_INTERNAL" | "OFFICIAL_PORTAL_MANUAL" | "GOVT_API_SYNC"
  evidenceReference: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("StatusHistory", StatusHistorySchema);
