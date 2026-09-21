const jwt = require("jsonwebtoken");
const { User, Student, Application } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "sgp_secure_jwt_secret_key_2026_sih_development";

// Authenticate JWT Token
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ userId: decoded.userId }).lean();
    if (!user || user.accountStatus !== "ACTIVE") {
      return res.status(401).json({ error: "Account inactive or user not found." });
    }

    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session token." });
  }
}

// Require specific role(s)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to perform this action.",
        requiredRoles: allowedRoles,
      });
    }
    next();
  };
}

// Ensure student can only access their own student record
async function verifyStudentOwnership(req, res, next) {
  try {
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({ error: "Access denied. Only students can perform this action." });
    }

    const student = await Student.findOne({ userId: req.user.userId }).lean();
    if (!student) {
      return res.status(404).json({ error: "Student profile not found. Please complete profile first." });
    }

    req.student = student;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Error verifying student identity." });
  }
}

// Ensure college staff can only access data belonging to their assigned college
function verifyCollegeOwnership(req, res, next) {
  if (!["COLLEGE_ADMIN", "COLLEGE_STAFF"].includes(req.user.role)) {
    return res.status(403).json({ error: "Access restricted to college authorities." });
  }
  if (!req.user.collegeId) {
    return res.status(403).json({ error: "No college assigned to this staff account." });
  }
  next();
}

// Ensure application access obeys strict object-level authorization
async function verifyApplicationAccess(req, res, next) {
  try {
    const applicationId = req.params.applicationId || req.params.id || req.body.applicationId;
    if (!applicationId) {
      return res.status(400).json({ error: "Application ID required." });
    }

    const app = await Application.findOne({ applicationId }).lean();
    if (!app) {
      return res.status(404).json({ error: "Application not found." });
    }

    // Role-based access check
    if (req.user.role === "STUDENT") {
      const student = await Student.findOne({ userId: req.user.userId }).lean();
      if (!student || student.studentId !== app.studentId) {
        return res.status(403).json({ error: "Forbidden: You cannot access another student's application." });
      }
    } else if (["COLLEGE_ADMIN", "COLLEGE_STAFF"].includes(req.user.role)) {
      if (req.user.collegeId !== app.collegeId) {
        return res.status(403).json({ error: "Forbidden: You cannot access applications from another college." });
      }
    } else if (!["MINISTRY_ADMIN", "MINISTRY_REVIEWER", "MINISTRY_APPROVER"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges." });
    }

    req.targetApplication = app;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Error verifying application authorization." });
  }
}

module.exports = {
  requireAuth,
  requireRole,
  verifyStudentOwnership,
  verifyCollegeOwnership,
  verifyApplicationAccess,
  JWT_SECRET,
};
