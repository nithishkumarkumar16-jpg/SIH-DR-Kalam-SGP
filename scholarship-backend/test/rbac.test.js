const http = require("http");
const { createApp } = require("../server");
const { connectTestDB, disconnectTestDB } = require("./testDb");

const TEST_PORT = 5098;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
let server = null;

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
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
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

async function runRBACTests() {
  console.log("==================================================================");
  console.log("  SGP BACKEND RBAC & OBJECT-LEVEL AUTHORIZATION TEST SUITE");
  console.log("==================================================================");

  const dbConn = await connectTestDB();
  console.log(`Verified test database in use: "${dbConn.name}"`);
  const testApp = createApp();
  server = await new Promise((res) => {
    const s = testApp.listen(TEST_PORT, () => res(s));
  });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  let studentToken = null;
  let collegeToken = null;
  let ministryAdminToken = null;
  let ministryReviewerToken = null;

  // 1. Authentication Tests
  await test("Student login with valid credentials (HTTP 200)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "Student@123",
      roleHint: "STUDENT",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Expected 200 with token, got ${r.status}`);
    studentToken = r.body.token;
  });

  await test("College Staff login with valid credentials (HTTP 200)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "college@sgp.gov.in",
      password: "College@123",
      roleHint: "COLLEGE",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Expected 200 with token, got ${r.status}`);
    collegeToken = r.body.token;
  });

  await test("Ministry Admin login with valid credentials (HTTP 200)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "ministry@sgp.gov.in",
      password: "Ministry@123",
      roleHint: "MINISTRY",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Expected 200 with token, got ${r.status}`);
    ministryAdminToken = r.body.token;
  });

  await test("Ministry Reviewer login with valid credentials (HTTP 200)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "reviewer@sgp.gov.in",
      password: "Reviewer@123",
      roleHint: "MINISTRY",
    });
    if (r.status !== 200 || !r.body.token) throw new Error(`Expected 200 with token, got ${r.status}`);
    ministryReviewerToken = r.body.token;
  });

  await test("Reject invalid credentials (HTTP 401)", async () => {
    const r = await req("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "WrongPassword!999",
    });
    if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
  });

  // 2. RBAC Access Control Tests
  await test("Student blocked from accessing College Dashboard API (HTTP 403)", async () => {
    const r = await req("GET", "/api/college/stats", null, studentToken);
    if (r.status !== 403) throw new Error(`Expected 403 Forbidden, got ${r.status}`);
  });

  await test("Student blocked from accessing Ministry Dashboard API (HTTP 403)", async () => {
    const r = await req("GET", "/api/ministry/stats", null, studentToken);
    if (r.status !== 403) throw new Error(`Expected 403 Forbidden, got ${r.status}`);
  });

  await test("College Staff blocked from accessing Ministry stats (HTTP 403)", async () => {
    const r = await req("GET", "/api/ministry/stats", null, collegeToken);
    if (r.status !== 403) throw new Error(`Expected 403 Forbidden, got ${r.status}`);
  });

  await test("Ministry Reviewer blocked from approving selection decision (HTTP 403)", async () => {
    const r = await req("POST", "/api/ministry/applications/APP-2026-0001/selection", {
      decision: "SELECTED",
      reason: "Unauthorized attempt by reviewer",
    }, ministryReviewerToken);
    if (r.status !== 403) throw new Error(`Expected 403 Forbidden for reviewer selection, got ${r.status}`);
  });

  // 3. Functional Tests
  await test("Student can retrieve own profile (HTTP 200)", async () => {
    const r = await req("GET", "/api/student/profile", null, studentToken);
    if (r.status !== 200 || !r.body.student) throw new Error(`Expected 200 with profile, got ${r.status}`);
  });

  await test("Student can view own applications (HTTP 200)", async () => {
    const r = await req("GET", "/api/student/applications", null, studentToken);
    if (r.status !== 200 || !Array.isArray(r.body.applications)) throw new Error(`Expected 200 with applications array, got ${r.status}`);
  });

  await test("College Staff can view their own college stats (HTTP 200)", async () => {
    const r = await req("GET", "/api/college/stats", null, collegeToken);
    if (r.status !== 200 || typeof r.body.stats?.totalStudents !== "number") throw new Error(`Expected 200 with college stats, got ${r.status}`);
  });

  await test("College Staff can list & filter their students (HTTP 200)", async () => {
    const r = await req("GET", "/api/college/students?department=Computer+Science", null, collegeToken);
    if (r.status !== 200 || !Array.isArray(r.body.students)) throw new Error(`Expected 200 with students array, got ${r.status}`);
  });

  await test("Ministry Admin can view aggregated stats & zero-division safe payment summary (HTTP 200)", async () => {
    const r = await req("GET", "/api/ministry/stats", null, ministryAdminToken);
    if (r.status !== 200 || typeof r.body.stats?.totalColleges !== "number") throw new Error(`Expected 200 with ministry stats, got ${r.status}`);

    const p = await req("GET", "/api/ministry/payments", null, ministryAdminToken);
    if (p.status !== 200 || typeof p.body.summary?.studentsPaidPercent !== "number") {
      throw new Error(`Expected valid payments summary with numeric percentage, got ${p.status}`);
    }
  });

  await test("Public common schemes and colleges are accessible without authentication (HTTP 200)", async () => {
    const s = await req("GET", "/api/common/schemes");
    if (s.status !== 200 || !Array.isArray(s.body.schemes)) throw new Error(`Public schemes failed with status ${s.status}`);

    const c = await req("GET", "/api/common/colleges");
    if (c.status !== 200 || !Array.isArray(c.body.colleges)) throw new Error(`Public colleges failed with status ${c.status}`);
  });

  console.log("==================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`DATABASE USED: ${dbConn.name}`);
  console.log("==================================================================");
  if (server) server.close();
  await disconnectTestDB();
  process.exit(failed > 0 ? 1 : 0);
}

runRBACTests().catch(async (err) => {
  console.error("Test execution failed:", err);
  if (server) server.close();
  await disconnectTestDB();
  process.exit(1);
});
