/**
 * ============================================================================
 * LOCAL SKILL EXCHANGE & COMMUNITY LEARNING PLATFORM - BACKEND SERVER
 * ============================================================================
 *
 * WHAT IS A SERVER? (PLAIN ENGLISH EXPLANATION FOR VIVA DEFENSE):
 * A server is simply a computer program that runs continuously in the
 * background, waiting for incoming messages (called "requests") from other
 * programs (like a web browser or mobile app, called the "frontend").
 *
 * When you open a website and type "Python" into a search box, your browser
 * sends an HTTP request across the internet to this file. This file receives
 * the request, does some work (like searching our Hash Table), and sends back
 * an answer (called a "response") containing the data formatted as JSON.
 *
 * WHAT DOES EXPRESS DO?
 * Node.js lets us run JavaScript outside a browser.
 * Express is a lightweight tool (framework) for Node.js that makes it easy to:
 * 1. Define "routes" or "endpoints" (URLs where the frontend can send requests).
 * 2. Read incoming data (like search keywords or booking form submissions).
 * 3. Send back formatted responses (JSON data and HTTP status codes like 200 OK).
 *
 * WHAT IS A PORT (PORT 5000)?
 * Think of a computer's IP address like an apartment building's street address.
 * The "port number" is like the specific apartment number inside that building.
 * Running on port 5000 means our backend program lives at apartment #5000.
 *
 * WHAT IS CORS (CROSS-ORIGIN RESOURCE SHARING)?
 * By default, web browsers block websites on one port (e.g. frontend on port 5173)
 * from talking to a backend on another port (e.g. backend on port 5000) for security.
 * Enabling CORS tells the browser: "It is safe to let our frontend talk to this backend!"
 * ============================================================================
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const emailService = require("./services/emailService");
const HashTable = require("./dsa/hashTable");
const Queue = require("./dsa/queue");
const Graph = require("./dsa/graph");
const MaxHeap = require("./dsa/heap");
const { pool, query, checkConnection, isPoolInitialized } = require("./db/index");
const { setupDatabase } = require("./db/setup");
const {
  hasQuestionBank,
  generateQuiz,
  getQuestionDetails,
  getSupportedSkills,
} = require("./quizzes/questionBanks");

// In-memory active quiz sessions Map: quizId -> { quizId, userId, skillName, answerKey, clientQuestions, expiresAt }
const activeQuizSessions = new Map();

// Periodic cleanup of expired quiz sessions (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [quizId, session] of activeQuizSessions.entries()) {
    if (session.expiresAt && session.expiresAt < now) {
      activeQuizSessions.delete(quizId);
    }
  }
}, 10 * 60 * 1000);

// JWT signing secret — loaded from backend/.env, never hardcoded.
// If missing, auth routes will return 500 rather than sign a token with no secret.
const JWT_SECRET = process.env.JWT_SECRET || null;
const JWT_EXPIRES_IN = "7d";

// Create the Express application instance
const application = express();
const PORT = process.env.PORT || 5000;

// Middleware 1: Enable CORS so the React frontend can make requests to this backend
application.use(cors());

// Middleware 2: Automatically parse incoming JSON request bodies into JavaScript objects
application.use(express.json());

// Ensure local uploads/avatars directory exists
const uploadsDir = path.join(__dirname, "uploads");
const avatarsDir = path.join(uploadsDir, "avatars");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

// Static file serving for uploaded profile photos
application.use("/uploads", express.static(uploadsDir));

// Multer storage engine for avatar images
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".png";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".png";
    const filename = `avatar_${req.user.userId}_${Date.now()}${safeExt}`;
    cb(null, filename);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum
  fileFilter: function (req, file, cb) {
    const allowedMime = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPG, PNG, and WebP images are permitted."));
    }
  },
});

/**
 * Authentication Middleware: authenticateToken
 * Verifies the JWT Bearer token from the incoming request's Authorization header.
 * Attaches decoded user payload { userId, email, role } to request.user.
 * Protects endpoints and ensures users can only access/modify authorized resources.
 */
