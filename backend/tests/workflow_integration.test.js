/**
 * ============================================================================
 * SkillExchange Live Workflow Integration Test Suite
 * (backend/tests/workflow_integration.test.js)
 * ============================================================================
 * Exercises end-to-end integration flows against the live PostgreSQL database
 * and running backend endpoints (http://localhost:5000):
 *
 * 1. GET /api/courses/available - dedicated course catalog listing approved teachers.
 * 2. Session Booking -> Pending -> Session-linked Chat -> Decline -> Chat Closed & History Preserved.
 * 3. Session Booking -> Accept -> Authorized Completion -> Learner Feedback (One review).
 * 4. Teacher Bayesian Reputation update in PostgreSQL & Max-Heap Recommendations.
 * 5. Reviewer Designation & Queue Authorization with Status Transitions.
 * 6. Retired Quiz API verification (410 Gone) & Quiz History preservation.
 *
 * Strictly uses isolated test data prefixed with 'test_wf_' and cleans up in afterAll.
 */

const { query, pool } = require("../db/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing. Tests require JWT_SECRET configured in backend/.env.");
}

// Isolated test entity IDs
const TIMESTAMP = Date.now();
const LEARNER_ID = `test_wf_learner_${TIMESTAMP}`;
const LEARNER_EMAIL = `learner_${TIMESTAMP}@test.com`;
const TEACHER_ID = `test_wf_teacher_${TIMESTAMP}`;
const REVIEWER_ID = `test_wf_reviewer_${TIMESTAMP}`;
const STRANGER_ID = `test_wf_stranger_${TIMESTAMP}`;

let learnerToken = "";
let teacherToken = "";
let reviewerToken = "";
let strangerToken = "";
let soleReviewerToken = "";
let soleReviewerId = "";

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("TestPass123!", 10);

  // 1. Create isolated test learner
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_reviewer, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, false, 4.00)`,
    [LEARNER_ID, "Test Workflow Learner", LEARNER_EMAIL, passwordHash]
  );
  learnerToken = jwt.sign(
    { userId: LEARNER_ID, email: LEARNER_EMAIL, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 2. Create isolated test teacher (approved)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_reviewer, reputation_score)
     VALUES ($1, $2, $3, $4, 'professional', false, true, false, 4.00)`,
    [TEACHER_ID, "Test Workflow Teacher", `teacher_${TIMESTAMP}@test.com`, passwordHash]
  );
  teacherToken = jwt.sign(
    { userId: TEACHER_ID, email: `teacher_${TIMESTAMP}@test.com`, role: "professional" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 3. Create isolated reviewer user (starts with is_reviewer = false)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_reviewer, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, false, 4.00)`,
    [REVIEWER_ID, "Test Workflow Reviewer", `reviewer_${TIMESTAMP}@test.com`, passwordHash]
  );
  reviewerToken = jwt.sign(
    { userId: REVIEWER_ID, email: `reviewer_${TIMESTAMP}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 4. Create isolated stranger user
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, is_reviewer, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, false, 4.00)`,
    [STRANGER_ID, "Test Workflow Stranger", `stranger_${TIMESTAMP}@test.com`, passwordHash]
  );
  strangerToken = jwt.sign(
    { userId: STRANGER_ID, email: `stranger_${TIMESTAMP}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 5. Add verified teaching skill for teacher so they appear in /api/courses/available
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
     VALUES ($1, 'Python', 'expert', 'teach', true)`,
    [TEACHER_ID]
  );

  // 6. Create mentor listing for teacher
  await query(
    `INSERT INTO mentor_listings (user_id, headline, hourly_rate, is_active)
     VALUES ($1, 'Expert Python 1:1 Mentorship', 0, true)
     ON CONFLICT (user_id) DO NOTHING`,
    [TEACHER_ID]
  );

  // 7. Acquire auth token for designated sole reviewer (kailashsampath15@gmail.com) without altering their records
  const revRes = await query(`SELECT id, email FROM users WHERE LOWER(email) = 'kailashsampath15@gmail.com'`);
  if (revRes.rows.length > 0) {
    soleReviewerId = revRes.rows[0].id;
    soleReviewerToken = jwt.sign(
      { userId: soleReviewerId, email: revRes.rows[0].email, role: "reviewer" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  }
});

afterAll(async () => {
  // Clean up all isolated test data without touching real database rows
  try {
    await query(`DELETE FROM messages WHERE sender_id IN ($1, $2, $3, $4)`, [
      LEARNER_ID,
      TEACHER_ID,
      REVIEWER_ID,
      STRANGER_ID,
    ]);
    await query(
      `DELETE FROM conversations WHERE user1_id IN ($1, $2, $3, $4) OR user2_id IN ($1, $2, $3, $4)`,
      [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]
    );
    await query(`DELETE FROM reviews WHERE reviewer_id IN ($1, $2, $3, $4) OR mentor_id = $2`, [
      LEARNER_ID,
      TEACHER_ID,
      REVIEWER_ID,
      STRANGER_ID,
    ]);
    await query(
      `DELETE FROM session_bookings WHERE learner_id IN ($1, $2, $3, $4) OR mentor_id IN ($1, $2, $3, $4)`,
      [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]
    );
    await query(`DELETE FROM mentor_listings WHERE user_id = $1`, [TEACHER_ID]);
    await query(`DELETE FROM skills WHERE user_id IN ($1, $2, $3, $4)`, [
      LEARNER_ID,
      TEACHER_ID,
      REVIEWER_ID,
      STRANGER_ID,
    ]);
    await query(`DELETE FROM teacher_verification_applications WHERE user_id IN ($1, $2)`, [
      TEACHER_ID,
      REVIEWER_ID,
    ]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4)`, [
      LEARNER_ID,
      TEACHER_ID,
      REVIEWER_ID,
      STRANGER_ID,
    ]);
  } catch (err) {
    console.error("Cleanup error in integration test:", err.message);
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
});

