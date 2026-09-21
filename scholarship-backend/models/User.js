const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  mobile: { type: String, trim: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ["STUDENT", "COLLEGE_ADMIN", "COLLEGE_STAFF", "MINISTRY_ADMIN", "MINISTRY_REVIEWER", "MINISTRY_APPROVER"],
    required: true,
    index: true,
  },
  collegeId: { type: String, default: null, index: true },
  accountStatus: {
    type: String,
    enum: ["ACTIVE", "INACTIVE", "INVITED", "SUSPENDED"],
    default: "ACTIVE",
    index: true,
  },
  activationTokenHash: { type: String, default: null, index: true },
  activationTokenExpiresAt: { type: Date, default: null },
  invitedAt: { type: Date, default: null },
  activatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
});

module.exports = mongoose.model("User", UserSchema);
