const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const {
  User,
  Student,
  College,
  Application,
  DocumentVerification,
  EligibilityResult,
  Deficiency,
  StatusHistory,
  Review,
  Notification,
  Scheme,
  SchemeRule,
  Payment,
  Ticket,
} = require("../models");
const { requireAuth, requireRole, verifyCollegeOwnership } = require("../middleware/auth");
const { recordAuditLog } = require("../middleware/audit");
const { generateCollegeExcel, parseStudentImportSpreadsheet } = require("../utils/excelExport");

const router = express.Router();

// Apply auth + college role checks
router.use(requireAuth);
router.use(requireRole("COLLEGE_ADMIN", "COLLEGE_STAFF"));
router.use(verifyCollegeOwnership);

// GET /api/college/stats
router.get("/stats", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;

    const [
      totalStudents,
      totalApplications,
      pending,
      correctionRequired,
      verified,
      readyForSubmission,
      submitted,
    ] = await Promise.all([
      Student.countDocuments({ collegeId }),
      Application.countDocuments({ collegeId }),
      Application.countDocuments({ collegeId, applicationStatus: { $in: ["DRAFT", "SUBMITTED", "COLLEGE_REVIEW"] } }),
      Application.countDocuments({ collegeId, applicationStatus: "CORRECTION_REQUIRED" }),
      Application.countDocuments({ collegeId, documentVerificationStatus: "VERIFIED" }),
      Application.countDocuments({ collegeId, applicationStatus: "COLLEGE_REVIEW", documentVerificationStatus: "VERIFIED" }),
      Application.countDocuments({ collegeId, applicationStatus: { $nin: ["DRAFT"] } }),
    ]);

    const college = await College.findOne({ collegeId }).lean();

    res.json({
      college,
      stats: {
        totalStudents,
        totalApplications,
        pending,
        correctionRequired,
        verified,
        readyForSubmission,
        submitted,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load college stats: " + err.message });
  }
});

// GET /api/college/students (Filterable & Searchable)
router.get("/students", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { department, course, studyYear, academicYear, scheme, status, search } = req.query;

    const filter = { collegeId };

    if (department) filter.department = department;
    if (course) filter.course = course;
    if (studyYear) filter.studyYear = studyYear;
    if (academicYear) filter.academicYear = academicYear;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
        { registerNumber: { $regex: q, $options: "i" } },
      ];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 }).lean();

    // Attach current active application summary and user accountStatus for each student
    const studentIds = students.map(s => s.studentId);
    const userIds = students.map(s => s.userId);
    const appQuery = { studentId: { $in: studentIds } };
    if (scheme) appQuery.schemeId = scheme;
    if (status) appQuery.applicationStatus = status;

    const [apps, users] = await Promise.all([
      Application.find(appQuery).lean(),
      User.find({ userId: { $in: userIds } }).select("userId accountStatus email invitedAt activatedAt").lean(),
    ]);

    const appMap = new Map();
    for (const a of apps) {
      if (!appMap.has(a.studentId)) appMap.set(a.studentId, a);
    }

    const userMap = new Map(users.map(u => [u.userId, u]));

    const merged = students
      .map(s => {
        const activeApp = appMap.get(s.studentId) || null;
        const u = userMap.get(s.userId) || {};
        return {
          ...s,
          accountStatus: u.accountStatus || "ACTIVE",
          invitedAt: u.invitedAt || null,
          activatedAt: u.activatedAt || null,
          activeApplication: activeApp,
          applicationStatus: activeApp ? activeApp.applicationStatus : "NO_APPLICATION",
          eligibilityStatus: activeApp ? activeApp.eligibilityStatus : "PENDING",
          documentVerificationStatus: activeApp ? activeApp.documentVerificationStatus : "PENDING",
          schemeId: activeApp ? activeApp.schemeId : "—",
        };
      })
      .filter(s => {
        if (status && s.applicationStatus !== status) return false;
        if (scheme && s.schemeId !== scheme) return false;
        return true;
      });

    res.json({ students: merged, total: merged.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch college students: " + err.message });
  }
});

// GET /api/college/applications
router.get("/applications", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { status, schemeId, scheme, department, course, academicYear, search } = req.query;

    const filter = { collegeId };
    if (status) filter.applicationStatus = status;
    const activeScheme = schemeId || scheme;
    if (activeScheme) filter.schemeId = activeScheme;
    if (academicYear) filter.academicYear = academicYear;

    if (department || course) {
      const studentQuery = { collegeId };
      if (department) studentQuery.department = department;
      if (course) studentQuery.course = course;
      const matchedStudents = await Student.find(studentQuery).select("studentId").lean();
      const studentIdList = matchedStudents.map((s) => s.studentId);
      filter.studentId = { $in: studentIdList };
    }

    const apps = await Application.find(filter).sort({ submittedAt: -1, createdAt: -1 }).lean();

    // Populate student and scheme names
    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    const schemeIds = [...new Set(apps.map((a) => a.schemeId))];

    const [students, schemes] = await Promise.all([
      Student.find({ studentId: { $in: studentIds } }).lean(),
      Scheme.find({ schemeId: { $in: schemeIds } }).lean(),
    ]);

    const stuMap = new Map(students.map((s) => [s.studentId, s]));
    const schMap = new Map(schemes.map((s) => [s.schemeId, s]));

    let populated = apps.map((a) => ({
      ...a,
      student: stuMap.get(a.studentId) || null,
      scheme: schMap.get(a.schemeId) || null,
    }));

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      populated = populated.filter((a) => {
        const idMatch = a.applicationId && a.applicationId.toLowerCase().includes(q);
        const stuMatch = a.student && a.student.fullName && a.student.fullName.toLowerCase().includes(q);
        const regMatch = a.student && a.student.registerNumber && a.student.registerNumber.toLowerCase().includes(q);
        const schMatch = a.scheme && a.scheme.schemeName && a.scheme.schemeName.toLowerCase().includes(q);
        return idMatch || stuMatch || regMatch || schMatch;
      });
    }

    res.json({ applications: populated, total: populated.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications: " + err.message });
  }
});

// GET /api/college/applications/:id
router.get("/applications/:id", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const app = await Application.findOne({ applicationId: req.params.id, collegeId }).lean();

    if (!app) {
      return res.status(404).json({ error: "Application not found or does not belong to your college." });
    }

    const [student, scheme, verifications, eligibility, deficiencies, reviews, history] = await Promise.all([
      Student.findOne({ studentId: app.studentId }).lean(),
      Scheme.findOne({ schemeId: app.schemeId }).lean(),
      DocumentVerification.find({ applicationId: app.applicationId }).lean(),
      EligibilityResult.findOne({ applicationId: app.applicationId }).lean(),
      Deficiency.find({ applicationId: app.applicationId }).lean(),
      Review.find({ applicationId: app.applicationId }).sort({ createdAt: -1 }).lean(),
      StatusHistory.find({ applicationId: app.applicationId }).sort({ timestamp: 1 }).lean(),
    ]);

    res.json({
      application: app,
      student,
      scheme,
      verifications,
      eligibility,
      deficiencies,
      reviews,
      statusHistory: history,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load application details: " + err.message });
  }
});