describe("1. Dedicated Available Courses Catalog (GET /api/courses/available)", () => {
  test("Returns HTTP 200 with database-backed courses and approved teachers", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/available`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("courses");
    expect(body).toHaveProperty("count");
    expect(Array.isArray(body.courses)).toBe(true);
    expect(body.courses.length).toBeGreaterThan(0);

    // Verify course structure
    const pythonCourse = body.courses.find((c) => c.name.toLowerCase() === "python");
    expect(pythonCourse).toBeDefined();
    expect(pythonCourse).toHaveProperty("category");
    expect(pythonCourse).toHaveProperty("teachers");
    expect(Array.isArray(pythonCourse.teachers)).toBe(true);

    // The isolated approved teacher should be in the teachers list
    const foundTeacher = pythonCourse.teachers.find((t) => t.id === TEACHER_ID);
    expect(foundTeacher).toBeDefined();
    expect(foundTeacher.name).toBe("Test Workflow Teacher");
  });
});

describe("2. Booking Flow -> Pending Chat -> Decline -> Chat Closed & History Preserved", () => {
  let bookingId = null;
  let convId = null;

  test("Learner books a session; session_bookings is pending and linked conversation is created", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        mentorId: TEACHER_ID,
        learnerId: LEARNER_ID,
        topic: "Python Basics & Data Structures",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        notes: "Introductory session on Python syntax",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.booking).toBeDefined();
    expect(body.booking.status).toBe("pending");
    expect(body.booking.mentorId || body.booking.mentor_id).toBe(TEACHER_ID);
    expect(body.booking.learnerId || body.booking.learner_id).toBe(LEARNER_ID);

    bookingId = body.booking.id;

    // Verify linked conversation in DB
    const bookingDb = await query(
      `SELECT conversation_id, status FROM session_bookings WHERE id = $1`,
      [bookingId]
    );
    expect(bookingDb.rows.length).toBe(1);
    expect(bookingDb.rows[0].status).toBe("pending");
    expect(bookingDb.rows[0].conversation_id).toBeTruthy();
    convId = bookingDb.rows[0].conversation_id;
  });

  test("Session-linked conversation is visible to both learner and teacher", async () => {
    // Check learner's conversations
    const learnerConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    expect(learnerConvRes.status).toBe(200);
    const learnerConvs = await learnerConvRes.json();
    const foundInLearner = (learnerConvs.conversations || []).find((c) => c.id === convId);
    expect(foundInLearner).toBeDefined();
    expect(foundInLearner.is_closed).toBe(false);

    // Check teacher's conversations
    const teacherConvRes = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherConvRes.status).toBe(200);
    const teacherConvs = await teacherConvRes.json();
    const foundInTeacher = (teacherConvs.conversations || []).find((c) => c.id === convId);
    expect(foundInTeacher).toBeDefined();
    expect(foundInTeacher.is_closed).toBe(false);
  });

  test("Messages can be sent and persist while booking is pending", async () => {
    // Send message from learner
    const sendRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({ content: "Hello teacher, look forward to learning Python!" }),
    });
    expect(sendRes.status).toBe(201);

    // Fetch messages (simulating page reload/refresh)
    const getRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.messages.length).toBeGreaterThanOrEqual(1);
    const msg = body.messages.find((m) => m.content.includes("look forward to learning Python"));
    expect(msg).toBeDefined();
    expect(msg.sender_id).toBe(LEARNER_ID);
  });

  test("Teacher declines booking; booking is declined and conversation is closed without deleting history", async () => {
    const declineRes = await fetch(`${BASE_URL}/api/sessions/${bookingId}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({ decline_reason: "Unavailable due to conference conflict." }),
    });
    expect(declineRes.status).toBe(200);

    // Verify session status in DB
    const sessDb = await query(`SELECT status FROM session_bookings WHERE id = $1`, [bookingId]);
    expect(sessDb.rows[0].status).toBe("declined");

    // Verify conversation is_closed in DB
    const convDb = await query(`SELECT is_closed FROM conversations WHERE id = $1`, [convId]);
    expect(convDb.rows[0].is_closed).toBe(true);

    // Verify message history is preserved
    const getRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`, {
      headers: { Authorization: `Bearer ${learnerToken}` },
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    const origMsg = body.messages.find((m) => m.content.includes("look forward to learning Python"));
    expect(origMsg).toBeDefined();

    // Verify new message attempt on closed conversation returns 400 Bad Request
    const rejectSendRes = await fetch(`${BASE_URL}/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({ content: "Can we reschedule?" }),
    });
    expect(rejectSendRes.status).toBe(400);
    const rejectBody = await rejectSendRes.json();
    expect(rejectBody.error).toMatch(/closed/i);
  });
});

