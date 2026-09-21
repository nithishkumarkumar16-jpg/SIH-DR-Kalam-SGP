/**
 * [RETIRED / ISOLATED TEST HARNESS]
 * SGP COMPREHENSIVE END-TO-END AUDIT SUITE
 * 
 * RETIREMENT NOTICE:
 * This comprehensive harness was used for initial manual-equivalent end-to-end audits.
 * It is now officially RETIRED in favor of focused, isolated test suites:
 * - test/rate_limit_regression.test.js
 * - test/rbac.test.js
 * - test/gap_closure_excel.test.js
 * - test/analytics_verification.test.js
 * 
 * SAFEGUARD ENFORCEMENT:
 * Refuses connection to the working application database ("sgp_scholarship") and port 5000.
 * If run, it binds to isolated port 5095 and dedicated test database "sgp_scholarship_test".
 */

const http = require("http");
const { createApp } = require("../server");
const { connectTestDB, disconnectTestDB } = require("./testDb");

const TEST_PORT = 5095;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
let serverInstance = null;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = options.headers || {};
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }
    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch (e) {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on("error", reject);

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runAudit() {
  console.log("==================================================================");
  console.log("  [RETIRED] SGP COMPREHENSIVE END-TO-END AUDIT (ISOLATED RUNNER)");
  console.log("==================================================================");

  const dbConn = await connectTestDB();
  console.log(`Test database connected: ${dbConn.name}`);
  const testApp = createApp();
  serverInstance = await new Promise((resolve) => {
    const s = testApp.listen(TEST_PORT, () => resolve(s));
  });
  console.log(`Isolated audit server running on port ${TEST_PORT}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1 & 4. Health & Common endpoints
    const health = await request("/api/common/colleges");
    assert(health.status === 200 && health.body.colleges?.length >= 4, "MongoDB connection & Public Colleges list");

    const schemes = await request("/api/common/schemes");
    assert(schemes.status === 200 && schemes.body.schemes?.length >= 9, "Public Schemes list returned from MongoDB");

    // 7. Student Registration & Login
    const testEmail = `audit.student.${Date.now()}@sgp.gov.in`;
    const regRes = await request("/api/auth/register", {
      method: "POST",
      body: {
        email: testEmail,
        password: "AuditPassword@123",
        fullName: "Karthik Audit Student",
        mobile: "9876543299",
        collegeId: "COL-GCT-01",
        course: "B.E. / B.Tech",
        department: "Computer Science",
        studyYear: "2nd Year",
        category: "ST",
      },
    });
    assert(regRes.status === 201 && regRes.body.token && regRes.body.user, "Student registration and JWT issue");

    const studentToken = regRes.body.token;
    const studentId = regRes.body.user.studentId;

    // Test Login with newly registered student
    const loginRes = await request("/api/auth/login", {
      method: "POST",
      body: { email: testEmail, password: "AuditPassword@123" },
    });
    assert(loginRes.status === 200 && loginRes.body.user.studentId === studentId, "Student login with fresh credentials");

    // 8. Student Profile Persistence
    const profGet = await request("/api/student/profile", { token: studentToken });
    assert(profGet.status === 200 && profGet.body.student.fullName === "Karthik Audit Student", "Student profile retrieval");

    const profUpdate = await request("/api/student/profile", {
      method: "PUT",
      token: studentToken,
      body: {
        familyIncome: 145000,
        registerNumber: "REG-2026-AUDIT-99",
        district: "Salem",
      },
    });
    assert(profUpdate.status === 200 && profUpdate.body.student.familyIncome === 145000, "Student profile update persistence in MongoDB");

    // 9. Student Application Persistence
    const createRes = await request("/api/student/applications", {
      method: "POST",
      token: studentToken,
      body: { schemeId: "SCHEME-NFST" },
    });
    assert(createRes.status === 201 && createRes.body.application, "Student application creation in MongoDB");
    const testAppId = createRes.body.application.applicationId;

    // 11. Document Verification Persistence (Client OCR Metadata)
    const docVerRes = await request(`/api/student/applications/${testAppId}/verify-document`, {
      method: "POST",
      token: studentToken,
      body: {
        documentType: "income",
        extractedFields: {
          name: "KARTHIK M",
          income: "145000",
          certNumber: "INC/2026/998877",
        },
        confidence: 93,
        verificationStatus: "VERIFIED",
        mismatch: false,
      },
    });
    assert(
      (docVerRes.status === 200 || docVerRes.status === 201) &&
        docVerRes.body.verification?.confidence === 93,
      "OCR Verification metadata saved to MongoDB (no raw files)"
    );

    // 12. Eligibility Result Persistence
    const eligRes = await request(`/api/student/applications/${testAppId}/save-eligibility`, {
      method: "POST",
      token: studentToken,
      body: {
        schemeId: "SCHEME-NFST",
        ruleVersion: "2026.1",
        evaluationResult: "ELIGIBLE",
        explanation: "Income INR 1,45,000 within INR 6,00,000 ceiling. Category ST matched.",
      },
    });
    assert(
      (eligRes.status === 200 || eligRes.status === 201) &&
        (eligRes.body.eligibility?.evaluationResult === "ELIGIBLE" || eligRes.body.result?.evaluationResult === "ELIGIBLE"),
      "Eligibility result saved to application in MongoDB"
    );

    // Submit Application to move from DRAFT to SUBMITTED
    const submitRes = await request(`/api/student/applications/${testAppId}/submit`, {
      method: "POST",
      token: studentToken,
    });
    assert(submitRes.status === 200 && submitRes.body.application.applicationStatus === "SUBMITTED", "Application submission state transition");

    // 13. Status check after logout & re-login
    const reLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: testEmail, password: "AuditPassword@123" },
    });
    const freshToken = reLogin.body.token;
    const myApps = await request("/api/student/applications", { token: freshToken });
    const myApp = myApps.body.applications.find((a) => a.applicationId === testAppId);
    assert(myApp && myApp.applicationStatus === "SUBMITTED", "Student sees correct application status after logout/login");

    // 14. Status history persistence
    const appDetails = await request(`/api/student/applications/${testAppId}`, { token: freshToken });
    assert(appDetails.status === 200 && appDetails.body.statusHistory?.length >= 2, "Status history audit trail persisted in MongoDB");

    // 16. Login as College Staff
    const collegeLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "staff@sgp.gov.in", password: "Staff@123" },
    });
    assert(collegeLogin.status === 200 && collegeLogin.body.user.role === "COLLEGE_STAFF", "College Staff login");
    const collegeToken = collegeLogin.body.token;

    // 17. College sees real MongoDB student & application
    const colApps = await request("/api/college/applications", { token: collegeToken });
    const colFoundApp = colApps.body.applications?.find((a) => a.applicationId === testAppId);
    assert(colFoundApp !== undefined, "College Staff sees real submitted application in MongoDB");

    // 18. College isolation: ensure College COL-GCT-01 only sees its own students
    const colStudents = await request("/api/college/students", { token: collegeToken });
    const allBelongToCollege = colStudents.body.students.every((s) => s.collegeId === "COL-GCT-01");
    assert(allBelongToCollege && colStudents.body.students.length > 0, "College strictly isolated to own institution data");

    // 19. Filters test against real MongoDB data
    const filterDept = await request("/api/college/students?department=Computer%20Science", { token: collegeToken });
    assert(filterDept.body.students.every((s) => s.department === "Computer Science"), "College Department filter verified against real records");

    const filterYear = await request("/api/college/students?studyYear=2nd%20Year", { token: collegeToken });
    assert(filterYear.body.students.every((s) => s.studyYear === "2nd Year"), "College Study Year filter verified against real records");

    // 15. Deficiency creation by College
    const createDef = await request(`/api/college/applications/${testAppId}/deficiency`, {
      method: "POST",
      token: collegeToken,
      body: {
        documentType: "income",
        type: "DATA_MISMATCH",
        description: "Income certificate issue date is not clearly legible. Please provide high-contrast scan.",
        severity: "MEDIUM",
      },
    });
    assert(createDef.status === 201 && createDef.body.deficiency, "Deficiency created and flagged by College");
    const defId = createDef.body.deficiency.deficiencyId;

    // Confirm application status updated to CORRECTION_REQUIRED
    const defAppCheck = await request(`/api/college/applications/${testAppId}`, { token: collegeToken });
    assert(defAppCheck.body.application.applicationStatus === "CORRECTION_REQUIRED", "Application status transitioned to CORRECTION_REQUIRED");

    // 15b. Student resolves deficiency via PUT
    const resolveDef = await request(`/api/student/deficiencies/${defId}/resolve`, {
      method: "PUT",
      token: freshToken,
      body: {
        resolutionNote: "Uploaded freshly scanned high-resolution e-Sevai income certificate.",
      },
    });
    assert(resolveDef.status === 200 && resolveDef.body.deficiency.status === "RESOLVED", "Student resolved deficiency and resubmitted");

    // 20. College review persistence (Decision: VERIFIED)
    const reviewRes = await request(`/api/college/applications/${testAppId}/review`, {
      method: "POST",
      token: collegeToken,
      body: {
        decision: "VERIFIED",
        comments: "Income certificate re-checked and verified bonafide credentials.",
      },
    });
    assert(reviewRes.status === 200 && reviewRes.body.application.applicationStatus === "COLLEGE_REVIEW", "College verification review persisted");

    // 21. Forwarding to Ministry
    const forwardRes = await request(`/api/college/applications/${testAppId}/forward`, {
      method: "POST",
      token: collegeToken,
      body: {
        comments: "Forwarded with verified institutional bonafide certificates.",
      },
    });
    assert(forwardRes.status === 200 && forwardRes.body.application.applicationStatus === "MINISTRY_SCRUTINY", "Application forwarded to Ministry Scrutiny in MongoDB");

    // 22. Login as Ministry Reviewer
    const revLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "reviewer@sgp.gov.in", password: "Reviewer@123" },
    });
    assert(revLogin.status === 200 && revLogin.body.user.role === "MINISTRY_REVIEWER", "Ministry Reviewer login");
    const revToken = revLogin.body.token;

    // 23. Ministry sees application
    const minApps = await request("/api/ministry/applications", { token: revToken });
    const minFound = minApps.body.applications?.find((a) => a.applicationId === testAppId);
    assert(minFound !== undefined, "Ministry Reviewer retrieves real forwarded application from MongoDB");

    // 24. Ministry multi-dimension filters
    const filterState = await request("/api/ministry/applications?state=Tamil%20Nadu", { token: revToken });
    assert(filterState.body.applications.every((a) => a.college?.state === "Tamil Nadu"), "Ministry State filter verified on real data");

    const filterStatus = await request("/api/ministry/applications?status=MINISTRY_SCRUTINY", { token: revToken });
    assert(filterStatus.body.applications.every((a) => a.applicationStatus === "MINISTRY_SCRUTINY"), "Ministry Status filter verified on real data");

    // 25. Ministry KPI cards calculated from real database aggregations
    const minStats = await request("/api/ministry/stats", { token: revToken });
    assert(
      minStats.status === 200 &&
        typeof minStats.body.stats.totalApplications === "number" &&
        minStats.body.stats.totalApplications >= 2,
      "Ministry KPI statistics calculated via live MongoDB aggregation pipeline"
    );

    // 26. College statistics from real database records (/api/ministry/colleges)
    const colStats = await request("/api/ministry/colleges", { token: revToken });
    const gctCol = colStats.body.colleges?.find((c) => c.collegeId === "COL-GCT-01");
    assert(
      colStats.status === 200 && colStats.body.colleges?.length >= 1 && gctCol && gctCol.studentsCount >= 1,
      "College performance statistics aggregated from real database records"
    );

    // 27. Selection permissions: Reviewer blocked from approving, Approver permitted
    const revAttempt = await request(`/api/ministry/applications/${testAppId}/selection`, {
      method: "POST",
      token: revToken,
      body: { decision: "SELECTED", reason: "Reviewer attempting selection" },
    });
    assert(revAttempt.status === 403, "Ministry Reviewer strictly blocked from Approver-only selection action (HTTP 403)");

    // Login as Ministry Approver
    const appLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "approver@sgp.gov.in", password: "Approver@123" },
    });
    assert(appLogin.status === 200 && appLogin.body.user.role === "MINISTRY_APPROVER", "Ministry Approver login");
    const appToken = appLogin.body.token;

    const selectRes = await request(`/api/ministry/applications/${testAppId}/selection`, {
      method: "POST",
      token: appToken,
      body: {
        decision: "SELECTED",
        reason: "Approved by National Selection Committee for Tribal Fellowship 2026.",
        sanctionedAmount: 54000,
      },
    });
    assert(selectRes.status === 200 && selectRes.body.application.applicationStatus === "SELECTED", "Ministry Approver executed official Selection in MongoDB");

    // 28. Payment tracking with real database records
    const paymentsRes = await request("/api/ministry/payments", { token: appToken });
    assert(
      paymentsRes.status === 200 &&
        typeof paymentsRes.body.summary.studentsPaidPercent === "number" &&
        paymentsRes.body.summary.studentsPaidPercent >= 0,
      "Payment records & zero-division safe payment metrics from MongoDB"
    );

    // Confirm Payment
    const createdPayment = paymentsRes.body.payments?.find((p) => p.applicationId === testAppId);
    if (createdPayment) {
      const payConfirm = await request(`/api/ministry/payments/${createdPayment.paymentId}/update-status`, {
        method: "POST",
        token: appToken,
        body: {
          paymentStatus: "CONFIRMED",
          paidAmount: 54000,
          paymentReference: "PFMS-UTR-2026-AUDIT-SUCCESS",
        },
      });
      assert(payConfirm.status === 200 && payConfirm.body.payment.paymentStatus === "CONFIRMED", "Payment status updated to CONFIRMED with UTR reference");
    }

    // 29. Manual External Government Portal Status Update
    const extUpdate = await request(`/api/applications/${testAppId}/external-status`, {
      method: "POST",
      token: appToken,
      body: {
        externalApplicationId: "NSP-2026-TA-998877",
        externalPortalSource: "National Scholarship Portal (scholarships.gov.in)",
        externalStatus: "SANCTIONED",
        evidenceReference: "Official NSP Gazette List 2026-27 Sr.No 142",
      },
    });
    assert(
      extUpdate.status === 200 &&
        extUpdate.body.application?.externalApplicationId === "NSP-2026-TA-998877" &&
        extUpdate.body.application?.externalStatus === "SANCTIONED",
      "Manual external government portal status updated and persisted"
    );

    // 30. Verify Audit Logs created (requires MINISTRY_ADMIN)
    const adminLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "ministry@sgp.gov.in", password: "Ministry@123" },
    });
    assert(adminLogin.status === 200 && adminLogin.body.user.role === "MINISTRY_ADMIN", "Ministry Admin login");
    const adminToken = adminLogin.body.token;

    const auditRes = await request("/api/ministry/audit-logs", { token: adminToken });
    const recentAudit = auditRes.body.logs?.find((l) => l.entityId === testAppId);
    assert(recentAudit !== undefined, "Audit log records created for application state transitions and reviews");

    // 31. Verify Notifications persisted
    const notifRes = await request("/api/student/notifications", { token: freshToken });
    assert(notifRes.status === 200 && Array.isArray(notifRes.body.notifications), "Notifications retrieved for the student");

    // 32. Cross-student access rejection (Student B cannot access Student A's application)
    const priyaLogin = await request("/api/auth/login", {
      method: "POST",
      body: { email: "student@sgp.gov.in", password: "Student@123" },
    });
    const priyaToken = priyaLogin.body.token;
    const crossStudentRes = await request(`/api/student/applications/${testAppId}`, { token: priyaToken });
    assert(
      crossStudentRes.status === 404 || crossStudentRes.status === 403,
      "Cross-student access strictly blocked (HTTP 404/403 IDOR protected)"
    );

    // 34. Student calling College or Ministry endpoints directly
    const stdToCol = await request("/api/college/stats", { token: freshToken });
    assert(stdToCol.status === 403, "Student blocked from accessing College APIs (HTTP 403)");

    const stdToMin = await request("/api/ministry/stats", { token: freshToken });
    assert(stdToMin.status === 403, "Student blocked from accessing Ministry APIs (HTTP 403)");

    // 35. College calling Ministry endpoints directly
    const colToMin = await request("/api/ministry/audit-logs", { token: collegeToken });
    assert(colToMin.status === 403, "College Staff blocked from accessing Ministry Audit APIs (HTTP 403)");

    console.log("==================================================================");
    console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`DATABASE USED: ${dbConn.name}`);
    console.log("==================================================================");

    if (serverInstance) serverInstance.close();
    await disconnectTestDB();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("AUDIT RUNNER EXCEPTION:", err);
    if (serverInstance) serverInstance.close();
    await disconnectTestDB();
    process.exit(1);
  }
}

runAudit();
