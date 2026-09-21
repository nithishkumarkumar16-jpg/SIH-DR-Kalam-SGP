const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema({
  logId: { type: String, required: true, unique: true, index: true },
  actorUserId: { type: String, required: true, index: true },
  actorRole: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true }, // "Application", "User", "Student", "Payment", "Scheme", "Deficiency", "College"
  entityId: { type: String, required: true, index: true },
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  reason: { type: String },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("AuditLog", AuditLogSchema);