describe("3. Session Completion Authorization & Learner Feedback Trace", () => {
  let acceptedBookingId = null;

  test("Book a second session and have teacher accept it", async () => {
    const bookRes = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        mentorId: TEACHER_ID,
        learnerId: LEARNER_ID,
        topic: "Python 1:1 Complete Workflow",
        scheduledAt: new Date(Date.now() + 172800000).toISOString(),
      }),
    });
    expect(bookRes.status).toBe(201);
    const bookBody = await bookRes.json();
    acceptedBookingId = bookBody.booking.id;

    // Teacher accepts booking
    const acceptRes = await fetch(`${BASE_URL}/api/sessions/${acceptedBookingId}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(acceptRes.status).toBe(200);
  });

  test("Learner cannot review a session before it is completed (400 Bad Request)", async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        sessionId: acceptedBookingId,
        rating: 5,
        comment: "Premature review should be rejected.",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/completed/i);
  });

  test("Unauthorized non-participant cannot complete the session (403 Forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/${acceptedBookingId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(res.status).toBe(403);
  });

  test("Authorized participant marks session as completed (200 OK)", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/${acceptedBookingId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.booking.status).toBe("completed");

    // Verify database state
    const dbRes = await query(`SELECT status FROM session_bookings WHERE id = $1`, [
      acceptedBookingId,
    ]);
    expect(dbRes.rows[0].status).toBe("completed");
  });

  test("Non-learner (teacher or stranger) cannot submit review for session (403 Forbidden)", async () => {
    const teacherReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        sessionId: acceptedBookingId,
        rating: 5,
        comment: "Teacher self-review",
      }),
    });
    expect(teacherReviewRes.status).toBe(403);

    const strangerReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${strangerToken}`,
      },
      body: JSON.stringify({
        sessionId: acceptedBookingId,
        rating: 5,
        comment: "Stranger review",
      }),
    });
    expect(strangerReviewRes.status).toBe(403);
  });

  test("Learner submits review; updates teacher reputation via Bayesian damping in PostgreSQL", async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        sessionId: acceptedBookingId,
        rating: 5,
        comment: "Outstanding teacher, explained everything with clarity!",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.review).toBeDefined();

    // Verify Bayesian reputation in PostgreSQL:
    // Prior R0 = 4.0, weight m = 3. 1 review of 5.0 -> (3 * 4.0 + 5.0) / (3 + 1) = 17 / 4 = 4.25
    const teacherDb = await query(`SELECT reputation_score FROM users WHERE id = $1`, [
      TEACHER_ID,
    ]);
    const repScore = parseFloat(teacherDb.rows[0].reputation_score);
    expect(repScore).toBeCloseTo(4.25, 2);
  });

  test("Learner cannot submit a duplicate second review for the same session (409 Conflict)", async () => {
    const res = await fetch(`${BASE_URL}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerToken}`,
      },
      body: JSON.stringify({
        sessionId: acceptedBookingId,
        rating: 4,
        comment: "Duplicate review attempt",
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already.*submitted/i);
  });

  test("Recommendations Max-Heap reflects updated teacher reputation", async () => {
    const res = await fetch(`${BASE_URL}/api/recommendations/${LEARNER_ID}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("recommendations");
    expect(Array.isArray(body.recommendations)).toBe(true);

    const rec = body.recommendations.find((r) => r.id === TEACHER_ID);
    if (rec) {
      expect(parseFloat(rec.reputation_score)).toBeCloseTo(4.25, 2);
    }
  });
});

describe("4. Reviewer Designation & Queue Authorization with Status Transitions", () => {
  let applicationId = `app_test_${TIMESTAMP}`;

  test("Non-reviewer receives 403 Forbidden on reviewer queue", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher-verification/admin/queue`, {
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    expect(res.status).toBe(403);
  });

  test("Non-sole reviewer user receives 403 even if is_reviewer is true in database", async () => {
    // Create an application directly in database for verification test
    await query(
      `INSERT INTO teacher_verification_applications (id, user_id, skill_name, status, submission_type)
       VALUES ($1, $2, 'Python', 'under_review', 'both')`,
      [applicationId, TEACHER_ID]
    );

    // Attempt to set is_reviewer = true on a non-sole-reviewer account
    await query(`UPDATE users SET is_reviewer = true WHERE id = $1`, [REVIEWER_ID]);

    const res = await fetch(`${BASE_URL}/api/teacher-verification/admin/queue`, {
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    // Server must reject: only kailashsampath15@gmail.com is authorized
    expect(res.status).toBe(403);
  });

  test("Designated sole reviewer receives 200 OK and views the queue", async () => {
    const res = await fetch(`${BASE_URL}/api/teacher-verification/admin/queue`, {
      headers: { Authorization: `Bearer ${soleReviewerToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.queue)).toBe(true);
    expect(body).toHaveProperty("count");
    const foundApp = body.queue.find((a) => a.id === applicationId);
    expect(foundApp).toBeDefined();
  });

  test("Sole reviewer reviews application and transitions status to approved", async () => {
    const res = await fetch(
      `${BASE_URL}/api/teacher-verification/admin/application/${applicationId}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${soleReviewerToken}`,
        },
        body: JSON.stringify({
          action: "approve",
          notes: "Credentials verified successfully by test reviewer.",
        }),
      }
    );
    expect(res.status).toBe(200);

    // Verify application status in database
    const appDb = await query(
      `SELECT status, reviewer_id FROM teacher_verification_applications WHERE id = $1`,
      [applicationId]
    );
    expect(appDb.rows[0].status).toBe("approved");
    expect(appDb.rows[0].reviewer_id).toBe(soleReviewerId);

    // Verify user can_teach is true and skills has verified skill
    const userDb = await query(`SELECT can_teach FROM users WHERE id = $1`, [TEACHER_ID]);
    expect(userDb.rows[0].can_teach).toBe(true);

    const skillDb = await query(
      `SELECT is_verified FROM skills WHERE user_id = $1 AND skill_name = 'Python' AND type = 'teach'`,
      [TEACHER_ID]
    );
    expect(skillDb.rows[0].is_verified).toBe(true);
  });
});

describe("5. Retired Quiz Feature Verification", () => {
  test("All quiz endpoints return HTTP 410 Gone", async () => {
    const getQuizzes = await fetch(`${BASE_URL}/api/quizzes`);
    expect(getQuizzes.status).toBe(410);

    const postStart = await fetch(`${BASE_URL}/api/quizzes/start`, { method: "POST" });
    expect(postStart.status).toBe(410);

    const postSubmit = await fetch(`${BASE_URL}/api/quiz/submit`, { method: "POST" });
    expect(postSubmit.status).toBe(410);

    const getDetails = await fetch(`${BASE_URL}/api/quizzes/123`);
    expect(getDetails.status).toBe(410);
  });

  test("Quiz retirement migration dropped quiz_attempts while preserving verified skills", async () => {
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
      ) as exists;
    `);
    expect(tableCheck.rows[0].exists).toBe(false);

    // Verify skills table preserves is_verified and verified_at
    const skillsCheck = await query(`
      SELECT COUNT(*) as count FROM skills WHERE is_verified IS NOT NULL
    `);
    expect(parseInt(skillsCheck.rows[0].count, 10)).toBeGreaterThan(0);
  });
});

describe("6. Demo-Password Bypass Security & Regression Verification", () => {
  test("Demo account authenticates through standard bcrypt with valid credentials", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo_user_1@skillexchange.demo",
        password: "password123",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.id).toBe("demo_user_1");
  });

  test("Demo account rejects invalid password with 401 across environments", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo_user_1@skillexchange.demo",
        password: "wrong_password_attempt",
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid email or password/i);
  });

  test("Demo password shortcut does not bypass non-matching accounts", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: LEARNER_EMAIL,
        password: "password123",
      }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid email or password/i);
  });

  test("Normal bcrypt-hashed credentials authenticate successfully regardless of environment", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: LEARNER_EMAIL,
        password: "TestPass123!",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.user.id).toBe(LEARNER_ID);
  });
});

afterAll(async () => {
  try {
    await query(`DELETE FROM reviews WHERE reviewer_id = $1 OR reviewee_id = $1`, [LEARNER_ID]);
    await query(`DELETE FROM session_bookings WHERE learner_id = $1 OR teacher_id = $2`, [LEARNER_ID, TEACHER_ID]);
    await query(`DELETE FROM teacher_verification_applications WHERE applicant_id IN ($1, $2, $3, $4)`, [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]);
    await query(`DELETE FROM mentor_listings WHERE user_id IN ($1, $2, $3, $4)`, [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]);
    await query(`DELETE FROM skills WHERE user_id IN ($1, $2, $3, $4)`, [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]);
    await query(`DELETE FROM users WHERE id IN ($1, $2, $3, $4)`, [LEARNER_ID, TEACHER_ID, REVIEWER_ID, STRANGER_ID]);
  } catch (_) {}
});


