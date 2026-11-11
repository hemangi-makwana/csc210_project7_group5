/**
 * ============================================================================
 * Prompt 2 Focused Integration Test Suite: Courses, Bookings & Separate Histories
 * (backend/tests/prompt2_workflow.test.js)
 * ============================================================================
 * Rigorously verifies the 6 Prompt 2 workflow requirements against PostgreSQL:
 *
 * 1. Available Courses: Shows courses with eligible, verified teachers and lets
 *    learners find the right teacher with teacher profile & bio details.
 * 2. Session Booking: Learner books a session with a selected teacher; creates real
 *    DB record with status 'pending' and coordination chat thread.
 * 3. Teacher Decision: Teacher sees incoming booking and can accept or decline it
 *    with a polite reason.
 * 4. Status Synchronization: Both learner and teacher accounts see the updated status
 *    and transparency into the decline reason.
 * 5. Strict History Separation: Learner history contains only learning sessions;
 *    teacher history contains only teaching sessions. Switching modes never mixes them.
 * 6. Catalog Integrity & Spelling Diagnostics: Unknown/misspelled course names produce
 *    useful diagnostic messages and suggestions, and are never silently added to skill_catalog.
 *
 * Fully isolated using 'test_p2_' prefixed fixtures and cleanly torn down in afterAll.
 */

const { query, pool } = require("../db/index");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const BASE_URL = "http://localhost:5000";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing.");
}

const TS = Date.now();
const LEARNER_A_ID = `test_p2_learner_${TS}`;
const TEACHER_B_ID = `test_p2_teacher_${TS}`;
const UNVERIFIED_TEACHER_ID = `test_p2_unver_${TS}`;
const STRANGER_ID = `test_p2_stranger_${TS}`;

let learnerAToken = "";
let teacherBToken = "";
let strangerToken = "";
let initialCatalogCount = 0;

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("Pass123!Secure", 10);

  // Record baseline skill_catalog count to prove zero catalog pollution
  const catRes = await query("SELECT COUNT(*)::int as count FROM skill_catalog");
  initialCatalogCount = catRes.rows[0].count;

  // 1. User A (Primary Learner, can also teach)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score, bio)
     VALUES ($1, $2, $3, $4, 'student', true, true, 4.50, 'Learner A interested in systems and Python')`,
    [LEARNER_A_ID, "Learner User A", `learner_a_${TS}@test.com`, passwordHash]
  );
  learnerAToken = jwt.sign(
    { userId: LEARNER_A_ID, email: `learner_a_${TS}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 2. User B (Verified Teacher for Python and Algorithms)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score, bio)
     VALUES ($1, $2, $3, $4, 'professional', true, true, 4.95, 'Expert software engineer with 10 years experience')`,
    [TEACHER_B_ID, "Teacher User B", `teacher_b_${TS}@test.com`, passwordHash]
  );
  teacherBToken = jwt.sign(
    { userId: TEACHER_B_ID, email: `teacher_b_${TS}@test.com`, role: "professional" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // 3. User C (Unverified Teacher - to test that unverified teachers do not appear in available courses)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score, bio)
     VALUES ($1, $2, $3, $4, 'student', true, true, 3.50, 'Unverified candidate')`,
    [UNVERIFIED_TEACHER_ID, "Unverified User C", `unverified_${TS}@test.com`, passwordHash]
  );

  // 4. Stranger User (for authorization checks)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, 4.00)`,
    [STRANGER_ID, "Stranger User D", `stranger_${TS}@test.com`, passwordHash]
  );
  strangerToken = jwt.sign(
    { userId: STRANGER_ID, email: `stranger_${TS}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Add verified teaching skill for Teacher B
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
     VALUES ($1, 'Python', 'expert', 'teach', true)`,
    [TEACHER_B_ID]
  );

  // Add unverified teaching skill for User C (is_verified = false)
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
     VALUES ($1, 'Python', 'beginner', 'teach', false)`,
    [UNVERIFIED_TEACHER_ID]
  );
});

afterAll(async () => {
  try {
    const ids = [LEARNER_A_ID, TEACHER_B_ID, UNVERIFIED_TEACHER_ID, STRANGER_ID];
    await query("DELETE FROM messages WHERE sender_id = ANY($1)", [ids]);
    await query("DELETE FROM conversations WHERE user1_id = ANY($1) OR user2_id = ANY($1)", [ids]);
    await query("DELETE FROM reviews WHERE reviewer_id = ANY($1) OR mentor_id = ANY($1)", [ids]);
    await query("DELETE FROM session_bookings WHERE learner_id = ANY($1) OR mentor_id = ANY($1)", [ids]);
    await query("DELETE FROM skills WHERE user_id = ANY($1)", [ids]);
    await query("DELETE FROM course_requests WHERE requester_id = ANY($1)", [ids]);
    await query("DELETE FROM users WHERE id = ANY($1)", [ids]);
  } catch (err) {
    console.error("Teardown error in prompt2_workflow.test.js:", err.message);
  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
});

describe("1. Available Courses Catalog & Verified Teacher Discovery", () => {
  test("GET /api/courses/available lists courses with verified teachers only", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/available`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.courses)).toBe(true);
    expect(body.count).toBeGreaterThan(0);

    const pythonCourse = body.courses.find((c) => c.name.toLowerCase() === "python");
    expect(pythonCourse).toBeDefined();
    expect(Array.isArray(pythonCourse.teachers)).toBe(true);

    // Verified Teacher B must be present
    const teacherB = pythonCourse.teachers.find((t) => t.id === TEACHER_B_ID);
    expect(teacherB).toBeDefined();
    expect(teacherB.name).toBe("Teacher User B");
    expect(teacherB.level).toBe("expert");
    expect(teacherB.bio).toContain("Expert software engineer");

    // Unverified User C must NOT be in the teachers list
    const unverifiedTeacher = pythonCourse.teachers.find((t) => t.id === UNVERIFIED_TEACHER_ID);
    expect(unverifiedTeacher).toBeUndefined();
  });
});