// POST /api/college/applications/:id/review (College Staff review decision)
router.post("/applications/:id/review", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { decision, comments, verifiedItems } = req.body;

    if (!decision || !comments) {
      return res.status(400).json({ error: "Review decision and comments are required." });
    }

    const app = await Application.findOne({ applicationId: req.params.id, collegeId });
    if (!app) {
      return res.status(404).json({ error: "Application not found or unauthorized." });
    }

    const reviewId = `REV-COL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const newReview = await Review.create({
      reviewId,
      applicationId: app.applicationId,
      reviewerUserId: req.user.userId,
      reviewerRole: req.user.role,
      collegeId,
      decision,
      comments: comments.trim(),
      verifiedItems: verifiedItems || {},
    });

    const prevStatus = app.applicationStatus;
    let nextStatus = prevStatus;

    if (decision === "VERIFIED") {
      nextStatus = "COLLEGE_REVIEW";
      app.currentStage = "College Verification Approved";
      app.whoMustAct = "College Authority";
      app.nextAction = "Ready to forward to Ministry for final scrutiny";
      app.documentVerificationStatus = "VERIFIED";
    } else if (decision === "CORRECTION_REQUESTED") {
      nextStatus = "CORRECTION_REQUIRED";
      app.currentStage = "Correction Required";
      app.whoMustAct = "Student";
      app.nextAction = "Student must resolve deficiencies and resubmit";
    }

    app.applicationStatus = nextStatus;
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: nextStatus,
      changedBy: req.user.userId,
      changedByRole: req.user.role,
      reason: `College Review: ${decision}. ${comments}`,
      source: "COLLEGE_PORTAL",
    });

    // Notify student
    const student = await Student.findOne({ studentId: app.studentId }).lean();
    if (student) {
      await Notification.create({
        notificationId: `NOTIF-${Date.now()}`,
        userId: student.userId,
        role: "STUDENT",
        title: `College Review: ${decision.replace(/_/g, " ")}`,
        message: comments,
        type: decision === "CORRECTION_REQUESTED" ? "DEFICIENCY" : "INFO",
        link: `/student/status`,
      });
    }

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "COLLEGE_APPLICATION_REVIEWED",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: { status: prevStatus },
      newValue: { status: nextStatus, decision, reviewId },
      reason: comments,
      req,
    });

    res.json({ message: "Review recorded successfully", review: newReview, application: app });
  } catch (err) {
    res.status(500).json({ error: "Review failed: " + err.message });
  }
});

// POST /api/college/applications/:id/deficiency (Issue deficiency)
router.post("/applications/:id/deficiency", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { documentType, type, description, severity } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: "Deficiency type and description are required." });
    }

    const app = await Application.findOne({ applicationId: req.params.id, collegeId });
    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    const student = await Student.findOne({ studentId: app.studentId }).lean();
    if (!student) {
      return res.status(404).json({ error: "Student record not found." });
    }

    const deficiencyId = `DEF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const def = await Deficiency.create({
      deficiencyId,
      applicationId: app.applicationId,
      studentId: app.studentId,
      documentType: documentType || "general",
      type,
      description: description.trim(),
      severity: severity || "HIGH",
      status: "OPEN",
      createdBy: req.user.userId,
      createdByRole: req.user.role,
      assignedTo: student.userId,
    });

    const prevStatus = app.applicationStatus;
    app.applicationStatus = "CORRECTION_REQUIRED";
    app.currentStage = "Correction Required";
    app.whoMustAct = "Student";
    app.nextAction = `Student must resolve deficiency: ${type.replace(/_/g, " ")}`;
    app.openDeficienciesCount = (app.openDeficienciesCount || 0) + 1;
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: "CORRECTION_REQUIRED",
      changedBy: req.user.userId,
      changedByRole: req.user.role,
      reason: `Deficiency Raised (${type}): ${description}`,
      source: "COLLEGE_PORTAL",
    });

    // Notify student
    await Notification.create({
      notificationId: `NOTIF-${Date.now()}`,
      userId: student.userId,
      role: "STUDENT",
      title: "Correction Required for Application",
      message: `${description} (${type.replace(/_/g, " ")})`,
      type: "DEFICIENCY",
      link: `/student/deficiencies`,
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "DEFICIENCY_CREATED",
      entityType: "Deficiency",
      entityId: deficiencyId,
      newValue: def,
      reason: description,
      req,
    });

    res.status(201).json({ message: "Deficiency created and student notified", deficiency: def, application: app });
  } catch (err) {
    res.status(500).json({ error: "Failed to create deficiency: " + err.message });
  }
});

// POST /api/college/applications/:id/forward (Forward to Ministry)
router.post("/applications/:id/forward", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { comments } = req.body;

    const app = await Application.findOne({ applicationId: req.params.id, collegeId });
    if (!app) {
      return res.status(404).json({ error: "Application not found or unauthorized." });
    }

    // Check that there are no open blocking deficiencies
    const openDefCount = await Deficiency.countDocuments({
      applicationId: app.applicationId,
      status: "OPEN",
    });

    if (openDefCount > 0) {
      return res.status(400).json({
        error: `Cannot forward application: ${openDefCount} unresolved deficiency item(s) remain.`,
      });
    }

    const prevStatus = app.applicationStatus;
    app.applicationStatus = "MINISTRY_SCRUTINY";
    app.currentStage = "Ministry Scrutiny Stage";
    app.whoMustAct = "Ministry Official";
    app.nextAction = "Ministry scrutiny and statutory quota verification";
    app.lastUpdatedAt = new Date();
    await app.save();

    await StatusHistory.create({
      historyId: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      applicationId: app.applicationId,
      previousStatus: prevStatus,
      newStatus: "MINISTRY_SCRUTINY",
      changedBy: req.user.userId,
      changedByRole: req.user.role,
      reason: comments || "Institutional verification completed. Forwarded to Ministry.",
      source: "COLLEGE_PORTAL",
    });

    const student = await Student.findOne({ studentId: app.studentId }).lean();
    if (student) {
      await Notification.create({
        notificationId: `NOTIF-${Date.now()}`,
        userId: student.userId,
        role: "STUDENT",
        title: "Application Forwarded to Ministry",
        message: `Your college has verified and forwarded your application ${app.applicationId} to the Ministry for official scrutiny.`,
        type: "INFO",
        link: `/student/status`,
      });
    }

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "APPLICATION_FORWARDED_TO_MINISTRY",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: { status: prevStatus },
      newValue: { status: "MINISTRY_SCRUTINY" },
      reason: comments || "Forwarded to Ministry",
      req,
    });

    res.json({ message: "Application successfully forwarded to Ministry", application: app });
  } catch (err) {
    res.status(500).json({ error: "Forwarding failed: " + err.message });
  }
});

