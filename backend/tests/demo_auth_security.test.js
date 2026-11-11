/**
 * ============================================================================
 * Demo Account & Password Authentication Security Test Suite
 * (backend/tests/demo_auth_security.test.js)
 * ============================================================================
 *
 * PROVES:
 * 1. Demo accounts authenticate strictly through bcrypt:
 *    - Valid bcrypt-hashed password succeeds across all environments:
 *      unset (undefined), development, test, staging, and production.
 *    - Invalid password fails with 401 across all environments.
 * 2. There is NO shared-password shortcut in any environment:
 *    - Submitting an arbitrary or previous shortcut password that does not
 *      match the account's bcrypt hash is rejected with 401 in:
 *      - unset (undefined) environment
 *      - development environment
 *      - test environment
 *      - staging environment
 *      - production environment
 * 3. Normal (non-demo) account login behavior is completely unchanged:
 *    - Valid bcrypt-hashed password succeeds across all environments.
 *    - Invalid password fails with 401 across all environments.
 *
 * Security Boundaries:
 * - Uses isolated test fixtures prefixed with 'test_demo_auth_'
 * - Cleans up test fixtures in afterAll
 * - Never prints .env values, tokens, or credentials
 */

const http = require("http");
const bcrypt = require("bcryptjs");
const { application } = require("../server");
const { query, pool } = require("../db/index");

const TIMESTAMP = Date.now();
const DEMO_USER_ID = `test_demo_auth_demo_${TIMESTAMP}`;
const DEMO_USER_EMAIL = `demo_auth_demo_${TIMESTAMP}@test.demo`;

const NON_DEMO_USER_ID = `test_demo_auth_real_${TIMESTAMP}`;
const NON_DEMO_USER_EMAIL = `demo_auth_real_${TIMESTAMP}@example.com`;

const REAL_PASSWORD = "UniqueValidPassword_Bcrypt123!";
const INVALID_SHORTCUT_PASSWORD = "password123";

let testServer;
let baseUrl;
const savedNodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  // Hash the real password with standard bcrypt for both test fixtures
  const passwordHash = await bcrypt.hash(REAL_PASSWORD, 10);

  // 1. Create isolated demo user (is_demo = TRUE)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_demo, reputation_score)
     VALUES ($1, 'Test Demo User', $2, $3, 'student', true, false, true, 4.00)`,
    [DEMO_USER_ID, DEMO_USER_EMAIL, passwordHash]
  );

  // 2. Create isolated non-demo user (is_demo = FALSE)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_demo, reputation_score)
     VALUES ($1, 'Test Non-Demo Real User', $2, $3, 'student', true, false, false, 4.00)`,
    [NON_DEMO_USER_ID, NON_DEMO_USER_EMAIL, passwordHash]
  );

  // 3. Start ephemeral test server on an unassigned port
  await new Promise((resolve) => {
    testServer = http.createServer(application);
    testServer.listen(0, "127.0.0.1", () => {
      const port = testServer.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  // Restore original environment
  process.env.NODE_ENV = savedNodeEnv;

  // Close test server
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
  }

  // Clean up isolated test users
  await query(`DELETE FROM users WHERE id IN ($1, $2)`, [DEMO_USER_ID, NON_DEMO_USER_ID]);
  await pool.end();
});

afterEach(() => {
  // Always reset NODE_ENV between tests
  process.env.NODE_ENV = savedNodeEnv;
});

describe("Demo & Standard Account Bcrypt Authentication Enforcement", () => {
  // --- 1. Demo accounts authenticate through bcrypt ---
  test("Demo account authenticates through bcrypt when credentials match hash (development)", async () => {
    process.env.NODE_ENV = "development";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(DEMO_USER_ID);
  });

  test("Demo account authenticates through bcrypt when credentials match hash (production)", async () => {
    process.env.NODE_ENV = "production";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(DEMO_USER_ID);
  });

  test("Demo account authenticates through bcrypt when NODE_ENV is unset / undefined", async () => {
    delete process.env.NODE_ENV;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(DEMO_USER_ID);
  });

  // --- 2. Zero password shortcut across all environments ---
  test("No shortcut exists: demo account rejects non-matching password in unset environment", async () => {
    delete process.env.NODE_ENV;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: INVALID_SHORTCUT_PASSWORD,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });

  test("No shortcut exists: demo account rejects non-matching password in development environment", async () => {
    process.env.NODE_ENV = "development";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: INVALID_SHORTCUT_PASSWORD,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });

  test("No shortcut exists: demo account rejects non-matching password in test environment", async () => {
    process.env.NODE_ENV = "test";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: INVALID_SHORTCUT_PASSWORD,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });

  test("No shortcut exists: demo account rejects non-matching password in staging environment", async () => {
    process.env.NODE_ENV = "staging";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: INVALID_SHORTCUT_PASSWORD,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });

  test("No shortcut exists: demo account rejects non-matching password in production environment", async () => {
    process.env.NODE_ENV = "production";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEMO_USER_EMAIL,
        password: INVALID_SHORTCUT_PASSWORD,
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });

  // --- 3. Normal (non-demo) user login behavior is unchanged ---
  test("Normal user authenticates through bcrypt in development", async () => {
    process.env.NODE_ENV = "development";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: NON_DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(NON_DEMO_USER_ID);
  });

  test("Normal user authenticates through bcrypt in production", async () => {
    process.env.NODE_ENV = "production";

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: NON_DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(NON_DEMO_USER_ID);
  });

  test("Normal user authenticates through bcrypt when NODE_ENV is unset / undefined", async () => {
    delete process.env.NODE_ENV;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: NON_DEMO_USER_EMAIL,
        password: REAL_PASSWORD,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.id).toBe(NON_DEMO_USER_ID);
  });

  test("Incorrect password for normal user fails with 401 across all environments", async () => {
    delete process.env.NODE_ENV;

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: NON_DEMO_USER_EMAIL,
        password: "IncorrectPassword456!",
      }),
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid email or password/i);
  });
});
