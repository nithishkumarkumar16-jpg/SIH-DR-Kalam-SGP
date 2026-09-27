const mongoose = require("mongoose");

const AwardSchema = new mongoose.Schema({
  awardId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  schemeId: { type: String, required: true, index: true },
  awardLetterNumber: { type: String, required: true },
  awardDate: { type: Date, default: Date.now },
  acceptanceStatus: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED"], default: "PENDING" },
  acceptedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const SanctionSchema = new mongoose.Schema({
  sanctionId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  schemeId: { type: String, required: true, index: true },
  sanctionOrderNumber: { type: String, required: true },
  sanctionDate: { type: Date, default: Date.now },
  totalSanctionedAmount: { type: Number, required: true },
  approvedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const TicketReplySchema = new mongoose.Schema({
  replyId: { type: String },
  sender: { type: String, required: true },
  senderRole: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const TicketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, index: true },
  studentId: { type: String, required: true, index: true },
  category: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  requestType: { type: String, enum: ["SUPPORT_TICKET", "STATUS_UPDATE_REQUEST"], default: "SUPPORT_TICKET" },
  issueType: { type: String },
  officialStatusAtSubmission: { type: String },
  replies: [TicketReplySchema],
  adminNote: { type: String },
  assignedTo: { type: String },
  ticketOwner: { type: String }, // support staff or reviewer owner
  deadline: { type: Date },
  latestReply: { type: String },
  latestReplyAt: { type: Date },
  repliedBy: { type: String },
  status: {
    type: String,
    enum: [
      "OPEN",
      "IN_PROGRESS",
      "REVIEWING",
      "WAITING_FOR_STUDENT",
      "WAITING_FOR_AUTHORITY",
      "RESOLVED",
      "CLOSED"
    ],
    default: "OPEN",
    index: true,
  },
  resolution: { type: String },
  closedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = {
  Award: mongoose.model("Award", AwardSchema),
  Sanction: mongoose.model("Sanction", SanctionSchema),
  Ticket: mongoose.model("Ticket", TicketSchema),
};
