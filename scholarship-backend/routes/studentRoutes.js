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
  try {
    const studentObj = req.student
      ? (typeof req.student.toObject === "function" ? req.student.toObject() : { ...req.student })
      : {};
    if (req.user) {
      studentObj.email = req.user.email;
      studentObj.mobile = req.user.mobile || studentObj.mobile || "";
    }
    res.json({ student: studentObj });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve student profile: " + err.message });
  }
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

// POST /api/student/applications/:id/lifecycle-status (Student Manual Selection Change with Automated Admin Sync)
router.post("/applications/:id/lifecycle-status", async (req, res) => {
  try {
    const { lifecycleStage, stageLabel, note, nextAction, whoMustAct } = req.body;

    const VALID_LIFECYCLE_STAGES = [
      "DRAFT",
      "DOCUMENT_VERIFICATION",
      "ELIGIBILITY_CONFIRMED",
      "COLLEGE_REVIEW",
      "CORRECTION_REQUIRED",
      "MINISTRY_SCRUTINY",
      "SELECTION",
      "SANCTIONED",
      "PAID",
      "COMPLETED",
    ];

    // Normalize friendly aliases (e.g. IN_PROCESS -> COLLEGE_REVIEW, DOCUMENT_ISSUES -> CORRECTION_REQUIRED, PROCESS -> COMPLETED)
    let normalized = lifecycleStage;
    if (lifecycleStage === "IN_PROCESS" || lifecycleStage === "IN_PROGRESS") {
      normalized = "COLLEGE_REVIEW";
    } else if (lifecycleStage === "DOCUMENT_ISSUES" || lifecycleStage === "DOCUMENT_ISSUE" || lifecycleStage === "CORRECTION") {
      normalized = "CORRECTION_REQUIRED";
    } else if (lifecycleStage === "PROCESS" || lifecycleStage === "PROCESSED") {
      normalized = "SANCTIONED";
    }

    if (!normalized || !VALID_LIFECYCLE_STAGES.includes(normalized)) {
      return res.status(400).json({
        error: `Invalid lifecycle stage. Must be one of: ${VALID_LIFECYCLE_STAGES.join(", ")} or aliases (IN_PROCESS, DOCUMENT_ISSUES, PROCESS)`,
      });
    }

    const STAGE_LABELS = {
      DRAFT: "Application Created",
      DOCUMENT_VERIFICATION: "Documents Uploaded & OCR",
      ELIGIBILITY_CONFIRMED: "Eligibility Pre-Check",
      COLLEGE_REVIEW: "College Verification (In Process)",
      CORRECTION_REQUIRED: "Document Issues / Correction Required",
      MINISTRY_SCRUTINY: "Ministry Scrutiny (In Process)",
      SELECTION: "Selection Committee Evaluation",
      SANCTIONED: "Award & Sanction (Processed)",
      PAID: "DBT Payment Credit (Processed)",
      COMPLETED: "Renewal / Completion (Processed)",
    };

    const DEFAULT_WHO_MUST_ACT = {
      DRAFT: "Student",
      DOCUMENT_VERIFICATION: "Student / College Verifier",
      ELIGIBILITY_CONFIRMED: "Eligibility Verification Cell",
      COLLEGE_REVIEW: "College Verification Officer",
      CORRECTION_REQUIRED: "Student (Resolve Document Issues)",
      MINISTRY_SCRUTINY: "Ministry Scrutiny Committee",
      SELECTION: "Selection Committee",
      SANCTIONED: "Sanctioning Authority",
      PAID: "PFMS / Bank DBT Cell",
      COMPLETED: "Student / Institution",
    };

    const DEFAULT_NEXT_ACTION = {
      DRAFT: "Complete document upload and submit application",
      DOCUMENT_VERIFICATION: "Verify OCR certificate extractions and bonafide credentials",
      ELIGIBILITY_CONFIRMED: "Proceed to institutional college-level verification",
      COLLEGE_REVIEW: "College committee visual certificate check and bonafide sign-off",
      CORRECTION_REQUIRED: "Student must re-upload flagged document and resubmit",
      MINISTRY_SCRUTINY: "State/Ministry scrutiny officer verifies institutional recommendation",
      SELECTION: "Selection committee evaluates merit ranking and quota",
      SANCTIONED: "Generate formal award letter and sanction order",
      PAID: "Direct Benefit Transfer credit via NPCI Aadhaar-seeded bank account",
      COMPLETED: "Application cycle completed. Track renewal period.",
    };

    const app = await Application.findOne({
      applicationId: req.params.id,
      studentId: req.student.studentId,
    });

    if (!app) {
      return res.status(404).json({ error: "Application not found or unauthorized." });
    }

    const prevStatus = app.lifecycleStage || app.applicationStatus;
    const resolvedLabel = (stageLabel && stageLabel.trim()) || STAGE_LABELS[normalized] || normalized;
    const resolvedWho = (whoMustAct && whoMustAct.trim()) || DEFAULT_WHO_MUST_ACT[normalized] || app.whoMustAct;
    const resolvedNext = (nextAction && nextAction.trim()) || DEFAULT_NEXT_ACTION[normalized] || app.nextAction;
    const now = new Date();

    app.lifecycleStage = normalized;
    app.applicationStatus = normalized;
    app.currentStage = resolvedLabel;
    app.whoMustAct = resolvedWho;
    app.nextAction = resolvedNext;
    app.lifecycleNote = (note && note.trim()) || `Manual student selection: ${resolvedLabel}`;
    app.lifecycleLastUpdated = now;
    app.lifecycleUpdatedBy = req.user.userId;
    app.lifecycleUpdatedByRole = "STUDENT";
    app.lastUpdatedAt = now;

    // If Document Issues / Correction Required, ensure open deficiency is flagged
    if (normalized === "CORRECTION_REQUIRED") {
      const existingDef = await Deficiency.findOne({ applicationId: app.applicationId, status: "OPEN" });
      if (!existingDef) {
        await Deficiency.create({
          deficiencyId: `DEF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          applicationId: app.applicationId,
          studentId: req.student.studentId,
          type: "DATA_MISMATCH",
          documentType: "marksheet",
          severity: "HIGH",
          description: (note && note.trim()) || "Document issues flagged: discrepancy in uploaded certificate or credentials requiring student re-submission.",
          status: "OPEN",
          createdBy: req.user.userId,
          createdByRole: "STUDENT",
          assignedTo: req.student.studentId,
        });
      }
      app.openDeficienciesCount = 1;
    }

    await app.save();

    // 1. Audit status history
    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: normalized,
      changedBy: req.user.userId,
      changedByRole: "STUDENT",
      reason: (note && note.trim()) || `Manual status selection to ${resolvedLabel} (Automated Admin Portal Sync)`,
      source: "STUDENT_MANUAL_SELECTION",
      timestamp: now,
    });

    // 2. Automated sync ticket in Ticket collection so it immediately appears in Admin Portal (College & Ministry Support Tickets)
    try {
      const count = await Ticket.countDocuments({ requestType: "STATUS_UPDATE_REQUEST" });
      const ticketId = `SGP-STATUS-${String(count + 1).padStart(4, "0")}`;
      await Ticket.create({
        ticketId,
        applicationId: app.applicationId,
        studentId: req.student.studentId,
        category: "Application Status",
        subject: `Manual Lifecycle Update: ${resolvedLabel} (${app.applicationId})`,
        message: (note && note.trim()) || `Student selected lifecycle status: ${resolvedLabel}. Synced automatically to Admin Portal.`,
        requestType: "STATUS_UPDATE_REQUEST",
        issueType: normalized === "CORRECTION_REQUIRED" ? "Document Issues" : (["COLLEGE_REVIEW", "MINISTRY_SCRUTINY"].includes(normalized) ? "In Process" : "Process / Completed"),
        officialStatusAtSubmission: normalized,
        status: "OPEN",
        replies: [
          {
            replyId: `REP-${Date.now()}-1`,
            sender: req.student.fullName || "Student",
            senderRole: "STUDENT",
            message: (note && note.trim()) || `Automated status update: ${resolvedLabel}`,
            timestamp: now,
          },
        ],
        deadline: new Date(Date.now() + 7 * 86400000),
      });
    } catch (tktErr) {
      console.warn("Could not create ticket for manual status update:", tktErr.message);
    }

    // 3. System Notification for College and Student
    await Notification.create({
      notificationId: `NOTIF-${Date.now()}`,
      userId: req.user.userId,
      role: "STUDENT",
      title: "Lifecycle Status Updated",
      message: `Your application ${app.applicationId} status has been updated to "${resolvedLabel}" and automatically synced with your College Admin Portal.`,
      type: "INFO",
      link: "/student/status",
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: "STUDENT_MANUAL_LIFECYCLE_UPDATE",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: { status: prevStatus },
      newValue: { status: normalized, currentStage: resolvedLabel },
      reason: "Student manual selection with automated admin sync",
      req,
    });

    res.json({
      message: `Lifecycle status successfully updated to "${resolvedLabel}" and synced with Admin Portal.`,
      application: app,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update lifecycle status: " + err.message });
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

// GET /api/student/tickets/:id (Get single ticket details)
router.get("/tickets/:id", async (req, res) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.id, studentId: req.student.studentId }).lean();
    if (!ticket) return res.status(404).json({ error: "Ticket not found." });
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to load ticket: " + err.message });
  }
});

// POST /api/student/tickets (Create a support ticket)
router.post("/tickets", async (req, res) => {
  try {
    const { category, subject, message, applicationId, requestType, issueType, officialStatusAtSubmission } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "Subject and message are required." });
    }

    const isStatusRequest = requestType === "STATUS_UPDATE_REQUEST";
    const prefix = isStatusRequest ? "SGP-STATUS" : "SGP-TKT";

    const count = await Ticket.countDocuments(isStatusRequest ? { requestType: "STATUS_UPDATE_REQUEST" } : { requestType: { $ne: "STATUS_UPDATE_REQUEST" } });
    let ticketId = `${prefix}-${String(count + 1).padStart(4, "0")}`;
    const exists = await Ticket.findOne({ ticketId });
    if (exists) {
      ticketId = `${prefix}-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    }

    const ticket = await Ticket.create({
      ticketId,
      applicationId: applicationId || null,
      studentId: req.student.studentId,
      category: isStatusRequest ? (category || "Application Status") : (category || "Scholarship Query"),
      subject: subject.trim(),
      message: message.trim(),
      requestType: isStatusRequest ? "STATUS_UPDATE_REQUEST" : "SUPPORT_TICKET",
      issueType: issueType || null,
      officialStatusAtSubmission: officialStatusAtSubmission || null,
      status: "OPEN",
      replies: [
        {
          replyId: `REP-${Date.now()}-1`,
          sender: req.student.fullName || "Student",
          senderRole: "STUDENT",
          message: message.trim(),
          timestamp: new Date(),
        },
      ],
      deadline: new Date(Date.now() + 7 * 86400000), // 7 days resolution target
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: "STUDENT",
      action: isStatusRequest ? "STATUS_UPDATE_REQUEST_CREATED" : "TICKET_CREATED",
      entityType: "Ticket",
      entityId: ticketId,
      newValue: { subject, category: ticket.category, requestType: ticket.requestType, issueType: ticket.issueType },
      reason: isStatusRequest ? "Student requested status update / reported status issue" : "Student created support ticket",
      req,
    });

    res.status(201).json({ message: isStatusRequest ? "Status update request submitted successfully" : "Ticket submitted successfully", ticket });
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

    if (!Array.isArray(ticket.replies)) {
      ticket.replies = [];
    }

    const replyObj = {
      replyId: `REP-${Date.now()}-${Math.floor(10 + Math.random() * 90)}`,
      sender: req.student.fullName || "Student",
      senderRole: "STUDENT",
      message: reply.trim(),
      timestamp: new Date(),
    };
    ticket.replies.push(replyObj);
    ticket.latestReply = reply.trim();
    ticket.latestReplyAt = new Date();
    ticket.repliedBy = `Student (${req.student.fullName})`;
    ticket.status = "WAITING_FOR_AUTHORITY";
    ticket.updatedAt = new Date();
    await ticket.save();

    res.json({ message: "Reply added to ticket", ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to reply to ticket: " + err.message });
  }
});

module.exports = router;
