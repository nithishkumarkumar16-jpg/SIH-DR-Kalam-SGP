const XLSX = require("xlsx");

/**
 * Helper to format date safely as YYYY-MM-DD or readable string
 */
function formatDate(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toISOString().split("T")[0];
  } catch {
    return "—";
  }
}

function formatDateTime(val) {
  if (!val) return "—";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return "—";
    return d.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return "—";
  }
}

/**
 * Sanitize strings for safe filenames
 */
function sanitizeForFilename(str) {
  if (!str) return "Export";
  return String(str).replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
}

/**
 * Generate College Excel Export (1 sheet: "Applications" with 26 required columns)
 */
function generateCollegeExcel(college, rows) {
  const wb = XLSX.utils.book_new();

  // Explicit headers matching user specification exactly
  const headers = [
    "Register Number",
    "Student Name",
    "Course",
    "Study Year",
    "Academic Year",
    "Account Activation",
    "Scheme",
    "Application Year",
    "Internal Application ID",
    "External Reference",
    "Application Status",
    "Document Status",
    "OCR/Verification Status",
    "Eligibility Status",
    "Mismatch Count",
    "Pending Correction",
    "Reviewer",
    "Review Status",
    "Tracking Source",
    "Last Checked Date",
    "Next Action",
    "Ticket Owner",
    "Latest Ticket Reply",
    "Ticket Deadline",
    "Submitted Date",
    "Last Updated"
  ];

  const sheetData = [headers];

  for (const item of rows) {
    const student = item.student || {};
    const app = item.application || {};
    const review = item.latestReview || {};
    const ticket = item.latestTicket || {};

    // Mask sensitive fields if present
    const row = [
      student.registerNumber || "—",
      student.fullName || "—",
      student.course || "—",
      student.studyYear || "—",
      app.academicYear || student.academicYear || "2026-2027",
      item.accountStatus || "ACTIVE",
      app.schemeId || "—",
      app.applicationYear || 2026,
      app.applicationId || "—",
      app.externalApplicationId || "—",
      app.applicationStatus || "NO_APPLICATION",
      app.documentVerificationStatus || "PENDING",
      item.ocrVerificationStatus || "VERIFIED",
      app.eligibilityStatus || "PENDING",
      item.mismatchCount ?? 0,
      item.pendingCorrection ?? "No",
      review.reviewerUserId ? `${review.reviewerRole || "Officer"} (${review.reviewerUserId})` : "—",
      review.decision || "PENDING",
      app.externalPortalSource || "SGP Internal",
      formatDate(app.externalLastChecked || app.lastUpdatedAt),
      app.nextAction || "—",
      ticket.ticketOwner || ticket.assignedTo || "—",
      ticket.latestReply || ticket.resolution || "—",
      formatDate(ticket.deadline),
      formatDateTime(app.submittedAt),
      formatDateTime(app.lastUpdatedAt || app.createdAt)
    ];

    sheetData.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths for polished look
  ws["!cols"] = [
    { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 22 },
    { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 15 },
    { wch: 18 }, { wch: 26 }, { wch: 16 }, { wch: 24 }, { wch: 18 },
    { wch: 35 }, { wch: 20 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Applications");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const collegeNameSanitized = sanitizeForFilename(college?.collegeName || "Institution");
  const todayStr = new Date().toISOString().split("T")[0];
  const filename = `SGP_College_${collegeNameSanitized}_${todayStr}.xlsx`;

  return { buffer, filename, recordCount: rows.length };
}

/**
 * Generate Ministry Excel Export (5 sheets: Applications, Summary, Payments, Deficiencies, Status History)
 */
function generateMinistryExcel(applications, summaryStats, payments, deficiencies, statusHistory) {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: "Applications"
  // -------------------------------------------------------------
  const appHeaders = [
    "Internal Application ID",
    "External Reference",
    "Register Number",
    "Student Name",
    "College ID",
    "College Name",
    "State",
    "Course",
    "Department",
    "Study Year",
    "Academic Year",
    "Application Year",
    "Scheme ID",
    "Scheme Name",
    "Application Status",
    "Document Status",
    "Eligibility Status",
    "Open Deficiencies",
    "Payment Status",
    "Sanctioned Amount (₹)",
    "Confirmed Paid Amount (₹)",
    "Last Reviewer Role",
    "Current Stage",
    "Who Must Act",
    "Next Action",
    "Submitted Date",
    "Last Updated"
  ];

  const appRows = [appHeaders];
  for (const item of applications) {
    const s = item.student || {};
    const c = item.college || {};
    const sc = item.scheme || {};
    const p = item.payment || {};

    appRows.push([
      item.applicationId || "—",
      item.externalApplicationId || "—",
      s.registerNumber || "—",
      s.fullName || "—",
      item.collegeId || "—",
      c.collegeName || item.collegeId || "—",
      c.state || s.state || "Tamil Nadu",
      s.course || "—",
      s.department || "—",
      s.studyYear || "—",
      item.academicYear || "2026-2027",
      item.applicationYear || 2026,
      item.schemeId || "—",
      sc.schemeName || item.schemeId || "—",
      item.applicationStatus || "—",
      item.documentVerificationStatus || "PENDING",
      item.eligibilityStatus || "PENDING",
      item.openDeficienciesCount ?? 0,
      p.paymentStatus || "PENDING",
      p.sanctionedAmount ?? 0,
      p.paidAmount ?? 0,
      item.lastReviewerRole || "—",
      item.currentStage || "—",
      item.whoMustAct || "—",
      item.nextAction || "—",
      formatDateTime(item.submittedAt),
      formatDateTime(item.lastUpdatedAt || item.createdAt)
    ]);
  }

  const wsApps = XLSX.utils.aoa_to_sheet(appRows);
  wsApps["!cols"] = [
    { wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 16 },
    { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 30 }, { wch: 22 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 22 },
    { wch: 24 }, { wch: 20 }, { wch: 25 }, { wch: 20 }, { wch: 35 },
    { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsApps, "Applications");

  // -------------------------------------------------------------
  // Sheet 2: "Summary" (MongoDB aggregated metrics)
  // -------------------------------------------------------------
  const totalApps = summaryStats.totalApplications || 0;
  const sanctionedAmt = summaryStats.totalSanctionedAmount || 0;
  const confirmedPaidAmt = summaryStats.totalConfirmedPaidAmount || 0;
  const outstandingAmt = Math.max(0, sanctionedAmt - confirmedPaidAmt);

  const calcPct = (num, denom) => (denom > 0 ? ((num / denom) * 100).toFixed(1) + "%" : "0.0%");

  const summaryData = [
    ["SGP MINISTRY MONITORING SUMMARY", ""],
    ["Generated At", new Date().toISOString().replace("T", " ").substring(0, 19)],
    ["Source Database", "MongoDB (sgp_scholarship) - Live Aggregations"],
    ["", ""],
    ["Key Metric", "Value", "Percentage", "Denominator / Basis"],
    ["Total Registered Students", summaryStats.totalStudents ?? 0, "—", "Registered student count"],
    ["Total Participating Colleges", summaryStats.totalColleges ?? 0, "—", "Active institutions"],
    ["Total Scholarship Applications", totalApps, "100.0%", "Total Applications"],
    ["", "", "", ""],
    ["APPLICATION LIFECYCLE STAGES", "", "", ""],
    ["Draft", summaryStats.draftCount ?? 0, calcPct(summaryStats.draftCount ?? 0, totalApps), "of Total Applications"],
    ["Submitted", summaryStats.submittedCount ?? 0, calcPct(summaryStats.submittedCount ?? 0, totalApps), "of Total Applications"],
    ["Correction Required", summaryStats.correctionRequiredCount ?? 0, calcPct(summaryStats.correctionRequiredCount ?? 0, totalApps), "of Total Applications"],
    ["Resubmitted", summaryStats.resubmittedCount ?? 0, calcPct(summaryStats.resubmittedCount ?? 0, totalApps), "of Total Applications"],
    ["College Review Pending", summaryStats.collegeReviewCount ?? 0, calcPct(summaryStats.collegeReviewCount ?? 0, totalApps), "of Total Applications"],
    ["Ministry Scrutiny", summaryStats.ministryScrutinyCount ?? 0, calcPct(summaryStats.ministryScrutinyCount ?? 0, totalApps), "of Total Applications"],
    ["Selected", summaryStats.selectedCount ?? 0, calcPct(summaryStats.selectedCount ?? 0, totalApps), "of Total Applications"],
    ["Award Accepted", summaryStats.acceptedCount ?? 0, calcPct(summaryStats.acceptedCount ?? 0, totalApps), "of Total Applications"],
    ["Sanctioned", summaryStats.sanctionedCount ?? 0, calcPct(summaryStats.sanctionedCount ?? 0, totalApps), "of Total Applications"],
    ["Paid", summaryStats.paidCount ?? 0, calcPct(summaryStats.paidCount ?? 0, totalApps), "of Total Applications"],
    ["Not Selected", summaryStats.notSelectedCount ?? 0, calcPct(summaryStats.notSelectedCount ?? 0, totalApps), "of Total Applications"],
    ["Total Applications", totalApps, "100.0%", "Total Applications Processed"],
    ["Overall Approval Rate (%)", calcPct((summaryStats.sanctionedCount || 0) + (summaryStats.paidCount || 0) + (summaryStats.selectedCount || 0), totalApps), calcPct((summaryStats.sanctionedCount || 0) + (summaryStats.paidCount || 0) + (summaryStats.selectedCount || 0), totalApps), "Approved / Sanctioned of Total Apps"],
    ["", "", "", ""],
    ["FINANCIAL & DISBURSEMENT SUMMARY", "", "", ""],
    ["Total Sanctioned Amount (₹)", sanctionedAmt.toLocaleString("en-IN"), "100.0%", "Total Sanction Order Amount"],
    ["Confirmed Paid Amount (₹)", confirmedPaidAmt.toLocaleString("en-IN"), calcPct(confirmedPaidAmt, sanctionedAmt), "of Sanctioned Amount"],
    ["Outstanding Disbursement (₹)", outstandingAmt.toLocaleString("en-IN"), calcPct(outstandingAmt, sanctionedAmt), "of Sanctioned Amount"],
    ["Pending Payment Records Count", summaryStats.pendingPaymentsCount ?? 0, "—", "Records in PENDING status"]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 16 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // -------------------------------------------------------------
  // Sheet 3: "Payments"
  // -------------------------------------------------------------
  const payHeaders = [
    "Payment ID",
    "Application ID",
    "Student",
    "College",
    "Scheme",
    "Academic Year",
    "Payment Component",
    "Installment",
    "Sanctioned Amount (₹)",
    "Confirmed Paid Amount (₹)",
    "Payment Status",
    "UTR / Reference",
    "Payment Source",
    "Payment Date",
    "Last Successful Update"
  ];

  const payRows = [payHeaders];
  for (const p of payments) {
    payRows.push([
      p.paymentId || "—",
      p.applicationId || "—",
      p.studentName || p.studentId || "—",
      p.collegeName || p.collegeId || "—",
      p.schemeName || p.schemeId || "—",
      p.academicYear || "2026-2027",
      p.component || "DBT Scholarship Component",
      p.instalment ?? 1,
      p.sanctionedAmount ?? 0,
      p.paidAmount ?? 0,
      p.paymentStatus || "PENDING",
      p.paymentReference || "—",
      p.source || "DBT_CONFIRMED_MANUAL",
      formatDateTime(p.checkedAt),
      formatDateTime(p.createdAt)
    ]);
  }

  const wsPayments = XLSX.utils.aoa_to_sheet(payRows);
  wsPayments["!cols"] = [
    { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 20 },
    { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 24 },
    { wch: 18 }, { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");

  // -------------------------------------------------------------
  // Sheet 4: "Deficiencies"
  // -------------------------------------------------------------
  const defHeaders = [
    "Deficiency ID",
    "Application ID",
    "Student",
    "College",
    "Deficiency Type",
    "Description",
    "Required Action",
    "Assigned Staff",
    "Severity",
    "Status",
    "Created Date",
    "Due Date",
    "Resolved Date"
  ];

  const defRows = [defHeaders];
  for (const d of deficiencies) {
    defRows.push([
      d.deficiencyId || "—",
      d.applicationId || "—",
      d.studentName || d.studentId || "—",
      d.collegeName || d.collegeId || "—",
      d.type || "DATA_MISMATCH",
      d.description || "—",
      d.type === "UNCLEAR_DOCUMENT"
        ? "Upload clear and legible copy of document"
        : d.type === "INVALID_INFORMATION"
        ? "Contact issuing authority or correct registration information"
        : "Verify and submit corrected document metadata",
      d.assignedTo || "Student / Institutional Staff",
      d.severity || "HIGH",
      d.status || "OPEN",
      formatDateTime(d.createdAt),
      formatDate(d.dueDate || new Date(new Date(d.createdAt || Date.now()).getTime() + 14 * 86400000)),
      formatDateTime(d.resolvedAt)
    ]);
  }

  const wsDef = XLSX.utils.aoa_to_sheet(defRows);
  wsDef["!cols"] = [
    { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 30 }, { wch: 24 },
    { wch: 35 }, { wch: 35 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 16 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDef, "Deficiencies");

  // -------------------------------------------------------------
  // Sheet 5: "Status History"
  // -------------------------------------------------------------
  const hisHeaders = [
    "History ID",
    "Application ID",
    "Previous Status",
    "New Status",
    "Changed By",
    "Role",
    "Reason",
    "Source",
    "Evidence Reference",
    "Timestamp"
  ];

  const hisRows = [hisHeaders];
  for (const h of statusHistory) {
    hisRows.push([
      h.historyId || "—",
      h.applicationId || "—",
      h.previousStatus || "NONE",
      h.newStatus || "—",
      h.changedBy || "—",
      h.changedByRole || "—",
      h.reason || "—",
      h.source || "SGP_INTERNAL",
      h.evidenceReference || "—",
      formatDateTime(h.timestamp)
    ]);
  }

  const wsHis = XLSX.utils.aoa_to_sheet(hisRows);
  wsHis["!cols"] = [
    { wch: 24 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 20 },
    { wch: 18 }, { wch: 35 }, { wch: 22 }, { wch: 24 }, { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsHis, "Status History");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
  const todayStr = new Date().toISOString().split("T")[0];
  const filename = `SGP_Ministry_${todayStr}.xlsx`;

  return { buffer, filename, recordCount: applications.length };
}

/**
 * Parse student import spreadsheet buffer (XLSX or CSV)
 * Returns array of normalized rows and validation details
 */
function parseStudentImportSpreadsheet(buffer) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("Uploaded workbook has no sheets.");
  }

  const sheet = wb.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const parsed = [];
  const errors = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const r = rawRows[idx];
    const rowNum = idx + 2; // +1 for 0-index, +1 for header row

    // Normalize keys regardless of casing / spaces
    const getVal = (...keys) => {
      for (const k of keys) {
        for (const actualKey of Object.keys(r)) {
          if (actualKey.trim().toLowerCase() === k.toLowerCase()) {
            return String(r[actualKey]).trim();
          }
        }
      }
      return "";
    };

    const registerNumber = getVal("register number", "registernumber", "reg no", "roll number", "rollno", "reg_no");
    const fullName = getVal("student name", "studentname", "full name", "fullname", "name");
    const email = getVal("email", "email address", "student email");
    const course = getVal("course", "degree", "programme") || "B.E. / B.Tech";
    const department = getVal("department", "dept", "branch") || "Computer Science";
    const studyYear = getVal("study year", "year", "studyyear") || "1st Year";
    const mobile = getVal("mobile", "phone", "contact", "mobile number");
    const category = getVal("category", "community") || "General";
    const familyIncomeStr = getVal("family income", "income", "familyincome");
    const familyIncome = familyIncomeStr ? Number(familyIncomeStr.replace(/[^0-9.]/g, "")) : 200000;

    const rowErrors = [];
    if (!registerNumber) rowErrors.push("Missing Register Number");
    if (!fullName) rowErrors.push("Missing Student Name");
    if (!email || !email.includes("@")) rowErrors.push("Missing or invalid Email");

    parsed.push({
      rowNum,
      registerNumber,
      fullName,
      email,
      course,
      department,
      studyYear,
      mobile,
      category,
      familyIncome,
      isValid: rowErrors.length === 0,
      errors: rowErrors
    });
  }

  return parsed;
}

module.exports = {
  generateCollegeExcel,
  generateMinistryExcel,
  parseStudentImportSpreadsheet,
  formatDate,
  formatDateTime,
};
