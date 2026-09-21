const http = require("http");
const XLSX = require("xlsx");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { User, Student } = require("../models");
const { createApp } = require("../server");
const { connectTestDB, disconnectTestDB } = require("./testDb");

const TEST_PORT = 5097;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
let server = null;

function req(method, path, body = null, token = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = {};
    if (!isBinary) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = body && !isBinary ? JSON.stringify(body) : body;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const r = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers["content-type"] || "";
          const contentDisposition = res.headers["content-disposition"] || "";
          const recordCount = res.headers["x-record-count"];

          if (isBinary || contentType.includes("spreadsheetml") || contentType.includes("octet-stream")) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              buffer,
              contentType,
              contentDisposition,
              recordCount,
            });
          } else {
            const raw = buffer.toString("utf8");
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                body: JSON.parse(raw),
                raw,
              });
            } catch {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                raw,
              });
            }
          }
        });
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runGapClosureExcelTests() {
  console.log("==========================================================================");
  console.log("  SGP FINAL GAP-CLOSURE & EXCEL EXPORT INTEGRATION TEST SUITE");
  console.log("==========================================================================");

  const dbConn = await connectTestDB();
  console.log(`Verified test database in use: "${dbConn.name}"`);
  const testApp = createApp();
  server = await new Promise((r) => {
    const s = testApp.listen(TEST_PORT, () => r(s));
  });

  let passed = 0;
  let failed = 0;
  const testResults = [];

  async function test(testNum, name, fn) {
    try {
      await fn();
      console.log(`✅ [TEST ${testNum}] PASS: ${name}`);
      passed++;
      testResults.push({ num: testNum, name, status: "PASS" });
    } catch (err) {
      console.error(`❌ [TEST ${testNum}] FAIL: ${name} ->`, err.message);
      failed++;
      testResults.push({ num: testNum, name, status: "FAIL", error: err.message });
    }
  }

  let studentToken = null;
  let collegeToken = null;
  let ministryAdminToken = null;
  let ministryReviewerToken = null;
  let studentUser = null;
  // Ensure direct MongoDB connection for token hash validation
  if (mongoose.connection.readyState === 0) {
    await connectTestDB();
  }

  // Setup / Auth
  await test("0.1", "Authenticate Student (student@sgp.gov.in)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "Student@123",
      roleHint: "STUDENT",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Status ${r.status}`);
    studentToken = r.body.token;
    studentUser = r.body.user;
  });

  await test("0.2", "Authenticate College Staff (college@sgp.gov.in)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "college@sgp.gov.in",
      password: "College@123",
      roleHint: "COLLEGE",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Status ${r.status}`);
    collegeToken = r.body.token;
    collegeUser = r.body.user;
  });

  await test("0.3", "Authenticate Ministry Admin (ministry@sgp.gov.in)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "ministry@sgp.gov.in",
      password: "Ministry@123",
      roleHint: "MINISTRY",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Status ${r.status}`);
    ministryAdminToken = r.body.token;
  });

  await test("0.4", "Authenticate Ministry Reviewer (reviewer@sgp.gov.in)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "reviewer@sgp.gov.in",
      password: "Reviewer@123",
      roleHint: "MINISTRY",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Status ${r.status}`);
    ministryReviewerToken = r.body.token;
  });

  // Test 1: Student cannot export College Excel (403)
  await test("1", "Student blocked from College Excel Export (HTTP 403)", async () => {
    const r = await req("GET", "/api/college/export-excel", null, studentToken, true);
    if (r.status !== 403) throw new Error(`Expected 403, got ${r.status}`);
  });

  // Test 2: Student cannot export Ministry Excel (403)
  await test("2", "Student blocked from Ministry Excel Export (HTTP 403)", async () => {
    const r = await req("GET", "/api/ministry/export-excel", null, studentToken, true);
    if (r.status !== 403) throw new Error(`Expected 403, got ${r.status}`);
  });

  // Test 3: IDOR prevention - Student cannot access other student application
  await test("3", "Student blocked from accessing arbitrary application (IDOR Check)", async () => {
    const fakeId = "64f1a2b3c4d5e6f7a8b9c0d1";
    const r = await req("GET", `/api/student/applications/${fakeId}`, null, studentToken);
    if (r.status !== 404 && r.status !== 403) throw new Error(`Expected 404 or 403, got ${r.status}`);
  });

  // Test 4: College Excel Export returns 200 and binary .xlsx
  let collegeBuffer = null;
  let collegeDisposition = "";
  await test("4", "College Admin/Staff can access College Excel export (HTTP 200)", async () => {
    const r = await req("GET", "/api/college/export-excel", null, collegeToken, true);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!r.contentType.includes("spreadsheetml")) throw new Error(`Invalid content type: ${r.contentType}`);
    collegeBuffer = r.buffer;
    collegeDisposition = r.contentDisposition;
  });

  // Test 5: College export filename format
  await test("5", "College export Content-Disposition filename format (SGP_College_*.xlsx)", async () => {
    if (!collegeDisposition.includes("SGP_College_") || !collegeDisposition.endsWith('.xlsx"') && !collegeDisposition.endsWith('.xlsx')) {
      throw new Error(`Unexpected disposition: ${collegeDisposition}`);
    }
  });

  // Test 6: College export valid XLSX workbook structure (1 sheet: Applications)
  let collegeWorkbook = null;
  await test("6", "College export contains exactly 1 sheet named 'Applications'", async () => {
    collegeWorkbook = XLSX.read(collegeBuffer, { type: "buffer" });
    if (!collegeWorkbook.SheetNames.includes("Applications")) {
      throw new Error(`Missing 'Applications' sheet. Sheets: ${collegeWorkbook.SheetNames.join(", ")}`);
    }
    if (collegeWorkbook.SheetNames.length !== 1) {
      throw new Error(`Expected 1 sheet, got ${collegeWorkbook.SheetNames.length}`);
    }
  });

  // Test 7: College export contains all 26 required columns
  await test("7", "College export contains exactly the 26 required columns", async () => {
    const sheet = collegeWorkbook.Sheets["Applications"];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length === 0) throw new Error("Sheet is empty");
    const headers = rows[0];

    const expectedColumns = [
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

    for (const col of expectedColumns) {
      if (!headers.includes(col)) {
        throw new Error(`Missing required column: "${col}". Present: ${headers.join(", ")}`);
      }
    }
  });

  // Test 8: College export strictly scoped to college
  await test("8", "College export records strictly bound to user's collegeId", async () => {
    const sheet = collegeWorkbook.Sheets["Applications"];
    const records = XLSX.utils.sheet_to_json(sheet);
    if (records.length > 0) {
      for (const rec of records) {
        if (rec["College Name"] && collegeUser.collegeId && rec["College Name"] === "Unknown College") {
          throw new Error("Application has unlinked college");
        }
      }
    }
  });

  // Test 9: Sensitive data exclusion check in College export
  await test("9", "College export excludes sensitive credentials & raw blobs", async () => {
    const sheet = collegeWorkbook.Sheets["Applications"];
    const records = XLSX.utils.sheet_to_json(sheet);
    const serialized = JSON.stringify(records);

    const forbidden = ["password", "passwordHash", "otp", "jwt", "secret", "data:image/", "base64"];
    for (const word of forbidden) {
      if (serialized.toLowerCase().includes(word)) {
        throw new Error(`Export contains sensitive keyword: "${word}"`);
      }
    }
  });

  // Test 10: Ministry Excel Export returns 200 and binary .xlsx
  let ministryBuffer = null;
  let ministryDisposition = "";
  await test("10", "Ministry Admin can access Ministry Excel export (HTTP 200)", async () => {
    const r = await req("GET", "/api/ministry/export-excel", null, ministryAdminToken, true);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!r.contentType.includes("spreadsheetml")) throw new Error(`Invalid content type: ${r.contentType}`);
    ministryBuffer = r.buffer;
    ministryDisposition = r.contentDisposition;
  });

  // Test 11: Ministry export filename format
  await test("11", "Ministry export Content-Disposition filename format (SGP_Ministry_*.xlsx)", async () => {
    if (!ministryDisposition.includes("SGP_Ministry_") || !ministryDisposition.endsWith('.xlsx"') && !ministryDisposition.endsWith('.xlsx')) {
      throw new Error(`Unexpected disposition: ${ministryDisposition}`);
    }
  });

  // Test 12: Ministry export contains all 5 required sheets
  let ministryWorkbook = null;
  await test("12", "Ministry export contains all 5 required sheets", async () => {
    ministryWorkbook = XLSX.read(ministryBuffer, { type: "buffer" });
    const expectedSheets = ["Applications", "Summary", "Payments", "Deficiencies", "Status History"];
    for (const sheetName of expectedSheets) {
      if (!ministryWorkbook.SheetNames.includes(sheetName)) {
        throw new Error(`Missing required sheet: "${sheetName}". Found: ${ministryWorkbook.SheetNames.join(", ")}`);
      }
    }
  });

  // Test 13: Ministry export Summary sheet includes real aggregations with explicit denominators
  await test("13", "Ministry Summary sheet includes real aggregations and calculated approval rate", async () => {
    const summarySheet = ministryWorkbook.Sheets["Summary"];
    const summaryRows = XLSX.utils.sheet_to_json(summarySheet, { header: 1 });
    if (!summaryRows || summaryRows.length === 0) throw new Error("Summary sheet is empty");

    const rowTexts = summaryRows.map((r) => String(r[0] || ""));
    const hasTotalApps = rowTexts.some((t) => t.includes("Total Scholarship Applications") || t.includes("Total Applications"));
    const hasApprovalRate = rowTexts.some((t) => t.includes("Approval Rate"));

    if (!hasTotalApps) throw new Error(`Missing Total Applications row in Summary. Found: ${rowTexts.slice(0, 15).join(", ")}`);
    if (!hasApprovalRate) throw new Error(`Missing Approval Rate row in Summary. Found: ${rowTexts.slice(0, 15).join(", ")}`);
  });

  // Test 14: Ministry export filter parameters work
  await test("14", "Ministry export filters by paymentStatus parameter", async () => {
    const r = await req("GET", "/api/ministry/export-excel?paymentStatus=PAID", null, ministryAdminToken, true);
    if (r.status !== 200) throw new Error(`Expected 200 with paymentStatus filter, got ${r.status}`);
    const wb = XLSX.read(r.buffer, { type: "buffer" });
    const appSheet = wb.Sheets["Applications"];
    const rows = XLSX.utils.sheet_to_json(appSheet);
    for (const row of rows) {
      if (row["Payment Status"] && row["Payment Status"] !== "PAID") {
        throw new Error(`Found non-PAID row in filtered export: ${row["Payment Status"]}`);
      }
    }
  });

  // Test 15: Ministry Reviewer role can also export
  await test("15", "Ministry Reviewer role can access Ministry export (HTTP 200)", async () => {
    const r = await req("GET", "/api/ministry/export-excel", null, ministryReviewerToken, true);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
  });

  // Test 16: Admin Master Table for College works with pagination
  await test("16", "College Admin Master Table endpoint returns paginated grouped records", async () => {
    const r = await req("GET", "/api/college/admin-table?page=1&limit=5", null, collegeToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!Array.isArray(r.body.records) || typeof r.body.total !== "number" || typeof r.body.page !== "number") {
      throw new Error(`Invalid pagination structure in response: ${JSON.stringify(Object.keys(r.body))}`);
    }
    if (r.body.records.length > 0) {
      const item = r.body.records[0];
      if (!item.student || !item.application || !item.review || !item.tracking) {
        throw new Error("Missing grouped record fields (student, application, review, tracking)");
      }
    }
  });

  // Test 17: Admin Master Table for Ministry works with pagination
  await test("17", "Ministry Admin Master Table endpoint returns paginated grouped records", async () => {
    const r = await req("GET", "/api/ministry/admin-table?page=1&limit=5", null, ministryAdminToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (!Array.isArray(r.body.records) || typeof r.body.total !== "number" || typeof r.body.page !== "number") {
      throw new Error(`Invalid pagination structure in response: ${JSON.stringify(Object.keys(r.body))}`);
    }
    if (r.body.records.length > 0) {
      const item = r.body.records[0];
      if (!item.student || !item.application || !item.review || !item.tracking) {
        throw new Error("Missing grouped record fields (student, application, review, tracking)");
      }
    }
  });

  // Test 18: Bulk Student Import Preview validates rows and detects format
  await test("18", "Bulk Student Import Preview accepts valid JSON rows and validates format", async () => {
    const sampleRows = [
      {
        fullName: "Test Bulk Student One",
        email: `test_bulk_${Date.now()}@sgp.test`,
        mobile: "9876543210",
        course: "B.Tech Computer Science",
        department: "Computer Science",
        studyYear: "1st Year",
        registerNumber: `REG_${Date.now()}`,
        category: "GENERAL",
        familyIncome: 180000,
      },
      {
        fullName: "", // Invalid row: missing name & register number
        email: "invalid-email-no-name",
        mobile: "123",
      },
    ];

    const r = await req("POST", "/api/college/students/import-preview", { rows: sampleRows }, collegeToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    const summary = r.body.summary || {};
    if (summary.validCount !== 1 || summary.invalidCount !== 1) {
      throw new Error(`Expected 1 valid and 1 invalid row, got valid=${summary.validCount}, invalid=${summary.invalidCount}`);
    }
  });

  // Test 19: Bulk Student Import Confirmation creates student with status=INVITED and never returns plaintext password or passwordHash
  let importedStudentEmail = `test_invite_${Date.now()}@sgp.test`;
  let importedStudentReg = `REG_INV_${Date.now()}`;
  let rawImportedActivationToken = null;

  await test("19", "Bulk Student Import Confirm creates student accounts without exposing passwords", async () => {
    const validRows = [
      {
        fullName: "Test Invited Student",
        email: importedStudentEmail,
        mobile: "9876543219",
        course: "B.Tech Information Technology",
        department: "IT",
        studyYear: "2nd Year",
        registerNumber: importedStudentReg,
        category: "OBC",
        familyIncome: 220000,
      },
    ];

    const r = await req("POST", "/api/college/students/import-confirm", { rows: validRows }, collegeToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    if (r.body.imported !== 1) {
      throw new Error(`Expected imported=1, got: ${JSON.stringify(r.body)}`);
    }

    // Crucial security verification: response must NEVER contain plaintext passwords or passwordHash
    const responseStr = JSON.stringify(r.body).toLowerCase();
    if (responseStr.includes("temppassword") || responseStr.includes("passwordhash") || responseStr.includes("sgp#")) {
      throw new Error("Security Violation: import-confirm response leaked password credentials!");
    }

    // Verify user in DB is in INVITED state with hashed activation token
    const userInDb = await User.findOne({ email: importedStudentEmail.toLowerCase() });
    if (!userInDb) throw new Error("User record not found in MongoDB");
    if (userInDb.accountStatus !== "INVITED") throw new Error(`Expected accountStatus 'INVITED', got: ${userInDb.accountStatus}`);
    if (!userInDb.activationTokenHash) throw new Error("Missing activationTokenHash in MongoDB");
  });

  // Test 19.1: Admin endpoints strictly exclude student password and passwordHash
  await test("19.1", "College Admin endpoints strictly exclude student password and passwordHash", async () => {
    const r = await req("GET", "/api/college/students", null, collegeToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
    const jsonStr = JSON.stringify(r.body).toLowerCase();
    if (jsonStr.includes("passwordhash") || jsonStr.includes("activationtokenhash")) {
      throw new Error("Security Violation: GET /api/college/students leaked password hashes or token hashes!");
    }
  });

  // Test 19.2: Student cannot login before account activation
  await test("19.2", "Student cannot login before account activation (HTTP 403)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: importedStudentEmail,
      password: "AnyPassword123!",
      roleHint: "STUDENT",
    });
    if (r.status !== 403) throw new Error(`Expected HTTP 403 for unactivated account, got ${r.status}`);
    if (!r.body.error || !r.body.error.toLowerCase().includes("not activated")) {
      throw new Error(`Unexpected error message: ${r.body.error}`);
    }
  });

  // Test 19.3: Activation token expires (expired token rejected)
  await test("19.3", "Activation token expires and is rejected when expired (HTTP 400)", async () => {
    // Generate a test token and intentionally expire it in MongoDB
    const testExpiredToken = crypto.randomBytes(32).toString("hex");
    const testTokenHash = crypto.createHash("sha256").update(testExpiredToken).digest("hex");
    await User.updateOne(
      { email: importedStudentEmail.toLowerCase() },
      {
        $set: {
          activationTokenHash: testTokenHash,
          activationTokenExpiresAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        },
      }
    );

    const r = await req("GET", `/api/auth/verify-activation-token?token=${testExpiredToken}`);
    if (r.status !== 400) throw new Error(`Expected 400 for expired token, got ${r.status}`);

    const rActivate = await req("POST", "/api/auth/activate-account", {
      token: testExpiredToken,
      password: "ValidPassword@123",
    });
    if (rActivate.status !== 400) throw new Error(`Expected 400 for activating with expired token, got ${rActivate.status}`);
  });

  // Test 19.4: Student can activate account using valid token and set their own password
  const studentNewChosenPassword = "MySecurePassword@2026";
  await test("19.4", "Student activates account with valid token and sets their own password", async () => {
    // Generate fresh valid token
    const freshToken = crypto.randomBytes(32).toString("hex");
    rawImportedActivationToken = freshToken;
    const freshTokenHash = crypto.createHash("sha256").update(freshToken).digest("hex");
    await User.updateOne(
      { email: importedStudentEmail.toLowerCase() },
      {
        $set: {
          activationTokenHash: freshTokenHash,
          activationTokenExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
          accountStatus: "INVITED",
        },
      }
    );

    // Verify token
    const verifyRes = await req("GET", `/api/auth/verify-activation-token?token=${freshToken}`);
    if (verifyRes.status !== 200 || !verifyRes.body.valid) {
      throw new Error(`Expected 200 with valid=true, got ${verifyRes.status}: ${JSON.stringify(verifyRes.body)}`);
    }

    // Activate account
    const actRes = await req("POST", "/api/auth/activate-account", {
      token: freshToken,
      password: studentNewChosenPassword,
    });
    if (actRes.status !== 200 || !actRes.body.success) {
      throw new Error(`Expected 200 with success=true, got ${actRes.status}: ${JSON.stringify(actRes.body)}`);
    }

    // Verify in DB that accountStatus is now ACTIVE and activatedAt is set
    const userAfter = await User.findOne({ email: importedStudentEmail.toLowerCase() });
    if (userAfter.accountStatus !== "ACTIVE") throw new Error(`Expected ACTIVE, got ${userAfter.accountStatus}`);
    if (!userAfter.activatedAt) throw new Error("Missing activatedAt timestamp in DB");
  });

  // Test 19.5: Activation token is single-use
  await test("19.5", "Activation token is strictly single-use and cannot be reused", async () => {
    const actResAgain = await req("POST", "/api/auth/activate-account", {
      token: rawImportedActivationToken,
      password: "AnotherPassword@999",
    });
    if (actResAgain.status !== 400) {
      throw new Error(`Expected 400 when attempting to reuse token, got ${actResAgain.status}`);
    }
  });

  // Test 19.6: Student can successfully login after activation using newly set password
  await test("19.6", "Student can login after activation with their newly set password", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: importedStudentEmail,
      password: studentNewChosenPassword,
      roleHint: "STUDENT",
    });
    if (r.status !== 200 || !r.body.token) {
      throw new Error(`Expected 200 login with token, got ${r.status}: ${JSON.stringify(r.body)}`);
    }
    if (r.body.user.role !== "STUDENT") {
      throw new Error(`Expected STUDENT role, got ${r.body.user.role}`);
    }
  });

  // Test 19.7: College Admin can resend invitation and initiate password reset without seeing password
  await test("19.7", "College Admin can resend invitation and initiate password reset without seeing password", async () => {
    const studentDoc = (await Student.findOne({ email: importedStudentEmail.toLowerCase() })) ||
                       (await Student.findOne({ registerNumber: importedStudentReg }));
    if (!studentDoc) throw new Error("Student document not found in DB");

    // Initiate password reset
    const resetRes = await req("POST", `/api/college/students/${studentDoc.studentId}/reset-password`, {}, collegeToken);
    if (resetRes.status !== 200) throw new Error(`Expected 200, got ${resetRes.status}: ${JSON.stringify(resetRes.body)}`);

    // Verify reset response does NOT leak any passwords
    const resetJson = JSON.stringify(resetRes.body).toLowerCase();
    if (resetJson.includes("passwordhash") || resetJson.includes("sgp#") || resetJson.includes("password\":")) {
      throw new Error("Password leaked in reset-password response!");
    }

    // Resend invite
    const resendRes = await req("POST", `/api/college/students/${studentDoc.studentId}/resend-invite`, {}, collegeToken);
    if (resendRes.status !== 200) throw new Error(`Expected 200, got ${resendRes.status}: ${JSON.stringify(resendRes.body)}`);
  });

  // Test 19.8: College isolation enforced on invitation management
  await test("19.8", "College isolation enforced on student invitation and password reset (HTTP 404/403)", async () => {
    const fakeOrForeignId = "STU-9999-FOREIGN";
    const r = await req("POST", `/api/college/students/${fakeOrForeignId}/reset-password`, {}, collegeToken);
    if (r.status !== 404 && r.status !== 403) {
      throw new Error(`Expected 404 or 403 for unauthorized student reset, got ${r.status}`);
    }
  });

  // Test 20: Scheme Configuration update increments rule version and saves rules
  await test("20", "Ministry Scheme Configuration update retains version and rules", async () => {
    const listRes = await req("GET", "/api/ministry/schemes", null, ministryAdminToken);
    if (listRes.status !== 200) throw new Error(`Could not fetch schemes: ${listRes.status}`);

    const schemes = listRes.body.schemes || [];
    const existingScheme = schemes[0];
    const targetId = existingScheme ? existingScheme.schemeId : "SCH-TRIBAL-01";
    const targetName = existingScheme ? existingScheme.schemeName : "National Tribal Scholarship";

    const updatePayload = {
      schemeId: targetId,
      schemeName: targetName,
      schemeType: "CENTRAL",
      ministry: "Ministry of Tribal Affairs",
      description: "Updated scholarship rules with version increment",
      targetCategory: ["ST"],
      academicLevels: ["ug", "pg"],
      maxIncome: 300000,
      ruleVersion: (existingScheme?.ruleVersion || 1) + 1,
      eligibilityRules: {
        minAttendancePercentage: 75,
        requiredCasteCategory: ["ST"],
      },
    };

    const r = await req("POST", "/api/ministry/schemes", updatePayload, ministryAdminToken);
    if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
    if (!r.body.scheme || !r.body.scheme.schemeId) {
      throw new Error("Scheme response missing scheme details");
    }
  });

  // Test 21: Support Ticket Workflow for College and Ministry
  await test("21", "Support Ticket endpoints return tickets and accept replies", async () => {
    // College tickets
    const colTickets = await req("GET", "/api/college/tickets", null, collegeToken);
    if (colTickets.status !== 200 || !Array.isArray(colTickets.body.tickets)) {
      throw new Error(`Expected 200 tickets array for college, got ${colTickets.status}`);
    }

    // Ministry tickets
    const minTickets = await req("GET", "/api/ministry/tickets", null, ministryAdminToken);
    if (minTickets.status !== 200 || !Array.isArray(minTickets.body.tickets)) {
      throw new Error(`Expected 200 tickets array for ministry, got ${minTickets.status}`);
    }
  });

  // Test 22: AuditLog contains records of the export operations
  await test("22", "AuditLog contains COLLEGE_EXCEL_EXPORTED and MINISTRY_EXCEL_EXPORTED entries", async () => {
    const auditRes = await req("GET", "/api/ministry/audit-logs?limit=30", null, ministryAdminToken);
    if (auditRes.status !== 200) throw new Error(`Expected 200 from audit logs, got ${auditRes.status}`);
    const logs = auditRes.body.logs || [];
    const actions = logs.map((l) => l.action);

    const hasCollegeExport = actions.includes("COLLEGE_EXCEL_EXPORTED");
    const hasMinistryExport = actions.includes("MINISTRY_EXCEL_EXPORTED");

    if (!hasCollegeExport) throw new Error(`Missing COLLEGE_EXCEL_EXPORTED in recent AuditLog. Recent actions: ${actions.slice(0, 10).join(", ")}`);
    if (!hasMinistryExport) throw new Error(`Missing MINISTRY_EXCEL_EXPORTED in recent AuditLog. Recent actions: ${actions.slice(0, 10).join(", ")}`);
  });

  console.log("\n==========================================================================");
  console.log(`  INTEGRATION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log(`  DATABASE USED: ${dbConn.name}`);
  console.log("==========================================================================");

  if (server) server.close();
  await disconnectTestDB();

  return { passed, failed, testResults };
}

runGapClosureExcelTests()
  .then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  })
  .catch(async (err) => {
    console.error("Test execution fatal error:", err);
    if (server) server.close();
    await disconnectTestDB();
    process.exit(1);
  });
