const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  reviewerUserId: { type: String, required: true, index: true },
  reviewerRole: { type: String, required: true },
  collegeId: { type: String, index: true },
  decision: {
    type: String,
    enum: ["VERIFIED", "CORRECTION_REQUESTED", "RECOMMENDED", "FORWARDED_TO_MINISTRY", "REJECTED"],
    required: true,
  },
  comments: { type: String, required: true },
  verifiedItems: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Review", ReviewSchema);
