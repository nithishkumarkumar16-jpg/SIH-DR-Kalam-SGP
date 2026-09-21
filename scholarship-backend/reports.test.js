/**
 * [RETIRED / ISOLATED TEST HARNESS]
 * SGP /api/send-report Security & Functionality Verification
 * 
 * RETIREMENT NOTICE:
 * This standalone script was used to verify early report submission routes.
 * Core API security and rate limiting are now verified in:
 * - test/rate_limit_regression.test.js
 * 
 * SAFEGUARD ENFORCEMENT:
 * Strictly refuses connection to the working application database ("sgp_scholarship") and port 5000.
 * If run, it binds to isolated port 5094 and dedicated test database "sgp_scholarship_test".
 */

const http = require("http");
const { createApp } = require("./server");
const { connectTestDB, disconnectTestDB } = require("./test/testDb");

const TEST_PORT = 5094;
const BASE = `http://127.0.0.1:${TEST_PORT}`;
let serverInstance = null;

// Test helper to make POST request
function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const data = JSON.stringify(body);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("==================================================================");
  console.log("  [RETIRED] SGP /api/send-report Security & Functionality (ISOLATED)");
  console.log("==================================================================");

  const dbConn = await connectTestDB();
  console.log(`Test database connected: ${dbConn.name}`);
  const testApp = createApp();
  serverInstance = await new Promise((resolve) => {
    const s = testApp.listen(TEST_PORT, () => resolve(s));
  });
  console.log(`Isolated reports test server running on port ${TEST_PORT}`);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL: ${name}`, err.message);
    }
  }

  // 1. Missing CAPTCHA
  await test("Rejects request with missing CAPTCHA token (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "test@example.com",
      issueType: "Verification Error",
      message: "Test message",
      captchaToken: "",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 2. Invalid Email Format
  await test("Rejects invalid email format (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "invalid-email-address",
      issueType: "Verification Error",
      message: "Test message",
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 3. Oversized Message
  await test("Rejects oversized description > 4000 chars (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "test@example.com",
      issueType: "Verification Error",
      message: "a".repeat(4001),
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 4. Invalid Rating (<0 or >5)
  await test("Rejects invalid rating number (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "test@example.com",
      rating: 6,
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 5. Completely empty report
  await test("Rejects empty report with no rating, issueType, message or comments (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "",
      email: "",
      issueType: "",
      message: "",
      comment: "",
      rating: 0,
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 6. Extra unexpected fields (strict schema validation)
  await test("Rejects report with unexpected fields (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "test@example.com",
      issueType: "Other",
      message: "Test message",
      captchaToken: "local-dev-mock-captcha-token",
      unexpectedAdminField: "hack",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 7. Oversized Name (>100 chars)
  await test("Rejects oversized name > 100 chars (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "N".repeat(101),
      email: "test@example.com",
      issueType: "Other",
      message: "Test message",
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 8. Invalid CAPTCHA (short non-dev token)
  await test("Rejects invalid short CAPTCHA token (HTTP 400)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "Test User",
      email: "test@example.com",
      issueType: "Other",
      message: "Test message",
      captchaToken: "short-bad-token",
    });
    if (res.status !== 400) throw new Error(`Expected status 400, got ${res.status}`);
  });

  // 9. Missing SMTP Credentials (returns clear user-friendly HTTP 503 instead of fake success)
  await test("Returns clear HTTP 503 when SMTP credentials are unset (not fake success)", async () => {
    const res = await post(`${BASE}/api/send-report`, {
      name: "SAMPLE APPLICANT",
      email: "applicant@example.com",
      issueType: "Document Upload Issue",
      message: "OCR failed on Aadhaar date of birth",
      rating: 4,
      comment: "Portal interface is great",
      captchaToken: "local-dev-mock-captcha-token",
    });
    if (res.status !== 503) throw new Error(`Expected 503 for unconfigured SMTP, got ${res.status}`);
    if (!res.body?.error?.includes("Email service is not configured")) {
      throw new Error(`Unexpected error message: ${JSON.stringify(res.body)}`);
    }
  });

  // 10. Rate Limiting verification
  await test("Enforces rate limiting on repeated requests (HTTP 429)", async () => {
    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await post(`${BASE}/api/send-report`, {
        name: "Spam Test",
        email: "spam@example.com",
        issueType: "Other",
        message: "Spam message",
        captchaToken: "local-dev-mock-captcha-token",
      });
      if (res.status === 429) {
        got429 = true;
        break;
      }
    }
    if (!got429) throw new Error("Expected HTTP 429 rate limit error after repeated requests");
  });

  console.log(`\nResults: ${passed}/${total} test cases passed.`);
  console.log(`DATABASE USED: ${dbConn.name}`);
  console.log("==================================================================");

  if (serverInstance) serverInstance.close();
  await disconnectTestDB();
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(async (err) => {
  console.error("Test failure:", err);
  if (serverInstance) serverInstance.close();
  await disconnectTestDB();
  process.exit(1);
});


