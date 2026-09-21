const mongoose = require("mongoose");

const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "DOCUMENT_VERIFICATION",
  "COLLEGE_REVIEW",
  "CORRECTION_REQUIRED",
  "RESUBMITTED",
  "MINISTRY_SCRUTINY",
  "ELIGIBILITY_CONFIRMED",
  "SELECTION_PENDING",
  "SELECTED",
  "NOT_SELECTED",
  "AWARD_ACCEPTANCE",
  "SANCTIONED",
  "PAYMENT_PENDING",
  "PAID",
  "CONTINUATION",
  "COMPLETED"
];

const ApplicationSchema = new mongoose.Schema({
  applicationId: { type: String, required: true, unique: true, index: true },
  studentId: { type: String, required: true, index: true },
  collegeId: { type: String, required: true, index: true },
  schemeId: { type: String, required: true, index: true },
  academicYear: { type: String, default: "2026-2027", index: true },
  applicationYear: { type: Number, default: 2026 },
  applicationStatus: {
    type: String,
    enum: APPLICATION_STATUSES,
    default: "DRAFT",
    index: true,
  },
  currentStage: { type: String, default: "Draft Stage" },
  whoMustAct: { type: String, default: "Student" },
  nextAction: { type: String, default: "Complete verification and submit application" },
  
  // External Official Government Portal Tracking (Part 11 / 30)
  externalApplicationId: { type: String, trim: true },
  externalPortalSource: { type: String, trim: true }, // e.g. "NSP (scholarships.gov.in)", "Tribal Affairs Portal"
  externalStatus: {
    type: String,
    enum: ["SUBMITTED", "UNDER_VERIFICATION", "DEFICIENCY", "VERIFIED", "SELECTED", "SANCTIONED", "PAYMENT_PROCESSED", "OTHER", "UNKNOWN", null],
    default: null
  },
  externalEvidence: { type: String }, // reference / note / dispatch ID
  externalLastChecked: { type: Date },
  externalUpdatedBy: { type: String },

  // Reviewer assignment & workload tracking
  assignedReviewerId: { type: String, index: true },
  assignedReviewerRole: { type: String },
  assignedReviewerName: { type: String },
  reassignmentReason: { type: String },
  reassignedAt: { type: Date },

  // Possible duplicate detection
  possibleDuplicate: { type: Boolean, default: false, index: true },
  duplicateMatches: [
    {
      applicationId: { type: String },
      studentId: { type: String },
      matchReason: { type: String },
      matchedAt: { type: Date, default: Date.now },
    }
  ],

  // Application Route
  applicationRoute: {
    type: String,
    enum: ["PORTAL_DIRECT", "INSTITUTIONAL_BULK", "EXTERNAL_TRACKING"],
    default: "PORTAL_DIRECT",
    index: true,
  },

  // Verification & Eligibility summary
  documentVerificationStatus: { type: String, enum: ["PENDING", "VERIFIED", "FLAGGED"], default: "PENDING" },
  eligibilityStatus: { type: String, enum: ["PENDING", "ELIGIBLE", "NOT_ELIGIBLE", "NEEDS_REVIEW"], default: "PENDING" },
  openDeficienciesCount: { type: Number, default: 0 },

  // Stage Timestamps for accurate duration & age metrics
  submittedAt: { type: Date },
  collegeVerifiedAt: { type: Date },
  ministryScrutinizedAt: { type: Date },
  selectedAt: { type: Date },
  sanctionedAt: { type: Date },
  paidAt: { type: Date },
  lastReopenedAt: { type: Date },

  lastUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

ApplicationSchema.pre("save", function () {
  this.lastUpdatedAt = Date.now();
});

module.exports = {
  Application: mongoose.model("Application", ApplicationSchema),
  APPLICATION_STATUSES,
};