function authenticateToken(request, response, next) {
  const authHeader = request.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return response.status(401).json({
      error: "Authentication required. Please log in to perform this action.",
    });
  }

  if (!JWT_SECRET) {
    return response.status(500).json({
      error: "Server configuration error: JWT_SECRET is not configured in backend/.env.",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    request.user = decoded;
    next();
  } catch (err) {
    return response.status(401).json({
      error: "Invalid or expired session token. Please log in again.",
    });
  }
}

/**
 * Helper: matchSkillsAndNotifyLearners
 * Scans open course requests matching the provided teachable skill names (case-insensitively).
 * Creates notifications for requesting learners and marks requests as fulfilled.
 * Prevents duplicate notifications and ignores self-matches.
 *
 * @param {object} dbClient - Dedicated PostgreSQL client (inside an active transaction) or query runner
 * @param {string} teacherId - ID of the mentor/teacher
 * @param {string} teacherName - Display name of the mentor/teacher
 * @param {Array<string>} teachSkillNames - Array of skill names taught
 * @returns {Promise<Array>} List of notifications created
 */
async function matchSkillsAndNotifyLearners(dbClient, teacherId, teacherName, teachSkillNames) {
  const notificationsCreated = [];
  if (!teachSkillNames || !Array.isArray(teachSkillNames) || teachSkillNames.length === 0) {
    return notificationsCreated;
  }

  for (const rawSkillName of teachSkillNames) {
    if (!rawSkillName || typeof rawSkillName !== "string") continue;
    const cleanSkill = rawSkillName.trim();
    if (!cleanSkill) continue;

    // Find open course requests matching this skill (case-insensitive), excluding teacher's own requests
    const matchesRes = await dbClient.query(
      `SELECT id, requester_id, title
       FROM course_requests
       WHERE status = 'open'
         AND LOWER(title) = LOWER($1)
         AND requester_id != $2`,
      [cleanSkill, teacherId]
    );

    for (const match of matchesRes.rows) {
      const learnerId = match.requester_id;
      const targetLink = `/skills/search?query=${encodeURIComponent(cleanSkill)}`;

      // Check if notification already exists to avoid duplicate notifications
      const existingNotif = await dbClient.query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND type = 'course_match'
           AND (link = $2 OR message LIKE $3)`,
        [learnerId, targetLink, `%${cleanSkill}%`]
      );

      if (existingNotif.rows.length === 0) {
        const notifTitle = `Skill Now Available: ${cleanSkill}`;
        const notifMsg = `Great news! ${teacherName || "A mentor"} is now offering to teach "${cleanSkill}", matching your course request "${match.title}".`;

        const insertNotif = await dbClient.query(
          `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
           VALUES ($1, 'course_match', $2, $3, $4, FALSE, CURRENT_TIMESTAMP)
           RETURNING id, user_id, type, title, message, link, is_read, created_at`,
          [learnerId, notifTitle, notifMsg, targetLink]
        );

        // Mark course request as fulfilled
        await dbClient.query(
          `UPDATE course_requests
           SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [match.id]
        );

        notificationsCreated.push(insertNotif.rows[0]);

        // Asynchronously dispatch email notification if learner has email configured
        dbClient.query("SELECT email, name FROM users WHERE id = $1", [learnerId])
          .then((lRes) => {
            if (lRes.rows && lRes.rows[0]) {
              emailService.notifyCourseMatch({
                learnerEmail: lRes.rows[0].email,
                learnerName: lRes.rows[0].name,
                skillName: cleanSkill,
                teacherName: teacherName,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }

  return notificationsCreated;
}

// ----------------------------------------------------------------------------
// DATA STRUCTURE INSTANCES (ALGORITHMIC CORE ENGINE)
// ----------------------------------------------------------------------------

// Hash Table for O(1) instant lookup of mentors by skill name
const skillHashTable = new HashTable(31);

// FIFO Queue for processing mentor session bookings in the order received
const bookingQueue = new Queue();

// Adjacency List Graph for modeling learner-mentor relationships and community proximity
const mentorGraph = new Graph();

// ----------------------------------------------------------------------------
// SEED DATA POPULATION & POSTGRESQL SYNCHRONIZATION
// ----------------------------------------------------------------------------

/**
 * Initial list of mentors used for fallback and initial PostgreSQL seeding.
 *
 * WHY 20 MENTORS? (VIVA DEFENSE POINT):
 * 20 is a representative sample size chosen for demo purposes — it gives the Hash Table
 * enough real entries to distribute meaningfully across its 31 buckets and produces
 * visible collision chains (multiple mentors per skill bucket) without overwhelming
 * the in-memory data. However, the Hash Table itself has NO fixed capacity limit:
 * it uses separate chaining (arrays inside each bucket), so it can hold arbitrarily
 * more mentors simply by calling hashTable.insert() more times — zero code changes needed.
 */
const seedUsers = [
  // ---- ORIGINAL 7 MENTORS ----
  {
    userId: "user_1",
    name: "Alice Chen",
    role: "professional",
    skills: ["Python", "Web Design"],
    reputationScore: 4.9,
    bio: "Senior full-stack developer specialising in Python back-ends and responsive web design.",
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Web Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_2",
    name: "Bob Smith",
    role: "student",
    skills: ["Python", "Guitar"],
    reputationScore: 4.5,
    bio: "CS undergraduate who loves algorithms and plays acoustic guitar on weekends.",
    skillEntries: [
      { skillName: "Python", level: "intermediate" },
      { skillName: "Guitar", level: "beginner" },
    ],
  },
  {
    userId: "user_3",
    name: "Clara Garcia",
    role: "volunteer",
    skills: ["Python", "Public Speaking"],
    reputationScore: 4.7,
    bio: "Community coding bootcamp instructor with a passion for public speaking and inclusion in tech.",
    skillEntries: [
      { skillName: "Python", level: "beginner" },
      { skillName: "Public Speaking", level: "expert" },
    ],
  },
  {
    userId: "user_4",
    name: "David Kim",
    role: "professional",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.8,
    bio: "Professional musician and TED-talk coach helping others find their stage voice.",
    skillEntries: [
      { skillName: "Guitar", level: "expert" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },
  {
    userId: "user_5",
    name: "Elena Rostova",
    role: "professional",
    skills: ["Python", "Web Design"],
    reputationScore: 5.0,
    bio: "Lead UX engineer with 10+ years building production Python services and polished web interfaces.",
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Web Design", level: "expert" },
    ],
  },
  {
    userId: "user_6",
    name: "Farhan Ali",
    role: "student",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.3,
    bio: "Music performance student who mentors beginners in guitar technique and stage confidence.",
    skillEntries: [
      { skillName: "Guitar", level: "intermediate" },
      { skillName: "Public Speaking", level: "beginner" },
    ],
  },
  {
    userId: "user_7",
    name: "Grace Hopper",
    role: "volunteer",
    skills: ["Web Design", "Public Speaking"],
    reputationScore: 4.9,
    bio: "Retired software architect now volunteering to teach accessible web design and presentation skills.",
    skillEntries: [
      { skillName: "Web Design", level: "intermediate" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },

  // ---- NEW MENTORS (users 8–20) — adds 7 new skill categories ----
  {
    userId: "user_8",
    name: "Hiro Tanaka",
    role: "professional",
    skills: ["Data Structures", "Python"],
    reputationScore: 4.7,
    bio: "Software engineer at a fintech company who loves teaching computer science fundamentals.",
    skillEntries: [
      { skillName: "Data Structures", level: "expert" },
      { skillName: "Python", level: "intermediate" },
    ],
  },
  {
    userId: "user_9",
    name: "Isabelle Dupont",
    role: "volunteer",
    skills: ["Spanish", "Public Relations"],
    reputationScore: 4.6,
    bio: "Bilingual community liaison with a background in corporate communications and language tutoring.",
    skillEntries: [
      { skillName: "Spanish", level: "expert" },
      { skillName: "Public Relations", level: "intermediate" },
    ],
  },
  {
    userId: "user_10",
    name: "James O'Brien",
    role: "student",
    skills: ["Guitar", "Cooking"],
    reputationScore: 3.9,
    bio: "Hospitality student who jams on guitar and loves teaching basic home cooking techniques.",
    skillEntries: [
      { skillName: "Guitar", level: "intermediate" },
      { skillName: "Cooking", level: "beginner" },
    ],
  },
  {
    userId: "user_11",
    name: "Kavya Reddy",
    role: "professional",
    skills: ["UI Design", "Web Design"],
    reputationScore: 4.9,
    bio: "Senior product designer at a SaaS startup with expertise in Figma, design systems, and CSS.",
    skillEntries: [
      { skillName: "UI Design", level: "expert" },
      { skillName: "Web Design", level: "expert" },
    ],
  },
  {
    userId: "user_12",
    name: "Liam Foster",
    role: "student",
    skills: ["Python", "Excel"],
    reputationScore: 3.8,
    bio: "Business analytics undergraduate learning Python for data work and sharing spreadsheet tips.",
    skillEntries: [
      { skillName: "Python", level: "beginner" },
      { skillName: "Excel", level: "beginner" },
    ],
  },
  {
    userId: "user_13",
    name: "Mei Zhang",
    role: "volunteer",
    skills: ["Photography", "Public Speaking"],
    reputationScore: 4.5,
    bio: "Freelance photographer and community workshop host teaching portrait and street photography.",
    skillEntries: [
      { skillName: "Photography", level: "expert" },
      { skillName: "Public Speaking", level: "intermediate" },
    ],
  },
  {
    userId: "user_14",
    name: "Nadia Okonkwo",
    role: "professional",
    skills: ["Data Structures", "Public Relations"],
    reputationScore: 5.0,
    bio: "Principal engineer and former PR manager — rare blend of deep technical and communication expertise.",
    skillEntries: [
      { skillName: "Data Structures", level: "expert" },
      { skillName: "Public Relations", level: "expert" },
    ],
  },
  {
    userId: "user_15",
    name: "Oscar Brennan",
    role: "student",
    skills: ["Spanish", "Cooking"],
    reputationScore: 4.1,
    bio: "Culinary arts student who picked up conversational Spanish while studying abroad in Madrid.",
    skillEntries: [
      { skillName: "Spanish", level: "intermediate" },
      { skillName: "Cooking", level: "intermediate" },
    ],
  },
  {
    userId: "user_16",
    name: "Priya Sharma",
    role: "professional",
    skills: ["Excel", "UI Design"],
    reputationScore: 4.8,
    bio: "Financial analyst turned UX designer, expert in Excel modelling and clean interface design.",
    skillEntries: [
      { skillName: "Excel", level: "expert" },
      { skillName: "UI Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_17",
    name: "Rahul Nair",
    role: "volunteer",
    skills: ["Python", "Data Structures"],
    reputationScore: 4.6,
    bio: "Open-source contributor and CS tutor specialising in algorithms, sorting, and graph theory.",
    skillEntries: [
      { skillName: "Python", level: "expert" },
      { skillName: "Data Structures", level: "intermediate" },
    ],
  },
  {
    userId: "user_18",
    name: "Sofia Martínez",
    role: "professional",
    skills: ["Photography", "Web Design"],
    reputationScore: 4.3,
    bio: "Digital media creator blending photography portfolio work with clean, minimal web design.",
    skillEntries: [
      { skillName: "Photography", level: "intermediate" },
      { skillName: "Web Design", level: "intermediate" },
    ],
  },
  {
    userId: "user_19",
    name: "Thomas Müller",
    role: "volunteer",
    skills: ["Guitar", "Public Speaking"],
    reputationScore: 4.7,
    bio: "Classical guitarist and TEDx speaker who mentors others in performance skills and stage presence.",
    skillEntries: [
      { skillName: "Guitar", level: "expert" },
      { skillName: "Public Speaking", level: "expert" },
    ],
  },
  {
    userId: "user_20",
    name: "Uma Krishnan",
    role: "student",
    skills: ["Cooking", "Excel"],
    reputationScore: 4.2,
    bio: "Nutrition science student who teaches healthy meal prep and uses Excel for diet tracking.",
    skillEntries: [
      { skillName: "Cooking", level: "expert" },
      { skillName: "Excel", level: "intermediate" },
    ],
  },
];

/**
 * Inserts seed users into the Hash Table and primes the Graph network.
 * Used as a fallback when local PostgreSQL is not running or during initial offline boot.
 */
function seedDatabase() {
  // Clear any existing in-memory entries for deterministic re-seeding
  mentorGraph.clear();

  for (let userIndex = 0; userIndex < seedUsers.length; userIndex++) {
    const user = seedUsers[userIndex];

    // Add vertex to Graph
    mentorGraph.addVertex(user.userId, {
      name: user.name,
      role: user.role,
      skills: user.skills,
      reputationScore: user.reputationScore,
    });

    for (let skillIndex = 0; skillIndex < user.skillEntries.length; skillIndex++) {
      const skillEntry = user.skillEntries[skillIndex];

      const mentorRecord = {
        userId: user.userId,
        id: user.userId,
        name: user.name,
        level: skillEntry.level,
        skills: user.skills,
        reputationScore: user.reputationScore,
      };

      skillHashTable.insert(skillEntry.skillName, mentorRecord);
    }
  }

  // Build representative community graph connections among seed users
  // (Models mentor-learner sessions and peer collaborations across skill domains)
  const peerConnections = [
    ["user_1", "user_2", 4.8],  // Python cohort peers
    ["user_1", "user_5", 5.0],  // Full-stack / UX collaboration
    ["user_2", "user_3", 4.2],  // Music / Creative arts peers
    ["user_3", "user_4", 4.5],  // Digital Arts / Design circle
    ["user_4", "user_5", 4.9],  // UI / Frontend design
    ["user_5", "user_7", 4.7],  // Web architecture collaboration
    ["user_6", "user_2", 4.4],  // Acoustic guitar peers
    ["user_7", "user_14", 5.0], // Engineering leadership
    ["user_8", "user_1", 4.9],  // Python CS fundamentals
    ["user_8", "user_14", 4.8], // Data structures peer circle
    ["user_9", "user_15", 4.6], // Conversational Spanish peers
    ["user_10", "user_6", 4.3], // Guitar & music student group
    ["user_11", "user_4", 4.9], // Figma & Product design
    ["user_11", "user_16", 4.8], // UI / UX designers
    ["user_12", "user_16", 4.1], // Analytics & Excel modeling
    ["user_13", "user_3", 4.7], // Photography & creative arts
    ["user_17", "user_7", 4.9], // Public speaking workshop
    ["user_18", "user_10", 4.5], // Culinary arts peer circle
    ["user_19", "user_8", 4.6], // CS & Data structures
    ["user_20", "user_12", 4.3], // Excel spreadsheets
  ];

  for (const [u1, u2, weight] of peerConnections) {
    mentorGraph.addEdge(u1, u2, weight, "mentorship", true);
  }
}

/**
 * Connects to local PostgreSQL, ensures tables exist, seeds initial mentors if empty,
 * and loads mentor skills and network connections from PostgreSQL into the in-memory
 * Hash Table and Graph.
 *
 * ARCHITECTURAL PRINCIPLE:
 * PostgreSQL is the true persistent source of truth. The Hash Table and Graph serve as
 * the fast, in-memory algorithmic indexes primed directly from PostgreSQL data.
 */
async function initializeDatabaseAndDsa() {
  try {
    const conn = await checkConnection();

    if (conn.reachable) {
      console.log(`[Database] Connected to local PostgreSQL ("${conn.database}" on port 5432)`);

      // Ensure schema tables exist (safe and idempotent)
      await setupDatabase(false);

      // Query mentors and skills directly from PostgreSQL to populate Hash Table & Graph
      const result = await query(`
        SELECT u.id, u.name, u.role, u.bio, u.reputation_score,
               s.skill_name, s.level,
               ARRAY(
                 SELECT s2.skill_name FROM skills s2
                 WHERE s2.user_id = u.id AND s2.type = 'teach'
               ) as all_skills
        FROM users u
        JOIN skills s ON u.id = s.user_id
        WHERE s.type = 'teach'
        ORDER BY u.id
      `);

      // Populate user vertices in Graph
      const allUsersRes = await query(`SELECT id, name, role, reputation_score FROM users`);
      if (allUsersRes.rows) {
        for (const u of allUsersRes.rows) {
          mentorGraph.addVertex(u.id, {
            name: u.name,
            role: u.role,
            reputationScore: parseFloat(u.reputation_score) || 5.0,
          });
        }
      }

      // Populate Graph edges from session bookings
      const bookingsRes = await query(`
        SELECT mentor_id, learner_id, status FROM session_bookings
        WHERE mentor_id IS NOT NULL AND learner_id IS NOT NULL
      `);
      if (bookingsRes.rows) {
        for (const b of bookingsRes.rows) {
          mentorGraph.addEdge(b.learner_id, b.mentor_id, 1, "mentorship", true);
        }
      }

      // Populate Graph edge weights from reviews
      const reviewsRes = await query(`
        SELECT mentor_id, reviewer_id, rating FROM reviews
        WHERE mentor_id IS NOT NULL AND reviewer_id IS NOT NULL
      `);
      if (reviewsRes.rows) {
        for (const r of reviewsRes.rows) {
          mentorGraph.updateEdgeWeight(r.reviewer_id, r.mentor_id, r.rating, true);
        }
      }

      if (result.rows && result.rows.length > 0) {
        for (const row of result.rows) {
          const mentorRecord = {
            userId: row.id,
            id: row.id,
            name: row.name,
            level: row.level,
            skills: row.all_skills || [row.skill_name],
            reputationScore: parseFloat(row.reputation_score) || 5.0,
          };
          skillHashTable.insert(row.skill_name, mentorRecord);
        }
        console.log(`[DSA Engine] Primed Hash Table with ${result.rows.length} skill entries directly from PostgreSQL!`);
        console.log(`[DSA Engine] Primed Graph with ${mentorGraph.getStats().vertexCount} vertices and ${mentorGraph.getStats().edgeCount} edges!`);
        return true;
      }
    } else {
      console.warn(`[Database] Local PostgreSQL is not currently running or reachable (${conn.reason}).`);
      console.warn(`[Database] Ensure PostgreSQL is running locally on port 5432 with credentials in backend/.env.`);
    }
  } catch (err) {
    console.warn(`[Database] Notice during database initialization: ${err.message}`);
  }

  // Fallback to in-memory seed data so application and test suites function reliably
  seedDatabase();
  console.log("[DSA Engine] Primed in-memory Hash Table with initial fallback catalog.");
  return false;
}

// Run initial seed on load
seedDatabase();

// Attempt async synchronization with PostgreSQL on startup
if (isPoolInitialized()) {
  initializeDatabaseAndDsa().catch((err) => {
    console.error("[Database Sync Error]", err.message);
  });
}

// ----------------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------------

/**
 * Sorts an array of mentors by their proficiency level:
 * Expert first, then Intermediate, then Beginner.
 *
 * @param {Array<object>} mentorsList - The raw list of mentors from the hash table.
 * @returns {Array<object>} A new sorted array with expert mentors first.
 */
function sortMentorsByLevel(mentorsList) {
  const levelWeights = {
    expert: 3,
    intermediate: 2,
    beginner: 1,
  };

  return [...mentorsList].sort((mentorA, mentorB) => {
    const weightA = levelWeights[mentorA.level] || 0;
    const weightB = levelWeights[mentorB.level] || 0;
    return weightB - weightA;
  });
}

// ----------------------------------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * ENDPOINT 1: GET /api/skills/search?query=<skillName>
 *
 * WHAT IT DOES:
 * 1. Reads search query parameter (e.g. ?query=Python).
 * 2. Uses our Hash Table's lookup() method to quickly find mentors in O(1) average time.
 *    (All entries in the Hash Table are primed from / synced with PostgreSQL).
 * 3. Sorts matching mentors by proficiency level (expert first).
 * 4. Returns { mentors: [...] }.
 */
application.get("/api/skills/search", async (request, response) => {
  try {
    const searchSkillName = request.query.query;

    if (!searchSkillName || typeof searchSkillName !== "string" || searchSkillName.trim() === "") {
      return response.status(200).json({ mentors: [] });
    }

    const cleanQuery = searchSkillName.trim();
    const conn = await checkConnection();

    if (conn.reachable) {
      const dbResult = await query(
        `SELECT u.id, u.id as "userId", u.name, u.role, u.bio, u.reputation_score as "reputationScore",
                u.is_demo, u.avatar_url, s.skill_name, s.level, COALESCE(s.is_verified, FALSE) as is_verified,
                COALESCE(
                  (SELECT array_agg(s2.skill_name) FROM skills s2 WHERE s2.user_id = u.id AND s2.type = 'teach'),
                  ARRAY[s.skill_name]
                ) as skills,
                COALESCE(
                  (SELECT json_agg(json_build_object('skill_name', s3.skill_name, 'level', s3.level, 'type', s3.type, 'is_verified', COALESCE(s3.is_verified, FALSE)))
                   FROM skills s3 WHERE s3.user_id = u.id AND s3.type = 'teach'),
                  '[]'::jsonb
                ) as skill_entries
         FROM users u
         JOIN skills s ON u.id = s.user_id
         WHERE s.type = 'teach' AND LOWER(s.skill_name) LIKE LOWER($1)
         ORDER BY s.is_verified DESC,
           CASE s.level WHEN 'expert' THEN 1 WHEN 'intermediate' THEN 2 ELSE 3 END,
           u.reputation_score DESC`,
        [`%${cleanQuery}%`]
      );

      if (dbResult.rows && dbResult.rows.length > 0) {
        return response.status(200).json({
          mentors: dbResult.rows,
          source: "postgresql",
        });
      }
    }

    // Step 1: Use Hash Table fallback to find mentors who have this skill in O(1) average time
    const matchingMentors = skillHashTable.lookup(cleanQuery);

    // Step 2: Sort mentors by expertise level (expert > intermediate > beginner)
    const sortedMentors = sortMentorsByLevel(matchingMentors);

    return response.status(200).json({
      mentors: sortedMentors,
      source: "hash_table",
    });
  } catch (error) {
    console.error("Error during skill search:", error);
    return response.status(500).json({
      error: "An internal server error occurred while searching for skills.",
    });
  }
});

/**
 * ENDPOINT 2: POST /api/sessions/book
 *
 * WHAT IT DOES:
 * 1. Reads booking details from request body.
 * 2. Enqueues the booking into our FIFO Queue to preserve arrival order and prevent race conditions.
 * 3. Persists the booking directly into local PostgreSQL session_bookings table.
 * 4. Returns the saved persistent record back to the frontend.
 */
application.post("/api/sessions/book", async (request, response) => {
  try {
    const { mentorId, learnerId, scheduledAt, topic, notes } = request.body;

    if (!mentorId || !learnerId || !scheduledAt) {
      return response.status(400).json({
        error: "Missing required booking details. Please provide mentorId, learnerId, and scheduledAt.",
      });
    }

    // Step 1: Verify PostgreSQL database connectivity
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Session booking could not be saved to persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    const bookingId = `booking_${Date.now()}`;
    const bookingRequest = {
      id: bookingId,
      bookingId: bookingId,
      mentorId: String(mentorId),
      learnerId: String(learnerId),
      scheduledAt: String(scheduledAt),
      status: "queued",
      topic: topic || "Mentoring Session",
      notes: notes || "",
      createdAt: new Date().toISOString(),
    };

    // Step 2: Persist directly into PostgreSQL session_bookings table
    await query(
      `INSERT INTO session_bookings (id, mentor_id, learner_id, scheduled_at, status, topic, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [
        bookingRequest.id,
        bookingRequest.mentorId,
        bookingRequest.learnerId,
        bookingRequest.scheduledAt,
        bookingRequest.status,
        bookingRequest.topic,
        bookingRequest.notes,
      ]
    );

    // Add notification for the mentor in PostgreSQL
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        bookingRequest.mentorId,
        "booking_received",
        "New Mentorship Booking Request",
        `New session request for "${bookingRequest.topic}" from user ${bookingRequest.learnerId}.`,
        "/history?view=teaching",
      ]
    ).catch(() => {});

    // Asynchronously dispatch email notification if mentor has email configured
    Promise.all([
      query("SELECT email, name FROM users WHERE id = $1", [bookingRequest.mentorId]),
      query("SELECT name FROM users WHERE id = $1", [bookingRequest.learnerId]),
    ])
      .then(([mRes, lRes]) => {
        if (mRes.rows && mRes.rows[0]) {
          emailService.notifyBookingEvent({
            recipientEmail: mRes.rows[0].email,
            recipientName: mRes.rows[0].name,
            topic: bookingRequest.topic,
            scheduledAt: bookingRequest.scheduledAt,
            status: "queued",
            partnerName: lRes.rows[0]?.name || "A learner",
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Step 3: Enqueue in FIFO Queue to maintain pipeline processing order (DSA Feature)
    bookingQueue.enqueue(bookingRequest);

    // Step 4: Connect learner and mentor in the Adjacency Graph (DSA Feature)
    mentorGraph.addEdge(bookingRequest.learnerId, bookingRequest.mentorId, 1, "mentorship", true);

    return response.status(201).json({
      message: "Session booking request saved to database and enqueued successfully.",
      booking: bookingRequest,
      queuePosition: bookingQueue.size(),
    });
  } catch (error) {
    console.error("Error during session booking:", error);
    return response.status(500).json({
      error: "An internal server error occurred while processing the booking request.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 3: GET /api/users/all
 *
 * WHAT IT DOES:
 * Returns the full directory of peer mentors.
 * PostgreSQL is the source of truth: queries PostgreSQL directly when connected.
 */
application.get("/api/users/all", async (request, response) => {
  try {
    const conn = await checkConnection();

    if (conn.reachable) {
      const dbResult = await query(`
        SELECT u.id, u.name, u.role, u.bio, u.profile_summary, u.specialization_domain,
               u.work_experience, u.social_profiles, u.avatar_url, COALESCE(u.is_demo, FALSE) as is_demo,
               u.reputation_score,
               COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL), '{}') as skills,
               COALESCE(
                 json_agg(
                   json_build_object('skill_name', s.skill_name, 'level', s.level, 'type', s.type, 'is_verified', COALESCE(s.is_verified, FALSE), 'verified_at', s.verified_at)
                 ) FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL),
                 '[]'
               ) as skill_entries
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        GROUP BY u.id, u.name, u.role, u.bio, u.profile_summary, u.specialization_domain, u.work_experience, u.social_profiles, u.avatar_url, u.is_demo, u.reputation_score
        ORDER BY u.id;
      `);

      if (dbResult.rows && dbResult.rows.length > 0) {
        const mentorList = dbResult.rows.map((row) => ({
          id: row.id,
          userId: row.id,
          name: row.name,
          role: row.role || "Peer Mentor",
          skills: row.skill_entries && row.skill_entries.length > 0 ? row.skill_entries : (row.skills || []),
          bio: row.bio || row.profile_summary || "",
          profile_summary: row.profile_summary || row.bio || "",
          specialization_domain: row.specialization_domain || null,
          work_experience: row.work_experience || [],
          social_profiles: row.social_profiles || {},
          avatar_url: row.avatar_url || null,
          is_demo: Boolean(row.is_demo),
          reputationScore: parseFloat(row.reputation_score) || 5.0,
          reputation_score: parseFloat(row.reputation_score) || 5.0,
        }));

        return response.status(200).json({
          mentors: mentorList,
          users: mentorList,
          source: "postgresql",
        });
      }
    }

    // Fallback if database is offline or unseeded
    const mentorList = seedUsers.map((user) => ({
      id: user.userId,
      userId: user.userId,
      name: user.name,
      role: user.role || "Peer Mentor",
      skills: user.skills,
      bio: user.bio,
      reputationScore: user.reputationScore,
    }));

    return response.status(200).json({
      mentors: mentorList,
      users: mentorList,
      source: "memory_fallback",
    });
  } catch (error) {
    console.error("Error retrieving all mentors:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving mentors.",
    });
  }
});

/**
 * ENDPOINT 4: PUT /api/users/:userId/skills
 *
 * WHAT IT DOES:
 * 1. Updates user bio and skills directly in PostgreSQL.
 * 2. Dynamically indexes new teachable skills into the Hash Table for instant O(1) search.
 * 3. Keeps PostgreSQL as the persistent source of truth.
 */
application.put("/api/users/:userId/skills", async (request, response) => {
  try {
    const targetUserId = request.params.userId;

    // Verify authentication and enforce ownership: users can only change their own profile
    const authHeader = request.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return response.status(401).json({
        error: "Authentication required. Please log in to modify your profile.",
      });
    }
    if (!JWT_SECRET) {
      return response.status(500).json({
        error: "Server configuration error: JWT_SECRET is not configured in backend/.env.",
      });
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return response.status(401).json({
        error: "Invalid or expired session token. Please log in again.",
      });
    }
    if (decoded.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to modify another user's profile.",
      });
    }

    const incomingBio = request.body.bio !== undefined ? request.body.bio : "";
    const incomingSummary = request.body.profile_summary !== undefined ? request.body.profile_summary : incomingBio;
    const incomingSkills = request.body.skills || [];

    // Step 1: Verify PostgreSQL database connectivity
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. User skills could not be saved to persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Step 2: Persist directly into PostgreSQL inside an atomic transaction
    const client = await pool.connect();
    let updatedUser;
    let notificationsSent = [];

    try {
      await client.query("BEGIN");

      // Check username duplicate if changing username
      if (request.body.username !== undefined && request.body.username) {
        const cleanUser = request.body.username.trim().toLowerCase();
        const dup = await client.query(
          "SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2",
          [cleanUser, targetUserId]
        );
        if (dup.rows.length > 0) {
          await client.query("ROLLBACK");
          return response.status(409).json({ error: `Username "${request.body.username}" is already taken.` });
        }
      }

      const updateClauses = ["bio = $1", "profile_summary = $2", "updated_at = CURRENT_TIMESTAMP"];
      const updateVals = [incomingBio, incomingSummary];
      let pIdx = 3;

      if (request.body.specialization_domain !== undefined) {
        updateClauses.push(`specialization_domain = $${pIdx++}`);
        updateVals.push(request.body.specialization_domain ? request.body.specialization_domain.trim() : null);
      }
      if (request.body.work_experience !== undefined) {
        updateClauses.push(`work_experience = $${pIdx++}::jsonb`);
        updateVals.push(JSON.stringify(request.body.work_experience));
      }
      if (request.body.social_profiles !== undefined) {
        updateClauses.push(`social_profiles = $${pIdx++}::jsonb`);
        updateVals.push(JSON.stringify(request.body.social_profiles));
      }
      if (request.body.username !== undefined && request.body.username) {
        updateClauses.push(`username = $${pIdx++}`);
        updateVals.push(request.body.username.trim().toLowerCase());
      }
      updateVals.push(targetUserId);

      await client.query(
        `UPDATE users SET ${updateClauses.join(", ")} WHERE id = $${pIdx}`,
        updateVals
      );

      // Fetch existing verified skills before deleting so verification badge is not lost
      const existingVerified = await client.query(
        `SELECT LOWER(skill_name) as lower_skill, is_verified, verified_at 
         FROM skills 
         WHERE user_id = $1 AND is_verified = TRUE`,
        [targetUserId]
      );
      const verifiedMap = new Map();
      for (const v of existingVerified.rows) {
        verifiedMap.set(v.lower_skill, { is_verified: true, verified_at: v.verified_at });
      }

      // Delete existing skills for this user and insert updated list
      await client.query(`DELETE FROM skills WHERE user_id = $1`, [targetUserId]);

      const teachSkillNames = [];
      for (const skill of incomingSkills) {
        const skillName = skill.skill_name || skill.skillName;
        const level = skill.level || "beginner";
        const type = skill.type || "teach";

        if (skillName) {
          const lowerName = skillName.trim().toLowerCase();
          const isVerified = type === "teach" && (Boolean(skill.is_verified) || verifiedMap.has(lowerName));
          const verifiedAt = isVerified
            ? (verifiedMap.get(lowerName)?.verified_at || new Date())
            : null;

          await client.query(
            `INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ON CONSTRAINT uq_user_skill_type DO UPDATE SET
               level = EXCLUDED.level,
               is_verified = EXCLUDED.is_verified,
               verified_at = EXCLUDED.verified_at`,
            [targetUserId, skillName, level, type, isVerified, verifiedAt]
          );

          if (type === "teach") {
            teachSkillNames.push(skillName);
          }
        }
      }

      // Fetch refreshed user record and skills directly from database
      const userRes = await client.query(
        `SELECT id, name, email, username, role, bio, profile_summary, specialization_domain,
                work_experience, social_profiles, avatar_url, reputation_score
         FROM users WHERE id = $1`,
        [targetUserId]
      );
      const userSkillsRes = await client.query(
        `SELECT id, skill_name, level, type, is_verified, verified_at FROM skills WHERE user_id = $1 ORDER BY id`,
        [targetUserId]
      );
      const row = userRes.rows[0] || {
        id: targetUserId,
        name: "User " + targetUserId,
        bio: incomingBio,
        profile_summary: incomingSummary,
        reputation_score: 5.0,
      };

      updatedUser = {
        userId: row.id,
        id: row.id,
        name: row.name,
        username: row.username || null,
        bio: row.bio || incomingBio,
        profile_summary: row.profile_summary || row.bio || incomingBio,
        specialization_domain: row.specialization_domain || "",
        work_experience: row.work_experience || [],
        social_profiles: row.social_profiles || {},
        avatar_url: row.avatar_url || null,
        reputationScore: parseFloat(row.reputation_score) || 5.0,
        skills: userSkillsRes.rows,
        skillEntries: userSkillsRes.rows,
      };

      // When teachable skills are added, match open course requests and notify requesting learners
      notificationsSent = await matchSkillsAndNotifyLearners(
        client,
        targetUserId,
        updatedUser.name,
        teachSkillNames
      );

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    // Step 3: Dynamically re-index newly saved teachable skills into the Hash Table for instant O(1) search
    for (const skill of incomingSkills) {
      if (skill.type !== "teach") continue;

      const skillName = skill.skill_name || skill.skillName;
      if (!skillName) continue;

      const mentorRecord = {
        userId: updatedUser.userId,
        id: updatedUser.userId,
        name: updatedUser.name,
        level: skill.level || "beginner",
        skills: updatedUser.skills,
        reputationScore: updatedUser.reputationScore,
      };

      skillHashTable.insert(skillName, mentorRecord);
    }

    // Step 4: Update Graph vertex metadata with updated skills and reputation (DSA Feature)
    mentorGraph.addVertex(updatedUser.userId, {
      name: updatedUser.name,
      role: updatedUser.role,
      skills: updatedUser.skills,
      reputationScore: updatedUser.reputationScore,
    });

    return response.status(200).json({
      message: "Profile skills and details saved successfully in PostgreSQL database!",
      notificationsSentCount: notificationsSent.length,
      user: {
        userId: updatedUser.userId,
        id: updatedUser.userId,
        name: updatedUser.name,
        username: updatedUser.username,
        bio: updatedUser.bio,
        profile_summary: updatedUser.profile_summary,
        specialization_domain: updatedUser.specialization_domain,
        work_experience: updatedUser.work_experience,
        social_profiles: updatedUser.social_profiles,
        avatar_url: updatedUser.avatar_url,
        skills: updatedUser.skills,
        skillEntries: updatedUser.skillEntries,
      },
    });
  } catch (error) {
    console.error("Error updating user skills:", error);
    return response.status(500).json({
      error: "An internal server error occurred while updating skills.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 4B: PUT /api/users/:userId/profile
 *
 * Dedicated REST endpoint for updating comprehensive profile details:
 * - username: Unique handle (alphanumeric, underscores, hyphens, 3-30 chars)
 * - profile_summary: Professional / learner summary (also syncs with bio)
 * - specialization_domain: Field of expertise (e.g. "Full-Stack Web Dev", "Data Science")
 * - work_experience: JSON array of past roles / projects / experience
 * - social_profiles: JSON object of links ({ github, linkedin, twitter, website, ... })
 * - name, avatar_url
 *
 * Security & Integrity:
 * - Protected by authenticateToken middleware.
 * - Enforces that users can ONLY modify their own profile (request.user.userId === targetUserId).
 * - 100% Parameterized SQL queries.
 * - Idempotent, non-destructive, preserves all user data.
 */
application.put("/api/users/:userId/profile", authenticateToken, async (request, response) => {
  try {
    const targetUserId = request.params.userId;

    // Strict ownership enforcement
    if (request.user.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to modify another user's profile.",
      });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Profile could not be saved to persistent storage.",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Verify user exists in database
    const userCheck = await query("SELECT id FROM users WHERE id = $1", [targetUserId]);
    if (userCheck.rows.length === 0) {
      return response.status(404).json({ error: "User not found." });
    }

    const {
      name,
      username,
      profile_summary,
      bio,
      specialization_domain,
      work_experience,
      social_profiles,
      avatar_url,
      active_mode,
      can_teach,
      can_learn,
    } = request.body;

    // Validate username if provided
    let cleanUsername = null;
    if (username !== undefined && username !== null && String(username).trim() !== "") {
      cleanUsername = String(username).trim().toLowerCase();
      const usernameRegex = /^[a-z0-9_-]{3,30}$/;
      if (!usernameRegex.test(cleanUsername)) {
        return response.status(400).json({
          error: "Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.",
        });
      }

      // Check for duplicate username across other accounts
      const duplicateUser = await query(
        "SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2",
        [cleanUsername, targetUserId]
      );
      if (duplicateUser.rows.length > 0) {
        return response.status(409).json({
          error: `The username "${username}" is already taken. Please choose a different username.`,
        });
      }
    }

    // Build parameterized UPDATE dynamically
    const updateClauses = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim() === "") {
        return response.status(400).json({ error: "Name cannot be empty." });
      }
      updateClauses.push(`name = $${paramIndex++}`);
      updateValues.push(name.trim());
    }

    if (username !== undefined) {
      updateClauses.push(`username = $${paramIndex++}`);
      updateValues.push(cleanUsername);
    }

    const incomingSummary = profile_summary !== undefined ? profile_summary : bio;
    if (incomingSummary !== undefined) {
      updateClauses.push(`profile_summary = $${paramIndex++}`);
      updateValues.push(incomingSummary);
      updateClauses.push(`bio = $${paramIndex++}`);
      updateValues.push(incomingSummary);
    }

    if (specialization_domain !== undefined) {
      updateClauses.push(`specialization_domain = $${paramIndex++}`);
      updateValues.push(specialization_domain ? specialization_domain.trim() : null);
    }

    if (work_experience !== undefined) {
      let expData = work_experience;
      if (typeof expData === "string") {
        try {
          expData = JSON.parse(expData);
        } catch (e) {
          expData = [{ description: expData }];
        }
      }
      updateClauses.push(`work_experience = $${paramIndex++}::jsonb`);
      updateValues.push(JSON.stringify(expData));
    }

    if (social_profiles !== undefined) {
      let socialData = social_profiles;
      if (typeof socialData === "string") {
        try {
          socialData = JSON.parse(socialData);
        } catch (e) {
          socialData = {};
        }
      }
      updateClauses.push(`social_profiles = $${paramIndex++}::jsonb`);
      updateValues.push(JSON.stringify(socialData));
    }

    if (avatar_url !== undefined) {
      updateClauses.push(`avatar_url = $${paramIndex++}`);
      updateValues.push(avatar_url ? avatar_url.trim() : null);
    }

    if (active_mode !== undefined) {
      const cleanMode = active_mode === "teacher" ? "teacher" : "learner";
      updateClauses.push(`active_mode = $${paramIndex++}`);
      updateValues.push(cleanMode);
    }

    if (can_teach !== undefined) {
      updateClauses.push(`can_teach = $${paramIndex++}`);
      updateValues.push(Boolean(can_teach));
    }

    if (can_learn !== undefined) {
      updateClauses.push(`can_learn = $${paramIndex++}`);
      updateValues.push(Boolean(can_learn));
    }

    if (updateClauses.length === 0) {
      return response.status(400).json({ error: "No valid profile fields provided for update." });
    }

    updateClauses.push("updated_at = CURRENT_TIMESTAMP");

    const updateSql = `UPDATE users SET ${updateClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, email, username, role, bio, profile_summary, specialization_domain, work_experience, social_profiles, avatar_url, reputation_score, active_mode, can_teach, can_learn, updated_at`;
    updateValues.push(targetUserId);

    const updateRes = await query(updateSql, updateValues);
    const updated = updateRes.rows[0];

    // Fetch user skills
    const skillsRes = await query(
      `SELECT id, skill_name, level, type, is_verified, verified_at FROM skills WHERE user_id = $1 ORDER BY id`,
      [targetUserId]
    );

    return response.status(200).json({
      message: "Profile updated successfully in PostgreSQL.",
      user: {
        id: updated.id,
        userId: updated.id,
        name: updated.name,
        email: updated.email,
        username: updated.username || null,
        role: updated.role,
        bio: updated.bio || updated.profile_summary || "",
        profile_summary: updated.profile_summary || updated.bio || "",
        specialization_domain: updated.specialization_domain || "",
        work_experience: updated.work_experience || [],
        social_profiles: updated.social_profiles || {},
        avatar_url: updated.avatar_url || null,
        reputation_score: parseFloat(updated.reputation_score) || 5.0,
        active_mode: updated.active_mode || "learner",
        can_teach: updated.can_teach !== false,
        can_learn: updated.can_learn !== false,
        skills: skillsRes.rows || [],
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return response.status(500).json({
      error: "An internal server error occurred while updating profile.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 4B: POST /api/users/:userId/avatar
 * Uploads a profile picture (JPG, PNG, WebP up to 5MB).
 * Saves to backend/uploads/avatars and updates avatar_url in PostgreSQL.
 * Strictly checks user ownership via authenticateToken.
 */
application.post("/api/users/:userId/avatar", authenticateToken, (request, response) => {
  const targetUserId = request.params.userId;
  if (request.user.userId !== targetUserId) {
    return response.status(403).json({
      error: "Forbidden: You are not authorized to update another user's avatar.",
    });
  }

  avatarUpload.single("avatar")(request, response, async (uploadErr) => {
    if (uploadErr) {
      return response.status(400).json({
        error: uploadErr.message || "Failed to upload avatar image. Ensure it is a valid JPG, PNG, or WebP under 5MB.",
      });
    }

    if (!request.file) {
      return response.status(400).json({
        error: "No image file provided in the request body. Key must be 'avatar'.",
      });
    }

    try {
      const conn = await checkConnection();
      if (!conn.reachable) {
        return response.status(503).json({
          error: "Database unavailable. Avatar could not be saved.",
        });
      }

      // Public relative path served by Express static middleware
      const avatarUrl = `/uploads/avatars/${request.file.filename}`;

      const updateRes = await query(
        `UPDATE users
         SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, name, email, username, avatar_url, updated_at`,
        [avatarUrl, targetUserId]
      );

      if (updateRes.rows.length === 0) {
        return response.status(404).json({ error: "User not found." });
      }

      return response.status(200).json({
        message: "Profile photo uploaded and updated successfully.",
        avatar_url: avatarUrl,
        user: updateRes.rows[0],
      });
    } catch (err) {
      console.error("Error saving avatar in database:", err);
      return response.status(500).json({
        error: "Failed to save avatar URL to database.",
        details: err.message,
      });
    }
  });
});

/**
 * ENDPOINT 4C: GET /api/users/:userId/profile
 * Retrieves a user's full profile details including skills from PostgreSQL.
 */
application.get("/api/users/:userId/profile", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();

    if (conn.reachable) {
      const dbResult = await query(
        `SELECT u.id, u.name, u.email, u.username, u.role, u.bio, u.profile_summary,
                u.specialization_domain, u.work_experience, u.social_profiles, u.avatar_url,
                u.reputation_score, u.active_mode, u.can_teach, u.can_learn,
                COALESCE(
                  json_agg(
                    json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type, 'is_verified', COALESCE(s.is_verified, FALSE), 'verified_at', s.verified_at)
                  ) FILTER (WHERE s.id IS NOT NULL),
                  '[]'
                ) as skills
         FROM users u
         LEFT JOIN skills s ON u.id = s.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [targetUserId]
      );

      if (dbResult.rows.length > 0) {
        const u = dbResult.rows[0];
        return response.status(200).json({
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          username: u.username || null,
          role: u.role,
          bio: u.bio || u.profile_summary || "",
          profile_summary: u.profile_summary || u.bio || "",
          specialization_domain: u.specialization_domain || "",
          work_experience: u.work_experience || [],
          social_profiles: u.social_profiles || {},
          avatar_url: u.avatar_url || null,
          reputation_score: parseFloat(u.reputation_score) || 5.0,
          active_mode: u.active_mode || "learner",
          can_teach: u.can_teach !== false,
          can_learn: u.can_learn !== false,
          skills: u.skills || [],
        });
      }
      return response.status(404).json({ error: "User not found." });
    }

    return response.status(503).json({
      error: "Database unavailable.",
      details: conn.reason || "Local PostgreSQL is not connected.",
    });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return response.status(500).json({
      error: "An internal server error occurred while fetching user profile.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 5: GET /api/users/:userId
 *
 * Retrieves a user's full profile and skills from PostgreSQL.
 */
application.get("/api/users/:userId", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();

    if (conn.reachable) {
      const dbResult = await query(
        `SELECT u.id, u.name, u.email, u.username, u.role, u.bio, u.profile_summary,
                u.specialization_domain, u.work_experience, u.social_profiles, u.avatar_url,
                u.reputation_score,
                COALESCE(
                  json_agg(
                    json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type, 'is_verified', COALESCE(s.is_verified, FALSE), 'verified_at', s.verified_at)
                  ) FILTER (WHERE s.id IS NOT NULL),
                  '[]'
                ) as skills
         FROM users u
         LEFT JOIN skills s ON u.id = s.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [targetUserId]
      );

      if (dbResult.rows.length > 0) {
        const u = dbResult.rows[0];
        return response.status(200).json({
          id: u.id,
          userId: u.id,
          name: u.name,
          email: u.email,
          username: u.username || null,
          role: u.role,
          bio: u.bio || u.profile_summary || "",
          profile_summary: u.profile_summary || u.bio || "",
          specialization_domain: u.specialization_domain || "",
          work_experience: u.work_experience || [],
          social_profiles: u.social_profiles || {},
          avatar_url: u.avatar_url || null,
          reputation_score: parseFloat(u.reputation_score) || 5.0,
          skills: u.skills || [],
        });
      }
    }

    // In-memory fallback
    const found = seedUsers.find((u) => u.userId === targetUserId) || seedUsers[0];
    const skillsFormatted = (found.skillEntries || []).map((s, idx) => ({
      id: `s_${idx}`,
      skill_name: s.skillName,
      level: s.level,
      type: "teach",
    }));

    return response.status(200).json({
      id: found.userId,
      userId: found.userId,
      name: found.name,
      email: `${found.userId}@skillswap.local`,
      username: null,
      role: found.role,
      bio: found.bio,
      profile_summary: found.bio,
      specialization_domain: "",
      work_experience: [],
      social_profiles: {},
      avatar_url: null,
      reputation_score: found.reputationScore,
      skills: skillsFormatted,
    });
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return response.status(500).json({
      error: "An internal server error occurred while fetching user profile.",
    });
  }
});

/**
 * ENDPOINT 6: GET /api/users/:userId/history
 *
 * Retrieves past and upcoming sessions for the user from PostgreSQL.
 */
application.get("/api/users/:userId/history", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const roleFilter = request.query.role; // 'learner', 'teacher', or undefined
    const conn = await checkConnection();

    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Session history could not be retrieved from persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
        sessions: [],
        learningSessions: [],
        teachingSessions: [],
      });
    }

    let filterClause = "WHERE (sb.learner_id = $1 OR sb.mentor_id = $1)";
    if (roleFilter === "learner") {
      filterClause = "WHERE sb.learner_id = $1";
    } else if (roleFilter === "teacher") {
      filterClause = "WHERE sb.mentor_id = $1";
    }

    const dbResult = await query(
      `SELECT sb.id, sb.mentor_id, sb.learner_id, sb.scheduled_at, sb.status, sb.topic, sb.notes,
              json_build_object('id', m.id, 'name', m.name, 'role', m.role, 'avatar_url', m.avatar_url, 'is_demo', m.is_demo) as mentor,
              json_build_object('id', l.id, 'name', l.name, 'role', l.role, 'avatar_url', l.avatar_url, 'is_demo', l.is_demo) as learner,
              CASE WHEN r.id IS NOT NULL THEN
                json_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment)
              ELSE NULL END as review
       FROM session_bookings sb
       JOIN users m ON sb.mentor_id = m.id
       JOIN users l ON sb.learner_id = l.id
       LEFT JOIN reviews r ON sb.id = r.session_id
       ${filterClause}
       ORDER BY sb.scheduled_at DESC`,
      [targetUserId]
    );

    const rows = dbResult.rows || [];
    const learningSessions = rows.filter((s) => s.learner_id === targetUserId);
    const teachingSessions = rows.filter((s) => s.mentor_id === targetUserId);

    return response.status(200).json({
      sessions: rows,
      learningSessions,
      teachingSessions,
      source: "postgresql",
    });
  } catch (error) {
    console.error("Error retrieving session history:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving session history.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 7: POST /api/reviews
 *
 * Submits rating and review for a session, updating PostgreSQL and mentor reputation.
 */
application.post("/api/reviews", async (request, response) => {
  try {
    const { sessionId, rating, comment } = request.body;

    if (!sessionId || !rating) {
      return response.status(400).json({
        error: "Missing required review fields. Please provide sessionId and rating.",
      });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Review could not be saved to persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    const reviewId = `rev_${Date.now()}`;

    // Find session in PostgreSQL
    const sessRes = await query(`SELECT * FROM session_bookings WHERE id = $1`, [sessionId]);

    if (sessRes.rows.length === 0) {
      return response.status(404).json({
        error: `Session "${sessionId}" was not found in the database.`,
      });
    }

    const sess = sessRes.rows[0];

    // Insert review into PostgreSQL
    await query(
      `INSERT INTO reviews (id, session_id, reviewer_id, mentor_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [reviewId, sessionId, sess.learner_id, sess.mentor_id, parseInt(rating, 10), comment || ""]
    );

    // Update session status to completed
    await query(`UPDATE session_bookings SET status = 'completed' WHERE id = $1`, [sessionId]);

    // Recalculate mentor reputation score
    await query(
      `UPDATE users SET reputation_score = (
         SELECT ROUND(AVG(rating), 2) FROM reviews WHERE mentor_id = $1
       ) WHERE id = $1`,
      [sess.mentor_id]
    );

    // Update relationship edge weight in the Adjacency Graph (DSA Feature)
    mentorGraph.updateEdgeWeight(sess.learner_id, sess.mentor_id, parseInt(rating, 10), true);

    return response.status(201).json({
      message: "Session review recorded successfully in PostgreSQL! Mentor reputation score updated.",
      review: {
        id: reviewId,
        sessionId,
        rating: parseInt(rating, 10),
        comment: comment || "",
      },
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return response.status(500).json({
      error: "An internal server error occurred while submitting review.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 8: GET /api/recommendations/:userId
 *
 * ALGORITHMIC CORE: MAX-HEAP PRIORITY QUEUE + GRAPH BFS PROXIMITY
 *
 * HOW IT WORKS (VIVA DEFENSE POINT):
 * 1. Fetches candidate mentors and learner's desired skills from PostgreSQL (or seed fallback).
 * 2. Runs Graph BFS (Breadth-First Search) to compute the exact degree of separation (hops)
 *    between the learner and each candidate mentor in the community network.
 * 3. Evaluates a multi-factor composite affinity score for each mentor:
 *      - Skill Overlap & Expertise Level (40%)
 *      - Community Reputation Score (40%)
 *      - Graph Network Proximity (20%)
 * 4. Inserts all candidates into a Max-Heap (Priority Queue).
 * 5. Extracts the top-k (6) ranked recommendations in O(k log n) time.
 */
application.get("/api/recommendations/:userId", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();

    let candidateMentors = [];
    let learnerDesiredSkills = [];

    if (conn.reachable) {
      // 1. Fetch learner's desired skills (type = 'learn')
      const learnerSkillsRes = await query(
        `SELECT skill_name, level FROM skills WHERE user_id = $1 AND type = 'learn'`,
        [targetUserId]
      );
      learnerDesiredSkills = learnerSkillsRes.rows || [];

      // 2. Fetch candidate mentors excluding the requesting learner
      const dbResult = await query(
        `SELECT u.id, u.name, u.role, u.bio, u.reputation_score, u.avatar_url, u.is_demo,
                COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL), '{}') as skills,
                COALESCE(
                  json_agg(json_build_object('skill_name', s.skill_name, 'level', s.level, 'type', s.type, 'is_verified', COALESCE(s.is_verified, FALSE)))
                  FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL), '[]'
                ) as skill_entries
         FROM users u
         LEFT JOIN skills s ON u.id = s.user_id
         WHERE u.id <> $1
         GROUP BY u.id, u.name, u.role, u.bio, u.reputation_score, u.avatar_url, u.is_demo
         ORDER BY u.reputation_score DESC`,
        [targetUserId]
      );

      candidateMentors = dbResult.rows || [];
    }

    // Complement candidates with seed catalog mentors if database has few candidates or is offline
    if (candidateMentors.length < 6) {
      const existingIds = new Set(candidateMentors.map((m) => m.id || m.userId));
      existingIds.add(targetUserId);
      for (const su of seedUsers) {
        if (!existingIds.has(su.userId)) {
          candidateMentors.push(su);
          existingIds.add(su.userId);
        }
      }
    }

    // Initialize the Max-Heap priority queue
    const recommendationHeap = new MaxHeap();

    // Score and insert each candidate into the Max-Heap
    for (const mentor of candidateMentors) {
      const mentorId = mentor.id || mentor.userId;
      const skillsList = Array.isArray(mentor.skills) ? mentor.skills : (mentor.skills ? [mentor.skills] : []);

      // Calculate graph network distance (hops) using BFS
      const networkDistance = mentorGraph.getDegreesOfSeparation(targetUserId, mentorId);

      // Compute composite recommendation score
      const scoreResult = MaxHeap.computeRecommendationScore(
        {
          id: mentorId,
          name: mentor.name,
          skills: mentor.skill_entries && Array.isArray(mentor.skill_entries) && mentor.skill_entries.length > 0
            ? mentor.skill_entries
            : skillsList,
          reputation_score: mentor.reputation_score || mentor.reputationScore,
        },
        learnerDesiredSkills,
        networkDistance
      );

      const clampedScore = Math.min(100, Math.max(0, Math.round(scoreResult.score || 85)));

      const candidateRecord = {
        mentor: {
          id: mentorId,
          userId: mentorId,
          name: mentor.name,
          role: mentor.role,
          bio: mentor.bio,
          avatar_url: mentor.avatar_url || null,
          is_demo: Boolean(mentor.is_demo),
          skills: mentor.skill_entries && mentor.skill_entries.length > 0 ? mentor.skill_entries : skillsList,
          reputationScore: parseFloat(mentor.reputation_score || mentor.reputationScore) || 5.0,
        },
        score: clampedScore,
        reason: scoreResult.reason,
        networkProximity: networkDistance === Infinity ? "community" : `${networkDistance}-hop`,
        breakdown: scoreResult.breakdown,
      };

      recommendationHeap.insert(candidateRecord);
    }

    // Extract top-6 ranked recommendations from Max-Heap in O(k log n) time
    const topMentors = recommendationHeap.extractTopK(6);

    const rankedRecommendations = topMentors.map((item, index) => ({
      ...item.mentor,
      mentor: item.mentor,
      score: item.score,
      matchScore: item.score,
      rank: index + 1,
      reason: item.reason,
      matchReason: item.reason,
      networkProximity: item.networkProximity,
      breakdown: item.breakdown,
    }));

    return response.status(200).json({
      recommendations: rankedRecommendations,
      totalCandidatesEvaluated: candidateMentors.length,
      algorithm: "Max-Heap Priority Queue with Graph BFS Proximity",
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return response.status(500).json({
      error: "An internal server error occurred while generating recommendations.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/network/proximity/:userId
 *
 * Uses Graph BFS to calculate degrees of separation and shortest path
 * between the requested user and another user.
 */
application.get("/api/network/proximity/:userId", async (request, response) => {
  try {
    const sourceUserId = request.params.userId;
    const targetUserId = request.query.targetId;

    if (!targetUserId) {
      return response.status(400).json({
        error: "Missing required query parameter: targetId. Example: /api/network/proximity/user_1?targetId=user_3",
      });
    }

    const degrees = mentorGraph.getDegreesOfSeparation(sourceUserId, targetUserId);
    const { shortestPath } = mentorGraph.bfs(sourceUserId, targetUserId);
    const mutualConnections = mentorGraph.findMutualConnections(sourceUserId, targetUserId);

    return response.status(200).json({
      sourceUserId,
      targetUserId,
      degreesOfSeparation: degrees === Infinity ? null : degrees,
      isDirectConnection: degrees === 1,
      shortestPath,
      mutualConnections,
      hopLabel: degrees === 1 ? "1st degree" : degrees === 2 ? "2nd degree (mutual peer)" : degrees === Infinity ? "disconnected" : `${degrees} hops`,
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT: GET /api/network/stats
 *
 * Returns live Graph network metrics (vertex count, edge count, density, connected components).
 */
application.get("/api/network/stats", async (request, response) => {
  try {
    const stats = mentorGraph.getStats();
    const components = mentorGraph.findConnectedComponents();

    return response.status(200).json({
      ...stats,
      connectedCommunitiesCount: components.length,
      communities: components.map((comp, idx) => ({
        communityId: idx + 1,
        size: comp.length,
        members: comp.slice(0, 10),
      })),
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// COURSE & WORKSHOP REQUESTS ENDPOINTS (PostgreSQL-backed)
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: POST /api/course-requests
 *
 * Allows an authenticated learner to request a skill or course that is NOT currently available.
 * Validates:
 * 1. Title is required (at least 2 characters, max 255).
 * 2. Category is required (defaults to "General", max 100).
 * 3. Skill must NOT already be actively taught on SkillSwap.
 * 4. Learner cannot have duplicate active open requests for the same skill.
 */
application.post("/api/course-requests", authenticateToken, async (request, response) => {
  try {
    const requesterId = request.user.userId;
    const { title, description, category } = request.body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return response.status(400).json({
        error: "Course/skill title is required (at least 2 characters).",
      });
    }

    const cleanTitle = title.trim();
    const cleanCategory = category && typeof category === "string" ? category.trim() : "General";
    const cleanDesc = description && typeof description === "string" ? description.trim() : "";

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Course request could not be saved.",
      });
    }

    // Check if an existing mentor already teaches this skill in PostgreSQL or active catalog
    const existingSkillDb = await query(
      `SELECT s.skill_name, u.name as mentor_name
       FROM skills s
       JOIN users u ON s.user_id = u.id
       WHERE s.type = 'teach' AND LOWER(s.skill_name) = LOWER($1)
       LIMIT 1`,
      [cleanTitle]
    );

    const catalogMentors =
      typeof skillHashTable !== "undefined" && typeof skillHashTable.lookup === "function"
        ? skillHashTable.lookup(cleanTitle)
        : [];

    if (existingSkillDb.rows.length > 0 || (catalogMentors && catalogMentors.length > 0)) {
      const activeMentorName =
        existingSkillDb.rows.length > 0
          ? existingSkillDb.rows[0].mentor_name
          : catalogMentors[0].name;

      return response.status(400).json({
        error: `The skill "${cleanTitle}" is already available on SkillSwap! Mentor ${activeMentorName} is currently teaching it. You can search mentors and book a session directly.`,
        alreadyAvailable: true,
        skillName: cleanTitle,
        mentorName: activeMentorName,
      });
    }

    // Check if the learner already has an active open request for this skill
    const duplicateRequest = await query(
      `SELECT id FROM course_requests
       WHERE requester_id = $1 AND LOWER(title) = LOWER($2) AND status = 'open'`,
      [requesterId, cleanTitle]
    );

    if (duplicateRequest.rows.length > 0) {
      return response.status(409).json({
        error: `You already have an open course request for "${cleanTitle}".`,
      });
    }

    // Insert new course request
    const insertRes = await query(
      `INSERT INTO course_requests (requester_id, title, description, category, status, votes_count)
       VALUES ($1, $2, $3, $4, 'open', 1)
       RETURNING id, requester_id, title, description, category, status, votes_count, created_at, updated_at`,
      [requesterId, cleanTitle, cleanDesc, cleanCategory]
    );

    return response.status(201).json({
      message: `Course request for "${cleanTitle}" created successfully. You will be notified as soon as a mentor offers to teach it.`,
      courseRequest: insertRes.rows[0],
    });
  } catch (error) {
    console.error("Error creating course request:", error);
    return response.status(500).json({
      error: "An internal server error occurred while creating course request.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/course-requests/my
 * Returns all course requests submitted by the authenticated user.
 */
application.get("/api/course-requests/my", authenticateToken, async (request, response) => {
  try {
    const requesterId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query(
      `SELECT id, requester_id, title, description, category, status, votes_count, created_at, updated_at
       FROM course_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC`,
      [requesterId]
    );

    return response.status(200).json({
      courseRequests: res.rows || [],
    });
  } catch (error) {
    console.error("Error fetching user's course requests:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving course requests.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/users/:userId/course-requests
 * Returns all course requests for a specific user ID (ownership strictly enforced).
 */
application.get("/api/users/:userId/course-requests", authenticateToken, async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    if (request.user.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to view another user's course requests.",
      });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query(
      `SELECT id, requester_id, title, description, category, status, votes_count, created_at, updated_at
       FROM course_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC`,
      [targetUserId]
    );

    return response.status(200).json({
      courseRequests: res.rows || [],
    });
  } catch (error) {
    console.error("Error fetching user course requests:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving course requests.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/course-requests
 * Returns community course requests (filterable by status: ?status=open/fulfilled/all).
 */
application.get("/api/course-requests", async (request, response) => {
  try {
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const statusFilter = request.query.status || "open";
    const res = await query(
      `SELECT cr.id, cr.requester_id, cr.title, cr.description, cr.category, cr.status, cr.votes_count, cr.created_at,
              u.name as requester_name
       FROM course_requests cr
       JOIN users u ON cr.requester_id = u.id
       WHERE ($1 = 'all' OR cr.status = $1)
       ORDER BY cr.created_at DESC`,
      [statusFilter]
    );

    return response.status(200).json({
      courseRequests: res.rows || [],
    });
  } catch (error) {
    console.error("Error fetching course requests:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving course requests.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/course-requests/:id
 * Retrieves a single course request by ID.
 */
application.get("/api/course-requests/:id", async (request, response) => {
  try {
    const requestId = parseInt(request.params.id, 10);
    if (isNaN(requestId)) {
      return response.status(400).json({ error: "Invalid course request ID." });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query(
      `SELECT cr.id, cr.requester_id, cr.title, cr.description, cr.category, cr.status, cr.votes_count, cr.created_at, cr.updated_at,
              u.name as requester_name, u.email as requester_email
       FROM course_requests cr
       JOIN users u ON cr.requester_id = u.id
       WHERE cr.id = $1`,
      [requestId]
    );

    if (res.rows.length === 0) {
      return response.status(404).json({ error: "Course request not found." });
    }

    return response.status(200).json({
      courseRequest: res.rows[0],
    });
  } catch (error) {
    console.error("Error retrieving course request:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving course request.",
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// NOTIFICATIONS ENDPOINTS (PostgreSQL-backed)
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/notifications
 * Returns all notifications for the authenticated user, ordered newest first.
 */
application.get("/api/notifications", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const notifRes = await query(
      `SELECT id, user_id, type, title, message, is_read, link, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*)::int as unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return response.status(200).json({
      notifications: notifRes.rows || [],
      unreadCount: unreadCountRes.rows[0]?.unread_count || 0,
    });
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving notifications.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/users/:userId/notifications
 * Returns all notifications for a specific user ID (ownership strictly enforced).
 */
application.get("/api/users/:userId/notifications", authenticateToken, async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    if (request.user.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to view another user's notifications.",
      });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const notifRes = await query(
      `SELECT id, user_id, type, title, message, is_read, link, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [targetUserId]
    );

    const unreadCountRes = await query(
      `SELECT COUNT(*)::int as unread_count
       FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [targetUserId]
    );

    return response.status(200).json({
      notifications: notifRes.rows || [],
      unreadCount: unreadCountRes.rows[0]?.unread_count || 0,
    });
  } catch (error) {
    console.error("Error retrieving user notifications:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving notifications.",
      details: error.message,
    });
  }
});

/**
 * Handler for marking a single notification as read
 */
const markNotificationReadHandler = async (request, response) => {
  try {
    const notifId = parseInt(request.params.id, 10);
    if (isNaN(notifId)) {
      return response.status(400).json({ error: "Invalid notification ID." });
    }

    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    // Verify notification exists and belongs to this user
    const checkRes = await query(
      "SELECT id, user_id FROM notifications WHERE id = $1",
      [notifId]
    );

    if (checkRes.rows.length === 0) {
      return response.status(404).json({ error: "Notification not found." });
    }

    if (checkRes.rows[0].user_id !== userId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to modify another user's notification.",
      });
    }

    const updateRes = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, type, title, message, is_read, link, created_at`,
      [notifId, userId]
    );

    return response.status(200).json({
      message: "Notification marked as read.",
      notification: updateRes.rows[0],
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return response.status(500).json({
      error: "An internal server error occurred while updating notification.",
      details: error.message,
    });
  }
};

application.patch("/api/notifications/:id/read", authenticateToken, markNotificationReadHandler);
application.put("/api/notifications/:id/read", authenticateToken, markNotificationReadHandler);

/**
 * Handler for marking all user notifications as read
 */
const markAllNotificationsReadHandler = async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const updateRes = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE
       RETURNING id`,
      [userId]
    );

    return response.status(200).json({
      message: "All unread notifications marked as read.",
      markedCount: updateRes.rowCount || 0,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return response.status(500).json({
      error: "An internal server error occurred while updating notifications.",
      details: error.message,
    });
  }
};

application.patch("/api/notifications/read-all", authenticateToken, markAllNotificationsReadHandler);
application.put("/api/notifications/read-all", authenticateToken, markAllNotificationsReadHandler);

// ----------------------------------------------------------------------------
// CONNECTIONS & DIRECT MESSAGING ENDPOINTS (PostgreSQL-backed)
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/connections
 * Retrieves confirmed peer connections and messaging contacts for the authenticated user.
 */
application.get("/api/connections", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query(
      `SELECT u.id, u.name, u.email, u.username, u.role, u.avatar_url, u.is_demo, u.reputation_score,
              c.status, c.created_at as connected_since
       FROM connections c
       JOIN users u ON (CASE WHEN c.user_id = $1 THEN c.peer_id ELSE c.user_id END) = u.id
       WHERE c.user_id = $1 OR c.peer_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return response.status(200).json({ connections: res.rows || [] });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return response.status(500).json({ error: "Failed to fetch connections.", details: error.message });
  }
});

/**
 * ENDPOINT: GET /api/conversations
 * Retrieves all direct message threads for the authenticated user with latest message snippet and unread count.
 */
application.get("/api/conversations", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const convRes = await query(
      `SELECT c.id, c.user1_id, c.user2_id, c.last_message_at, c.created_at,
              json_build_object(
                'id', peer.id,
                'name', peer.name,
                'email', peer.email,
                'username', peer.username,
                'avatar_url', peer.avatar_url,
                'role', peer.role,
                'is_demo', peer.is_demo
              ) as peer,
              (
                SELECT content FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) as last_message_content,
              (
                SELECT m.created_at FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) as last_message_time,
              (
                SELECT COUNT(*)::int FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = FALSE
              ) as unread_count
       FROM conversations c
       JOIN users peer ON (CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END) = peer.id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      [userId]
    );

    return response.status(200).json({ conversations: convRes.rows || [] });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return response.status(500).json({ error: "Failed to fetch conversations.", details: error.message });
  }
});

/**
 * ENDPOINT: POST /api/conversations
 * Initiates or returns an existing conversation thread with another community member.
 */
application.post("/api/conversations", authenticateToken, async (request, response) => {
  try {
    const currentUserId = request.user.userId;
    const recipientId = request.body.recipientId || request.body.peerId || request.body.userId;

    if (!recipientId) {
      return response.status(400).json({ error: "recipientId is required." });
    }

    if (recipientId === currentUserId) {
      return response.status(400).json({ error: "Cannot start a conversation with yourself." });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    // Verify recipient exists
    const recCheck = await query(
      `SELECT id, name, email, username, avatar_url, role, is_demo FROM users WHERE id = $1`,
      [recipientId]
    );
    if (recCheck.rows.length === 0) {
      return response.status(404).json({ error: "Recipient user not found." });
    }
    const peer = recCheck.rows[0];

    // Canonical order to satisfy unique constraint
    const u1 = currentUserId < recipientId ? currentUserId : recipientId;
    const u2 = currentUserId < recipientId ? recipientId : currentUserId;

    // Check existing or insert
    let convRes = await query(
      `SELECT id, user1_id, user2_id, last_message_at, created_at
       FROM conversations
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [u1, u2]
    );

    if (convRes.rows.length === 0) {
      convRes = await query(
        `INSERT INTO conversations (user1_id, user2_id, last_message_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING id, user1_id, user2_id, last_message_at, created_at`,
        [u1, u2]
      );

      // Record mutual connection
      await query(
        `INSERT INTO connections (user_id, peer_id, status)
         VALUES ($1, $2, 'connected')
         ON CONFLICT (user_id, peer_id) DO NOTHING`,
        [currentUserId, recipientId]
      );
    }

    const conv = convRes.rows[0];
    return response.status(200).json({
      conversation: {
        id: conv.id,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        last_message_at: conv.last_message_at,
        created_at: conv.created_at,
        peer,
      },
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return response.status(500).json({ error: "Failed to start conversation.", details: error.message });
  }
});

/**
 * ENDPOINT: GET /api/conversations/:id/messages
 * Retrieves all messages in a conversation.
 * Strict security: Only participants in the conversation can view messages.
 */
application.get("/api/conversations/:id/messages", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const convId = parseInt(request.params.id, 10);
    if (isNaN(convId)) {
      return response.status(400).json({ error: "Invalid conversation ID." });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    // Ownership check: must be a participant
    const convCheck = await query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1`,
      [convId]
    );

    if (convCheck.rows.length === 0) {
      return response.status(404).json({ error: "Conversation not found." });
    }

    const conv = convCheck.rows[0];
    if (conv.user1_id !== userId && conv.user2_id !== userId) {
      return response.status(403).json({
        error: "Forbidden: You are not a participant in this conversation.",
      });
    }

    // Fetch messages
    const msgRes = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
              u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [convId]
    );

    // Mark unread messages sent to this user as read
    await query(
      `UPDATE messages SET is_read = TRUE
       WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
      [convId, userId]
    );

    return response.status(200).json({ messages: msgRes.rows || [] });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return response.status(500).json({ error: "Failed to retrieve messages.", details: error.message });
  }
});

/**
 * ENDPOINT: POST /api/conversations/:id/messages
 * Sends a message in a conversation.
 * Strict security: Only participants can send messages.
 * Automatically notifies recipient with an in-app notification and email.
 */
application.post("/api/conversations/:id/messages", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const convId = parseInt(request.params.id, 10);
    const { content } = request.body;

    if (isNaN(convId)) {
      return response.status(400).json({ error: "Invalid conversation ID." });
    }

    if (!content || typeof content !== "string" || content.trim() === "") {
      return response.status(400).json({ error: "Message content cannot be empty." });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    // Ownership check: must be a participant
    const convCheck = await query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id = $1`,
      [convId]
    );

    if (convCheck.rows.length === 0) {
      return response.status(404).json({ error: "Conversation not found." });
    }

    const conv = convCheck.rows[0];
    if (conv.user1_id !== userId && conv.user2_id !== userId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to send messages in this conversation.",
      });
    }

    const recipientId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

    // Insert message
    const msgRes = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       RETURNING id, conversation_id, sender_id, content, is_read, created_at`,
      [convId, userId, content.trim()]
    );
    const newMessage = msgRes.rows[0];

    // Update conversation timestamp
    await query(
      `UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [convId]
    );

    // Fetch sender info for notification
    const senderRes = await query(`SELECT name FROM users WHERE id = $1`, [userId]);
    const senderName = senderRes.rows[0]?.name || "A community member";

    // Create in-app notification for recipient
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
       VALUES ($1, 'message', $2, $3, $4, FALSE, CURRENT_TIMESTAMP)`,
      [
        recipientId,
        `New message from ${senderName}`,
        content.trim().length > 100 ? `${content.trim().slice(0, 97)}...` : content.trim(),
        `/messages?conversationId=${convId}`,
      ]
    );

    // Fetch recipient email for optional SMTP delivery
    const recipientRes = await query(`SELECT name, email FROM users WHERE id = $1`, [recipientId]);
    if (recipientRes.rows.length > 0) {
      const recUser = recipientRes.rows[0];
      emailService.sendNotificationEmail({
        recipientEmail: recUser.email,
        recipientName: recUser.name,
        subject: `New Message from ${senderName} on SkillExchange`,
        title: `You have a new message from ${senderName}`,
        message: content.trim(),
        actionUrl: `/messages?conversationId=${convId}`,
        actionText: "View Conversation",
      }).catch((e) => console.warn("Background email notification error:", e.message));
    }

    return response.status(201).json({
      message: "Message sent successfully.",
      data: {
        ...newMessage,
        sender_name: senderName,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return response.status(500).json({ error: "Failed to send message.", details: error.message });
  }
});

// ----------------------------------------------------------------------------
// MENTOR LISTINGS ENDPOINTS (PostgreSQL-backed)
// ----------------------------------------------------------------------------

/**
 * Handler for creating or updating a mentor listing
 */
const upsertMentorListingHandler = async (request, response) => {
  try {
    const targetUserId = request.params.userId || request.user.userId;

    // Strict ownership verification
    if (request.user.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to update another user's mentor listing.",
      });
    }

    const { headline, hourly_rate, availability, is_active } = request.body;

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const cleanHeadline = headline !== undefined ? String(headline).trim() : "Available Peer Mentor";
    const cleanRate = hourly_rate !== undefined ? parseFloat(hourly_rate) || 0.0 : 0.0;
    const cleanAvail = availability !== undefined ? String(availability).trim() : "Flexible / Weekends & Evenings";
    const cleanActive = is_active !== undefined ? Boolean(is_active) : true;

    const client = await pool.connect();
    let listingRow;
    let notificationsSent = [];

    try {
      await client.query("BEGIN");

      const upsertRes = await client.query(
        `INSERT INTO mentor_listings (user_id, headline, hourly_rate, availability, is_active, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           headline = EXCLUDED.headline,
           hourly_rate = EXCLUDED.hourly_rate,
           availability = EXCLUDED.availability,
           is_active = EXCLUDED.is_active,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id, user_id, headline, hourly_rate, availability, is_active, created_at, updated_at`,
        [targetUserId, cleanHeadline, cleanRate, cleanAvail, cleanActive]
      );
      listingRow = upsertRes.rows[0];

      // If mentor listing is active, notify learners who requested skills this mentor teaches
      if (cleanActive) {
        const mentorUserRes = await client.query("SELECT name FROM users WHERE id = $1", [targetUserId]);
        const mentorName = mentorUserRes.rows[0]?.name || "A mentor";

        const teachSkillsRes = await client.query(
          "SELECT skill_name FROM skills WHERE user_id = $1 AND type = 'teach'",
          [targetUserId]
        );
        const teachSkills = teachSkillsRes.rows.map((r) => r.skill_name);

        notificationsSent = await matchSkillsAndNotifyLearners(
          client,
          targetUserId,
          mentorName,
          teachSkills
        );
      }

      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    return response.status(200).json({
      message: "Mentor listing saved successfully.",
      listing: listingRow,
      notificationsSentCount: notificationsSent.length,
    });
  } catch (error) {
    console.error("Error saving mentor listing:", error);
    return response.status(500).json({
      error: "An internal server error occurred while saving mentor listing.",
      details: error.message,
    });
  }
};

application.post("/api/mentor-listings", authenticateToken, upsertMentorListingHandler);
application.put("/api/mentor-listings", authenticateToken, upsertMentorListingHandler);
application.put("/api/users/:userId/mentor-listing", authenticateToken, upsertMentorListingHandler);

/**
 * ENDPOINT: GET /api/mentor-listings/my
 * Returns the authenticated user's mentor listing.
 */
application.get("/api/mentor-listings/my", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query("SELECT * FROM mentor_listings WHERE user_id = $1", [userId]);
    if (res.rows.length === 0) {
      return response.status(404).json({ error: "Mentor listing not found for current user." });
    }
    return response.status(200).json({ listing: res.rows[0] });
  } catch (error) {
    return response.status(500).json({ error: "An error occurred fetching mentor listing." });
  }
});

/**
 * ENDPOINT: GET /api/mentor-listings/:userId
 * Returns a specific user's public mentor listing.
 */
application.get("/api/mentor-listings/:userId", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const res = await query("SELECT * FROM mentor_listings WHERE user_id = $1", [targetUserId]);
    if (res.rows.length === 0) {
      return response.status(404).json({ error: "Mentor listing not found." });
    }
    return response.status(200).json({ listing: res.rows[0] });
  } catch (error) {
    return response.status(500).json({ error: "An error occurred fetching mentor listing." });
  }
});

// ----------------------------------------------------------------------------
// SKILL VERIFICATION QUIZ ENDPOINTS (PostgreSQL-backed & JWT-authorized)
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: GET /api/quizzes/supported-skills
 * Returns the list of skills that currently offer a curated qualification quiz.
 */
application.get("/api/quizzes/supported-skills", (request, response) => {
  const supported = getSupportedSkills();
  return response.status(200).json({
    supportedSkills: supported,
    count: supported.length,
    description: "Curated 10-question verification quizzes with checked answer keys.",
  });
});

/**
 * ENDPOINT: POST /api/quizzes/start
 * Starts a 10-question multiple choice teacher verification quiz for the specified skill.
 *
 * Requirements:
 * - Requires JWT authentication (request.user.userId).
 * - Checks if the selected skill has a curated question bank.
 * - If not available: returns 404 with an explanation that no quiz is available yet (no generic questions).
 * - Randomly selects 10 distinct questions from the skill's question bank.
 * - Randomizes option order for every question.
 * - Keeps correct answers server-side; NEVER leaks answer key or preselected answers to client.
 */
application.post("/api/quizzes/start", authenticateToken, (request, response) => {
  try {
    const { skillName } = request.body;

    if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
      return response.status(400).json({
        error: "Skill name is required to start a verification quiz.",
      });
    }

    const cleanSkill = skillName.trim();

    // Check if question bank is available for this skill
    if (!hasQuestionBank(cleanSkill)) {
      const supportedList = getSupportedSkills()
        .map((s) => s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "))
        .join(", ");
      return response.status(404).json({
        available: false,
        error: `A verification quiz is not available for "${cleanSkill}" yet.`,
        message: `A verification quiz is not available for "${cleanSkill}" yet. Curated qualification quizzes with domain-specific questions are currently supported for: ${supportedList}. Verified teacher badges are only awarded for skills with curated qualification quizzes.`,
        skillName: cleanSkill,
        supportedSkills: getSupportedSkills(),
      });
    }

    // Generate 10-question quiz with randomized options and distinct questions
    const generated = generateQuiz(cleanSkill);
    if (!generated) {
      return response.status(500).json({
        error: `Failed to generate quiz for "${cleanSkill}". Insufficient questions in bank.`,
      });
    }

    const quizId = `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Store session server-side with 1 hour expiration
    activeQuizSessions.set(quizId, {
      quizId,
      userId: request.user.userId,
      skillName: cleanSkill,
      answerKey: generated.answerKey,
      clientQuestions: generated.clientQuestions,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    return response.status(200).json({
      quizId,
      skillName: cleanSkill,
      totalQuestions: generated.clientQuestions.length,
      passingScore: 5,
      passingPercentage: 50,
      questions: generated.clientQuestions, // Client receives NO correct answers and NO preselected answers
    });
  } catch (error) {
    console.error("Error starting quiz:", error);
    return response.status(500).json({
      error: "An internal server error occurred while starting the quiz.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: POST /api/quizzes/submit
 * Grades the submitted quiz on the server and records the attempt in PostgreSQL.
 *
 * Requirements:
 * - Uses JWT identity for authorization; never trusts user ID from request body.
 * - Scores result out of 10 and percentage.
 * - Score of 5/10 or higher qualifies user as verified teacher for that specific skill.
 * - Score below 5/10 shows result and supportive message:
 *   "You didn’t pass this time. Review the skill and try again when you’re ready." and allows retake.
 * - Persists attempt into quiz_attempts table.
 * - On pass (score >= 5): marks is_verified = TRUE in skills table and issues in-app notification.
 */
application.post("/api/quizzes/submit", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId; // Strictly from JWT
    const { quizId, skillName, answers } = request.body;

    if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
      return response.status(400).json({
        error: "Skill name is required to submit a quiz.",
      });
    }

    const cleanSkill = skillName.trim();

    if (!hasQuestionBank(cleanSkill)) {
      return response.status(404).json({
        error: `A verification quiz is not available for "${cleanSkill}" yet.`,
      });
    }

    if (!answers || typeof answers !== "object") {
      return response.status(400).json({
        error: "Submitted answers are required.",
      });
    }

    // Retrieve active session or reconstruct answer lookup
    const session = activeQuizSessions.get(quizId);
    if (session && session.userId !== userId) {
      return response.status(403).json({
        error: "Forbidden: You are not authorized to submit this quiz session.",
      });
    }

    // Determine the questions to grade
    let questionsToGrade = [];
    if (session && session.clientQuestions) {
      questionsToGrade = session.clientQuestions;
    } else {
      // If session expired, grade submitted question IDs that exist in the bank
      const submittedQIds = Array.isArray(answers) ? answers.map((a) => a.questionId) : Object.keys(answers);
      questionsToGrade = submittedQIds
        .map((qId) => {
          const q = getQuestionDetails(cleanSkill, qId);
          return q ? { id: q.id, question: q.question } : null;
        })
        .filter(Boolean);
    }

    if (questionsToGrade.length === 0) {
      return response.status(400).json({
        error: "No valid questions were submitted for grading.",
      });
    }

    // Grade each question server-side
    let score = 0;
    const total = 10; // Quizzes are standard 10 questions
    const questionResults = [];

    for (const q of questionsToGrade) {
      let chosenAnswer = "";
      if (Array.isArray(answers)) {
        const found = answers.find((a) => a.questionId === q.id);
        chosenAnswer = found ? String(found.answer || "").trim() : "";
      } else {
        chosenAnswer = answers[q.id] ? String(answers[q.id]).trim() : "";
      }

      let questionDetail = null;
      if (session && session.answerKey && session.answerKey.has(q.id)) {
        questionDetail = session.answerKey.get(q.id);
      } else {
        questionDetail = getQuestionDetails(cleanSkill, q.id);
      }

      const correctAnswer = questionDetail ? questionDetail.correctAnswer : "";
      const explanation = questionDetail ? questionDetail.explanation : "";
      const isCorrect = Boolean(correctAnswer && chosenAnswer && chosenAnswer === correctAnswer);

      if (isCorrect) {
        score += 1;
      }

      questionResults.push({
        questionId: q.id,
        question: q.question,
        chosenAnswer: chosenAnswer || "(No answer selected)",
        correctAnswer,
        isCorrect,
        explanation,
      });
    }

    const percentage = Math.round((score / total) * 100);
    const passed = score >= 5;

    // Database persistence
    const conn = await checkConnection();
    let attemptRecord = null;

    if (conn.reachable) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Save attempt to quiz_attempts
        const attemptRes = await client.query(
          `INSERT INTO quiz_attempts (user_id, skill_name, score, total, percentage, passed)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, user_id, skill_name, score, total, percentage, passed, created_at`,
          [userId, cleanSkill, score, total, percentage, passed]
        );
        attemptRecord = attemptRes.rows[0];

        // If passed (score >= 5), mark skill as verified in skills table
        if (passed) {
          // Check if the user already has this skill listed as teachable
          const skillCheck = await client.query(
            `SELECT id FROM skills WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2) AND type = 'teach'`,
            [userId, cleanSkill]
          );

          if (skillCheck.rows.length > 0) {
            await client.query(
              `UPDATE skills
               SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP
               WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2) AND type = 'teach'`,
              [userId, cleanSkill]
            );
          } else {
            // If they haven't saved this skill to their profile yet, insert verified teachable skill
            await client.query(
              `INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at)
               VALUES ($1, $2, 'intermediate', 'teach', TRUE, CURRENT_TIMESTAMP)
               ON CONFLICT ON CONSTRAINT uq_user_skill_type DO UPDATE SET
                 is_verified = TRUE,
                 verified_at = CURRENT_TIMESTAMP`,
              [userId, cleanSkill]
            );
          }

          // Create an in-app celebration notification
          await client.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES ($1, 'quiz_passed', $2, $3, '/profile')`,
            [
              userId,
              `✓ Verified Teacher: ${cleanSkill}`,
              `Congratulations! You passed the ${cleanSkill} teacher verification quiz with a score of ${score}/10 (${percentage}%). You are now a verified teacher for this skill!`,
            ]
          ).catch(() => {});
        }

        await client.query("COMMIT");
      } catch (dbErr) {
        await client.query("ROLLBACK");
        console.error("Error saving quiz attempt to database:", dbErr);
      } finally {
        client.release();
      }
    }

    // Clean up active session
    if (quizId) {
      activeQuizSessions.delete(quizId);
    }

    const message = passed
      ? `Congratulations! You passed the ${cleanSkill} verification quiz with a score of ${score}/10 (${percentage}%). You have earned the Verified Teacher badge!`
      : `You didn’t pass this time. Review the skill and try again when you’re ready.`;

    return response.status(200).json({
      quizId,
      skillName: cleanSkill,
      score,
      total,
      percentage,
      passed,
      qualifiesAsTeacher: passed,
      scoreDisplay: `${score}/${total} (${percentage}%)`,
      message,
      results: questionResults,
      attemptId: attemptRecord ? attemptRecord.id : null,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return response.status(500).json({
      error: "An internal server error occurred while grading the quiz.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/quizzes/attempts/my
 * Retrieves past quiz attempts and verified skills for the authenticated user.
 */
application.get("/api/quizzes/attempts/my", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const conn = await checkConnection();

    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const attemptsRes = await query(
      `SELECT id, skill_name, score, total, percentage, passed, created_at
       FROM quiz_attempts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    const verifiedSkillsRes = await query(
      `SELECT id, skill_name, level, verified_at
       FROM skills
       WHERE user_id = $1 AND is_verified = TRUE AND type = 'teach'
       ORDER BY verified_at DESC`,
      [userId]
    );

    return response.status(200).json({
      attempts: attemptsRes.rows || [],
      verifiedSkills: verifiedSkillsRes.rows || [],
    });
  } catch (error) {
    console.error("Error retrieving user quiz attempts:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving quiz attempts.",
      details: error.message,
    });
  }
});

// ----------------------------------------------------------------------------
// AUTHENTICATION ENDPOINTS (PostgreSQL-backed)
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: POST /api/auth/register
 *
 * WHAT IT DOES:
 * 1. Validates that name, email, password, and role are provided.
 * 2. Checks for duplicate email — returns 409 Conflict if already registered.
 * 3. Hashes the plaintext password with bcrypt (12 salt rounds).
 * 4. Inserts the new user into PostgreSQL users table.
 * 5. Signs and returns a JWT token — never returns the password hash.
 *
 * WHY BCRYPT? (VIVA POINT):
 * bcrypt is a one-way hashing function. Even if someone reads the database,
 * they cannot reverse the hash back to the original password. The salt rounds
 * (12) control how computationally expensive the hash is, making brute-force
 * attacks impractical.
 */
application.post("/api/auth/register", async (request, response) => {
  try {
    // Validate required fields
    if (!JWT_SECRET) {
      return response.status(500).json({
        error: "Server configuration error: JWT_SECRET is not set in backend/.env.",
      });
    }

    const {
      name,
      email,
      password,
      role,
      username,
      profile_summary,
      specialization_domain,
      active_mode,
      can_teach,
      can_learn,
    } = request.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return response.status(400).json({ error: "Name is required." });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return response.status(400).json({ error: "A valid email address is required." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return response.status(400).json({ error: "Password must be at least 6 characters." });
    }

    // Optional username format & uniqueness validation
    let cleanUsername = null;
    if (username && typeof username === "string" && username.trim() !== "") {
      cleanUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,30}$/.test(cleanUsername)) {
        return response.status(400).json({
          error: "Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens.",
        });
      }
    }

    const allowedRoles = ["student", "professional", "volunteer"];
    const userRole = allowedRoles.includes(role) ? role : "student";
    const userMode = active_mode === "teacher" ? "teacher" : "learner";
    const userCanTeach = can_teach !== undefined ? Boolean(can_teach) : true;
    const userCanLearn = can_learn !== undefined ? Boolean(can_learn) : true;

    // Verify PostgreSQL is reachable before attempting write
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Registration could not be completed.",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Check for duplicate email using parameterized query
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase().trim()]
    );
    if (existingUser.rows.length > 0) {
      return response.status(409).json({
        error: "An account with this email address already exists. Please log in instead.",
      });
    }

    // Check duplicate username if provided
    if (cleanUsername) {
      const existingUserByUsername = await query(
        "SELECT id FROM users WHERE LOWER(username) = $1",
        [cleanUsername]
      );
      if (existingUserByUsername.rows.length > 0) {
        return response.status(409).json({
          error: `The username "${username}" is already taken. Please choose another username.`,
        });
      }
    }

    // Hash password — 12 salt rounds is the recommended minimum for bcrypt
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate a unique user ID
    const userId = "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const summaryVal = profile_summary && typeof profile_summary === "string" ? profile_summary.trim() : "";
    const specDomain = specialization_domain && typeof specialization_domain === "string" ? specialization_domain.trim() : null;

    // Insert new user into PostgreSQL — password_hash stored, never plaintext
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, reputation_score, username, profile_summary, bio, specialization_domain, active_mode, can_teach, can_learn)
       VALUES ($1, $2, $3, $4, $5, 5.00, $6, $7, $7, $8, $9, $10, $11)`,
      [userId, name.trim(), email.toLowerCase().trim(), passwordHash, userRole, cleanUsername, summaryVal, specDomain, userMode, userCanTeach, userCanLearn]
    );

    // Build safe user object — password_hash is intentionally excluded
    const newUser = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      username: cleanUsername,
      role: userRole,
      bio: summaryVal,
      profile_summary: summaryVal,
      specialization_domain: specDomain || "",
      work_experience: [],
      social_profiles: {},
      avatar_url: null,
      reputation_score: 5.0,
      active_mode: userMode,
      can_teach: userCanTeach,
      can_learn: userCanLearn,
      skills: [],
    };

    // Sign JWT token with the secret from .env
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return response.status(201).json({
      message: "Registration successful! Welcome to SkillExchange.",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Error during registration:", error.message);
    return response.status(500).json({
      error: "An internal server error occurred during registration.",
    });
  }
});

/**
 * ENDPOINT: POST /api/auth/login
 *
 * WHAT IT DOES:
 * 1. Looks up the user by email using a parameterized query.
 * 2. Compares the submitted password against the stored bcrypt hash.
 * 3. Returns a JWT token and the user profile on success.
 * 4. Returns a generic 401 on any credential mismatch (never reveals
 *    whether the email exists — prevents user enumeration attacks).
 *
 * WHY GENERIC 401? (VIVA POINT):
 * Returning "email not found" vs "wrong password" separately leaks information
 * that attackers can exploit to enumerate valid accounts. A single generic
 * message prevents this.
 */
application.post("/api/auth/login", async (request, response) => {
  try {
    if (!JWT_SECRET) {
      return response.status(500).json({
        error: "Server configuration error: JWT_SECRET is not set in backend/.env.",
      });
    }

    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({ error: "Email and password are required." });
    }

    // Verify PostgreSQL is reachable
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Login could not be completed.",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Look up user by email — parameterized to prevent SQL injection
    const result = await query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.bio, u.reputation_score,
              u.username, u.profile_summary, u.specialization_domain, u.work_experience, u.social_profiles, u.avatar_url,
              u.active_mode, u.can_teach, u.can_learn,
              COALESCE(
                json_agg(
                  json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type, 'is_verified', COALESCE(s.is_verified, FALSE), 'verified_at', s.verified_at)
                ) FILTER (WHERE s.id IS NOT NULL),
                '[]'
              ) as skills
       FROM users u
       LEFT JOIN skills s ON u.id = s.user_id
       WHERE u.email = $1
       GROUP BY u.id`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Email not found — return generic message to prevent user enumeration
      return response.status(401).json({
        error: "Invalid email or password. Please check your credentials and try again.",
      });
    }

    const dbUser = result.rows[0];

    // Compare submitted password against stored bcrypt hash
    const passwordMatches = await bcrypt.compare(password, dbUser.password_hash);
    if (!passwordMatches) {
      return response.status(401).json({
        error: "Invalid email or password. Please check your credentials and try again.",
      });
    }

    // Build safe user object — password_hash is intentionally excluded from response
    const safeUser = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      username: dbUser.username || null,
      role: dbUser.role,
      bio: dbUser.bio || dbUser.profile_summary || "",
      profile_summary: dbUser.profile_summary || dbUser.bio || "",
      specialization_domain: dbUser.specialization_domain || "",
      work_experience: dbUser.work_experience || [],
      social_profiles: dbUser.social_profiles || {},
      avatar_url: dbUser.avatar_url || null,
      reputation_score: parseFloat(dbUser.reputation_score) || 5.0,
      active_mode: dbUser.active_mode || "learner",
      can_teach: dbUser.can_teach !== false,
      can_learn: dbUser.can_learn !== false,
      skills: dbUser.skills || [],
    };

    // Sign JWT token
    const token = jwt.sign(
      { userId: safeUser.id, email: safeUser.email, role: safeUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return response.status(200).json({
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Error during login:", error.message);
    return response.status(500).json({
      error: "An internal server error occurred during login.",
    });
  }
});

/**
 * DATABASE HEALTH ENDPOINT: GET /api/health/db
 *
 * Verifies local PostgreSQL reachability, latency, database name, and server version.
 */
application.get("/api/health/db", async (request, response) => {
  try {
    const health = await checkConnection();
    return response.status(health.reachable ? 200 : 503).json({
      status: health.reachable ? "ok" : "warning",
      database: health.reachable ? "connected" : "unreachable",
      databaseType: "PostgreSQL (Local Development)",
      databaseName: health.database,
      latencyMs: health.latencyMs,
      serverTime: health.serverTime,
      postgresVersion: health.version,
      reason: health.reason,
    });
  } catch (error) {
    return response.status(500).json({
      status: "error",
      database: "unreachable",
      error: error.message,
    });
  }
});

// Root endpoint for quick health check
application.get("/", (request, response) => {
  return response.json({
    status: "online",
    message: "Local Skill Exchange Backend API & DSA Engine is running with Local PostgreSQL support!",
  });
});

// ----------------------------------------------------------------------------
// START THE SERVER LISTENER
// ----------------------------------------------------------------------------
if (require.main === module) {
  application.listen(PORT, () => {
    console.log(`Backend server is running and listening on http://localhost:${PORT}`);
  });
}

// Export modules for testing purposes
module.exports = {
  application,
  seedUsers,
  skillHashTable,
  bookingQueue,
  mentorGraph,
  MaxHeap,
  Graph,
  seedDatabase,
  sortMentorsByLevel,
  initializeDatabaseAndDsa,
  activeQuizSessions,
};
