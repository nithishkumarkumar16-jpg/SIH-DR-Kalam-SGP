const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, unique: true, index: true },
  collegeId: { type: String, required: true, index: true },
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: { type: String },
  gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say"] },
  category: { type: String, index: true }, // SC, ST, BC, MBC, DNC, OBC, EBC, Minority, General
  state: { type: String, default: "Tamil Nadu", index: true },
  district: { type: String, index: true },
  address: { type: String },
  course: { type: String, index: true }, // e.g., B.E., B.Tech, Arts, Science, Diploma, PG
  department: { type: String, index: true },
  studyYear: { type: String, index: true }, // 1st Year, 2nd Year, 3rd Year, 4th Year
  semester: { type: String },
  registerNumber: { type: String, index: true },
  admissionYear: { type: Number },
  expectedGraduationYear: { type: Number },
  academicYear: { type: String, default: "2026-2027", index: true },
  familyIncome: { type: Number, index: true },
  firstGraduate: { type: Boolean, default: false },
  disabilityStatus: { type: Boolean, default: false },
  // Aadhaar/Bank reference fields (never full plaintext numbers / credentials)
  bankAccountType: { type: String, enum: ["Single", "Joint", null], default: "Single" },
  bankSeededConfirmed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

StudentSchema.pre("save", function () {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model("Student", StudentSchema);
