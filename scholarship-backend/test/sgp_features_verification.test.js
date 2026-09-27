const http = require("http");
const { createApp } = require("../server");
const { connectTestDB, disconnectTestDB } = require("./testDb");
const { Application, Ticket, User } = require("../models");

const TEST_PORT = 5099;
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

async function runFeatureTests() {
  console.log("==================================================================");
  console.log("  SGP LIFECYCLE & SUPPORT TICKET WORKFLOW TEST SUITE");
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

  try {
    // Authenticate roles
    const studentLogin = await req("POST", "/api/auth/login", {
      email: "student@sgp.gov.in",
      password: "Student@123",
      roleHint: "STUDENT",
    });
    const studentToken = studentLogin.body.token;

    const collegeLogin = await req("POST", "/api/auth/login", {
      email: "college@sgp.gov.in",
      password: "College@123",
      roleHint: "COLLEGE",
    });
    const collegeToken = collegeLogin.body.token;

    const ministryLogin = await req("POST", "/api/auth/login", {
      email: "ministry@sgp.gov.in",
      password: "Ministry@123",
      roleHint: "MINISTRY",
    });
    const ministryToken = ministryLogin.body.token;

    // Find an existing application for student
    const existingApp = await Application.findOne({ studentId: "STU-2026-001" });
    if (!existingApp) throw new Error("Seed application not found for STU-2026-001");
    const appId = existingApp.applicationId;

    // 1. RBAC: Student cannot manually modify lifecycle status
    await test("Student blocked from updating lifecycle status directly (HTTP 403)", async () => {
      const r = await req("POST", `/api/college/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "SELECTION",
        stageLabel: "Selection Committee",
      }, studentToken);
      if (r.status !== 403) throw new Error(`Expected 403, got ${r.status}`);
    });

    // 2. College Admin updates lifecycle status for college application
    await test("College Admin updates application lifecycle status with audit history", async () => {
      const r = await req("POST", `/api/college/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "COLLEGE_REVIEW",
        stageLabel: "College Verification",
        note: "Verified bonafide certificate against college registry.",
        nextAction: "Forward to State/Ministry Scrutiny Committee",
        whoMustAct: "College Principal",
      }, collegeToken);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      if (r.body.application.lifecycleStage !== "COLLEGE_REVIEW") {
        throw new Error(`Expected lifecycleStage COLLEGE_REVIEW, got ${r.body.application.lifecycleStage}`);
      }
      if (r.body.application.whoMustAct !== "College Principal") {
        throw new Error(`Expected whoMustAct 'College Principal', got ${r.body.application.whoMustAct}`);
      }

      // Check StatusHistory collection
      const { StatusHistory } = require("../models");
      const histories = await StatusHistory.find({ applicationId: appId });
      const lastHistory = histories[histories.length - 1];
      if (!lastHistory || lastHistory.newStatus !== "COLLEGE_REVIEW") {
        throw new Error("StatusHistory was not properly appended");
      }
    });

    // 3. College Admin isolation: cannot update lifecycle status for another college
    await test("College Admin blocked from updating another college application (HTTP 403/404)", async () => {
      // Find an application from another college
      const otherApp = await Application.findOne({ collegeId: { $ne: existingApp.collegeId } });
      if (otherApp) {
        const r = await req("POST", `/api/college/applications/${otherApp.applicationId}/lifecycle-status`, {
          lifecycleStage: "MINISTRY_SCRUTINY",
        }, collegeToken);
        if (r.status !== 403 && r.status !== 404) {
          throw new Error(`Expected 403 or 404 for cross-college update, got ${r.status}`);
        }
      }
    });

    // 4. Ministry Admin updates lifecycle status
    await test("Ministry Admin updates application lifecycle status", async () => {
      const r = await req("POST", `/api/ministry/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "MINISTRY_SCRUTINY",
        stageLabel: "Ministry Scrutiny",
        note: "Merit list recommendation confirmed by joint committee.",
        nextAction: "Final quota selection evaluation",
        whoMustAct: "Ministry Scrutiny Committee",
      }, ministryToken);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${JSON.stringify(r.body)}`);
      if (r.body.application.lifecycleStage !== "MINISTRY_SCRUTINY") {
        throw new Error(`Expected lifecycleStage MINISTRY_SCRUTINY, got ${r.body.application.lifecycleStage}`);
      }
    });

    // 5. Support Ticket: Student creates ticket
    let createdTicketId = null;
    await test("Student creates support ticket with SGP-TKT-XXXX format", async () => {
      const r = await req("POST", "/api/student/tickets", {
        category: "College Verification",
        subject: "Verification timeline inquiry",
        message: "Why is my application still under college review? When will it be forwarded to ministry?",
        applicationId: appId,
      }, studentToken);
      if (r.status !== 201) throw new Error(`Expected 201, got ${r.status}: ${JSON.stringify(r.body)}`);
      if (!r.body.ticket || !r.body.ticket.ticketId.startsWith("SGP-TKT-")) {
        throw new Error(`Invalid ticket ID format: ${r.body.ticket?.ticketId}`);
      }
      if (r.body.ticket.status !== "OPEN") {
        throw new Error(`Expected status OPEN, got ${r.body.ticket.status}`);
      }
      createdTicketId = r.body.ticket.ticketId;
    });

    // 6. Support Ticket: Student lists own tickets
    await test("Student can retrieve own support tickets list", async () => {
      const r = await req("GET", "/api/student/tickets", null, studentToken);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const found = r.body.tickets.find((t) => t.ticketId === createdTicketId);
      if (!found) throw new Error("Created ticket not found in student ticket list");
    });

    // 7. Support Ticket: College Admin sees and replies to ticket
    await test("College Admin views ticket, replies, and updates status to IN_PROGRESS", async () => {
      const listRes = await req("GET", "/api/college/tickets", null, collegeToken);
      if (listRes.status !== 200) throw new Error(`Expected 200, got ${listRes.status}`);
      const found = listRes.body.tickets.find((t) => t.ticketId === createdTicketId);
      if (!found) throw new Error("Created ticket not visible in college tickets list");

      const replyRes = await req("POST", `/api/college/tickets/${createdTicketId}/reply`, {
        reply: "Your certificates are currently being verified by the college verification officer.",
        status: "IN_PROGRESS",
        adminNote: "Original 12th marksheet checked with department coordinator.",
        assignedTo: "Dr. K. Ramanathan",
      }, collegeToken);

      if (replyRes.status !== 200) throw new Error(`Expected 200, got ${replyRes.status}: ${JSON.stringify(replyRes.body)}`);
      if (replyRes.body.ticket.status !== "IN_PROGRESS") {
        throw new Error(`Expected status IN_PROGRESS, got ${replyRes.body.ticket.status}`);
      }
      if (replyRes.body.ticket.adminNote !== "Original 12th marksheet checked with department coordinator.") {
        throw new Error(`Admin note not saved`);
      }
      // Replies: 1 initial student message + 1 college reply = 2
      if (replyRes.body.ticket.replies.length !== 2) {
        throw new Error(`Expected 2 replies in replies array, got ${replyRes.body.ticket.replies.length}`);
      }
    });

    // 8. Support Ticket: Student sees reply and responds
    await test("Student views reply from admin and responds back", async () => {
      const getRes = await req("GET", `/api/student/tickets/${createdTicketId}`, null, studentToken);
      if (getRes.status !== 200) throw new Error(`Expected 200, got ${getRes.status}`);
      if (getRes.body.ticket.replies.length !== 2) {
        throw new Error(`Expected 2 replies, got ${getRes.body.ticket.replies.length}`);
      }
      if (getRes.body.ticket.status !== "IN_PROGRESS") {
        throw new Error(`Expected IN_PROGRESS status for student view`);
      }

      // Student reply
      const replyRes = await req("POST", `/api/student/tickets/${createdTicketId}/reply`, {
        reply: "Thank you for the update. I have also submitted the hardcopy to department.",
      }, studentToken);
      if (replyRes.status !== 200) throw new Error(`Expected 200, got ${replyRes.status}`);
      if (replyRes.body.ticket.status !== "WAITING_FOR_AUTHORITY") {
        throw new Error(`Expected WAITING_FOR_AUTHORITY after student reply, got ${replyRes.body.ticket.status}`);
      }
      if (replyRes.body.ticket.replies.length !== 3) {
        throw new Error(`Expected 3 replies, got ${replyRes.body.ticket.replies.length}`);
      }
    });

    // 9. Support Ticket: Ministry Admin views and resolves ticket
    await test("Ministry Admin resolves ticket with closure timestamp", async () => {
      const replyRes = await req("POST", `/api/ministry/tickets/${createdTicketId}/reply`, {
        reply: "Verification cleared and forwarded. Issue has been resolved.",
        status: "RESOLVED",
        adminNote: "Final resolution confirmed.",
      }, ministryToken);
      if (replyRes.status !== 200) throw new Error(`Expected 200, got ${replyRes.status}`);
      if (replyRes.body.ticket.status !== "RESOLVED") {
        throw new Error(`Expected RESOLVED status, got ${replyRes.body.ticket.status}`);
      }
      if (!replyRes.body.ticket.closedAt) {
        throw new Error("Expected closedAt timestamp to be set upon RESOLVED status");
      }
      if (replyRes.body.ticket.replies.length !== 4) {
        throw new Error(`Expected 4 replies in conversation thread, got ${replyRes.body.ticket.replies.length}`);
      }
    });

    // 10. Status Update Request: Student submits status update request
    let statusRequestId = null;
    await test("Student submits Status Update Request with SGP-STATUS ID and issueType", async () => {
      const res = await req("POST", "/api/student/tickets", {
        requestType: "STATUS_UPDATE_REQUEST",
        applicationId: appId,
        issueType: "Status Not Updated",
        category: "Application Status",
        subject: "Status Issue: Status Not Updated (" + appId + ")",
        message: "College verification completed on Friday but status is still showing College Review.",
        officialStatusAtSubmission: "COLLEGE_REVIEW",
      }, studentToken);

      if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
      statusRequestId = res.body.ticket.ticketId;
      if (!statusRequestId.startsWith("SGP-STATUS-")) {
        throw new Error(`Expected ticketId starting with SGP-STATUS-, got ${statusRequestId}`);
      }
      if (res.body.ticket.requestType !== "STATUS_UPDATE_REQUEST") {
        throw new Error(`Expected requestType STATUS_UPDATE_REQUEST, got ${res.body.ticket.requestType}`);
      }
      if (res.body.ticket.issueType !== "Status Not Updated") {
        throw new Error(`Expected issueType 'Status Not Updated', got ${res.body.ticket.issueType}`);
      }
      if (res.body.ticket.officialStatusAtSubmission !== "COLLEGE_REVIEW") {
        throw new Error(`Expected officialStatusAtSubmission 'COLLEGE_REVIEW', got ${res.body.ticket.officialStatusAtSubmission}`);
      }
    });

    // 11. Status Update Request: College admin sees status update request and updates official status
    await test("College Admin reviews Status Request and updates official lifecycle status", async () => {
      const ticketsRes = await req("GET", "/api/college/tickets", null, collegeToken);
      if (ticketsRes.status !== 200) throw new Error(`Expected 200, got ${ticketsRes.status}`);
      const found = ticketsRes.body.tickets.find((t) => t.ticketId === statusRequestId);
      if (!found) throw new Error(`Expected status request ${statusRequestId} in college tickets list`);
      if (found.requestType !== "STATUS_UPDATE_REQUEST") {
        throw new Error(`Expected requestType STATUS_UPDATE_REQUEST, got ${found.requestType}`);
      }

      // College officer updates official lifecycle status in response
      const updateRes = await req("POST", `/api/college/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "MINISTRY_SCRUTINY",
        stageLabel: "Ministry Scrutiny",
        nextAction: "Ministry scrutiny officer verifies institutional recommendation",
        whoMustAct: "Ministry Scrutiny Officer",
        note: "Verified certificates upon student status request; promoted to Ministry Scrutiny.",
      }, collegeToken);
      if (updateRes.status !== 200) throw new Error(`Expected 200, got ${updateRes.status}: ${JSON.stringify(updateRes.body)}`);
      if (updateRes.body.application.lifecycleStage !== "MINISTRY_SCRUTINY") {
        throw new Error(`Expected stage MINISTRY_SCRUTINY, got ${updateRes.body.application.lifecycleStage}`);
      }

      // College replies to status ticket
      const replyRes = await req("POST", `/api/college/tickets/${statusRequestId}/reply`, {
        reply: "Your verification has been completed and forwarded to Ministry Scrutiny.",
        status: "RESOLVED",
        adminNote: "Resolved via official lifecycle update",
      }, collegeToken);
      if (replyRes.status !== 200) throw new Error(`Expected 200, got ${replyRes.status}`);
      if (replyRes.body.ticket.status !== "RESOLVED") {
        throw new Error(`Expected RESOLVED status, got ${replyRes.body.ticket.status}`);
      }
    });

    // 12. Student manual selection updates lifecycle status with automatic admin sync
    await test("Student manual selection changes lifecycle status (In Process, Document Issues, Process) with Admin sync", async () => {
      // Test manual selection: Document Issues (CORRECTION_REQUIRED)
      const r1 = await req("POST", `/api/student/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "DOCUMENT_ISSUES",
        note: "Student flagged mismatch in caste certificate",
      }, studentToken);
      if (r1.status !== 200) throw new Error(`Expected 200, got ${r1.status}: ${JSON.stringify(r1.body)}`);
      if (r1.body.application.lifecycleStage !== "CORRECTION_REQUIRED") {
        throw new Error(`Expected CORRECTION_REQUIRED, got ${r1.body.application.lifecycleStage}`);
      }

      // Verify College Admin immediately sees updated status
      const colView = await req("GET", `/api/college/applications/${appId}`, null, collegeToken);
      if (colView.status !== 200) throw new Error(`Expected 200 from college view, got ${colView.status}`);
      if (colView.body.application.lifecycleStage !== "CORRECTION_REQUIRED") {
        throw new Error(`Expected college to see CORRECTION_REQUIRED, got ${colView.body.application.lifecycleStage}`);
      }

      // Test manual selection: In Process (COLLEGE_REVIEW)
      const r2 = await req("POST", `/api/student/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "IN_PROCESS",
        note: "Resubmitted documents, now in process",
      }, studentToken);
      if (r2.status !== 200) throw new Error(`Expected 200, got ${r2.status}`);
      if (r2.body.application.lifecycleStage !== "COLLEGE_REVIEW") {
        throw new Error(`Expected COLLEGE_REVIEW, got ${r2.body.application.lifecycleStage}`);
      }

      // Test manual selection: Process (SANCTIONED / Awarded)
      const r3 = await req("POST", `/api/student/applications/${appId}/lifecycle-status`, {
        lifecycleStage: "PROCESS",
        note: "Verification completed and approved",
      }, studentToken);
      if (r3.status !== 200) throw new Error(`Expected 200, got ${r3.status}`);
      if (r3.body.application.lifecycleStage !== "SANCTIONED") {
        throw new Error(`Expected SANCTIONED, got ${r3.body.application.lifecycleStage}`);
      }
    });

  } finally {
    if (server) {
      server.close();
    }
    await disconnectTestDB();
  }

  console.log("==================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runFeatureTests().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
