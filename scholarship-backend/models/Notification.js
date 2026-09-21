const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  role: { type: String },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["INFO", "WARNING", "DEFICIENCY", "STATUS_CHANGE", "AWARD", "PAYMENT", "SUCCESS"],
    default: "INFO",
  },
  link: { type: String },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("Notification", NotificationSchema);