describe("2. Session Request & Booking Flow", () => {
  let createdBookingId = null;

  test("Rejects booking when mentor does not exist (404)", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        mentorId: "nonexistent_mentor_999",
        learnerId: LEARNER_A_ID,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        topic: "Python",
      }),
    });
    expect(res.status).toBe(404);
  });

  test("Rejects self-booking (400)", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        mentorId: LEARNER_A_ID,
        learnerId: LEARNER_A_ID,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        topic: "Python",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/yourself/i);
  });

  test("Learner A books a session with Teacher B; status is pending in DB", async () => {
    const scheduledTime = new Date(Date.now() + 86400000).toISOString();
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        mentorId: TEACHER_B_ID,
        learnerId: LEARNER_A_ID,
        scheduledAt: scheduledTime,
        topic: "Python",
        notes: "Help with async programming and generators",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.booking.status).toBe("pending");
    createdBookingId = body.booking.id;

    // Verify record in PostgreSQL database
    const dbRes = await query(
      "SELECT id, mentor_id, learner_id, status, topic, notes FROM session_bookings WHERE id = $1",
      [createdBookingId]
    );
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].status).toBe("pending");
    expect(dbRes.rows[0].mentor_id).toBe(TEACHER_B_ID);
    expect(dbRes.rows[0].learner_id).toBe(LEARNER_A_ID);
    expect(dbRes.rows[0].topic).toBe("Python");
  });
});

