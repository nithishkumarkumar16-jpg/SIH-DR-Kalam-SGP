/**
 * Dedicated Test Database Configuration & Safeguard Module (SIH26239)
 * 
 * Strict Rules:
 * 1. Tests must execute against a dedicated test database (e.g., sgp_scholarship_test).
 * 2. Any attempt to run tests against the working application database (sgp_scholarship) is REFUSED.
 * 3. Never drop, clear, or reseed the working application database.
 * 4. Never expose connection credentials in logs.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");

const WORKING_APP_DB_NAME = "sgp_scholarship";
const DEFAULT_TEST_DB_NAME = "sgp_scholarship_test";
const DEFAULT_TEST_URI = `mongodb://127.0.0.1:27017/${DEFAULT_TEST_DB_NAME}`;

/**
 * Extract sanitized database name from a MongoDB connection URI.
 */
function extractDatabaseName(uri) {
  if (!uri || typeof uri !== "string") return "unknown";
  try {
    const cleaned = uri.replace(/^mongodb(\+srv)?:\/\//, "http://");
    const parsed = new URL(cleaned);
    const db = parsed.pathname.replace(/^\//, "").split("?")[0];
    return db || "unknown";
  } catch {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : "unknown";
  }
}

/**
 * Extract sanitized host and port without exposing username/password credentials.
 */
function extractSanitizedHost(uri) {
  if (!uri || typeof uri !== "string") return "unknown";
  try {
    const cleaned = uri.replace(/^mongodb(\+srv)?:\/\//, "http://");
    const parsed = new URL(cleaned);
    return `${parsed.hostname}${parsed.port ? ":" + parsed.port : ""}`;
  } catch {
    return "127.0.0.1:27017";
  }
}

/**
 * Safeguard: Refuses test execution against the working application database.
 */
function verifyDatabaseSafeguard(targetUri) {
  const dbName = extractDatabaseName(targetUri);
  const workingUri = process.env.MONGODB_URI || `mongodb://127.0.0.1:27017/${WORKING_APP_DB_NAME}`;
  const workingDbName = extractDatabaseName(workingUri);

  // 1. Strict refusal if matching the known working database name
  if (dbName === WORKING_APP_DB_NAME || dbName === workingDbName) {
    const errorMsg = `[CRITICAL SAFEGUARD] Test execution REFUSED against working application database "${dbName}". Tests must run against a dedicated test database (e.g., "${DEFAULT_TEST_DB_NAME}"). Never drop, clear or reseed the working database.`;
    throw new Error(errorMsg);
  }

  // 2. Strict requirement that test DB explicitly designates a test database
  if (!dbName.endsWith("_test") && !dbName.includes("test") && dbName !== DEFAULT_TEST_DB_NAME) {
    const errorMsg = `[CRITICAL SAFEGUARD] Test execution REFUSED: database "${dbName}" does not have a test designation (must include "test" or "_test"). Working data protection active.`;
    throw new Error(errorMsg);
  }

  return { ok: true, dbName };
}

/**
 * Get the trusted server-side test database URI.
 */
function getTestDatabaseUri() {
  const uri = process.env.TEST_MONGODB_URI || DEFAULT_TEST_URI;
  verifyDatabaseSafeguard(uri);
  return uri;
}

/**
 * Connect to the dedicated test database with active safeguard.
 */
async function connectTestDB(customUri) {
  const targetUri = customUri || getTestDatabaseUri();

  // Enforce safeguard before opening any connection
  verifyDatabaseSafeguard(targetUri);

  // If already connected, check if it's connected to the right test database
  if (mongoose.connection.readyState !== 0) {
    const currentDbName = mongoose.connection.name;
    if (currentDbName === extractDatabaseName(targetUri)) {
      return mongoose.connection;
    }
    // Disconnect from previous DB to switch to test DB cleanly
    await mongoose.disconnect();
  }

  const conn = await mongoose.connect(targetUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
  });

  const connectedDb = conn.connection.name;

  // Re-verify connected DB name against safeguard
  verifyDatabaseSafeguard(targetUri);
  if (connectedDb === WORKING_APP_DB_NAME) {
    await mongoose.disconnect();
    throw new Error(`[CRITICAL SAFEGUARD] Connected to forbidden working database "${connectedDb}". Disconnected immediately.`);
  }

  const sanitizedHost = extractSanitizedHost(targetUri);
  console.log(`[TEST DATABASE] Connected to dedicated test database: ${connectedDb} (${sanitizedHost})`);

  // Ensure test database has necessary seed data if empty
  const { User } = require("../models");
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log(`[TEST DATABASE] Initializing demo & statutory seed data in "${connectedDb}"...`);
    const { seed } = require("../seed");
    await seed(targetUri);
    console.log(`[TEST DATABASE] Seed completed for test database "${connectedDb}". Working database was untouched.`);
  }

  return conn.connection;
}

/**
 * Cleanly disconnect from test database.
 */
async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[TEST DATABASE] Disconnected from test database.");
  }
}

module.exports = {
  getTestDatabaseUri,
  verifyDatabaseSafeguard,
  connectTestDB,
  disconnectTestDB,
  extractDatabaseName,
  WORKING_APP_DB_NAME,
  DEFAULT_TEST_DB_NAME,
};