// POST /api/college/students/create (Admin creates/invites student with activation token)
router.post("/students/create", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { email, fullName, mobile, course, department, studyYear, registerNumber, category } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ error: "Email and Full Name are required." });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: "A user with this email already exists." });
    }

    // Cryptographically random single-use activation token (hashed with SHA-256 for DB storage)
    const rawActivationToken = crypto.randomBytes(32).toString("hex");
    const activationTokenHash = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
    const activationTokenExpiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours expiry

    // Generate unguessable placeholder passwordHash so no login is possible until student sets password
    const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

    const userId = `USR-STU-${Date.now().toString().slice(-6)}`;
    const studentId = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      userId,
      email: email.toLowerCase().trim(),
      mobile: mobile || "",
      passwordHash: dummyPasswordHash,
      role: "STUDENT",
      collegeId,
      accountStatus: "INVITED",
      activationTokenHash,
      activationTokenExpiresAt,
      invitedAt: new Date(),
    });

    const newStudent = await Student.create({
      studentId,
      userId,
      collegeId,
      fullName: fullName.trim(),
      category: category || "General",
      state: "Tamil Nadu",
      course: course || "B.E.",
      department: department || "General Engineering",
      studyYear: studyYear || "1st Year",
      registerNumber: registerNumber || `REG-${Date.now().toString().slice(-5)}`,
      admissionYear: new Date().getFullYear(),
      academicYear: "2026-2027",
    });

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "STUDENT_INVITED_BY_COLLEGE",
      entityType: "Student",
      entityId: studentId,
      reason: `College generated account activation invitation for ${email}`,
      req,
    });

    // College Admin NEVER receives or sees student passwords.
    res.status(201).json({
      message: "Student account invited successfully. An account activation link has been generated.",
      student: newStudent,
      invitation: {
        userId,
        email: newUser.email,
        accountStatus: "INVITED",
        invitedAt: newUser.invitedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to invite student: " + err.message });
  }
});

// GET /api/college/export-excel (Strict College Scoped Excel Export)
router.get("/export-excel", async (req, res) => {
  try {
    // STRICT SCOPING: Derive solely from authenticated user. Never trust query parameters.
    const collegeId = req.user.collegeId;
    const college = await College.findOne({ collegeId }).lean();

    const students = await Student.find({ collegeId }).sort({ registerNumber: 1 }).lean();
    const studentIds = students.map((s) => s.studentId);
    const userIds = students.map((s) => s.userId);

    const [users, apps, reviews, verifications, deficiencies, tickets] = await Promise.all([
      User.find({ userId: { $in: userIds } }).select("userId accountStatus").lean(),
      Application.find({ collegeId }).lean(),
      Review.find({ collegeId }).sort({ createdAt: -1 }).lean(),
      DocumentVerification.find({ studentId: { $in: studentIds } }).lean(),
      Deficiency.find({ studentId: { $in: studentIds } }).lean(),
      Ticket.find({ studentId: { $in: studentIds } }).sort({ updatedAt: -1 }).lean(),
    ]);

    const userMap = new Map(users.map((u) => [u.userId, u.accountStatus || "ACTIVE"]));

    const appMap = new Map();
    for (const a of apps) {
      if (!appMap.has(a.studentId)) appMap.set(a.studentId, a);
    }

    const reviewMap = new Map();
    for (const r of reviews) {
      if (!reviewMap.has(r.applicationId)) reviewMap.set(r.applicationId, r);
    }

    const verifMap = new Map();
    for (const v of verifications) {
      const list = verifMap.get(v.applicationId) || [];
      list.push(v);
      verifMap.set(v.applicationId, list);
    }

    const defMap = new Map();
    for (const d of deficiencies) {
      const list = defMap.get(d.applicationId) || [];
      list.push(d);
      defMap.set(d.applicationId, list);
    }

    const ticketMap = new Map();
    for (const t of tickets) {
      if (!ticketMap.has(t.studentId)) ticketMap.set(t.studentId, t);
    }

    const rows = [];
    for (const s of students) {
      const app = appMap.get(s.studentId) || null;
      const appId = app ? app.applicationId : null;
      const appVerifs = appId ? (verifMap.get(appId) || []) : [];
      const appDefs = appId ? (defMap.get(appId) || []) : [];
      const mismatches = appVerifs.filter((v) => v.mismatch).length;
      const pendingDefs = appDefs.filter((d) => d.status === "OPEN").length;

      rows.push({
        student: s,
        application: app,
        accountStatus: userMap.get(s.userId) || "ACTIVE",
        latestReview: appId ? (reviewMap.get(appId) || {}) : {},
        latestTicket: ticketMap.get(s.studentId) || {},
        ocrVerificationStatus: mismatches > 0 ? "FLAGGED" : (appVerifs.length > 0 ? "VERIFIED" : "PENDING"),
        mismatchCount: mismatches,
        pendingCorrection: pendingDefs > 0 ? `Yes (${pendingDefs} item${pendingDefs > 1 ? "s" : ""})` : "No",
      });
    }

    const { buffer, filename, recordCount } = generateCollegeExcel(college, rows);

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "COLLEGE_EXCEL_EXPORTED",
      entityType: "College",
      entityId: collegeId,
      newValue: { exportedCount: recordCount, filename },
      reason: `College Excel export generated for ${college?.collegeName || collegeId}`,
      req,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Export-Records", String(recordCount));
    return res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: "Failed to export college Excel: " + err.message });
  }
});