describe("3. Teacher Decision & Session Acceptance", () => {
  let pendingSessionId = null;

  beforeAll(async () => {
    // Create a fresh booking for accept test
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        mentorId: TEACHER_B_ID,
        learnerId: LEARNER_A_ID,
        scheduledAt: new Date(Date.now() + 100000000).toISOString(),
        topic: "Python Generators",
      }),
    });
    const body = await res.json();
    pendingSessionId = body.booking.id;
  });

  test("Teacher sees the pending request in their teaching history", async () => {
    const res = await fetch(`${BASE_URL}/api/users/${TEACHER_B_ID}/history?role=teacher`, {
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("teacher");
    expect(Array.isArray(body.teachingSessions)).toBe(true);

    const found = body.teachingSessions.find((s) => s.id === pendingSessionId);
    expect(found).toBeDefined();
    expect(found.status).toBe("pending");
    expect(found.learner.id).toBe(LEARNER_A_ID);
  });

  test("Unauthorized stranger cannot accept teacher session (403)", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/${pendingSessionId}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${strangerToken}` },
    });
    expect(res.status).toBe(403);
  });

  test("Teacher B accepts the session; status transitions to accepted in database", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/${pendingSessionId}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("accepted");

    // Verify DB
    const dbRes = await query("SELECT status FROM session_bookings WHERE id = $1", [pendingSessionId]);
    expect(dbRes.rows[0].status).toBe("accepted");
  });
});

describe("4. Teacher Decline & Decline Reason Transparency", () => {
  let declinableSessionId = null;
  const declineReasonText = "Unfortunately have an urgent conflict at this time. Please reschedule!";

  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        mentorId: TEACHER_B_ID,
        learnerId: LEARNER_A_ID,
        scheduledAt: new Date(Date.now() + 200000000).toISOString(),
        topic: "Python Unit Testing",
      }),
    });
    const body = await res.json();
    declinableSessionId = body.booking.id;
  });

  test("Teacher B declines booking with polite reason; thread is closed", async () => {
    const res = await fetch(`${BASE_URL}/api/sessions/${declinableSessionId}/decline`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherBToken}`,
      },
      body: JSON.stringify({ reason: declineReasonText }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("declined");

    // Verify DB record has declined_reason
    const dbRes = await query(
      "SELECT status, declined_reason, conversation_id FROM session_bookings WHERE id = $1",
      [declinableSessionId]
    );
    expect(dbRes.rows[0].status).toBe("declined");
    expect(dbRes.rows[0].declined_reason).toBe(declineReasonText);

    // Verify linked conversation is closed
    const convId = dbRes.rows[0].conversation_id;
    if (convId) {
      const convDb = await query("SELECT is_closed FROM conversations WHERE id = $1", [convId]);
      expect(convDb.rows[0].is_closed).toBe(true);
    }
  });

  test("Both Learner and Teacher see the declined status and the exact reason in history", async () => {
    // 1. Learner history
    const learnerRes = await fetch(`${BASE_URL}/api/users/${LEARNER_A_ID}/history?role=learner`, {
      headers: { Authorization: `Bearer ${learnerAToken}` },
    });
    expect(learnerRes.status).toBe(200);
    const learnerBody = await learnerRes.json();
    const learnerSess = learnerBody.sessions.find((s) => s.id === declinableSessionId);
    expect(learnerSess).toBeDefined();
    expect(learnerSess.status).toBe("declined");
    expect(learnerSess.declined_reason).toBe(declineReasonText);

    // 2. Teacher history
    const teacherRes = await fetch(`${BASE_URL}/api/users/${TEACHER_B_ID}/history?role=teacher`, {
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    expect(teacherRes.status).toBe(200);
    const teacherBody = await teacherRes.json();
    const teacherSess = teacherBody.sessions.find((s) => s.id === declinableSessionId);
    expect(teacherSess).toBeDefined();
    expect(teacherSess.status).toBe("declined");
    expect(teacherSess.declined_reason).toBe(declineReasonText);
  });
});

describe("5. Strict Learner vs. Teacher History Separation", () => {
  let reverseSessionId = null;

  beforeAll(async () => {
    // Add verified teaching skill for User A in Algorithms so User A can also teach
    await query(
      `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
       VALUES ($1, 'Algorithms', 'expert', 'teach', true)
       ON CONFLICT DO NOTHING`,
      [LEARNER_A_ID]
    );

    // Create a reverse session where User B is the learner and User A is the teacher
    const res = await fetch(`${BASE_URL}/api/sessions/book`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${teacherBToken}`,
      },
      body: JSON.stringify({
        mentorId: LEARNER_A_ID, // User A is mentor
        learnerId: TEACHER_B_ID, // User B is learner
        scheduledAt: new Date(Date.now() + 300000000).toISOString(),
        topic: "Algorithms",
      }),
    });
    const body = await res.json();
    reverseSessionId = body.booking.id;
  });

  test("User A's learner history contains only sessions where User A is the learner", async () => {
    const res = await fetch(`${BASE_URL}/api/users/${LEARNER_A_ID}/history?role=learner`, {
      headers: { Authorization: `Bearer ${learnerAToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("learner");

    // All returned sessions must have learner_id === LEARNER_A_ID
    for (const s of body.sessions) {
      expect(s.learner_id).toBe(LEARNER_A_ID);
    }
    // Reverse session (where User A was mentor) MUST NOT be present
    const reverseInLearner = body.sessions.find((s) => s.id === reverseSessionId);
    expect(reverseInLearner).toBeUndefined();
    expect(body.teachingSessions).toEqual([]);
  });

  test("User A's teacher history contains only sessions where User A is the teacher", async () => {
    const res = await fetch(`${BASE_URL}/api/users/${LEARNER_A_ID}/history?role=teacher`, {
      headers: { Authorization: `Bearer ${learnerAToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("teacher");

    // All returned sessions must have mentor_id === LEARNER_A_ID
    for (const s of body.sessions) {
      expect(s.mentor_id).toBe(LEARNER_A_ID);
    }
    // Reverse session MUST be present
    const reverseInTeacher = body.sessions.find((s) => s.id === reverseSessionId);
    expect(reverseInTeacher).toBeDefined();
    expect(body.learningSessions).toEqual([]);
  });

  test("Switching role parameter never mixes the two sets of records", async () => {
    const [learnerRes, teacherRes] = await Promise.all([
      fetch(`${BASE_URL}/api/users/${LEARNER_A_ID}/history?role=learner`, {
        headers: { Authorization: `Bearer ${learnerAToken}` },
      }),
      fetch(`${BASE_URL}/api/users/${LEARNER_A_ID}/history?role=teacher`, {
        headers: { Authorization: `Bearer ${learnerAToken}` },
      }),
    ]);

    const learnerData = await learnerRes.json();
    const teacherData = await teacherRes.json();

    const learnerIds = new Set(learnerData.sessions.map((s) => s.id));
    const teacherIds = new Set(teacherData.sessions.map((s) => s.id));

    // Intersection of learner and teacher session IDs must be completely disjoint
    for (const id of learnerIds) {
      expect(teacherIds.has(id)).toBe(false);
    }
  });
});

describe("6. Catalog Integrity & Unknown/Misspelled Course Handling", () => {
  test("Searching a misspelled course in Available Courses returns 200 with spelling suggestion", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/available?search=Pythn`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.courses).toEqual([]);
    expect(body.suggestion).toBe("Python");
    expect(body.message).toContain('Did you mean "Python"?');
  });

  test("Searching an unknown course returns 200 with useful message without suggestion", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/available?search=QuantumAlienBioengineering99`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.courses).toEqual([]);
    expect(body.suggestion).toBeNull();
    expect(body.message).toContain("does not exist in the course catalog");
  });

  test("GET /api/courses/validate returns valid: false and suggestion for typo", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/validate?name=Algorthms`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.suggestion).toBe("Algorithms");
  });

  test("GET /api/courses/validate returns valid: true for exact canonical course", async () => {
    const res = await fetch(`${BASE_URL}/api/courses/validate?name=Python`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.canonicalName).toBe("Python");
    expect(body.category).toBe("Programming & Software");
  });

  test("Mentor search by misspelled skill returns 200 with suggestion", async () => {
    const res = await fetch(`${BASE_URL}/api/skills/search?query=Pythn`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestion).toBe("Python");
    expect(body.message).toContain('Did you mean "Python"?');
  });

  test("Submitting a course request with a misspelled skill is rejected with 400 and suggestion", async () => {
    const res = await fetch(`${BASE_URL}/api/course-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        title: "Pythn",
        description: "Want to learn basics",
        category: "Programming & Software",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.suggestion).toBe("Python");
    expect(body.error).toContain('Did you mean "Python"?');
  });

  test("Submitting a course request with an unknown skill is rejected with 400", async () => {
    const res = await fetch(`${BASE_URL}/api/course-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${learnerAToken}`,
      },
      body: JSON.stringify({
        title: "CompletelyFakeCourseX99",
        description: "Fake course description",
        category: "General",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("does not exist in the course catalog");
  });

  test("CRITICAL: skill_catalog table count has not changed (no silent additions)", async () => {
    const catRes = await query("SELECT COUNT(*)::int as count FROM skill_catalog");
    const currentCount = catRes.rows[0].count;
    expect(currentCount).toBe(initialCatalogCount);

    // Verify none of the test queries entered the table
    const checkFake = await query(
      "SELECT id FROM skill_catalog WHERE name IN ('Pythn', 'Javscript', 'QuantumAlienBioengineering99', 'CompletelyFakeCourseX99')"
    );
    expect(checkFake.rows.length).toBe(0);
  });
});
