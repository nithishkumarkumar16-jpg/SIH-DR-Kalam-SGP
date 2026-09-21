const express = require("express");
const { Application, StatusHistory, Notification, Student } = require("../models");
const { requireAuth, requireRole } = require("../middleware/auth");
const { recordAuditLog } = require("../middleware/audit");

const router = express.Router();

// Authorized staff roles can update external government portal status
router.use(requireAuth);
router.use(requireRole("COLLEGE_ADMIN", "COLLEGE_STAFF", "MINISTRY_ADMIN", "MINISTRY_REVIEWER", "MINISTRY_APPROVER"));

const VALID_EXTERNAL_STATUSES = [
  "SUBMITTED",
  "UNDER_VERIFICATION",
  "DEFICIENCY",
  "VERIFIED",
  "SELECTED",
  "SANCTIONED",
  "PAYMENT_PROCESSED",
  "OTHER",
  "UNKNOWN"
];

// POST /api/applications/:id/external-status
router.post("/:id/external-status", async (req, res) => {
  try {
    const {
      externalApplicationId,
      externalPortalSource,
      externalStatus,
      evidenceReference,
      notes,
    } = req.body;

    if (!externalStatus || !VALID_EXTERNAL_STATUSES.includes(externalStatus)) {
      return res.status(400).json({
        error: `Invalid external status. Must be one of: ${VALID_EXTERNAL_STATUSES.join(", ")}`,
      });
    }

    const app = await Application.findOne({ applicationId: req.params.id });
    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    // If college staff, verify college ownership
    if (["COLLEGE_ADMIN", "COLLEGE_STAFF"].includes(req.user.role) && app.collegeId !== req.user.collegeId) {
      return res.status(403).json({ error: "Forbidden: Cannot update external status for another college's student." });
    }

    const prevExternal = {
      id: app.externalApplicationId,
      status: app.externalStatus,
      source: app.externalPortalSource,
    };

    if (externalApplicationId) app.externalApplicationId = externalApplicationId.trim();
    if (externalPortalSource) app.externalPortalSource = externalPortalSource.trim();
    app.externalStatus = externalStatus;
    app.externalEvidence = evidenceReference ? evidenceReference.trim() : (notes || "");
    app.externalLastChecked = new Date();
    app.externalUpdatedBy = req.user.userId;
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevExternal.status || "UNTRACKED",
      newStatus: `EXTERNAL_${externalStatus}`,
      changedBy: req.user.userId,
      changedByRole: req.user.role,
      reason: `Official Government Portal Check: ${externalStatus}. Ref: ${evidenceReference || notes || "Manual verification"}`,
      source: externalPortalSource || "OFFICIAL_GOVT_PORTAL_MANUAL",
      evidenceReference: evidenceReference || "",
    });

    const student = await Student.findOne({ studentId: app.studentId }).lean();
    if (student) {
      await Notification.create({
        notificationId: `NOTIF-${Date.now()}`,
        userId: student.userId,
        role: "STUDENT",
        title: `Official Portal Status: ${externalStatus.replace(/_/g, " ")}`,
        message: `Your status on ${app.externalPortalSource || "Government Portal"} has been updated to ${externalStatus}.`,
        type: externalStatus === "DEFICIENCY" ? "DEFICIENCY" : "INFO",
        link: `/student/status`,
      });
    }

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "EXTERNAL_PORTAL_STATUS_UPDATED",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: prevExternal,
      newValue: {
        externalApplicationId: app.externalApplicationId,
        externalStatus,
        source: app.externalPortalSource,
      },
      reason: notes || "Manual government portal check",
      req,
    });

    res.json({
      message: "Official government portal status updated successfully",
      application: app,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update external status: " + err.message });
  }
});

module.exports = router;