// GET /api/college/admin-table (Grouped Table Schema with Backend Pagination)
router.get("/admin-table", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const { department, course, studyYear, status, scheme, search } = req.query;

    const studentFilter = { collegeId };
    if (department) studentFilter.department = department;
    if (course) studentFilter.course = course;
    if (studyYear) studentFilter.studyYear = studyYear;

    if (search && search.trim()) {
      const q = search.trim();
      studentFilter.$or = [
        { fullName: { $regex: q, $options: "i" } },
        { studentId: { $regex: q, $options: "i" } },
        { registerNumber: { $regex: q, $options: "i" } },
      ];
    }

    const totalStudents = await Student.countDocuments(studentFilter);
    const students = await Student.find(studentFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const studentIds = students.map((s) => s.studentId);
    const userIds = students.map((s) => s.userId);

    const [users, apps, reviews, verifications, deficiencies, tickets] = await Promise.all([
      User.find({ userId: { $in: userIds } }).select("userId accountStatus").lean(),
      Application.find({ studentId: { $in: studentIds } }).lean(),
      Review.find({ collegeId }).sort({ createdAt: -1 }).lean(),
      DocumentVerification.find({ studentId: { $in: studentIds } }).lean(),
      Deficiency.find({ studentId: { $in: studentIds } }).lean(),
      Ticket.find({ studentId: { $in: studentIds } }).sort({ updatedAt: -1 }).lean(),
    ]);

    const userMap = new Map(users.map((u) => [u.userId, u.accountStatus || "ACTIVE"]));

    const appMap = new Map();
    for (const a of apps) {
      if (!appMap.has(a.studentId)) appMap.set(a.studentId, a);
    }

    const reviewMap = new Map();
    for (const r of reviews) {
      if (!reviewMap.has(r.applicationId)) reviewMap.set(r.applicationId, r);
    }

    const verifMap = new Map();
    for (const v of verifications) {
      const list = verifMap.get(v.applicationId) || [];
      list.push(v);
      verifMap.set(v.applicationId, list);
    }

    const defMap = new Map();
    for (const d of deficiencies) {
      const list = defMap.get(d.applicationId) || [];
      list.push(d);
      defMap.set(d.applicationId, list);
    }

    const ticketMap = new Map();
    for (const t of tickets) {
      if (!ticketMap.has(t.studentId)) ticketMap.set(t.studentId, t);
    }

    const records = students.map((s) => {
      const app = appMap.get(s.studentId) || null;
      const appId = app ? app.applicationId : null;
      const appVerifs = appId ? (verifMap.get(appId) || []) : [];
      const appDefs = appId ? (defMap.get(appId) || []) : [];
      const rev = appId ? (reviewMap.get(appId) || {}) : {};
      const t = ticketMap.get(s.studentId) || {};

      const mismatches = appVerifs.filter((v) => v.mismatch).length;
      const pendingDefs = appDefs.filter((d) => d.status === "OPEN").length;

      return {
        id: s.studentId,
        student: {
          registerNumber: s.registerNumber || "—",
          name: s.fullName,
          course: s.course || "—",
          department: s.department || "—",
          studyYear: s.studyYear || "—",
          accountActivation: userMap.get(s.userId) || "ACTIVE",
        },
        application: {
          scheme: app ? app.schemeId : "—",
          year: app ? (app.applicationYear || app.academicYear || 2026) : "—",
          internalId: app ? app.applicationId : "—",
          externalReference: app ? (app.externalApplicationId || "—") : "—",
        },
        review: {
          uploads: appVerifs.length,
          mismatches,
          reviewer: rev.reviewerUserId ? `${rev.reviewerRole || "Officer"} (${rev.reviewerUserId})` : "Pending",
          pendingCorrection: pendingDefs > 0 ? `Yes (${pendingDefs})` : "No",
        },
        tracking: {
          status: app ? app.applicationStatus : "NOT_APPLIED",
          source: app ? (app.externalPortalSource || "SGP Internal") : "—",
          lastCheckedDate: app ? (app.externalLastChecked || app.lastUpdatedAt || app.createdAt) : null,
          nextAction: app ? (app.nextAction || "—") : "Student registration pending",
        },
        support: {
          ticketOwner: t.ticketOwner || t.assignedTo || "—",
          latestReply: t.latestReply || t.resolution || "—",
          deadline: t.deadline || null,
        },
      };
    });

    // Optional post-filtering if scheme or status filter applied
    let filteredRecords = records;
    if (status) {
      filteredRecords = filteredRecords.filter((r) => r.tracking.status === status);
    }
    if (scheme) {
      filteredRecords = filteredRecords.filter((r) => r.application.scheme === scheme);
    }

    res.json({
      records: filteredRecords,
      total: totalStudents,
      page,
      totalPages: Math.ceil(totalStudents / limit) || 1,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load admin table: " + err.message });
  }
});

// POST /api/college/students/import-preview (Validate student rows before importing)
router.post("/students/import-preview", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    let parsedRows = [];

    if (req.body.fileBase64) {
      const buffer = Buffer.from(req.body.fileBase64, "base64");
      parsedRows = parseStudentImportSpreadsheet(buffer);
    } else if (Array.isArray(req.body.rows)) {
      parsedRows = req.body.rows.map((r, idx) => ({
        rowNum: idx + 1,
        registerNumber: String(r.registerNumber || "").trim(),
        fullName: String(r.fullName || r.name || "").trim(),
        email: String(r.email || "").trim(),
        course: r.course || "B.E. / B.Tech",
        department: r.department || "Computer Science",
        studyYear: r.studyYear || "1st Year",
        mobile: r.mobile || "",
        category: r.category || "General",
        familyIncome: r.familyIncome ? Number(r.familyIncome) : 200000,
        isValid: Boolean(r.registerNumber && r.fullName && r.email && r.email.includes("@")),
        errors: [],
      }));
    } else {
      return res.status(400).json({ error: "Please provide either rows array or fileBase64." });
    }

    // Check duplicate register numbers within the batch itself
    const regCounts = new Map();
    for (const r of parsedRows) {
      if (r.registerNumber) {
        regCounts.set(r.registerNumber, (regCounts.get(r.registerNumber) || 0) + 1);
      }
    }

    // Check existing students in DB for this college
    const existingRegs = await Student.find({
      collegeId,
      registerNumber: { $in: parsedRows.map((r) => r.registerNumber).filter(Boolean) },
    }).select("registerNumber").lean();
    const dbRegSet = new Set(existingRegs.map((e) => e.registerNumber));

    // Check existing users by email
    const existingEmails = await User.find({
      email: { $in: parsedRows.map((r) => r.email.toLowerCase()).filter(Boolean) },
    }).select("email").lean();
    const dbEmailSet = new Set(existingEmails.map((e) => e.email.toLowerCase()));

    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    const previewRows = parsedRows.map((r) => {
      let isDuplicate = false;
      let dupReason = "";

      if ((regCounts.get(r.registerNumber) || 0) > 1) {
        isDuplicate = true;
        dupReason = "Duplicate register number within uploaded file";
      } else if (dbRegSet.has(r.registerNumber)) {
        isDuplicate = true;
        dupReason = "Register number already registered in college";
      } else if (dbEmailSet.has(r.email.toLowerCase())) {
        isDuplicate = true;
        dupReason = "Email already exists in system";
      }

      if (!r.isValid) {
        invalidCount++;
      } else if (isDuplicate) {
        duplicateCount++;
      } else {
        validCount++;
      }

      return {
        ...r,
        isDuplicate,
        dupReason,
        status: !r.isValid ? "INVALID" : isDuplicate ? "DUPLICATE" : "VALID",
      };
    });

    res.json({
      summary: {
        totalRows: parsedRows.length,
        validCount,
        duplicateCount,
        invalidCount,
      },
      previewRows: previewRows.slice(0, 100), // Return preview up to 100 rows
    });
  } catch (err) {
    res.status(500).json({ error: "Preview parsing failed: " + err.message });
  }
});

