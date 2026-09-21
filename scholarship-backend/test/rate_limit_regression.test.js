/**
 * Rate Limiting & Regression Test Suite
 * Aligned with SIH26239 correctness rules:
 * - Verifies that login limit is enforced (HTTP 429)
 * - Verifies that client-supplied headers (like 'x-sgp-test-suite') DO NOT bypass the limit
 * - Verifies Retry-After header format and retryAfter in JSON response
 * - Verifies separation between general API limit and login limit
 * - Verifies login becomes available after the configured window
 */

const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { createApp } = require("../server");
const { connectTestDB, disconnectTestDB, verifyDatabaseSafeguard } = require("./testDb");
const mongoose = require("mongoose");

const TEST_PORT = 5096;
let server = null;

function request(method, path, body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path,
        method,
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runRegressionSuite() {
  console.log("====================================================================");
  console.log("  SGP RATE LIMIT & BYPASS REGRESSION TEST SUITE                     ");
  console.log("====================================================================");

  const dbConn = await connectTestDB();
  console.log(`Verified test database in use: "${dbConn.name}"`);

  // Configure test server using trusted server-side startup parameters:
  // Short 2500ms window with 5-attempt limit for deterministic window testing
  const testApp = createApp({
    rateLimit: {
      enabled: true,
      loginMax: 5,
      loginWindowMs: 2500,
      apiMax: 50,
      apiWindowMs: 2500,
    },
  });

  server = await new Promise((resolve) => {
    const s = testApp.listen(TEST_PORT, () => resolve(s));
  });
  console.log(`Isolated regression test server running on port ${TEST_PORT}`);

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
    // 1. Send 5 failed login attempts to exhaust the 5-attempt quota
    console.log("\n--- Stage 1: Exhaust Login Limit (5 Allowed Attempts) ---");
    for (let i = 1; i <= 5; i++) {
      const res = await request("POST", "/api/auth/login", {
        email: "student@sgp.gov.in",
        password: "WrongPassword" + i,
      });
      assert(
        res.status === 401,
        `Attempt ${i}/5: Normal invalid login rejected with HTTP 401 (status: ${res.status})`
      );
    }

    // 2. 6th attempt must be rejected with HTTP 429 Too Many Requests
    console.log("\n--- Stage 2: Verify Rate Limit Enforcement (HTTP 429) ---");
    const blockedRes = await request("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "WrongPassword6",
    });
    assert(
      blockedRes.status === 429,
      `Attempt 6: Exceeded limit correctly rejected with HTTP 429 (status: ${blockedRes.status})`
    );

    const retryAfterHeader = blockedRes.headers["retry-after"];
    const retryAfterVal = Number(retryAfterHeader);
    assert(
      Number.isInteger(retryAfterVal) && retryAfterVal > 0,
      `Retry-After header is valid positive integer: "${retryAfterHeader}"`
    );

    assert(
      blockedRes.body &&
        typeof blockedRes.body.error === "string" &&
        blockedRes.body.error.includes("Too many login attempts"),
      `Response body contains descriptive rate-limit error message: "${blockedRes.body?.error}"`
    );

    assert(
      blockedRes.body && typeof blockedRes.body.retryAfter === "number" && blockedRes.body.retryAfter > 0,
      `Response body contains integer retryAfter field: ${blockedRes.body?.retryAfter}`
    );

    // 3. Attempt bypass using 'x-sgp-test-suite: true' header
    console.log("\n--- Stage 3: Verify Header Bypass is Impossible ---");
    const bypassRes = await request(
      "POST",
      "/api/auth/login",
      {
        email: "student@sgp.gov.in",
        password: "WrongPassword7",
      },
      {
        "x-sgp-test-suite": "true",
      }
    );
    assert(
      bypassRes.status === 429,
      `Request with 'x-sgp-test-suite: true' still rejected with HTTP 429 (Bypass successfully BLOCKED)`
    );

    // 4. Test API Limiter Separation
    console.log("\n--- Stage 4: Verify API Limiter Separation ---");
    const publicApiRes = await request("GET", "/api/common/schemes");
    assert(
      publicApiRes.status === 200,
      `General API route /api/common/schemes accessible with HTTP 200 while logins are rate-limited`
    );

    // 5. Test Window Recovery after configured window expires
    console.log("\n--- Stage 5: Verify Login Recovery After Window Elapses ---");
    console.log("Waiting 3000ms for 2500ms rate-limit window to expire...");
    await sleep(3000);

    const recoveryRes = await request("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "WrongPasswordAfterWindow",
    });
    assert(
      recoveryRes.status === 401,
      `After window reset, login attempts are accepted again (HTTP 401 instead of 429)`
    );

    // 6. Test Database Safeguard Refusal against Working Database
    console.log("\n--- Stage 6: Verify Database Safeguard Refuses Working DB ---");
    let safeguardTriggered = false;
    let safeguardError = "";
    try {
      verifyDatabaseSafeguard("mongodb://127.0.0.1:27017/sgp_scholarship");
    } catch (e) {
      safeguardTriggered = true;
      safeguardError = e.message;
    }
    assert(
      safeguardTriggered && safeguardError.includes("[CRITICAL SAFEGUARD]"),
      `Database safeguard successfully refused execution against working database "sgp_scholarship"`
    );

    console.log("\n====================================================================");
    console.log(`  REGRESSION TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log(`  DATABASE USED: ${dbConn.name}`);
    console.log("====================================================================");

    await disconnectTestDB();
    if (server) server.close();
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectTestDB();
  }
}

runRegressionSuite().catch(async (err) => {
  console.error("Fatal error in regression suite:", err);
  if (server) server.close();
  await disconnectTestDB();
  process.exit(1);
});
