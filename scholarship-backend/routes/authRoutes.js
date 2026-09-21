const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Student, College } = require("../models");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const { recordAuditLog } = require("../middleware/audit");

const router = express.Router();

// POST /api/auth/register (Student Self-Registration)
router.post("/register", async (req, res) => {
  try {
    const { email, password, fullName, mobile, collegeId, course, department, studyYear, registerNumber, category, state, district, familyIncome } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: "Email, password, and full name are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    // Verify college exists if provided
    let assignedCollegeId = collegeId;
    if (assignedCollegeId) {
      const col = await College.findOne({ collegeId: assignedCollegeId });
      if (!col) {
        // Fallback: search by name or pick first active college
        const anyCol = await College.findOne({ status: "ACTIVE" });
        assignedCollegeId = anyCol ? anyCol.collegeId : "COL-DEFAULT-01";
      }
    } else {
      const anyCol = await College.findOne({ status: "ACTIVE" });
      assignedCollegeId = anyCol ? anyCol.collegeId : "COL-DEFAULT-01";
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = `USR-STU-${Date.now().toString().slice(-6)}`;
    const studentId = `STU-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = await User.create({
      userId,
      email: email.toLowerCase().trim(),
      mobile: mobile || "",
      passwordHash,
      role: "STUDENT",
      collegeId: assignedCollegeId,
      accountStatus: "ACTIVE",
    });

    const newStudent = await Student.create({
      studentId,
      userId,
      collegeId: assignedCollegeId,
      fullName: fullName.trim(),
      category: category || "General",
      state: state || "Tamil Nadu",
      district: district || "",
      course: course || "B.E.",
      department: department || "General Engineering",
      studyYear: studyYear || "1st Year",
      registerNumber: registerNumber || `REG-${Date.now().toString().slice(-5)}`,
      admissionYear: new Date().getFullYear(),
      academicYear: "2026-2027",
      familyIncome: familyIncome ? Number(familyIncome) : 180000,
    });

    await recordAuditLog({
      actorUserId: userId,
      actorRole: "STUDENT",
      action: "ACCOUNT_CREATED",
      entityType: "User",
      entityId: userId,
      reason: "Student registered successfully",
      req,
    });

    const token = jwt.sign(
      { userId: newUser.userId, email: newUser.email, role: newUser.role, collegeId: newUser.collegeId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Student account created successfully",
      token,
      user: {
        userId: newUser.userId,
        email: newUser.email,
        role: newUser.role,
        fullName: newStudent.fullName,
        studentId: newStudent.studentId,
        collegeId: newStudent.collegeId,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to register user. " + err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, roleHint } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password credentials." });
    }

    if (user.accountStatus === "INVITED") {
      return res.status(403).json({
        error: "Account not activated. Please use the activation link sent to your email to set your password.",
        accountStatus: "INVITED",
      });
    }

    if (user.accountStatus !== "ACTIVE") {
      return res.status(403).json({ error: "This account has been deactivated or suspended." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password credentials." });
    }

    // Role check if user selected a specific portal (prevent student login to ministry tab with student creds)
    if (roleHint) {
      if (roleHint === "COLLEGE" && !["COLLEGE_ADMIN", "COLLEGE_STAFF"].includes(user.role)) {
        return res.status(403).json({ error: `Account role is ${user.role}, cannot log into College Portal.` });
      }
      if (roleHint === "MINISTRY" && !["MINISTRY_ADMIN", "MINISTRY_REVIEWER", "MINISTRY_APPROVER"].includes(user.role)) {
        return res.status(403).json({ error: `Account role is ${user.role}, cannot log into Ministry Portal.` });
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    let studentProfile = null;
    let collegeInfo = null;

    if (user.role === "STUDENT") {
      studentProfile = await Student.findOne({ userId: user.userId }).lean();
    }
    if (user.collegeId) {
      collegeInfo = await College.findOne({ collegeId: user.collegeId }).lean();
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role, collegeId: user.collegeId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "LOGIN",
      entityType: "User",
      entityId: user.userId,
      reason: "Successful login",
      req,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        collegeName: collegeInfo ? collegeInfo.collegeName : null,
        fullName: studentProfile ? studentProfile.fullName : (user.role.startsWith("MINISTRY") ? "Ministry Official" : "College Authority"),
        studentId: studentProfile ? studentProfile.studentId : null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal login error." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select("-passwordHash").lean();
    if (!user) return res.status(404).json({ error: "User not found." });

    let studentProfile = null;
    let collegeInfo = null;

    if (user.role === "STUDENT") {
      studentProfile = await Student.findOne({ userId: user.userId }).lean();
    }
    if (user.collegeId) {
      collegeInfo = await College.findOne({ collegeId: user.collegeId }).lean();
    }
    res.json({
      user: {
        ...user,
        fullName: studentProfile ? studentProfile.fullName : (user.role.startsWith("MINISTRY") ? "Ministry Official" : "College Authority"),
        student: studentProfile,
        college: collegeInfo,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user session." });
  }
});

// GET /api/auth/verify-activation-token?token=...
router.get("/verify-activation-token", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== "string" || token.length < 16) {
      return res.status(400).json({ valid: false, error: "Missing or invalid activation token." });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
    const user = await User.findOne({
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ valid: false, error: "Activation token is invalid, expired, or has already been used." });
    }

    if (user.accountStatus === "ACTIVE") {
      return res.status(400).json({ valid: false, error: "This account has already been activated. Please log in directly." });
    }

    const student = await Student.findOne({ userId: user.userId }).lean();
    const college = user.collegeId ? await College.findOne({ collegeId: user.collegeId }).lean() : null;

    return res.json({
      valid: true,
      email: user.email,
      fullName: student ? student.fullName : "Student",
      registerNumber: student ? student.registerNumber : null,
      collegeName: college ? college.collegeName : null,
    });
  } catch (err) {
    res.status(500).json({ valid: false, error: "Failed to verify activation token: " + err.message });
  }
});

// POST /api/auth/activate-account
router.post("/activate-account", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Activation token is required." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
    const user = await User.findOne({
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: "Activation token is invalid, expired, or has already been used." });
    }

    // Hash student's chosen password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user.passwordHash = passwordHash;
    user.accountStatus = "ACTIVE";
    user.activatedAt = new Date();
    // SINGLE-USE: Invalidate the token immediately
    user.activationTokenHash = null;
    user.activationTokenExpiresAt = null;
    await user.save();

    await recordAuditLog({
      actorUserId: user.userId,
      actorRole: user.role,
      action: "ACCOUNT_ACTIVATED",
      entityType: "User",
      entityId: user.userId,
      reason: "Student completed secure password creation and account activation",
      req,
    });

    res.json({
      message: "Account successfully activated! You can now log in with your new password.",
      success: true,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to activate account: " + err.message });
  }
});

module.exports = router;
