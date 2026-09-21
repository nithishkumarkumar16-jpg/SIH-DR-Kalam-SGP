const express = require("express");
const {
  Student,
  Application,
  DocumentVerification,
  EligibilityResult,
  Deficiency,
  StatusHistory,
  Notification,
  Scheme,
  College,
  Ticket,
  Award,
} = require("../models");
const { requireAuth, requireRole, verifyStudentOwnership } = require("../middleware/auth");
const { recordAuditLog } = require("../middleware/audit");

const router = express.Router();

// Apply auth + student role to all routes here
router.use(requireAuth);
router.use(requireRole("STUDENT"));
router.use(verifyStudentOwnership);

// GET /api/student/profile
router.get("/profile", async (req, res) => {
  res.json({ student: req.student });
});

// PUT /api/student/profile
router.put("/profile", async (req, res) => {
  try {
    const allowedFields = [
      "fullName", "dateOfBirth", "gender", "category", "state", "district", "address",
      "course", "department", "studyYear", "semester", "registerNumber",
      "admissionYear", "expectedGraduationYear", "familyIncome", "firstGraduate",
      "disabilityStatus", "bankAccountType", "bankSeededConfirmed"
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await Student.findOneAndUpdate(
      { studentId: req.student.studentId },
      { $set: updates },
      { new: true }
    );

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "PROFILE_UPDATE",
      entityType: "Student",
      entityId: req.student.studentId,
      oldValue: req.student,
      newValue: updated,
      reason: "Student updated profile details",
      req,
    });

    res.json({ message: "Profile updated successfully", student: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile: " + err.message });
  }
});

// GET /api/student/applications
router.get("/applications", async (req, res) => {
  try {
    const apps = await Application.find({ studentId: req.student.studentId }).sort({ createdAt: -1 }).lean();
    res.json({ applications: apps });
  } catch (err) {
    res.status(500).json({ error: "Failed to load applications." });
  }
});

// POST /api/student/applications (Create new application)
router.post("/applications", async (req, res) => {
  try {
    const { schemeId, academicYear } = req.body;
    if (!schemeId) {
      return res.status(400).json({ error: "Scheme ID is required to create an application." });
    }

    const scheme = await Scheme.findOne({ schemeId });
    if (!scheme) {
      return res.status(404).json({ error: "Selected scheme does not exist." });
    }

    // Check if an active application for this scheme & academic year already exists
    const existing = await Application.findOne({
      studentId: req.student.studentId,
      schemeId,
      academicYear: academicYear || "2026-2027",
    });

    if (existing) {
      return res.json({
        message: "Existing application retrieved",
        application: existing,
      });
    }

    const applicationId = `APP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const newApp = await Application.create({
      applicationId,
      studentId: req.student.studentId,
      collegeId: req.student.collegeId,
      schemeId,
      academicYear: academicYear || "2026-2027",
      applicationYear: new Date().getFullYear(),
      applicationStatus: "DRAFT",
      currentStage: "Draft Stage",
      whoMustAct: "Student",
      nextAction: "Complete document verification and submit application",
    });

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId,
      previousStatus: "NONE",
      newStatus: "DRAFT",
      changedBy: req.user.userId,
      changedByRole: "STUDENT",
      reason: `Application created for scheme: ${scheme.schemeName}`,
      source: "SGP_PORTAL",
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "APPLICATION_CREATED",
      entityType: "Application",
      entityId: applicationId,
      newValue: newApp,
      reason: `Created draft application for ${scheme.schemeName}`,
      req,
    });

    res.status(201).json({
      message: "Application draft created successfully",
      application: newApp,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create application: " + err.message });
  }
});

// GET /api/student/applications/:id
router.get("/applications/:id", async (req, res) => {
  try {
    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    }).lean();

    if (!app) {
      return res.status(404).json({ error: "Application not found or unauthorized." });
    }

    const [scheme, college, verifications, eligibility, deficiencies, history] = await Promise.all([
      Scheme.findOne({ schemeId: app.schemeId }).lean(),
      College.findOne({ collegeId: app.collegeId }).lean(),
      DocumentVerification.find({ applicationId: app.applicationId }).lean(),
      EligibilityResult.findOne({ applicationId: app.applicationId }).sort({ evaluatedAt: -1 }).lean(),
      Deficiency.find({ applicationId: app.applicationId }).sort({ createdAt: -1 }).lean(),
      StatusHistory.find({ applicationId: app.applicationId }).sort({ timestamp: 1 }).lean(),
    ]);

    res.json({
      application: app,
      scheme,
      college,
      verifications,
      eligibility,
      deficiencies,
      statusHistory: history,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load application details." });
  }
});

// POST /api/student/applications/:id/verify-document (Save OCR verification metadata)
router.post("/applications/:id/verify-document", async (req, res) => {
  try {
    const { documentType, extractedFields, confidence, verificationStatus, mismatch, mismatchDetails, reviewRequired } = req.body;

    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (!documentType) {
      return res.status(400).json({ error: "Document type is required." });
    }

    const verificationId = `VER-${app.applicationId}-${documentType}`;

    const existing = await DocumentVerification.findOne({ verificationId });
    let newVersion = 1;
    let history = [];

    if (existing) {
      newVersion = (existing.version || 1) + 1;
      history = existing.versionHistory || [];
      history.push({
        version: existing.version || 1,
        extractedFields: existing.extractedFields,
        confidence: existing.confidence,
        verificationStatus: existing.verificationStatus,
        mismatch: existing.mismatch,
        mismatchDetails: existing.mismatchDetails,
        processedAt: existing.processedAt || new Date(),
        reason: "Replacement upload / re-verification",
      });
    }

    const record = await DocumentVerification.findOneAndUpdate(
      { verificationId },
      {
        $set: {
          applicationId: app.applicationId,
          studentId: req.student.studentId,
          documentType,
          extractedFields: extractedFields || {},
          confidence: typeof confidence === "number" ? confidence : 0,
          verificationStatus: verificationStatus || "VERIFIED",
          mismatch: !!mismatch,
          mismatchDetails: mismatchDetails || "",
          reviewRequired: !!reviewRequired,
          version: newVersion,
          versionHistory: history,
          processedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Update application's document verification flag
    app.documentVerificationStatus = mismatch ? "FLAGGED" : "VERIFIED";
    app.lastUpdatedAt = new Date();
    await app.save();

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "DOCUMENT_VERIFICATION_SAVED",
      entityType: "DocumentVerification",
      entityId: verificationId,
      newValue: { documentType, confidence, verificationStatus, version: newVersion },
      reason: `OCR verified metadata saved for ${documentType} (v${newVersion})`,
      req,
    });

    res.json({ message: "Verification result saved successfully", verification: record, version: newVersion });
  } catch (err) {
    res.status(500).json({ error: "Failed to save verification: " + err.message });
  }
});

// POST /api/student/applications/:id/save-eligibility
router.post("/applications/:id/save-eligibility", async (req, res) => {
  try {
    const { evaluationResult, matchScore, explanation, criteriaBreakdown } = req.body;

    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    const resultId = `ELG-${app.applicationId}`;

    const record = await EligibilityResult.findOneAndUpdate(
      { resultId },
      {
        $set: {
          applicationId: app.applicationId,
          studentId: req.student.studentId,
          schemeId: app.schemeId,
          evaluationResult: evaluationResult || "ELIGIBLE",
          matchScore: matchScore || 100,
          explanation: explanation || "Meets statutory scheme criteria",
          criteriaBreakdown: criteriaBreakdown || {},
          evaluatedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    app.eligibilityStatus = evaluationResult || "ELIGIBLE";
    app.lastUpdatedAt = new Date();
    await app.save();

    res.json({ message: "Eligibility result saved", eligibility: record });
  } catch (err) {
    res.status(500).json({ error: "Failed to save eligibility: " + err.message });
  }
});

// POST /api/student/applications/:id/submit
router.post("/applications/:id/submit", async (req, res) => {
  try {
    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (!["DRAFT", "CORRECTION_REQUIRED", "RESUBMITTED"].includes(app.applicationStatus)) {
      return res.status(400).json({ error: `Cannot submit application in status: ${app.applicationStatus}` });
    }

    const prevStatus = app.applicationStatus;
    const newStatus = prevStatus === "CORRECTION_REQUIRED" ? "RESUBMITTED" : "SUBMITTED";

    app.applicationStatus = newStatus;
    app.currentStage = "College Verification Stage";
    app.whoMustAct = "College Authority";
    app.nextAction = "College verification of student credentials and bonafide status";
    app.submittedAt = new Date();
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus,
      changedBy: req.user.userId,
      changedByRole: "STUDENT",
      reason: prevStatus === "CORRECTION_REQUIRED"
        ? "Student corrected and resubmitted application"
        : "Student submitted completed application for institutional verification",
      source: "SGP_PORTAL",
    });

    // In-app notification to student
    await Notification.create({
      notificationId: `NOTIF-${Date.now()}`,
      userId: req.user.userId,
      role: "STUDENT",
      title: "Application Submitted Successfully",
      message: `Your scholarship application ${app.applicationId} has been submitted to your college for verification.`,
      type: "SUCCESS",
      link: `/student/status`,
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "APPLICATION_SUBMITTED",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: { status: prevStatus },
      newValue: { status: newStatus },
      reason: "Submitted by student",
      req,
    });

    res.json({ message: "Application submitted successfully", application: app });
  } catch (err) {
    res.status(500).json({ error: "Submission failed: " + err.message });
  }
});

// GET /api/student/deficiencies
router.get("/deficiencies", async (req, res) => {
  try {
    const list = await Deficiency.find({ studentId: req.student.studentId }).sort({ createdAt: -1 }).lean();
    res.json({ deficiencies: list });
  } catch (err) {
    res.status(500).json({ error: "Failed to load deficiencies." });
  }
});

// PUT /api/student/deficiencies/:id/resolve
router.put("/deficiencies/:id/resolve", async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const def = await Deficiency.findOne({
      deficiencyId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!def) {
      return res.status(404).json({ error: "Deficiency not found." });
    }

    def.status = "RESOLVED";
    def.resolutionNote = resolutionNote || "Corrected and re-uploaded by student";
    def.resolvedAt = new Date();
    await def.save();

    // Check if any open deficiencies remain on this application
    const openCount = await Deficiency.countDocuments({
      applicationId: def.applicationId,
      status: "OPEN",
    });

    await Application.findOneAndUpdate(
      { applicationId: def.applicationId },
      {
        $set: {
          openDeficienciesCount: openCount,
          lastUpdatedAt: new Date(),
        },
      }
    );

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "DEFICIENCY_RESOLVED",
      entityType: "Deficiency",
      entityId: def.deficiencyId,
      newValue: { status: "RESOLVED", resolutionNote },
      reason: "Student resolved deficiency item",
      req,
    });

    res.json({ message: "Deficiency marked as resolved", deficiency: def, remainingOpen: openCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve deficiency: " + err.message });
  }
});

// GET /api/student/notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(20).lean();
    res.json({ notifications: notifs });
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

// PUT /api/student/notifications/:id/read
router.put("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { notificationId: req.params.id, userId: req.user.userId },
      { $set: { read: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update notification." });
  }
});

// POST /api/student/applications/:id/accept-award (Student accepts award)
router.post("/applications/:id/accept-award", async (req, res) => {
  try {
    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found or unauthorized." });
    }

    const award = await Award.findOne({ applicationId: app.applicationId });
    if (!award) {
      return res.status(400).json({ error: "No official award has been issued for this application yet." });
    }

    award.acceptanceStatus = "ACCEPTED";
    award.acceptedAt = new Date();
    await award.save();

    const prevStatus = app.applicationStatus;
    app.applicationStatus = "SANCTIONED";
    app.currentStage = "Award Accepted — Sanction Order Active";
    app.whoMustAct = "Finance & DBT Department";
    app.nextAction = "DBT payment processing to Aadhaar-seeded bank account";
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: "SANCTIONED",
      changedBy: req.user.userId,
      changedByRole: "STUDENT",
      reason: `Student officially accepted scholarship award (${award.awardLetterNumber})`,
      source: "STUDENT_PORTAL",
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "AWARD_ACCEPTED",
      entityType: "Award",
      entityId: award.awardId,
      newValue: { acceptanceStatus: "ACCEPTED" },
      reason: "Student accepted scholarship award",
      req,
    });

    res.json({ message: "Award accepted successfully. Awaiting financial disbursement.", award, application: app });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept award: " + err.message });
  }
});

// POST /api/student/applications/:id/progress-report (Submit continuation progress report)
router.post("/applications/:id/progress-report", async (req, res) => {
  try {
    const { academicPerformance, attendancePercentage, remarks } = req.body;
    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    const prevStatus = app.applicationStatus;
    app.applicationStatus = "CONTINUATION";
    app.currentStage = "Continuation / Progress Report Submitted";
    app.whoMustAct = "College Authority";
    app.nextAction = "College verification of academic continuation and attendance";
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: "CONTINUATION",
      changedBy: req.user.userId,
      changedByRole: "STUDENT",
      reason: `Progress report submitted. Attendance: ${attendancePercentage || "N/A"}%. Remarks: ${remarks || "Normal progress"}`,
      source: "STUDENT_PORTAL",
    });

    res.json({ message: "Progress report submitted successfully", application: app });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit progress report: " + err.message });
  }
});

// GET /api/student/tickets (List own tickets)
router.get("/tickets", async (req, res) => {
  try {
    const tickets = await Ticket.find({ studentId: req.student.studentId }).sort({ updatedAt: -1 }).lean();
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: "Failed to load tickets: " + err.message });
  }
});

// POST /api/student/tickets (Create a support ticket)
router.post("/tickets", async (req, res) => {
  try {
    const { category, subject, message, applicationId } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const ticketId = `TCK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;
    const ticket = await Ticket.create({
      ticketId,
      applicationId: applicationId || null,
      studentId: req.student.studentId,
      category: category || "GENERAL_QUERY",
      subject: subject.trim(),
      message: message.trim(),
      status: "OPEN",
      deadline: new Date(Date.now() + 7 * 86400000), // 7 days resolution target
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "TICKET_CREATED",
      entityType: "Ticket",
      entityId: ticketId,
      newValue: { subject, category },
      reason: "Student created support ticket",
      req,
    });

    res.status(201).json({ message: "Support ticket created successfully", ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to create ticket: " + err.message });
  }
});

// POST /api/student/tickets/:id/reply (Student replies to ticket)
router.post("/tickets/:id/reply", async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: "Reply text is required." });
    }

    const ticket = await Ticket.findOne({ ticketId: req.params.id, studentId: req.student.studentId });
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });

    ticket.latestReply = reply.trim();
    ticket.latestReplyAt = new Date();
    ticket.repliedBy = `Student (${req.student.fullName})`;
    ticket.status = "REVIEWING";
    ticket.updatedAt = new Date();
    await ticket.save();

    res.json({ message: "Reply added to ticket", ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to reply to ticket: " + err.message });
  }
});

module.exports = router;