// POST /api/college/students/import-confirm (Bulk create/invite students)
router.post("/students/import-confirm", requireRole("COLLEGE_ADMIN"), async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const { rows } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided for confirmation." });
    }

    let imported = 0;
    let skipped = 0;
    let duplicate = 0;
    let invalid = 0;
    const createdStudents = [];

    for (const r of rows) {
      const email = String(r.email || "").toLowerCase().trim();
      const registerNumber = String(r.registerNumber || "").trim();
      const fullName = String(r.fullName || "").trim();

      if (!email || !registerNumber || !fullName || !email.includes("@")) {
        invalid++;
        continue;
      }

      // Check if user or student already exists
      const [existingUser, existingStudent] = await Promise.all([
        User.findOne({ email }),
        Student.findOne({ collegeId, registerNumber }),
      ]);

      if (existingUser || existingStudent) {
        duplicate++;
        skipped++;
        continue;
      }

      // Cryptographically random single-use activation token (hashed for storage)
      const rawActivationToken = crypto.randomBytes(32).toString("hex");
      const activationTokenHash = crypto.createHash("sha256").update(rawActivationToken).digest("hex");
      const activationTokenExpiresAt = new Date(Date.now() + 72 * 3600 * 1000); // 72 hours expiry

      // Unguessable placeholder passwordHash so account cannot login until student activates
      const dummyPasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

      const userId = `USR-STU-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5)}`;
      const studentId = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await User.create({
        userId,
        email,
        mobile: r.mobile || "",
        passwordHash: dummyPasswordHash,
        role: "STUDENT",
        collegeId,
        accountStatus: "INVITED",
        activationTokenHash,
        activationTokenExpiresAt,
        invitedAt: new Date(),
      });

      await Student.create({
        studentId,
        userId,
        collegeId,
        fullName,
        category: r.category || "General",
        state: "Tamil Nadu",
        course: r.course || "B.E. / B.Tech",
        department: r.department || "Computer Science",
        studyYear: r.studyYear || "1st Year",
        registerNumber,
        admissionYear: new Date().getFullYear(),
        academicYear: "2026-2027",
        familyIncome: r.familyIncome ? Number(r.familyIncome) : 200000,
      });

      // Track created student metadata without any passwords, hashes, or tokens
      createdStudents.push({
        registerNumber,
        fullName,
        email,
        accountStatus: "INVITED",
      });

      imported++;
    }

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "STUDENTS_BULK_IMPORTED",
      entityType: "College",
      entityId: collegeId,
      newValue: { imported, duplicate, skipped, invalid },
      reason: `Bulk student import by College Admin: ${imported} imported, ${duplicate} duplicates skipped`,
      req,
    });

    // College Admin NEVER receives or sees student passwords.
    // Students set their own passwords through secure account activation.
    res.json({
      message: `Bulk import completed successfully: ${imported} student invitation(s) created. Students will set their own passwords through secure account activation.`,
      imported,
      importedCount: imported,
      skipped,
      duplicate,
      invalid,
      invitationsPending: imported,
      activated: 0,
      createdStudents,
    });
  } catch (err) {
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
});

// POST /api/college/students/:id/resend-invite (College Admin resends student invitation)
router.post("/students/:id/resend-invite", requireRole("COLLEGE_ADMIN"), async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id, collegeId: req.user.collegeId });
    if (!student) {
      return res.status(404).json({ error: "Student not found in your institution." });
    }

    const user = await User.findOne({ userId: student.userId });
    if (!user) {
      return res.status(404).json({ error: "Associated user record not found." });
    }

    if (user.accountStatus === "ACTIVE") {
      return res.status(400).json({ error: "Student account is already active." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const activationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const activationTokenExpiresAt = new Date(Date.now() + 72 * 3600 * 1000);

    user.activationTokenHash = activationTokenHash;
    user.activationTokenExpiresAt = activationTokenExpiresAt;
    user.invitedAt = new Date();
    await user.save();

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "STUDENT_INVITATION_RESENT",
      entityType: "Student",
      entityId: student.studentId,
      reason: `College Admin resent account activation invitation for student ${student.studentId} (${user.email})`,
      req,
    });

    // College Admin NEVER receives the student's password
    res.json({
      message: `Invitation successfully resent to ${user.email}. The student will set their own password upon opening their activation link.`,
      studentId: student.studentId,
      email: user.email,
      accountStatus: user.accountStatus,
      invitedAt: user.invitedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to resend invitation: " + err.message });
  }
});

// POST /api/college/students/:id/reset-password (College Admin initiates password reset invitation)
router.post("/students/:id/reset-password", requireRole("COLLEGE_ADMIN"), async (req, res) => {
  try {
    const student = await Student.findOne({ studentId: req.params.id, collegeId: req.user.collegeId });
    if (!student) {
      return res.status(404).json({ error: "Student not found in your institution." });
    }

    const user = await User.findOne({ userId: student.userId });
    if (!user) {
      return res.status(404).json({ error: "Associated user record not found." });
    }

    // Generate single-use reset token and set account to INVITED so student must set their password
    const rawToken = crypto.randomBytes(32).toString("hex");
    const activationTokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const activationTokenExpiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24h reset expiry

    user.accountStatus = "INVITED";
    user.activationTokenHash = activationTokenHash;
    user.activationTokenExpiresAt = activationTokenExpiresAt;
    user.invitedAt = new Date();
    await user.save();

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "STUDENT_PASSWORD_RESET_INITIATED",
      entityType: "Student",
      entityId: student.studentId,
      reason: `College Admin initiated password reset for student ${student.studentId} (${user.email})`,
      req,
    });

    // Admin NEVER sees student passwords
    res.json({
      message: `Password reset initiated for ${user.email}. The student will set their own password through secure account activation.`,
      studentId: student.studentId,
      email: user.email,
      accountStatus: user.accountStatus,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to initiate password reset: " + err.message });
  }
});

// GET /api/college/tickets (College staff tickets view)
router.get("/tickets", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const students = await Student.find({ collegeId }).select("studentId fullName registerNumber").lean();
    const studentIds = students.map((s) => s.studentId);
    const studentMap = new Map(students.map((s) => [s.studentId, s]));

    const tickets = await Ticket.find({ studentId: { $in: studentIds } }).sort({ updatedAt: -1 }).lean();

    const enriched = tickets.map((t) => ({
      ...t,
      student: studentMap.get(t.studentId) || null,
    }));

    res.json({ tickets: enriched });
  } catch (err) {
    res.status(500).json({ error: "Failed to load tickets: " + err.message });
  }
});

// POST /api/college/tickets/:id/reply (Reply to support ticket)
router.post("/tickets/:id/reply", async (req, res) => {
  try {
    const { reply, status, deadline } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: "Reply text is required." });
    }

    const ticket = await Ticket.findOne({ ticketId: req.params.id });
    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    // Verify student belongs to this college
    const student = await Student.findOne({ studentId: ticket.studentId, collegeId: req.user.collegeId });
    if (!student) {
      return res.status(403).json({ error: "Unauthorized access to this ticket." });
    }

    ticket.latestReply = reply.trim();
    ticket.latestReplyAt = new Date();
    ticket.repliedBy = `${req.user.role} (${req.user.userId})`;
    ticket.ticketOwner = req.user.userId;
    if (status) ticket.status = status;
    if (deadline) ticket.deadline = new Date(deadline);
    ticket.updatedAt = new Date();
    await ticket.save();

    await Notification.create({
      notificationId: `NOTIF-${Date.now()}`,
      userId: student.userId,
      role: "STUDENT",
      title: "Support Ticket Update",
      message: `Your college staff replied: "${reply.trim().substring(0, 100)}..."`,
      type: "INFO",
      link: "/student/tickets",
    });

    res.json({ message: "Ticket reply saved", ticket });
  } catch (err) {
    res.status(500).json({ error: "Failed to reply to ticket: " + err.message });
  }
});

