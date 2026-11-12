const http = require("http");
const bcrypt = require("bcryptjs");
const { query, pool } = require("../db/index");
const { application, initializeDatabaseAndDsa } = require("../server");

const TS = Date.now();
const LEARNER_ID = `test_rec_learner_${TS}`;
const UNVERIFIED_MENTOR_ID = `test_rec_unverified_${TS}`;
const VERIFIED_MENTOR_IDS = Array.from({ length: 8 }, (_, idx) => `test_rec_mentor_${idx + 1}_${TS}`);

let server;
let baseUrl = "";

async function apiGet(path, headers = {}) {
  const res = await fetch(`${baseUrl}${path}`, { method: "GET", headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

beforeAll(async () => {
  await initializeDatabaseAndDsa();

  const passwordHash = await bcrypt.hash("Pass123!Secure", 10);
  const uniqueSkill = `QuantumTesting_${TS}`;
  const requestSkill = `GraphAlgorithms_${TS}`;

  // Learner with 1 saved learning interest and 1 open skill request, plus a verified teach skill (must self-exclude)
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, active_mode, reputation_score)
     VALUES ($1, $2, $3, $4, 'student', true, true, 'learner', 4.50)`,
    [LEARNER_ID, "Rec Test Learner", `rec_learner_${TS}@test.com`, passwordHash]
  );
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
     VALUES ($1, $2, 'beginner', 'learn', FALSE),
            ($1, $2, 'expert', 'teach', TRUE)`,
    [LEARNER_ID, uniqueSkill]
  );
  await query(
    `INSERT INTO course_requests (requester_id, title, description, category, status)
     VALUES ($1, $2, 'Need help with graph algorithms', 'Computer Science', 'open')`,
    [LEARNER_ID, requestSkill]
  );

  // Unverified mentor teaching uniqueSkill — must be excluded
  await query(
    `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, active_mode, reputation_score)
     VALUES ($1, $2, $3, $4, 'professional', false, true, 'teacher', 5.00)`,
    [UNVERIFIED_MENTOR_ID, "Unverified Mentor", `rec_unver_${TS}@test.com`, passwordHash]
  );
  await query(
    `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
     VALUES ($1, $2, 'expert', 'teach', FALSE)`,
    [UNVERIFIED_MENTOR_ID, uniqueSkill]
  );

  // 8 verified mentors (7 matching saved learning interest, 1 matching open skill request)
  for (let i = 0; i < VERIFIED_MENTOR_IDS.length; i++) {
    const mId = VERIFIED_MENTOR_IDS[i];
    const rep = (4.9 - i * 0.1).toFixed(2);
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, can_learn, can_teach, active_mode, reputation_score)
       VALUES ($1, $2, $3, $4, 'professional', false, true, 'teacher', $5)`,
      [mId, `Verified Mentor ${i + 1}`, `rec_m_${i + 1}_${TS}@test.com`, passwordHash, rep]
    );
    const skillToTeach = i === 7 ? requestSkill : uniqueSkill;
    await query(
      `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
       VALUES ($1, $2, 'expert', 'teach', TRUE),
              ($1, 'Unverified Extra Skill', 'beginner', 'teach', FALSE)`,
      [mId, skillToTeach]
    );
  }

  server = http.createServer(application);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  const allUserIds = [LEARNER_ID, UNVERIFIED_MENTOR_ID, ...VERIFIED_MENTOR_IDS];
  await query("DELETE FROM course_requests WHERE requester_id = $1", [LEARNER_ID]).catch(() => {});
  await query("DELETE FROM skills WHERE user_id = ANY($1)", [allUserIds]).catch(() => {});
  await query("DELETE FROM users WHERE id = ANY($1)", [allUserIds]).catch(() => {});

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
});

describe("GET /api/recommendations/:userId", () => {
  test("returns all 8 verified matching mentors ranked strongest to weakest, excludes self and unverified skills", async () => {
    const res = await apiGet(`/api/recommendations/${LEARNER_ID}`, {
      "x-active-mode": "learner",
    });

    expect(res.status).toBe(200);
    expect(res.data.totalCount).toBe(8);
    expect(res.data.recommendations).toHaveLength(8);
    expect(res.data.scoringFormula).toBeUndefined();
    expect(res.data.algorithm).toBeUndefined();

    const returnedIds = res.data.recommendations.map((r) => r.id);
    expect(returnedIds).not.toContain(LEARNER_ID);
    expect(returnedIds).not.toContain(UNVERIFIED_MENTOR_ID);
    for (const mId of VERIFIED_MENTOR_IDS) {
      expect(returnedIds).toContain(mId);
    }

    // Scores are within 0-100 and sorted descending (strongest to weakest)
    for (let i = 0; i < res.data.recommendations.length; i++) {
      const rec = res.data.recommendations[i];
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
      if (i > 0) {
        expect(res.data.recommendations[i - 1].score).toBeGreaterThanOrEqual(rec.score);
      }
      // Unverified skills must not be included
      expect(rec.skills.every((s) => s.is_verified === true)).toBe(true);
      expect(rec.skills.map((s) => s.skill_name)).not.toContain("Unverified Extra Skill");
    }
  });

  test("returns empty recommendations in teacher mode", async () => {
    const res = await apiGet(`/api/recommendations/${LEARNER_ID}`, {
      "x-active-mode": "teacher",
    });

    expect(res.status).toBe(200);
    expect(res.data.mode).toBe("teacher");
    expect(res.data.recommendations).toEqual([]);
  });
});

