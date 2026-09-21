const User = require("./User");
const College = require("./College");
const Student = require("./Student");
const Scheme = require("./Scheme");
const SchemeRule = require("./SchemeRule");
const { Application, APPLICATION_STATUSES } = require("./Application");
const DocumentVerification = require("./DocumentVerification");
const EligibilityResult = require("./EligibilityResult");
const { Deficiency, DEFICIENCY_TYPES } = require("./Deficiency");
const StatusHistory = require("./StatusHistory");
const Review = require("./Review");
const Notification = require("./Notification");
const AuditLog = require("./AuditLog");
const { Payment, PAYMENT_STATUSES } = require("./Payment");
const { Award, Sanction, Ticket } = require("./OtherModels");

module.exports = {
  User,
  College,
  Student,
  Scheme,
  SchemeRule,
  Application,
  APPLICATION_STATUSES,
  DocumentVerification,
  EligibilityResult,
  Deficiency,
  DEFICIENCY_TYPES,
  StatusHistory,
  Review,
  Notification,
  AuditLog,
  Payment,
  PAYMENT_STATUSES,
  Award,
  Sanction,
  Ticket,
};