// GET /api/college/analytics (Advanced Server-Side Aggregations for SIH26239 Phase 1 & 3)
router.get("/analytics", async (req, res) => {
  try {
    const collegeId = req.user.collegeId;
    const {
      schemeId,
      academicYear,
      department,
      course,
      reviewerId,
      status,
      startDate,
      endDate,
      dateFilterType = "submissionDate",
    } = req.query;

    const appFilter = { collegeId };
    if (schemeId) appFilter.schemeId = schemeId;
    if (academicYear) appFilter.academicYear = academicYear;
    if (status) appFilter.applicationStatus = status;
    if (reviewerId) appFilter.assignedReviewerId = reviewerId;

    if (startDate || endDate) {
      const dateField = dateFilterType === "decisionDate" ? "collegeVerifiedAt" : "submittedAt";
      appFilter[dateField] = {};
      if (startDate) appFilter[dateField].$gte = new Date(startDate);
      if (endDate) appFilter[dateField].$lte = new Date(endDate);
    }

    if (department || course) {
      const studentQuery = { collegeId };
      if (department) studentQuery.department = department;
      if (course) studentQuery.course = course;
      const matchedStudents = await Student.find(studentQuery).select("studentId").lean();
      const studentIdList = matchedStudents.map((s) => s.studentId);
      appFilter.studentId = { $in: studentIdList };
    }

    const [
      totalRegisteredStudents,
      activatedStudentAccounts,
      totalSubmittedApps,
      pendingCorrections,
      collegeReviews,
      selectionsCount,
      paidConfirmedApps,
      matchingApplications,
      deficienciesList,
      studentsList,
      schemeRules,
    ] = await Promise.all([
      Student.countDocuments({ collegeId }),
      User.countDocuments({ collegeId, role: "STUDENT", accountStatus: "ACTIVE" }),
      Application.countDocuments({ ...appFilter, applicationStatus: { $nin: ["DRAFT"] } }),
      Application.countDocuments({ ...appFilter, applicationStatus: "CORRECTION_REQUIRED" }),
      Application.countDocuments({ ...appFilter, applicationStatus: "COLLEGE_REVIEW" }),
      Application.countDocuments({ ...appFilter, applicationStatus: { $in: ["SELECTED", "SANCTIONED", "PAID"] } }),
      Application.countDocuments({ ...appFilter, applicationStatus: "PAID" }),
      Application.find(appFilter).lean(),
      Deficiency.find({ applicationId: { $in: await Application.find({ collegeId }).distinct("applicationId") } }).lean(),
      Student.find({ collegeId }).select("studentId department course fullName").lean(),
      SchemeRule.find({}).lean(),
    ]);

    const studentMap = new Map(studentsList.map((s) => [s.studentId, s]));

    // Application Stage Bar Data
    const STAGES = [
      { key: "DRAFT", label: "Draft" },
      { key: "SUBMITTED", label: "Submitted" },
      { key: "COLLEGE_REVIEW", label: "College Review" },
      { key: "CORRECTION_REQUIRED", label: "Correction Required" },
      { key: "MINISTRY_SCRUTINY", label: "Ministry Scrutiny" },
      { key: "SELECTED", label: "Selected" },
      { key: "SANCTIONED", label: "Sanctioned" },
      { key: "PAID", label: "Paid Confirmed" },
      { key: "CONTINUATION", label: "Continuation" },
    ];

    // Ensure no status present in matching applications is omitted or hidden
    const knownStageKeys = new Set(STAGES.map((s) => s.key));
    for (const app of matchingApplications) {
      if (app.applicationStatus && !knownStageKeys.has(app.applicationStatus)) {
        const formattedLabel = app.applicationStatus
          .toLowerCase()
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        STAGES.push({ key: app.applicationStatus, label: formattedLabel });
        knownStageKeys.add(app.applicationStatus);
      }
    }

    const stageCounts = STAGES.map((st) => {
      const count = matchingApplications.filter((a) => a.applicationStatus === st.key).length;
      return {
        stageKey: st.key,
        stageLabel: st.label,
        stageName: st.label,
        count,
        percentage: totalSubmittedApps > 0 ? Math.round((count / totalSubmittedApps) * 100) : 0,
      };
    });

    // Department & Course Breakdown
    const deptMap = {};
    for (const app of matchingApplications) {
      const stu = studentMap.get(app.studentId);
      const dept = stu?.department || "General / Unassigned";
      const crs = stu?.course || "UG / Other";
      if (!deptMap[dept]) deptMap[dept] = { department: dept, total: 0, courses: {} };
      deptMap[dept].total++;
      deptMap[dept].courses[crs] = (deptMap[dept].courses[crs] || 0) + 1;
    }
    const departmentComparison = Object.values(deptMap)
      .map((d) => ({
        department: d.department,
        count: d.total,
        percentage: matchingApplications.length > 0 ? Math.round((d.total / matchingApplications.length) * 100) : 0,
        courses: Object.entries(d.courses).map(([courseName, count]) => ({ courseName, count })),
      }))
      .sort((a, b) => b.count - a.count);

    // Common Deficiency Reasons (Separating correction requests from statutory rejections)
    const defTypeMap = {};
    const rejectionMap = {};
    for (const def of deficienciesList) {
      const type = def.type || "OTHER";
      if (def.severity === "CRITICAL" || def.status === "REJECTED") {
        rejectionMap[type] = (rejectionMap[type] || 0) + 1;
      } else {
        defTypeMap[type] = (defTypeMap[type] || 0) + 1;
      }
    }
    const totalDeficiencies = deficienciesList.length;
    const deficiencyReasons = Object.entries(defTypeMap)
      .map(([type, count]) => ({
        reasonKey: type,
        reasonLabel: type.replace(/_/g, " "),
        count,
        percentage: totalDeficiencies > 0 ? Math.round((count / totalDeficiencies) * 100) : 0,
        category: "Correction Required",
      }))
      .sort((a, b) => b.count - a.count);

    const officialRejectionReasons = Object.entries(rejectionMap)
      .map(([type, count]) => ({
        reasonKey: type,
        reasonLabel: type.replace(/_/g, " "),
        count,
        category: "Official Rejection",
      }))
      .sort((a, b) => b.count - a.count);

    // Review Durations (Hours & Days)
    const completedDurationsHours = [];
    for (const app of matchingApplications) {
      if (app.collegeVerifiedAt && app.submittedAt) {
        const diffMs = new Date(app.collegeVerifiedAt).getTime() - new Date(app.submittedAt).getTime();
        if (diffMs > 0) completedDurationsHours.push(diffMs / (1000 * 3600));
      }
    }
    let avgReviewTimeHours = null;
    let medianReviewTimeHours = null;
    if (completedDurationsHours.length > 0) {
      completedDurationsHours.sort((a, b) => a - b);
      const sum = completedDurationsHours.reduce((acc, v) => acc + v, 0);
      avgReviewTimeHours = Math.round((sum / completedDurationsHours.length) * 10) / 10;
      const mid = Math.floor(completedDurationsHours.length / 2);
      medianReviewTimeHours =
        completedDurationsHours.length % 2 !== 0
          ? Math.round(completedDurationsHours[mid] * 10) / 10
          : Math.round(((completedDurationsHours[mid - 1] + completedDurationsHours[mid]) / 2) * 10) / 10;
    }

    // Waiting Age Buckets (0–3, 4–7, 8–14, >14 days) - Strictly Waiting Duration, NOT Automatic Overdue
    const openCases = matchingApplications.filter((a) =>
      ["SUBMITTED", "COLLEGE_REVIEW", "CORRECTION_REQUIRED"].includes(a.applicationStatus)
    );
    const ageBuckets = {
      "0-3": { bucketKey: "0-3", label: "0–3 Days", min: 0, max: 3, count: 0, applicationIds: [] },
      "4-7": { bucketKey: "4-7", label: "4–7 Days", min: 4, max: 7, count: 0, applicationIds: [] },
      "8-14": { bucketKey: "8-14", label: "8–14 Days", min: 8, max: 14, count: 0, applicationIds: [] },
      "14+": { bucketKey: "14+", label: "Over 14 Days", min: 15, max: Infinity, count: 0, applicationIds: [] },
    };
    let totalPendingAgeDays = 0;
    const now = Date.now();
    for (const app of openCases) {
      const refDate = app.submittedAt ? new Date(app.submittedAt).getTime() : new Date(app.createdAt).getTime();
      const ageDays = Math.max(0, Math.floor((now - refDate) / (1000 * 86400)));
      totalPendingAgeDays += ageDays;

      if (ageDays <= 3) {
        ageBuckets["0-3"].count++;
        ageBuckets["0-3"].applicationIds.push(app.applicationId);
      } else if (ageDays <= 7) {
        ageBuckets["4-7"].count++;
        ageBuckets["4-7"].applicationIds.push(app.applicationId);
      } else if (ageDays <= 14) {
        ageBuckets["8-14"].count++;
        ageBuckets["8-14"].applicationIds.push(app.applicationId);
      } else {
        ageBuckets["14+"].count++;
        ageBuckets["14+"].applicationIds.push(app.applicationId);
      }
    }
    const avgPendingAgeDays =
      openCases.length > 0 ? Math.round((totalPendingAgeDays / openCases.length) * 10) / 10 : null;

    // Weekly Submissions & Completed Reviews Trend (8 Weeks)
    const weeklyData = [];
    const oneWeekMs = 7 * 24 * 3600 * 1000;
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now - (i + 1) * oneWeekMs);
      const weekEnd = new Date(now - i * oneWeekMs);
      const startStr = weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const endStr = new Date(weekEnd.getTime() - 1).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const weekLabel = `${startStr} – ${endStr}`;

      const submissions = matchingApplications.filter((a) => {
        if (!a.submittedAt) return false;
        const d = new Date(a.submittedAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      const reviewsCompleted = matchingApplications.filter((a) => {
        if (!a.collegeVerifiedAt) return false;
        const d = new Date(a.collegeVerifiedAt);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeklyData.push({
        weekLabel,
        weekIndex: 8 - i,
        submissions,
        reviewsCompleted,
        series1: submissions,
        series2: reviewsCompleted,
      });
    }

    // Reviewer Workload & Overdue Cases (Overdue calculated STRICTLY against applicable configured deadline)
    const ruleMap = new Map(schemeRules.map((sr) => [sr.schemeId, sr]));
    const reviewerWorkloadMap = {};
    for (const app of matchingApplications) {
      const revId = app.assignedReviewerId || "UNASSIGNED";
      const revName = app.assignedReviewerName || (revId === "UNASSIGNED" ? "Institutional Pool (Unassigned)" : revId);
      if (!reviewerWorkloadMap[revId]) {
        reviewerWorkloadMap[revId] = {
          reviewerId: revId,
          reviewerName: revName,
          assignedCount: 0,
          completedReviews: 0,
          pendingReviews: 0,
          overdueCases: 0,
        };
      }
      reviewerWorkloadMap[revId].assignedCount++;
      if (
        app.collegeVerifiedAt ||
        ["MINISTRY_SCRUTINY", "SELECTED", "SANCTIONED", "PAID"].includes(app.applicationStatus)
      ) {
        reviewerWorkloadMap[revId].completedReviews++;
      } else if (["SUBMITTED", "COLLEGE_REVIEW", "CORRECTION_REQUIRED"].includes(app.applicationStatus)) {
        reviewerWorkloadMap[revId].pendingReviews++;
        const rule = ruleMap.get(app.schemeId);
        const colDeadline = rule?.deadlines?.collegeVerificationDeadline
          ? new Date(rule.deadlines.collegeVerificationDeadline).getTime()
          : null;
        // Overdue status applies ONLY if a valid deadline is configured and has passed
        if (colDeadline && now > colDeadline) {
          reviewerWorkloadMap[revId].overdueCases++;
        }
      }
    }
    const reviewerWorkload = Object.values(reviewerWorkloadMap);

    // Upcoming Deadlines (Showing 'Deadline not configured' if unconfigured)
    const deadlinesList = schemeRules.map((sr) => {
      const appDeadline = sr.deadlines?.applicationDeadline ? new Date(sr.deadlines.applicationDeadline) : null;
      const colDeadline = sr.deadlines?.collegeVerificationDeadline ? new Date(sr.deadlines.collegeVerificationDeadline) : null;
      const daysLeft = colDeadline ? Math.ceil((colDeadline.getTime() - now) / (1000 * 86400)) : null;
      return {
        schemeId: sr.schemeId,
        ruleVersion: sr.ruleVersion || "2026.1",
        applicationDeadline: appDeadline,
        collegeVerificationDeadline: colDeadline,
        deadlineStatus: colDeadline ? (daysLeft < 0 ? "Overdue" : `${daysLeft} days remaining`) : "Deadline not configured",
        daysRemaining: daysLeft,
        isOverdue: daysLeft !== null && daysLeft < 0,
      };
    });

    const completedCollegeReviewsCount = matchingApplications.filter(
      (a) => a.collegeVerifiedAt || ["MINISTRY_SCRUTINY", "SELECTED", "SANCTIONED", "PAID", "COLLEGE_VERIFIED"].includes(a.applicationStatus)
    ).length;

    res.json({
      metadata: {
        lastUpdatedAt: new Date(),
        dataSource: "College Institutional Database",
        collegeId,
        sampleSize: matchingApplications.length,
        isDemoData: false,
        dateFilterType,
        metricDefinitions: {
          reviewCompletionRate: "Completed required reviews / applications requiring review (%)",
          averageReviewTime: "Total completed-review duration / completed reviews (hours)",
          averagePendingAge: "Total current age of open cases / open cases (days)",
          activationRate: "Activated student accounts / Total registered students (%)",
        },
      },
      summary: {
        totalRegisteredStudents,
        activatedStudentAccounts,
        activationRate:
          totalRegisteredStudents > 0
            ? Math.round((activatedStudentAccounts / totalRegisteredStudents) * 100)
            : 0,
        totalSubmittedApps,
        pendingCorrections,
        collegeReviews,
        completedCollegeReviews: completedCollegeReviewsCount,
        selectionsCount,
        paidConfirmedApps,
      },
      summaryCards: {
        registeredStudents: {
          total: totalRegisteredStudents,
          activeAccounts: activatedStudentAccounts,
          invitedAccounts: Math.max(0, totalRegisteredStudents - activatedStudentAccounts),
        },
        submittedApplications: {
          total: totalSubmittedApps,
        },
        pendingCorrections: {
          total: pendingCorrections,
        },
        collegeReviewsCompleted: {
          total: completedCollegeReviewsCount,
          completed: completedCollegeReviewsCount,
          pending: collegeReviews,
          completionRate: totalSubmittedApps > 0 ? Math.round((completedCollegeReviewsCount / totalSubmittedApps) * 100) : 0,
        },
        selections: {
          total: selectionsCount,
          selectionRate: totalSubmittedApps > 0 ? Math.round((selectionsCount / totalSubmittedApps) * 100) : 0,
        },
        confirmedPayments: {
          amount: paidConfirmedApps * 54000,
          studentCount: paidConfirmedApps,
          coverageRate: totalSubmittedApps > 0 ? Math.round((paidConfirmedApps / totalSubmittedApps) * 100) : 0,
        },
      },
      stageCounts,
      applicationStageDistribution: stageCounts,
      departmentComparison,
      departmentDistribution: departmentComparison.map((d) => ({ deptName: d.department, count: d.count })),
      deficiencyReasons,
      commonDeficiencyReasons: deficiencyReasons.map((r) => ({ reason: r.reasonKey, count: r.count })),
      reviewTimeMetrics: {
        completedCount: completedDurationsHours.length,
        averageHours: avgReviewTimeHours,
        averageDays: avgReviewTimeHours !== null ? Math.round((avgReviewTimeHours / 24) * 10) / 10 : null,
        medianHours: medianReviewTimeHours,
        medianDays: medianReviewTimeHours !== null ? Math.round((medianReviewTimeHours / 24) * 10) / 10 : null,
      },
      reviewDurations: {
        averageDays: avgReviewTimeHours !== null ? Math.round((avgReviewTimeHours / 24) * 10) / 10 : null,
        medianDays: medianReviewTimeHours !== null ? Math.round((medianReviewTimeHours / 24) * 10) / 10 : null,
      },
      ageBuckets: {
        openCasesCount: openCases.length,
        averageAgeDays: avgPendingAgeDays,
        buckets: Object.values(ageBuckets),
      },
      pendingAgeBuckets: {
        openCasesCount: openCases.length,
        averageAgeDays: avgPendingAgeDays,
        buckets: Object.values(ageBuckets),
      },
      weeklyTrend: weeklyData,
      weeklyTrends: {
        weeks: weeklyData.map((w) => ({
          week: w.weekLabel,
          weekLabel: w.weekLabel,
          submissions: w.submissions,
          reviewsCompleted: w.reviewsCompleted,
          series1: w.submissions,
          series2: w.reviewsCompleted,
        })),
      },
      reviewerWorkload: reviewerWorkload.map((rw) => ({
        reviewerId: rw.reviewerId,
        reviewerName: rw.reviewerName,
        assignedCount: rw.assignedCount,
        completedCount: rw.completedReviews,
        pendingCount: rw.pendingReviews,
        overdueCount: rw.overdueCases,
      })),
      upcomingDeadlines: deadlinesList.map((dl) => ({
        event: "College Verification Deadline",
        schemeId: dl.schemeId,
        date: dl.collegeVerificationDeadline,
        daysLeft: dl.daysRemaining,
        status: dl.isOverdue ? "Overdue" : dl.daysRemaining <= 15 ? "Approaching" : "Normal",
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load college analytics: " + err.message });
  }
});

// POST /api/college/applications/:id/assign-reviewer (Phase 4: Reviewer Assignment)
router.post("/applications/:id/assign-reviewer", async (req, res) => {
  try {
    const { reviewerId, reviewerName, reviewerRole = "COLLEGE_STAFF", reason } = req.body;
    if (!reviewerId) {
      return res.status(400).json({ error: "reviewerId is required." });
    }

    const app = await Application.findOne({ applicationId: req.params.id, collegeId: req.user.collegeId });
    if (!app) {
      return res.status(404).json({ error: "Application not found in your institution." });
    }

    const prevReviewer = app.assignedReviewerId || "Unassigned";
    app.assignedReviewerId = reviewerId;
    app.assignedReviewerName = reviewerName || reviewerId;
    app.assignedReviewerRole = reviewerRole;
    app.reassignmentReason = reason || "Institutional workload balance";
    app.reassignedAt = new Date();
    await app.save();

    await recordAuditLog({
      actorUserId: req.user.userId,
      actorRole: req.user.role,
      action: "APPLICATION_REVIEWER_REASSIGNED",
      entityType: "Application",
      entityId: app.applicationId,
      oldValue: { reviewerId: prevReviewer },
      newValue: { reviewerId, reason: app.reassignmentReason },
      reason: `College Admin reassigned application to ${reviewerName || reviewerId}: ${app.reassignmentReason}`,
      req,
    });

    res.json({
      message: `Application successfully assigned to ${reviewerName || reviewerId}.`,
      applicationId: app.applicationId,
      assignedReviewerId: app.assignedReviewerId,
      assignedReviewerName: app.assignedReviewerName,
      application: app,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign reviewer: " + err.message });
  }
});

// GET /api/college/applications/:id/document-versions/:docType (Phase 4: Document Version Comparison)
router.get("/applications/:id/document-versions/:docType", async (req, res) => {
  try {
    const app = await Application.findOne({ applicationId: req.params.id, collegeId: req.user.collegeId });
    if (!app) {
      return res.status(404).json({ error: "Application not found in your institution." });
    }

    const docVerification = await DocumentVerification.findOne({
      applicationId: app.applicationId,
      documentType: req.params.docType,
    }).lean();

    if (!docVerification) {
      return res.status(404).json({ error: "No document verification record found for this type." });
    }

    const versions = docVerification.versionHistory || [];

    res.json({
      applicationId: app.applicationId,
      documentType: req.params.docType,
      currentVersion: docVerification.version || 1,
      extractedFields: docVerification.extractedFields || {},
      confidence: docVerification.confidence || 0,
      verificationStatus: docVerification.verificationStatus,
      processedAt: docVerification.processedAt,
      versions,
      versionHistory: versions,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch document versions: " + err.message });
  }
});

module.exports = router;
