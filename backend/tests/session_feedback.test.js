const http = require("http");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { query, pool } = require("../db/index");
const { application, initializeDatabaseAndDsa } = require("../server");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is missing.");
}

const TS = Date.now();
const LEARNER_ID = `test_sf_learner_${TS}`;
const TEACHER_ID = `test_sf_teacher_${TS}`;
const STRANGER_ID = `test_sf_stranger_${TS}`;

const PENDING_SESSION_ID = `test_sf_sess_pending_${TS}`;
const DECLINED_SESSION_ID = `test_sf_sess_declined_${TS}`;
const CANCELLED_SESSION_ID = `test_sf_sess_cancelled_${TS}`;
const COMPLETED_SESSION_ID = `test_sf_sess_completed_${TS}`;

let server;
let baseUrl = "";
let learnerToken = "";
let teacherToken = "";
let strangerToken = "";

async function apiRequest(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

beforeAll(async () => {
  await initializeDatabaseAndDsa();

  const passwordHash = await bcrypt.hash("Pass123!Secure", 10);

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, 4.00)`,
    [LEARNER_ID, "Secret Learner Name", `sf_learner_${TS}@test.com`, passwordHash]
  );
  learnerToken = jwt.sign(
    { userId: LEARNER_ID, email: `sf_learner_${TS}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score)
     VALUES ($1, $2, $3, $4, 'professional', false, true, 4.00)`,
    [TEACHER_ID, "Test Feedback Teacher", `sf_teacher_${TS}@test.com`, passwordHash]
  );
  teacherToken = jwt.sign(
    { userId: TEACHER_ID, email: `sf_teacher_${TS}@test.com`, role: "professional" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, false, 4.00)`,
    [STRANGER_ID, "Test Stranger", `sf_stranger_${TS}@test.com`, passwordHash]
  );
  strangerToken = jwt.sign(
    { userId: STRANGER_ID, email: `sf_stranger_${TS}@test.com`, role: "student" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const sessionsToInsert = [
    [PENDING_SESSION_ID, "pending"],
    [DECLINED_SESSION_ID, "declined"],
    [CANCELLED_SESSION_ID, "cancelled"],
    [COMPLETED_SESSION_ID, "completed"],
  ];

  for (const [id, status] of sessionsToInsert) {
    await query(
      `INSERT INTO session_bookings (id, mentor_id, learner_id, scheduled_at, status, topic)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)`,
      [id, TEACHER_ID, LEARNER_ID, status, `Topic ${status}`]
    );
  }

  server = http.createServer(application);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await query("DELETE FROM notifications WHERE user_id IN ($1, $2, $3)", [
    LEARNER_ID,
    TEACHER_ID,
    STRANGER_ID,
  ]).catch(() => {});
  await query("DELETE FROM reviews WHERE session_id IN ($1, $2, $3, $4)", [
    PENDING_SESSION_ID,
    DECLINED_SESSION_ID,
    CANCELLED_SESSION_ID,
    COMPLETED_SESSION_ID,
  ]).catch(() => {});
  await query("DELETE FROM session_bookings WHERE id IN ($1, $2, $3, $4)", [
    PENDING_SESSION_ID,
    DECLINED_SESSION_ID,
    CANCELLED_SESSION_ID,
    COMPLETED_SESSION_ID,
  ]).catch(() => {});
  await query("DELETE FROM users WHERE id IN ($1, $2, $3)", [
    LEARNER_ID,
    TEACHER_ID,
    STRANGER_ID,
  ]).catch(() => {});

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

describe("Session Feedback & Anonymous Teacher Rating Workflow", () => {
  test("rejects non-learner access to GET /api/sessions/:id/feedback and POST /api/reviews", async () => {
    const getRes = await apiRequest(`/api/sessions/${COMPLETED_SESSION_ID}/feedback`, {
      token: strangerToken,
    });
    expect(getRes.status).toBe(403);

    const postRes = await apiRequest("/api/reviews", {
      method: "POST",
      token: strangerToken,
      body: {
        sessionId: COMPLETED_SESSION_ID,
        rating: 4,
        questions: { clarity: 4, interaction: 4, preparation: 4, materials: 4, engagement: 4 },
      },
    });
    expect(postRes.status).toBe(403);
  });

  test("disallows feedback for pending, declined, and cancelled sessions", async () => {
    for (const sessionId of [PENDING_SESSION_ID, DECLINED_SESSION_ID, CANCELLED_SESSION_ID]) {
      const getRes = await apiRequest(`/api/sessions/${sessionId}/feedback`, {
        token: learnerToken,
      });
      expect(getRes.status).toBe(200);
      expect(getRes.data.canSubmitFeedback).toBe(false);

      const postRes = await apiRequest("/api/reviews", {
        method: "POST",
        token: learnerToken,
        body: {
          sessionId,
          rating: 5,
          questions: { clarity: 5, interaction: 5, preparation: 5, materials: 5, engagement: 5 },
        },
      });
      expect(postRes.status).toBe(400);
    }
  });

  test("submits exact 3-star rating + 5 structured answers, hides updated reputation from learner, and blocks duplicates", async () => {
    const preGet = await apiRequest(`/api/sessions/${COMPLETED_SESSION_ID}/feedback`, {
      token: learnerToken,
    });
    expect(preGet.status).toBe(200);
    expect(preGet.data.canSubmitFeedback).toBe(true);
    expect(preGet.data.questions).toHaveLength(5);

    const submitRes = await apiRequest("/api/reviews", {
      method: "POST",
      token: learnerToken,
      body: {
        sessionId: COMPLETED_SESSION_ID,
        rating: 3,
        comment: "Clear explanations, could use more examples.",
        questions: {
          clarity: 5,
          interaction: 4,
          preparation: 2,
          materials: 2,
          engagement: 4,
        },
      },
    });

    expect(submitRes.status).toBe(201);
    expect(submitRes.data.success).toBe(true);
    expect(submitRes.data.review.rating).toBe(3);
    expect(submitRes.data.updatedReputation).toBeUndefined();
    expect(submitRes.data.reputationSummary).toBeUndefined();

    // Verify exact database persistence
    const dbRes = await query(
      `SELECT rating, clarity_rating, interaction_rating, preparation_rating, materials_rating, engagement_rating
       FROM reviews WHERE session_id = $1`,
      [COMPLETED_SESSION_ID]
    );
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0]).toEqual({
      rating: 3,
      clarity_rating: 5,
      interaction_rating: 4,
      preparation_rating: 2,
      materials_rating: 2,
      engagement_rating: 4,
    });

    // Duplicate submission rejected
    const dupRes = await apiRequest("/api/reviews", {
      method: "POST",
      token: learnerToken,
      body: {
        sessionId: COMPLETED_SESSION_ID,
        rating: 5,
        questions: { clarity: 5, interaction: 5, preparation: 5, materials: 5, engagement: 5 },
      },
    });
    expect(dupRes.status).toBe(409);

    // Reloading feedback page returns alreadySubmitted and exact rating 3
    const postGet = await apiRequest(`/api/sessions/${COMPLETED_SESSION_ID}/feedback`, {
      token: learnerToken,
    });
    expect(postGet.status).toBe(200);
    expect(postGet.data.canSubmitFeedback).toBe(false);
    expect(postGet.data.alreadySubmitted).toBe(true);
    expect(postGet.data.review.rating).toBe(3);
  });

  test("teacher history and profile show anonymous feedback and improvement areas without learner identity", async () => {
    const historyRes = await apiRequest(`/api/users/${TEACHER_ID}/history?role=teacher`, {
      token: teacherToken,
    });
    expect(historyRes.status).toBe(200);

    // Individual student session rows must not leak the review
    const completedRow = (historyRes.data.teachingSessions || []).find(
      (s) => s.id === COMPLETED_SESSION_ID
    );
    expect(completedRow).toBeDefined();
    expect(completedRow.review).toBeNull();

    // Anonymous feedback list & improvement areas are present without learner identity
    expect(historyRes.data.anonymousFeedback).toHaveLength(1);
    expect(historyRes.data.anonymousFeedback[0].reviewer_name).toBe("Anonymous Learner");
    expect(historyRes.data.anonymousFeedback[0].reviewer_id).toBeUndefined();
    expect(historyRes.data.anonymousFeedback[0].session_id).toBeUndefined();
    expect(historyRes.data.anonymousFeedback[0].rating).toBe(3);

    const improvementKeys = (historyRes.data.feedbackSummary?.improvementAreas || []).map(
      (a) => a.key
    );
    expect(improvementKeys).toEqual(expect.arrayContaining(["preparation", "materials"]));

    // Teacher profile also anonymizes reviewer identity
    const profileRes = await apiRequest(`/api/users/${TEACHER_ID}/profile`, {
      token: teacherToken,
    });
    expect(profileRes.status).toBe(200);
    expect(profileRes.data.reviews).toHaveLength(1);
    expect(profileRes.data.reviews[0].reviewer_name).toBe("Anonymous Learner");
    expect(profileRes.data.reviews[0].reviewer_id).toBeUndefined();
    expect(profileRes.data.reviews[0].rating).toBe(3);
  });
});

