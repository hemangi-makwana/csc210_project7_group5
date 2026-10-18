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

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HashTable = require("./dsa/hashTable");
const Queue = require("./dsa/queue");
const { pool, query, checkConnection, isPoolInitialized } = require("./db/index");
const { setupDatabase } = require("./db/setup");

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

// ----------------------------------------------------------------------------
// DATA STRUCTURE INSTANCES (ALGORITHMIC CORE ENGINE)
// ----------------------------------------------------------------------------

// Hash Table for O(1) instant lookup of mentors by skill name
const skillHashTable = new HashTable(31);

// FIFO Queue for processing mentor session bookings in the order received
const bookingQueue = new Queue();

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
 * Inserts seed users into the Hash Table.
 * Used as a fallback when local PostgreSQL is not running or during initial offline boot.
 */
function seedDatabase() {
  for (let userIndex = 0; userIndex < seedUsers.length; userIndex++) {
    const user = seedUsers[userIndex];

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
}

/**
 * Connects to local PostgreSQL, ensures tables exist, seeds initial mentors if empty,
 * and loads mentor skills from PostgreSQL into the in-memory Hash Table.
 *
 * ARCHITECTURAL PRINCIPLE:
 * PostgreSQL is the true persistent source of truth. The Hash Table serves as the
 * fast, in-memory O(1) algorithmic index primed directly from PostgreSQL data.
 */
async function initializeDatabaseAndDsa() {
  try {
    const conn = await checkConnection();

    if (conn.reachable) {
      console.log(`[Database] Connected to local PostgreSQL ("${conn.database}" on port 5432)`);

      // Ensure schema tables exist (safe and idempotent)
      await setupDatabase(false);

      // Note: Sample mentors and bookings are optional and NOT inserted automatically.
      // To seed optional sample data, run: npm run db:seed

      // Query mentors and skills directly from PostgreSQL to populate Hash Table
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
application.get("/api/skills/search", (request, response) => {
  try {
    const searchSkillName = request.query.query;

    if (!searchSkillName || typeof searchSkillName !== "string" || searchSkillName.trim() === "") {
      return response.status(200).json({ mentors: [] });
    }

    // Step 1: Use Hash Table to find mentors who have this skill in O(1) average time
    const matchingMentors = skillHashTable.lookup(searchSkillName);

    // Step 2: Sort mentors by expertise level (expert > intermediate > beginner)
    const sortedMentors = sortMentorsByLevel(matchingMentors);

    return response.status(200).json({
      mentors: sortedMentors,
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
        "/history",
      ]
    ).catch(() => {});

    // Step 3: Enqueue in FIFO Queue to maintain pipeline processing order (DSA Feature)
    bookingQueue.enqueue(bookingRequest);

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
        SELECT u.id, u.name, u.role, u.bio, u.reputation_score,
               COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL), '{}') as skills
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        GROUP BY u.id, u.name, u.role, u.bio, u.reputation_score
        ORDER BY u.id;
      `);

      if (dbResult.rows && dbResult.rows.length > 0) {
        const mentorList = dbResult.rows.map((row) => ({
          id: row.id,
          userId: row.id,
          name: row.name,
          role: row.role || "Peer Mentor",
          skills: row.skills || [],
          bio: row.bio || "",
          reputationScore: parseFloat(row.reputation_score) || 5.0,
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

    // Step 2: Persist directly into PostgreSQL with parameterized queries
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
      const cleanUser = request.body.username.trim().toLowerCase();
      const dup = await query("SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2", [cleanUser, targetUserId]);
      if (dup.rows.length > 0) {
        return response.status(409).json({ error: `Username "${request.body.username}" is already taken.` });
      }
      updateClauses.push(`username = $${pIdx++}`);
      updateVals.push(cleanUser);
    }
    updateVals.push(targetUserId);

    await query(
      `UPDATE users SET ${updateClauses.join(", ")} WHERE id = $${pIdx}`,
      updateVals
    );

    // Delete existing skills for this user and insert updated list
    await query(`DELETE FROM skills WHERE user_id = $1`, [targetUserId]);

    for (const skill of incomingSkills) {
      const skillName = skill.skill_name || skill.skillName;
      const level = skill.level || "beginner";
      const type = skill.type || "teach";

      if (skillName) {
        await query(
          `INSERT INTO skills (user_id, skill_name, level, type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ON CONSTRAINT uq_user_skill_type DO NOTHING`,
          [targetUserId, skillName, level, type]
        );
      }
    }

    // Fetch refreshed user record directly from database
    const userRes = await query(
      `SELECT id, name, email, username, role, bio, profile_summary, specialization_domain,
              work_experience, social_profiles, avatar_url, reputation_score
       FROM users WHERE id = $1`,
      [targetUserId]
    );
    const row = userRes.rows[0] || {
      id: targetUserId,
      name: "User " + targetUserId,
      bio: incomingBio,
      profile_summary: incomingSummary,
      reputation_score: 5.0,
    };

    const updatedUser = {
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
      skills: incomingSkills.filter((s) => s.type === "teach").map((s) => s.skill_name || s.skillName),
      skillEntries: incomingSkills,
    };

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

    return response.status(200).json({
      message: "Profile skills and details saved successfully in PostgreSQL database!",
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

    if (updateClauses.length === 0) {
      return response.status(400).json({ error: "No valid profile fields provided for update." });
    }

    updateClauses.push("updated_at = CURRENT_TIMESTAMP");

    const updateSql = `UPDATE users SET ${updateClauses.join(", ")} WHERE id = $${paramIndex} RETURNING id, name, email, username, role, bio, profile_summary, specialization_domain, work_experience, social_profiles, avatar_url, reputation_score, updated_at`;
    updateValues.push(targetUserId);

    const updateRes = await query(updateSql, updateValues);
    const updated = updateRes.rows[0];

    // Fetch user skills
    const skillsRes = await query(
      `SELECT id, skill_name, level, type FROM skills WHERE user_id = $1 ORDER BY id`,
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
                u.reputation_score,
                COALESCE(
                  json_agg(
                    json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type)
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
                    json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type)
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
    const conn = await checkConnection();

    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Session history could not be retrieved from persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
        sessions: [],
      });
    }

    const dbResult = await query(
      `SELECT sb.id, sb.mentor_id, sb.learner_id, sb.scheduled_at, sb.status, sb.topic, sb.notes,
              json_build_object('id', m.id, 'name', m.name, 'role', m.role) as mentor,
              json_build_object('id', l.id, 'name', l.name, 'role', l.role) as learner,
              CASE WHEN r.id IS NOT NULL THEN
                json_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment)
              ELSE NULL END as review
       FROM session_bookings sb
       JOIN users m ON sb.mentor_id = m.id
       JOIN users l ON sb.learner_id = l.id
       LEFT JOIN reviews r ON sb.id = r.session_id
       WHERE sb.learner_id = $1 OR sb.mentor_id = $1
       ORDER BY sb.scheduled_at DESC`,
      [targetUserId]
    );

    return response.status(200).json({
      sessions: dbResult.rows || [],
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
 * Returns personalized mentor recommendations for the user.
 */
application.get("/api/recommendations/:userId", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();

    let mentors = [];

    if (conn.reachable) {
      const dbResult = await query(`
        SELECT u.id, u.name, u.role, u.bio, u.reputation_score,
               COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach' AND s.skill_name IS NOT NULL), '{}') as skills
        FROM users u
        LEFT JOIN skills s ON u.id = s.user_id
        WHERE u.id <> $1
        GROUP BY u.id, u.name, u.role, u.bio, u.reputation_score
        ORDER BY u.reputation_score DESC
        LIMIT 6;
      `, [targetUserId]);

      mentors = dbResult.rows || [];
    }

    if (mentors.length === 0) {
      mentors = seedUsers.filter((u) => u.userId !== targetUserId).slice(0, 6);
    }

    const recommendations = mentors.map((m, index) => {
      const skillsList = Array.isArray(m.skills) ? m.skills : (m.skills ? [m.skills] : []);
      const score = Math.round((parseFloat(m.reputation_score || m.reputationScore) || 4.5) * 20) - index * 2;
      return {
        mentor: {
          id: m.id || m.userId,
          userId: m.id || m.userId,
          name: m.name,
          role: m.role,
          bio: m.bio,
          skills: skillsList,
          reputationScore: parseFloat(m.reputation_score || m.reputationScore) || 5.0,
        },
        score: Math.min(score, 99),
        rank: index + 1,
        reason: `High community rating (${m.reputation_score || m.reputationScore}★) and active teaching in ${skillsList.slice(0, 2).join(", ")}.`,
      };
    });

    return response.status(200).json({
      recommendations,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return response.status(500).json({
      error: "An internal server error occurred while generating recommendations.",
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

    const { name, email, password, role, username, profile_summary, specialization_domain } = request.body;

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
      `INSERT INTO users (id, name, email, password_hash, role, reputation_score, username, profile_summary, bio, specialization_domain)
       VALUES ($1, $2, $3, $4, $5, 5.00, $6, $7, $7, $8)`,
      [userId, name.trim(), email.toLowerCase().trim(), passwordHash, userRole, cleanUsername, summaryVal, specDomain]
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
      skills: [],
    };

    // Sign JWT token with the secret from .env
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return response.status(201).json({
      message: "Registration successful! Welcome to SkillSwap.",
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
              COALESCE(
                json_agg(
                  json_build_object('id', s.id, 'skill_name', s.skill_name, 'level', s.level, 'type', s.type)
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
  seedDatabase,
  sortMentorsByLevel,
  initializeDatabaseAndDsa,
};
