const { AuditLog } = require("../models");

async function recordAuditLog({
  actorUserId,
  actorRole,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  reason = "",
  req = null,
}) {
  try {
    const ipAddress = req
      ? (req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
      : "system";

    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    await AuditLog.create({
      logId,
      actorUserId: actorUserId || "SYSTEM",
      actorRole: actorRole || "SYSTEM",
      action,
      entityType,
      entityId: String(entityId),
      oldValue,
      newValue,
      reason,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Failed to record audit log:", err.message);
  }
}

module.exports = { recordAuditLog };
