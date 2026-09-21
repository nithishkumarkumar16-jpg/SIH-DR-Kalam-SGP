const mongoose = require("mongoose");

const PAYMENT_STATUSES = ["PENDING", "PROCESSING", "CONFIRMED", "FAILED", "REVERSED", "UNKNOWN"];

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  collegeId: { type: String, required: true, index: true },
  schemeId: { type: String, required: true, index: true },
  academicYear: { type: String, default: "2026-2027", index: true },
  instalment: { type: Number, default: 1 },
  component: { type: String, default: "Tuition / Maintenance Fee DBT" },
  sanctionedAmount: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUSES,
    default: "PENDING",
    index: true,
  },
  recipientType: {
    type: String,
    enum: ["DIRECT_STUDENT_DBT", "INSTITUTIONAL_FEE"],
    default: "DIRECT_STUDENT_DBT",
    index: true,
  },
  isPartial: { type: Boolean, default: false },
  originalSanctionedInstallment: { type: Number },
  reversalDate: { type: Date },
  reversalReason: { type: String },
  paymentReference: { type: String, trim: true },
  source: { type: String, default: "DBT_CONFIRMED_MANUAL" },
  checkedAt: { type: Date },
  updatedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = {
  Payment: mongoose.model("Payment", PaymentSchema),
  PAYMENT_STATUSES,
};
