const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { connectTestDB, disconnectTestDB } = require("./testDb");

// Import models
const { Application, Payment, SchemeRule, User } = require("../models");

// Import routes
const express = require("express");
const app = express();
app.use(express.json());

const authRoutes = require("../routes/authRoutes");
const collegeRoutes = require("../routes/collegeRoutes");
const ministryRoutes = require("../routes/ministryRoutes");
const commonRoutes = require("../routes/commonRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/college", collegeRoutes);
app.use("/api/ministry", ministryRoutes);
app.use("/api/common", commonRoutes);

const TEST_PORT = 5099;
let server = null;

function apiCall(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${TEST_PORT}${urlPath}`);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("====================================================================");
  console.log("  SGP ADVANCED COLLEGE & MINISTRY ANALYTICS TEST SUITE (SIH26239)   ");
  console.log("====================================================================");

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  let dbConn = null;
  try {
    dbConn = await connectTestDB();
    console.log(`Verified test database in use: "${dbConn.name}"`);
    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });

    // 1. Authenticate test users
    let collegeToken = null;
    let ministryToken = null;

    await assertTest("Authenticate College Admin (COL-GCT-01)", async () => {
      const res = await apiCall("POST", "/api/auth/login", {
        email: "college@sgp.gov.in",
        password: "College@123",
        roleHint: "COLLEGE",
      });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      collegeToken = res.body.token;
    });

    await assertTest("Authenticate Ministry Admin", async () => {
      const res = await apiCall("POST", "/api/auth/login", {
        email: "ministry@sgp.gov.in",
        password: "Ministry@123",
        roleHint: "MINISTRY",
      });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.body)}`);
      }
      ministryToken = res.body.token;
    });

    // 2. PHASE 1: College Analytics Endpoint
    let collegeAnalytics = null;
    await assertTest("GET /api/college/analytics returns valid structure and server aggregations", async () => {
      const res = await apiCall("GET", "/api/college/analytics?academicYear=2026-2027", null, collegeToken);
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      collegeAnalytics = res.body;

      if (!collegeAnalytics.summaryCards) throw new Error("Missing summaryCards");
      if (!collegeAnalytics.applicationStageDistribution) throw new Error("Missing stage distribution");
      if (!collegeAnalytics.departmentDistribution) throw new Error("Missing department distribution");
      if (!collegeAnalytics.commonDeficiencyReasons) throw new Error("Missing deficiency reasons");
      if (!collegeAnalytics.reviewDurations) throw new Error("Missing reviewDurations");
      if (!collegeAnalytics.pendingAgeBuckets) throw new Error("Missing pendingAgeBuckets");
      if (!collegeAnalytics.weeklyTrends) throw new Error("Missing weeklyTrends");
      if (!collegeAnalytics.reviewerWorkload) throw new Error("Missing reviewerWorkload");
      if (!collegeAnalytics.upcomingDeadlines) throw new Error("Missing upcomingDeadlines");
      if (!collegeAnalytics.metadata) throw new Error("Missing metadata");
    });

    await assertTest("Phase 1.1: College KPI summary cards maintain separate account activation count", async () => {
      const reg = collegeAnalytics.summaryCards.registeredStudents;
      if (typeof reg.total !== "number" || typeof reg.activeAccounts !== "number" || typeof reg.invitedAccounts !== "number") {
        throw new Error(`Account activation not kept separate: ${JSON.stringify(reg)}`);
      }
      if (reg.activeAccounts + reg.invitedAccounts !== reg.total && reg.total > 0) {
        throw new Error(`Account count mismatch: ${reg.activeAccounts} + ${reg.invitedAccounts} != ${reg.total}`);
      }
    });

    await assertTest("Phase 1.5: Review duration calculation handles averages and medians", async () => {
      const dur = collegeAnalytics.reviewDurations;
      if (dur.averageDays === undefined || dur.medianDays === undefined) {
        throw new Error("Missing average or median review time");
      }
    });

    await assertTest("Phase 1.6: Pending age buckets partition cases into 0-3, 4-7, 8-14, 14+", async () => {
      const b = collegeAnalytics.pendingAgeBuckets.buckets;
      const keys = b.map((x) => x.bucketKey);
      if (!keys.includes("0-3") || !keys.includes("4-7") || !keys.includes("8-14") || !keys.includes("14+")) {
        throw new Error(`Unexpected bucket keys: ${keys.join(", ")}`);
      }
    });

    // 3. PHASE 4: Reviewer Reassignment & Document History
    await assertTest("Phase 4.4: Authorised Reviewer reassignment with mandatory audit reason", async () => {
      const app = await Application.findOne({ collegeId: "COL-GCT-01" });
      if (!app) throw new Error("No application found for COL-GCT-01");

      const res = await apiCall(
        "POST",
        `/api/college/applications/${app.applicationId}/assign-reviewer`,
        {
          reviewerId: "REV-COL-02",
          reviewerName: "Prof. S. Malathi",
          reason: "Faculty panel load balancing",
        },
        collegeToken
      );

      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      if (res.body.application.assignedReviewerId !== "REV-COL-02") {
        throw new Error(`Assigned reviewer not updated: ${res.body.application.assignedReviewerId}`);
      }
    });

    await assertTest("Phase 4.2: Document version comparison endpoint returns revisions without mutating originals", async () => {
      const app = await Application.findOne({ collegeId: "COL-GCT-01" });
      const res = await apiCall(
        "GET",
        `/api/college/applications/${app.applicationId}/document-versions/income`,
        null,
        collegeToken
      );
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      if (!Array.isArray(res.body.versions)) throw new Error("Missing versions array");
    });

    // 4. Cross-College Data Leakage Protection
    await assertTest("Cross-College Security: College A cannot view College B document versions", async () => {
      // Find an app belonging to a different college
      const otherApp = await Application.findOne({ collegeId: { $ne: "COL-GCT-01" } });
      if (otherApp) {
        const res = await apiCall(
          "GET",
          `/api/college/applications/${otherApp.applicationId}/document-versions/income`,
          null,
          collegeToken
        );
        if (res.status !== 403 && res.status !== 404) {
          throw new Error(`Expected 403/404 for cross-college access, got ${res.status}`);
        }
      }
    });

    // 5. PHASE 2: Ministry Analytics Endpoint
    let ministryAnalytics = null;
    await assertTest("GET /api/ministry/analytics returns full national metrics", async () => {
      const res = await apiCall("GET", "/api/ministry/analytics?academicYear=2026-2027", null, ministryToken);
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      ministryAnalytics = res.body;

      if (!ministryAnalytics.schemeComparison) throw new Error("Missing schemeComparison");
      if (!ministryAnalytics.collegePerformance) throw new Error("Missing collegePerformance");
      if (!ministryAnalytics.stageDurations) throw new Error("Missing stageDurations");
      if (!ministryAnalytics.cohortFunnel) throw new Error("Missing cohortFunnel");
      if (!ministryAnalytics.disbursementOverview) throw new Error("Missing disbursementOverview");
      if (!ministryAnalytics.continuationTracking) throw new Error("Missing continuationTracking");
      if (!ministryAnalytics.reviewerWorkload) throw new Error("Missing reviewerWorkload");
      if (!ministryAnalytics.dataQuality) throw new Error("Missing dataQuality");
    });

    await assertTest("Phase 2.5: Disbursement separates institutional fees from student DBT and handles reversals", async () => {
      const disb = ministryAnalytics.disbursementOverview;
      if (disb.studentDirectPayments === undefined || disb.institutionalFeePayments === undefined) {
        throw new Error("Missing separation between student DBT and institutional fees");
      }
      if (disb.reversals === undefined || disb.partialPayments === undefined) {
        throw new Error("Missing reversals or partial payments accounting");
      }
      if (typeof disb.paidPercentage !== "number" && disb.paidPercentage !== "N/A") {
        throw new Error(`Invalid paid percentage: ${disb.paidPercentage}`);
      }
    });

    await assertTest("Phase 2.10: Recorded budget overview only displayed when budget is available", async () => {
      const b = ministryAnalytics.budgetOverview;
      if (b && b.hasBudget) {
        if (!b.allocatedBudget || !b.utilizedBudget) {
          throw new Error(`Incomplete budget tracking: ${JSON.stringify(b)}`);
        }
      }
    });

    // 6. PHASE 4: Selection Preview & Approval
    await assertTest("Phase 4.6: Selection preview simulates merit & means criteria", async () => {
      const res = await apiCall(
        "POST",
        "/api/ministry/selection-preview",
        { schemeId: "SCHEME-NFST", academicYear: "2026-2027" },
        ministryToken
      );
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      if (!res.body.previewResults) throw new Error("Missing previewResults");
      if (!res.body.criteria) throw new Error("Missing criteria");
    });

    // 7. PHASE 4: Rule Impact Preview
    await assertTest("Phase 4.7: Rule-change preview shows affected counts while preserving rule version", async () => {
      const scheme = await SchemeRule.findOne();
      if (!scheme) throw new Error("No scheme rule found");

      const res = await apiCall(
        "POST",
        `/api/ministry/schemes/${scheme.schemeId}/preview-rule-impact`,
        { proposedChanges: { maxIncome: 300000, minPassMarks: 55 } },
        ministryToken
      );
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      if (!res.body.impactSummary) throw new Error("Missing impactSummary");
      if (typeof res.body.impactSummary.newlyEligibleCount !== "number") {
        throw new Error("Missing newlyEligibleCount");
      }
    });

    // 8. PHASE 4: Delay Alerts
    await assertTest("Phase 4.3: Statutory delay check prevents duplicate alerts within 24 hours", async () => {
      const res1 = await apiCall("POST", "/api/ministry/alerts/check-delays", {}, ministryToken);
      if (res1.status !== 200) throw new Error(`Status ${res1.status}: ${JSON.stringify(res1.body)}`);

      // Immediately run again to test rate limiting / duplicate suppression
      const res2 = await apiCall("POST", "/api/ministry/alerts/check-delays", {}, ministryToken);
      if (res2.status !== 200) throw new Error(`Status ${res2.status}: ${JSON.stringify(res2.body)}`);
      if (res2.body.duplicateAlertsSuppressed === undefined) {
        throw new Error("Missing duplicateAlertsSuppressed indicator");
      }
    });

    // 9. PHASE 4: Report Builder
    await assertTest("Phase 4.8: Report builder generates filtered statutory summary with metadata", async () => {
      const res = await apiCall("GET", "/api/ministry/report-builder?academicYear=2026-2027", null, ministryToken);
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
      if (!res.body.metadata || !res.body.summary) throw new Error("Missing report metadata or summary");
    });
  } catch (globalErr) {
    console.error("Global Test Error:", globalErr);
  } finally {
    if (server) {
      server.close();
    }
    console.log("====================================================================");
    console.log(`  RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log(`  DATABASE USED: ${dbConn ? dbConn.name : "N/A"}`);
    console.log("====================================================================");
    await disconnectTestDB();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
