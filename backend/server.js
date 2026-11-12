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
const zlib = require("zlib");
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
const {
  VerificationDecisionTree,
  ResumePreChecker,
  VerificationLifecycleManager,
} = require("./dsa/decisionTree");
const ReputationEngine = require("./dsa/reputationEngine");
const { validateFileSignature } = require("./utils/fileValidation");

// Designated Sole Reviewer Email (strictly enforced on server, case-insensitive)
const SOLE_REVIEWER_EMAIL = (process.env.REVIEWER_EMAIL || "kailashsampath15@gmail.com").trim().toLowerCase();

// Active User Presence Heartbeat Map (userId -> timestamp)
const userPresenceMap = new Map();

// Active WebRTC Call Signaling Messages (conversationId -> Array of signals)
const callSignalingMap = new Map();

const verificationDecisionTree = new VerificationDecisionTree();
const reputationEngine = new ReputationEngine(31, 4.0, 3);

const { pool, query, checkConnection, isPoolInitialized } = require("./db/index");
const { setupDatabase } = require("./db/setup");
const { seedSkillCatalog } = require("./db/seed");
// JWT signing secret — loaded strictly from backend/.env, never hardcoded.
// The backend requires JWT_SECRET and fails safely on startup if missing.
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "test" ? require("crypto").randomBytes(32).toString("hex") : null);
if (!JWT_SECRET) {
  console.error(
    "FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty in backend/.env.\n" +
    "The application cannot start securely without a configured JWT_SECRET."
  );
  process.exit(1);
}
const JWT_EXPIRES_IN = "7d";

// Create the Express application instance
const application = express();
const PORT = process.env.PORT || 5000;

// Middleware 1: Enable CORS so the React frontend can make requests to this backend
application.use(cors());

// Middleware 2: Automatically parse incoming JSON request bodies into JavaScript objects
application.use(express.json());

// Ensure local uploads/avatars and uploads/documents directories exist
const uploadsDir = path.join(__dirname, "uploads");
const avatarsDir = path.join(uploadsDir, "avatars");
const documentsDir = path.join(uploadsDir, "documents");
const attachmentsDir = path.join(uploadsDir, "attachments");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });
if (!fs.existsSync(attachmentsDir)) fs.mkdirSync(attachmentsDir, { recursive: true });

// Multer storage engine for Session Chat Attachments & Voice Notes
const attachmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, attachmentsDir);
  },
  filename: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const safeExt = [
      ".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".gif",
      ".webm", ".ogg", ".wav", ".mp3", ".m4a", ".mp4"
    ].includes(rawExt) ? rawExt : ".bin";
    const userPart = req.user ? req.user.userId : "anon";
    const filename = `attach_${userPart}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${safeExt}`;
    cb(null, filename);
  },
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB maximum (voice notes further capped at 10 MB)
  fileFilter: function (req, file, cb) {
    const rawExt = path.extname(file.originalname || "").toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    // Explicitly disallow SVG to prevent stored XSS via inline SVG attachments
    if (rawExt === ".svg" || mime.includes("svg")) {
      return cb(new Error("SVG files are not permitted for security reasons. Please upload PNG, JPG, WebP, or GIF images."));
    }
    const allowedExts = [
      ".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".webp", ".gif",
      ".webm", ".ogg", ".wav", ".mp3", ".m4a", ".mp4"
    ];
    if (
      allowedExts.includes(rawExt) ||
      mime.startsWith("image/") ||
      mime.startsWith("audio/") ||
      mime === "video/webm" ||
      mime === "video/mp4" ||
      mime.includes("pdf") ||
      mime.includes("officedocument") ||
      mime.includes("msword") ||
      mime.includes("ms-excel")
    ) {
      return cb(null, true);
    }
    return cb(new Error("File format not supported. Permitted types: PDF, DOCX, XLSX, images (PNG/JPG/WebP/GIF), and audio voice recordings."));
  },
});

// Static file serving for uploaded profile photos ONLY
// Secure: Verification documents are strictly served through authenticated routes, never exposed statically.
application.use("/uploads/avatars", express.static(avatarsDir));

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

// Multer storage engine for Teacher Verification documents (Resume & Certificates)
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, documentsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = [".pdf", ".docx", ".jpg", ".jpeg", ".png"].includes(ext) ? ext : ".pdf";
    const prefix = file.fieldname === "resume" ? "resume" : "cert";
    const userPart = req.user ? req.user.userId : "anon";
    const filename = `${prefix}_${userPart}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${safeExt}`;
    cb(null, filename);
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB maximum
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (file.fieldname === "resume") {
      const allowedExt = [".pdf", ".docx"];
      const allowedMime = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/octet-stream",
      ];
      if (allowedExt.includes(ext) || allowedMime.includes(mime)) {
        return cb(null, true);
      }
      return cb(new Error("Invalid resume format. Only PDF and DOCX files up to 5MB are permitted."));
    } else if (file.fieldname === "certificate") {
      const allowedExt = [".pdf", ".jpg", ".jpeg", ".png"];
      const allowedMime = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
      if (allowedExt.includes(ext) || allowedMime.includes(mime)) {
        return cb(null, true);
      }
      return cb(new Error("Invalid certificate format. Only PDF, JPG, and PNG files up to 5MB are permitted."));
    }
    cb(new Error("Unexpected file field in upload."));
  },
});

/**
 * Authentication Middleware: authenticateToken
 * Verifies the JWT Bearer token from the incoming request's Authorization header.
 * Attaches decoded user payload { userId, email, role, isReviewer, canTeach, canLearn } to request.user.
 * Protects endpoints and ensures users can only access/modify authorized resources.
 */
/**
 * Strict Sole Reviewer Authorization Middleware
 * Verifies that the authenticated user's authoritative email in PostgreSQL
 * matches kailashsampath15@gmail.com (case-insensitively).
 * Never trusts client headers or unverified body parameters.
 */
async function requireReviewerAuth(request, response, next) {
  if (!request.user || !request.user.userId) {
    return response.status(401).json({ error: "Authentication required." });
  }

  try {
    const userRes = await query("SELECT email, is_reviewer FROM users WHERE id = $1", [request.user.userId]);
    if (!userRes.rows || userRes.rows.length === 0) {
      return response.status(403).json({ error: "Access denied. User not found." });
    }
    const dbEmail = (userRes.rows[0].email || "").trim().toLowerCase();
    if (dbEmail !== SOLE_REVIEWER_EMAIL) {
      return response.status(403).json({
        error: "Access denied. Only the designated reviewer (kailashsampath15@gmail.com) may access reviewer endpoints.",
      });
    }
    request.user.is_reviewer = true;
    request.user.email = dbEmail;
    next();
  } catch (err) {
    return response.status(500).json({ error: "Failed to verify reviewer authorization." });
  }
}

async function authenticateToken(request, response, next) {
  const authHeader = request.headers["authorization"] || request.headers["Authorization"];
  let token = null;
  if (authHeader && typeof authHeader === "string") {
    const match = authHeader.match(/^bearer\s+(.+)$/i);
    if (match) {
      token = match[1].trim();
    }
  }
  if (!token && request.query && typeof request.query.token === "string") {
    token = request.query.token.trim();
  }

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

    // Query fresh database permissions so reviewer changes take effect immediately
    try {
      const uRes = await query(
        `SELECT is_reviewer, can_teach, can_learn, active_mode FROM users WHERE id = $1`,
        [decoded.userId]
      );
      if (uRes.rows && uRes.rows[0]) {
        request.user.is_reviewer = Boolean(uRes.rows[0].is_reviewer);
        request.user.isReviewer = Boolean(uRes.rows[0].is_reviewer);
        request.user.canTeach = true;
        request.user.canLearn = true;
        request.user.activeMode = uRes.rows[0].active_mode || "learner";
      } else {
        request.user.is_reviewer = false;
        request.user.isReviewer = false;
        request.user.canTeach = true;
        request.user.canLearn = true;
      }
    } catch (dbErr) {
      request.user.is_reviewer = false;
      request.user.isReviewer = false;
    }

    next();
  } catch (err) {
    console.warn(`[Auth] JWT verification failed: ${err.name} - ${err.message}`);
    return response.status(401).json({
      error: "Invalid or expired session token. Please log in again.",
    });
  }
}

/**
 * Computes Levenshtein edit distance between two strings for close-spelling suggestions.
 */
function computeLevenshteinDistance(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, () => Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;
  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i - 1] + 1
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Validates a skill name against PostgreSQL skill_catalog.
 * Returns { valid: boolean, canonicalName?: string, category?: string, suggestion?: string, message?: string }
 */
async function validateSkillAgainstCatalog(skillName) {
  if (!skillName || typeof skillName !== "string") {
    return { valid: false, error: "Skill name is required." };
  }
  const clean = skillName.trim();
  if (clean.length === 0) {
    return { valid: false, error: "Skill name cannot be empty." };
  }

  await ensureCuratedCatalogSynced();

  let catalog = [];
  try {
    const catalogRes = await query(
      `SELECT id, name, category, description FROM skill_catalog ORDER BY name ASC`
    );
    catalog = catalogRes.rows || [];
  } catch (err) {
    catalog = Array.isArray(seedSkillCatalog) ? seedSkillCatalog : [];
  }

  if (catalog.length === 0 && Array.isArray(seedSkillCatalog)) {
    catalog = seedSkillCatalog;
  }

  // Check exact case-insensitive match
  const exact = catalog.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (exact) {
    return { valid: true, canonicalName: exact.name, category: exact.category, catalogItem: exact };
  }

  // Find close spelling suggestion using edit distance
  let closest = null;
  let minDistance = Infinity;

  for (const item of catalog) {
    const itemName = item.name;
    const dist = computeLevenshteinDistance(clean.toLowerCase(), itemName.toLowerCase());
    const maxThreshold = clean.length >= 8 ? 3 : 2;
    if (dist <= maxThreshold && dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  if (closest) {
    return {
      valid: false,
      canonicalName: null,
      suggestion: closest.name,
      suggestionCategory: closest.category || null,
      distance: minDistance,
      message: `"${clean}" is close to "${closest.name}" in the catalog. Did you mean "${closest.name}", or would you like to request "${clean}" as a new skill?`,
    };
  }

  return {
    valid: false,
    canonicalName: null,
    suggestion: null,
    message: `"${clean}" is not yet in the curated catalog. You can submit it as a pending new skill request.`,
  };
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

      // Idempotently synchronize expanded canonical skill catalog across all domains
      if (Array.isArray(seedSkillCatalog) && seedSkillCatalog.length > 0) {
        for (const sc of seedSkillCatalog) {
          await query(
            `INSERT INTO skill_catalog (name, category, description)
             VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET
               category = EXCLUDED.category,
               description = EXCLUDED.description`,
            [sc.name, sc.category, sc.description]
          ).catch(() => {});
        }
      }

      // Ensure every existing account (demo and personal) can switch freely between Learner and Teacher modes
      await query(
        `UPDATE users
         SET can_teach = TRUE,
             can_learn = TRUE,
             active_mode = CASE WHEN active_mode IN ('learner', 'teacher') THEN active_mode ELSE 'learner' END
         WHERE can_teach IS DISTINCT FROM TRUE
            OR can_learn IS DISTINCT FROM TRUE
            OR active_mode IS NULL
            OR active_mode NOT IN ('learner', 'teacher')`
      ).catch(() => {});

      // Clean up obsolete quiz, demo/test, and duplicate notifications while preserving genuine notifications
      await cleanupObsoleteNotifications().catch(() => {});
      await cleanupAutomatedBookingChatMessages().catch(() => {});

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

      // Populate Graph edges and FIFO Queue from session bookings
      bookingQueue.clear();
      const bookingsRes = await query(`
        SELECT id, mentor_id, learner_id, scheduled_at, status, topic, notes, conversation_id, created_at
        FROM session_bookings
        WHERE mentor_id IS NOT NULL AND learner_id IS NOT NULL
        ORDER BY created_at ASC
      `);
      if (bookingsRes.rows) {
        for (const b of bookingsRes.rows) {
          mentorGraph.addEdge(b.learner_id, b.mentor_id, 1, "mentorship", true);
          if (b.status === "pending" || b.status === "queued") {
            bookingQueue.enqueue({
              id: b.id,
              bookingId: b.id,
              mentorId: b.mentor_id,
              learnerId: b.learner_id,
              scheduledAt: b.scheduled_at,
              status: b.status,
              topic: b.topic || "Mentoring Session",
              notes: b.notes || "",
              conversationId: b.conversation_id || null,
              createdAt: b.created_at,
            });
          }
        }
      }

      // Ensure structured feedback columns exist on reviews (idempotent, preserves existing data)
      await query(`
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS clarity_rating INT CHECK (clarity_rating >= 1 AND clarity_rating <= 5);
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS interaction_rating INT CHECK (interaction_rating >= 1 AND interaction_rating <= 5);
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS preparation_rating INT CHECK (preparation_rating >= 1 AND preparation_rating <= 5);
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS materials_rating INT CHECK (materials_rating >= 1 AND materials_rating <= 5);
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS engagement_rating INT CHECK (engagement_rating >= 1 AND engagement_rating <= 5);
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS feedback_answers JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE reviews ADD COLUMN IF NOT EXISTS session_score NUMERIC(4, 2);
      `).catch(() => {});

      // Populate ReputationEngine Hash Table and Graph edge weights from PostgreSQL reviews
      const reviewsRes = await query(`
        SELECT r.id, r.session_id, r.mentor_id, r.reviewer_id, r.rating, r.comment,
               r.clarity_rating, r.interaction_rating, r.preparation_rating,
               r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
               r.created_at, sb.topic AS topic
        FROM reviews r
        LEFT JOIN session_bookings sb ON r.session_id = sb.id
        WHERE r.mentor_id IS NOT NULL AND r.reviewer_id IS NOT NULL
        ORDER BY r.created_at DESC
      `);
      if (reviewsRes.rows) {
        reputationEngine.rebuildFromReviews(reviewsRes.rows);
        const reviewedMentors = new Set();
        for (const r of reviewsRes.rows) {
          mentorGraph.updateEdgeWeight(r.reviewer_id, r.mentor_id, r.rating, true);
          reviewedMentors.add(String(r.mentor_id));
        }
        // Reconcile users.reputation_score in PostgreSQL for teachers who have persisted reviews
        for (const teacherId of reviewedMentors) {
          const repRecord = reputationEngine.getTeacherReputation(teacherId);
          if (repRecord && repRecord.reviewCount > 0) {
            await query(
              "UPDATE users SET reputation_score = $1 WHERE id = $2 AND reputation_score IS DISTINCT FROM $1",
              [repRecord.boundedReputation, teacherId]
            ).catch(() => {});
            const vData = mentorGraph.getVertex(teacherId);
            if (vData) {
              mentorGraph.addVertex(teacherId, {
                ...vData,
                reputationScore: repRecord.boundedReputation,
              });
            }
          }
        }
      }

      if (result.rows && result.rows.length > 0) {
        skillHashTable.clear();
        for (const row of result.rows) {
          const repRecord = reputationEngine.getTeacherReputation(row.id);
          const effectiveReputation =
            repRecord && repRecord.reviewCount > 0
              ? repRecord.boundedReputation
              : parseFloat(row.reputation_score) || 5.0;
          const mentorRecord = {
            userId: row.id,
            id: row.id,
            name: row.name,
            level: row.level,
            skills: row.all_skills || [row.skill_name],
            reputationScore: effectiveReputation,
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
 * Cleans up obsolete quiz notifications, demo/test artifacts, and exact duplicate
 * notifications in PostgreSQL while preserving all genuine user and session notifications.
 */
async function cleanupObsoleteNotifications() {
  try {
    // 1. Remove retired quiz notifications and automated test/demo placeholder notifications
    await query(
      `DELETE FROM notifications
       WHERE LOWER(COALESCE(type, '')) LIKE '%quiz%'
          OR LOWER(COALESCE(title, '')) LIKE '%quiz%'
          OR LOWER(COALESCE(message, '')) LIKE '%quiz%'
          OR LOWER(COALESCE(link, '')) LIKE '%quiz%'
          OR user_id LIKE 'test_%'
          OR user_id LIKE 'mode_test_%'
          OR LOWER(COALESCE(title, '')) LIKE '%test workflow%'
          OR LOWER(COALESCE(message, '')) LIKE '%test workflow%'
          OR LOWER(COALESCE(title, '')) LIKE '%demo notification%'
          OR LOWER(COALESCE(title, '')) LIKE '%sample notification%'`
    );

    // 2. Deduplicate identical notifications for the same user (keeping the newest record)
    await query(
      `DELETE FROM notifications n
       USING notifications n2
       WHERE n.user_id = n2.user_id
         AND COALESCE(n.type, '') = COALESCE(n2.type, '')
         AND LOWER(TRIM(COALESCE(n.title, ''))) = LOWER(TRIM(COALESCE(n2.title, '')))
         AND LOWER(TRIM(COALESCE(n.message, ''))) = LOWER(TRIM(COALESCE(n2.message, '')))
         AND n.id < n2.id`
    );

    // 3. Route teacher incoming-booking notifications directly to Incoming Learner Requests (/requests)
    await query(
      `UPDATE notifications
       SET link = '/requests'
       WHERE type = 'booking_received' AND link = '/history?view=teaching'`
    );
  } catch (err) {
    // Non-fatal if DB unreachable
  }
}

/**
 * Safely removes only system-generated automated booking-request, acceptance, and decline
 * chat messages from conversations while preserving all participant messages, attachments,
 * voice notes, and call activity logs.
 */
async function cleanupAutomatedBookingChatMessages() {
  try {
    await query(
      `DELETE FROM messages
       WHERE COALESCE(message_type, 'text') = 'text'
         AND attachment_filename IS NULL
         AND (
           content LIKE 'Session booking request submitted for "%'
           OR content LIKE 'Session accepted! Looking forward to our session on "%'
           OR content LIKE 'Session request was declined: "%'
         )`
    );
  } catch (err) {
    // Non-fatal if DB unreachable
  }
}

let catalogSyncedInProcess = false;
async function ensureCuratedCatalogSynced() {
  if (catalogSyncedInProcess) return;
  try {
    if (Array.isArray(seedSkillCatalog) && seedSkillCatalog.length > 0) {
      for (const sc of seedSkillCatalog) {
        await query(
          `INSERT INTO skill_catalog (name, category, description)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE SET
             category = EXCLUDED.category,
             description = EXCLUDED.description`,
          [sc.name, sc.category, sc.description]
        );
      }
      catalogSyncedInProcess = true;
    }
  } catch (err) {
    // Non-fatal
  }
}

/**
 * Reconciles the in-memory FIFO bookingQueue with pending/queued session_bookings in PostgreSQL.
 */
async function reconcileBookingQueueFromDatabase() {
  try {
    const pendingRes = await query(`
      SELECT id, mentor_id, learner_id, scheduled_at, status, topic, notes, conversation_id, created_at
      FROM session_bookings
      WHERE status IN ('pending', 'queued')
      ORDER BY created_at ASC
    `);
    bookingQueue.clear();
    for (const b of pendingRes.rows || []) {
      bookingQueue.enqueue({
        id: b.id,
        bookingId: b.id,
        mentorId: b.mentor_id,
        learnerId: b.learner_id,
        scheduledAt: b.scheduled_at,
        status: b.status,
        topic: b.topic || "Mentoring Session",
        notes: b.notes || "",
        conversationId: b.conversation_id || null,
        createdAt: b.created_at,
      });
    }
  } catch (err) {
    // Non-fatal if DB unreachable
  }
}

/**
 * Reconciles a teacher's reputation, teachable skills, and vertex metadata across
 * ReputationEngine (HashTable), skillHashTable (HashTable), and mentorGraph (Graph)
 * using PostgreSQL as the authoritative source of truth.
 */
async function reconcileTeacherDsaState(teacherId) {
  if (!teacherId) return;
  try {
    const userRes = await query(
      `SELECT id, name, role, bio, reputation_score FROM users WHERE id = $1`,
      [String(teacherId)]
    );
    if (!userRes.rows || userRes.rows.length === 0) return;
    const u = userRes.rows[0];

    const skillsRes = await query(
      `SELECT skill_name, level, type, is_verified, verified_at
       FROM skills
       WHERE user_id = $1 AND type = 'teach'
       ORDER BY id ASC`,
      [String(teacherId)]
    );
    const teachSkills = skillsRes.rows || [];
    const repRecord = reputationEngine.getTeacherReputation(String(teacherId));
    const effectiveRep =
      repRecord && repRecord.reviewCount > 0
        ? repRecord.boundedReputation
        : parseFloat(u.reputation_score) || 5.0;

    mentorGraph.addVertex(u.id, {
      name: u.name,
      role: u.role,
      skills: teachSkills,
      reputationScore: effectiveRep,
    });

    for (const s of teachSkills) {
      skillHashTable.insert(s.skill_name, {
        userId: u.id,
        id: u.id,
        name: u.name,
        level: s.level || "intermediate",
        skills: teachSkills.map((ts) => ts.skill_name),
        reputationScore: effectiveRep,
      });
    }
  } catch (err) {
    // Non-fatal during background reconciliation
  }
}

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
 * ENDPOINT: GET /api/courses/available
 *
 * Populates real Available Courses from canonical skill_catalog entries that have
 * an available, approved (verified) teacher in PostgreSQL.
 * Supports optional category and text search filters.
 */
application.get("/api/courses/available", async (request, response) => {
  try {
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Available courses could not be retrieved.",
        courses: [],
      });
    }

    const { category, search } = request.query;
    let filterSql = "";
    const params = [];

    if (category && typeof category === "string" && category.trim() !== "All" && category.trim() !== "") {
      params.push(category.trim());
      filterSql += ` AND LOWER(sc.category) = LOWER($${params.length})`;
    }

    if (search && typeof search === "string" && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      filterSql += ` AND (LOWER(sc.name) LIKE $${params.length} OR LOWER(sc.description) LIKE $${params.length})`;
    }

    const dbResult = await query(
      `SELECT sc.id, sc.name, sc.category, sc.description,
              COUNT(DISTINCT s.user_id)::int AS teacher_count,
              json_agg(
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'avatar_url', u.avatar_url,
                  'reputation_score', COALESCE(u.reputation_score, 5.00),
                  'level', s.level,
                  'bio', u.bio
                ) ORDER BY COALESCE(u.reputation_score, 5.00) DESC
              ) AS teachers
       FROM skill_catalog sc
       JOIN skills s ON LOWER(s.skill_name) = LOWER(sc.name) AND s.type = 'teach' AND s.is_verified = TRUE
       JOIN users u ON s.user_id = u.id
       WHERE 1=1 ${filterSql}
       GROUP BY sc.id, sc.name, sc.category, sc.description
       ORDER BY sc.name ASC`,
      params
    );

    let suggestion = null;
    let message = null;
    let isCatalogCourse = false;

    if (search && typeof search === "string" && search.trim() !== "" && (!dbResult.rows || dbResult.rows.length === 0)) {
      const validation = await validateSkillAgainstCatalog(search.trim());
      if (validation.valid) {
        isCatalogCourse = true;
        message = `"${validation.canonicalName}" is a valid catalog course, but no verified teachers are currently offering active sessions. You can post a course request to alert verified educators!`;
      } else if (validation.suggestion) {
        suggestion = validation.suggestion;
        message = validation.message;
      } else {
        message = validation.message;
      }
    }

    return response.status(200).json({
      courses: dbResult.rows || [],
      count: dbResult.rows ? dbResult.rows.length : 0,
      search: search ? search.trim() : null,
      suggestion,
      message,
      isCatalogCourse,
    });
  } catch (error) {
    console.error("Error retrieving available courses:", error);
    return response.status(500).json({
      error: "An error occurred while retrieving available courses.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT: GET /api/courses/validate
 * Validates a course or skill name against the canonical PostgreSQL skill_catalog.
 * Returns spelling suggestions (via Levenshtein distance) if misspelled.
 * Note: Never modifies or inserts into skill_catalog.
 */
application.get("/api/courses/validate", async (request, response) => {
  try {
    const courseName = request.query.name || request.query.course;
    if (!courseName || typeof courseName !== "string" || !courseName.trim()) {
      return response.status(400).json({ error: "Course name query parameter is required." });
    }
    const validation = await validateSkillAgainstCatalog(courseName.trim());
    return response.status(200).json({
      query: courseName.trim(),
      valid: validation.valid,
      canonicalName: validation.canonicalName || null,
      category: validation.category || null,
      suggestion: validation.suggestion || null,
      message: validation.message,
    });
  } catch (err) {
    console.error("Error validating course name:", err);
    return response.status(500).json({ error: err.message });
  }
});

/**
 * ENDPOINT: GET /api/skills/catalog
 *
 * Retrieves canonical course and skill catalog backed by PostgreSQL skill_catalog.
 * Returns canonical list grouped by domain category for validation and selection.
 */
application.get("/api/skills/catalog", async (request, response) => {
  try {
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Catalog could not be retrieved.",
        catalog: [],
      });
    }

    await ensureCuratedCatalogSynced();

    const catRes = await query(
      `SELECT id, name, category, description, created_at
       FROM skill_catalog
       ORDER BY category ASC, name ASC`
    );

    return response.status(200).json({
      catalog: catRes.rows || [],
      count: catRes.rows ? catRes.rows.length : 0,
      source: "postgresql",
    });
  } catch (error) {
    console.error("Error retrieving skill catalog:", error);
    return response.status(500).json({
      error: "An internal server error occurred while retrieving the skill catalog.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 1: GET /api/skills/search?query=<mentorNameOrSkill>
 *
 * WHAT IT DOES:
 * 1. Reads search query parameter (e.g. ?query=Alice or ?query=Python).
 * 2. Matches mentor names and teachable skills case-insensitively by substring from PostgreSQL
 *    (and consults our Hash Table index for O(1) skill key lookup).
 * 3. Ranks exact mentor name matches first, then partial mentor name matches, then skill matches.
 * 4. Returns { mentors: [...] }.
 */
application.get("/api/skills/search", async (request, response) => {
  try {
    const searchSkillName = request.query.query;
    const cleanQuery = typeof searchSkillName === "string" ? searchSkillName.trim() : "";
    const conn = await checkConnection();

    // Consult the Hash Table index in O(1) average time when a specific skill keyword is provided
    const hashTableMatches = cleanQuery ? skillHashTable.lookup(cleanQuery) : [];
    const hashMatchedIds = new Set((hashTableMatches || []).map((m) => String(m.userId || m.id)));

    if (conn.reachable) {
      if (!cleanQuery) {
        const allResult = await query(
          `SELECT u.id, u.id as "userId", u.name, u.role, u.bio, u.profile_summary,
                  u.reputation_score as "reputationScore", u.reputation_score, u.is_demo, u.avatar_url,
                  (SELECT COUNT(*)::int FROM reviews r WHERE r.mentor_id = u.id) as review_count,
                  COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach'), '{}') as skills,
                  COALESCE(
                    jsonb_agg(
                      jsonb_build_object(
                        'skill_name', s.skill_name,
                        'level', s.level,
                        'type', s.type,
                        'is_verified', COALESCE(s.is_verified, FALSE)
                      )
                    ) FILTER (WHERE s.type = 'teach'),
                    '[]'::jsonb
                  ) as skill_entries,
                  BOOL_OR(COALESCE(s.is_verified, FALSE)) as is_verified
           FROM users u
           JOIN skills s ON u.id = s.user_id
           WHERE s.type = 'teach'
           GROUP BY u.id, u.name, u.role, u.bio, u.profile_summary, u.reputation_score, u.is_demo, u.avatar_url
           ORDER BY BOOL_OR(COALESCE(s.is_verified, FALSE)) DESC, u.reputation_score DESC, u.name ASC`
        );

        const mentors = (allResult.rows || []).map((row) => {
          const repData = reputationEngine.getTeacherReputation(row.id);
          const repScore =
            repData && repData.reviewCount > 0
              ? repData.boundedReputation
              : Math.min(5.0, Math.max(1.0, parseFloat(row.reputation_score) || 5.0));
          return {
            ...row,
            reputationScore: repScore,
            reputation_score: repScore,
            review_count: row.review_count || (repData ? repData.reviewCount : 0),
          };
        });

        return response.status(200).json({
          mentors,
          source: "postgresql",
          search: "",
        });
      }

      const lowerExact = cleanQuery.toLowerCase();
      const lowerPrefix = `${lowerExact}%`;
      const lowerSubstr = `%${lowerExact}%`;

      const dbResult = await query(
        `SELECT u.id, u.id as "userId", u.name, u.role, u.bio, u.profile_summary,
                u.reputation_score as "reputationScore", u.reputation_score, u.is_demo, u.avatar_url,
                (SELECT COUNT(*)::int FROM reviews r WHERE r.mentor_id = u.id) as review_count,
                COALESCE(array_agg(s.skill_name) FILTER (WHERE s.type = 'teach'), '{}') as skills,
                COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'skill_name', s.skill_name,
                      'level', s.level,
                      'type', s.type,
                      'is_verified', COALESCE(s.is_verified, FALSE)
                    )
                  ) FILTER (WHERE s.type = 'teach'),
                  '[]'::jsonb
                ) as skill_entries,
                BOOL_OR(
                  CASE
                    WHEN LOWER(s.skill_name) LIKE $1 AND COALESCE(s.is_verified, FALSE) = TRUE THEN TRUE
                    WHEN LOWER(u.name) LIKE $1 AND COALESCE(s.is_verified, FALSE) = TRUE THEN TRUE
                    ELSE FALSE
                  END
                ) as is_verified,
                CASE
                  WHEN LOWER(TRIM(u.name)) = $2 THEN 1
                  WHEN LOWER(TRIM(u.name)) LIKE $3 THEN 2
                  WHEN LOWER(u.name) LIKE $1 THEN 3
                  WHEN BOOL_OR(LOWER(TRIM(s.skill_name)) = $2) THEN 4
                  ELSE 5
                END as match_rank
         FROM users u
         JOIN skills s ON u.id = s.user_id
         WHERE s.type = 'teach'
         GROUP BY u.id, u.name, u.role, u.bio, u.profile_summary, u.reputation_score, u.is_demo, u.avatar_url
         HAVING LOWER(u.name) LIKE $1 OR BOOL_OR(LOWER(s.skill_name) LIKE $1)
         ORDER BY
           CASE
             WHEN LOWER(TRIM(u.name)) = $2 THEN 1
             WHEN LOWER(TRIM(u.name)) LIKE $3 THEN 2
             WHEN LOWER(u.name) LIKE $1 THEN 3
             WHEN BOOL_OR(LOWER(TRIM(s.skill_name)) = $2) THEN 4
             ELSE 5
           END ASC,
           MAX(CASE WHEN (LOWER(s.skill_name) LIKE $1 OR LOWER(u.name) LIKE $1) AND COALESCE(s.is_verified, FALSE) = TRUE THEN 1 ELSE 0 END) DESC,
           u.reputation_score DESC,
           u.name ASC`,
        [lowerSubstr, lowerExact, lowerPrefix]
      );

      let suggestion = null;
      let message = null;
      if (!dbResult.rows || dbResult.rows.length === 0) {
        await ensureCuratedCatalogSynced();
        const validation = await validateSkillAgainstCatalog(cleanQuery);
        if (validation.valid) {
          message = `"${validation.canonicalName}" is a valid catalog course, but no mentors currently teach this skill.`;
        } else if (validation.suggestion) {
          suggestion = validation.suggestion;
          message = validation.message;
        } else {
          message = `No mentors or skills matched "${cleanQuery}". You can request this skill on the Course & Skill Requests page.`;
        }
      }

      const mentors = (dbResult.rows || []).map((row) => {
        const repData = reputationEngine.getTeacherReputation(row.id);
        const repScore =
          repData && repData.reviewCount > 0
            ? repData.boundedReputation
            : Math.min(5.0, Math.max(1.0, parseFloat(row.reputation_score) || 5.0));
        return {
          ...row,
          reputationScore: repScore,
          reputation_score: repScore,
          review_count: row.review_count || (repData ? repData.reviewCount : 0),
          indexedInHashTable: hashMatchedIds.has(String(row.id)),
        };
      });

      return response.status(200).json({
        mentors,
        source: "postgresql",
        search: cleanQuery,
        suggestion,
        message,
      });
    }

    if (!cleanQuery) {
      return response.status(200).json({ mentors: [] });
    }

    // Fallback when DB is offline: match both mentor names and skills with exact name > partial name > skill ranking
    const lowerQ = cleanQuery.toLowerCase();
    const seenFallbackIds = new Set();
    const fallbackCandidates = [];

    for (const u of seedUsers) {
      const nameLower = (u.name || "").trim().toLowerCase();
      const hasNameMatch = nameLower.includes(lowerQ);
      const hasSkillMatch = (u.skills || []).some((sk) => String(sk).toLowerCase().includes(lowerQ));
      if (!hasNameMatch && !hasSkillMatch) continue;
      if (seenFallbackIds.has(u.userId)) continue;
      seenFallbackIds.add(u.userId);

      let matchRank = 5;
      if (nameLower === lowerQ) matchRank = 1;
      else if (nameLower.startsWith(lowerQ)) matchRank = 2;
      else if (hasNameMatch) matchRank = 3;
      else if ((u.skills || []).some((sk) => String(sk).toLowerCase() === lowerQ)) matchRank = 4;

      fallbackCandidates.push({
        userId: u.userId,
        id: u.userId,
        name: u.name,
        role: u.role,
        bio: u.bio,
        skills: u.skills,
        level: (u.skillEntries && u.skillEntries[0] && u.skillEntries[0].level) || "intermediate",
        reputationScore: u.reputationScore,
        matchRank,
      });
    }

    for (const m of hashTableMatches || []) {
      const mId = String(m.userId || m.id);
      if (!seenFallbackIds.has(mId)) {
        seenFallbackIds.add(mId);
        fallbackCandidates.push({ ...m, matchRank: 4 });
      }
    }

    fallbackCandidates.sort((a, b) => {
      if (a.matchRank !== b.matchRank) return a.matchRank - b.matchRank;
      return (b.reputationScore || 0) - (a.reputationScore || 0);
    });

    return response.status(200).json({
      mentors: fallbackCandidates,
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
 * Real booking workflow:
 * 1. Validates mentorId, learnerId, and scheduledAt.
 * 2. Creates a pending booking request in PostgreSQL session_bookings.
 * 3. Creates a session-linked conversation in conversations so learner and teacher coordinate.
 * 4. Posts an initial coordination message into the thread.
 * 5. Dispatches notifications.
 */
application.post("/api/sessions/book", async (request, response) => {
  try {
    const mentorId = request.body.mentorId || request.body.mentor_id;
    const learnerId = request.body.learnerId || request.body.learner_id;
    const scheduledAt = request.body.scheduledAt || request.body.scheduled_at || request.body.session_date;
    const topic = request.body.topic;
    const notes = request.body.notes;

    if (!mentorId || !learnerId || !scheduledAt) {
      return response.status(400).json({
        error: "Missing required booking details. Please provide mentorId, learnerId, and scheduledAt.",
      });
    }

    if (String(mentorId) === String(learnerId)) {
      return response.status(400).json({
        error: "Cannot book a mentorship session with yourself.",
      });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Session booking could not be saved to persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Verify mentor and learner accounts exist in PostgreSQL
    const mentorCheck = await query("SELECT id, name FROM users WHERE id = $1", [String(mentorId)]);
    if (mentorCheck.rows.length === 0) {
      return response.status(404).json({
        error: "Selected teacher or mentor was not found in the database.",
      });
    }

    const learnerCheck = await query("SELECT id, name FROM users WHERE id = $1", [String(learnerId)]);
    if (learnerCheck.rows.length === 0) {
      return response.status(404).json({
        error: "Learner account was not found in the database.",
      });
    }

    // Validate submitted skill/topic against the mentor's currently verified teachable skills in PostgreSQL
    const verifiedSkillsRes = await query(
      `SELECT id, skill_name, level, is_verified, verified_at
       FROM skills
       WHERE user_id = $1 AND type = 'teach' AND is_verified = TRUE
       ORDER BY skill_name ASC`,
      [String(mentorId)]
    );
    const verifiedSkills = verifiedSkillsRes.rows || [];
    const verifiedSkillNames = verifiedSkills.map((s) => s.skill_name);

    if (verifiedSkills.length === 0) {
      return response.status(400).json({
        error: "This mentor has no verified teaching skills available.",
        verifiedSkills: [],
      });
    }

    const explicitSkill = typeof request.body.skill === "string" ? request.body.skill.trim() : "";
    const rawTopic = typeof topic === "string" ? topic.trim() : "";
    const submittedSkill = explicitSkill || rawTopic;

    if (!submittedSkill) {
      return response.status(400).json({
        error: `Please choose one of this mentor's verified skills: ${verifiedSkillNames.join(", ")}.`,
        verifiedSkills: verifiedSkillNames,
      });
    }

    const lowerSubmitted = submittedSkill.toLowerCase();
    const matchedVerifiedSkill = verifiedSkills.find((vs) => {
      const lowerVerified = String(vs.skill_name || "").trim().toLowerCase();
      if (!lowerVerified) return false;
      if (lowerSubmitted === lowerVerified) return true;
      // Allow topic strings that begin with the verified skill name followed by a separator (e.g. "Python Basics") when explicit skill wasn't separately passed
      if (!explicitSkill && lowerSubmitted.startsWith(lowerVerified + " ")) return true;
      return false;
    });

    if (!matchedVerifiedSkill) {
      return response.status(400).json({
        error: `This mentor is not verified to teach ${submittedSkill}. Choose one of their verified skills.`,
        verifiedSkills: verifiedSkillNames,
      });
    }

    const canonicalTopic = explicitSkill
      ? matchedVerifiedSkill.skill_name
      : rawTopic || matchedVerifiedSkill.skill_name;

    const bookingId = `booking_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Canonical order to satisfy unique constraint uq_conversation_participants
    const u1 = String(learnerId) < String(mentorId) ? String(learnerId) : String(mentorId);
    const u2 = String(learnerId) < String(mentorId) ? String(mentorId) : String(learnerId);

    let convRes = await query(
      `SELECT id, user1_id, user2_id FROM conversations
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [u1, u2]
    );

    let convId;
    if (convRes.rows.length === 0) {
      const convInsert = await query(
        `INSERT INTO conversations (user1_id, user2_id, last_message_at, created_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [u1, u2]
      );
      convId = convInsert.rows[0].id;
    } else {
      convId = convRes.rows[0].id;
    }

    const bookingRequest = {
      id: bookingId,
      bookingId: bookingId,
      mentorId: String(mentorId),
      learnerId: String(learnerId),
      scheduledAt: String(scheduledAt),
      status: "pending",
      topic: canonicalTopic,
      skill: matchedVerifiedSkill.skill_name,
      notes: notes || "",
      conversationId: convId,
      createdAt: new Date().toISOString(),
    };

    // Persist into session_bookings table first to satisfy conversations_session_id_fkey
    await query(
      `INSERT INTO session_bookings (id, mentor_id, learner_id, scheduled_at, status, topic, notes, conversation_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO NOTHING`,
      [
        bookingRequest.id,
        bookingRequest.mentorId,
        bookingRequest.learnerId,
        bookingRequest.scheduledAt,
        bookingRequest.status,
        bookingRequest.topic,
        bookingRequest.notes,
        convId,
      ]
    );

    // Link conversation to session_id and ensure thread is open (without inserting automated system chat messages)
    await query(
      `UPDATE conversations
       SET session_id = $1, is_closed = FALSE, closed_at = NULL
       WHERE id = $2`,
      [bookingId, convId]
    );

    // Notification for mentor (links directly to Incoming Learner Requests)
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        bookingRequest.mentorId,
        "booking_received",
        "New Mentorship Booking Request",
        `New pending session request for "${bookingRequest.topic}".`,
        "/requests",
      ]
    ).catch(() => {});

    // Notification for learner
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        bookingRequest.learnerId,
        "booking_created",
        "Session Booking Pending",
        `Your booking request for "${bookingRequest.topic}" is awaiting teacher acceptance.`,
        "/history?view=learning",
      ]
    ).catch(() => {});

    bookingQueue.enqueue(bookingRequest);
    mentorGraph.addEdge(bookingRequest.learnerId, bookingRequest.mentorId, 1, "mentorship", true);

    return response.status(201).json({
      success: true,
      message: "Session booking request saved to database and coordination conversation opened.",
      booking: bookingRequest,
      conversationId: convId,
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
 * ENDPOINT: POST /api/sessions/:id/accept
 * Teacher accepts a pending session booking.
 */
application.post("/api/sessions/:id/accept", authenticateToken, async (request, response) => {
  try {
    const sessionId = request.params.id;
    const userId = request.user.userId;

    const sessRes = await query("SELECT * FROM session_bookings WHERE id = $1", [sessionId]);
    if (sessRes.rows.length === 0) {
      return response.status(404).json({ error: "Session booking not found." });
    }

    const session = sessRes.rows[0];
    if (session.mentor_id !== userId) {
      return response.status(403).json({ error: "Only the designated teacher can accept this session booking." });
    }

    if (session.status !== "pending" && session.status !== "queued") {
      return response.status(400).json({
        error: `Cannot accept session with current status "${session.status}".`,
      });
    }

    await query("UPDATE session_bookings SET status = 'accepted' WHERE id = $1", [sessionId]);
    await reconcileBookingQueueFromDatabase();

    // Ensure linked conversation points to this accepted session and is open (without inserting automated chat messages)
    if (session.conversation_id) {
      await query(
        `UPDATE conversations
         SET session_id = $1, is_closed = FALSE, closed_at = NULL
         WHERE id = $2`,
        [sessionId, session.conversation_id]
      ).catch(() => {});
    }

    // Notify learner via notifications (not automated chat messages)
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        session.learner_id,
        "booking_accepted",
        "Session Accepted!",
        `Your session booking for "${session.topic}" was accepted by the teacher.`,
        "/history?view=learning",
      ]
    ).catch(() => {});

    return response.status(200).json({
      message: "Session booking accepted successfully.",
      status: "accepted",
    });
  } catch (error) {
    console.error("Error accepting session booking:", error);
    return response.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT: POST /api/sessions/:id/decline
 * Teacher declines a pending session booking.
 */
application.post("/api/sessions/:id/decline", authenticateToken, async (request, response) => {
  try {
    const sessionId = request.params.id;
    const userId = request.user.userId;
    const { reason } = request.body;

    const sessRes = await query("SELECT * FROM session_bookings WHERE id = $1", [sessionId]);
    if (sessRes.rows.length === 0) {
      return response.status(404).json({ error: "Session booking not found." });
    }

    const session = sessRes.rows[0];
    if (session.mentor_id !== userId) {
      return response.status(403).json({ error: "Only the designated teacher can decline this session booking." });
    }

    if (session.status !== "pending" && session.status !== "queued") {
      return response.status(400).json({
        error: `Cannot decline session with current status "${session.status}".`,
      });
    }

    const rawDeclineReason =
      reason !== undefined ? reason : request.body.decline_reason || request.body.declineReason;
    const declineReason = rawDeclineReason && typeof rawDeclineReason === "string" && rawDeclineReason.trim() !== ""
      ? rawDeclineReason.trim()
      : "Teacher unavailable at requested time.";

    await query(
      "UPDATE session_bookings SET status = 'declined', declined_reason = $1 WHERE id = $2",
      [declineReason, sessionId]
    );
    await reconcileBookingQueueFromDatabase();

    // Close the linked conversation without deleting history or inserting automated system messages
    if (session.conversation_id) {
      await query(
        "UPDATE conversations SET is_closed = TRUE, closed_at = CURRENT_TIMESTAMP WHERE id = $1",
        [session.conversation_id]
      ).catch(() => {});
    }

    // Notify learner via notifications
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        session.learner_id,
        "booking_declined",
        "Session Booking Declined",
        `Your session for "${session.topic}" was declined: ${declineReason}`,
        "/history?view=learning",
      ]
    ).catch(() => {});

    return response.status(200).json({
      message: "Session booking declined.",
      status: "declined",
      declinedReason: declineReason,
    });
  } catch (error) {
    console.error("Error declining session booking:", error);
    return response.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT: POST /api/sessions/:id/cancel
 * Either session participant cancels a pending or accepted session.
 */
application.post("/api/sessions/:id/cancel", authenticateToken, async (request, response) => {
  try {
    const sessionId = request.params.id;
    const userId = request.user.userId;
    const cancelReason = (request.body.reason || request.body.cancel_reason || "Cancelled by participant").trim();

    const sessRes = await query("SELECT * FROM session_bookings WHERE id = $1", [sessionId]);
    if (sessRes.rows.length === 0) {
      return response.status(404).json({ error: "Session booking not found." });
    }

    const session = sessRes.rows[0];
    if (session.mentor_id !== userId && session.learner_id !== userId) {
      return response.status(403).json({ error: "Only session participants may cancel this session." });
    }

    if (session.status === "completed" || session.status === "declined" || session.status === "cancelled") {
      return response.status(400).json({
        error: `Cannot cancel a session that is already "${session.status}".`,
      });
    }

    await query(
      `UPDATE session_bookings
       SET status = 'cancelled', declined_reason = $1
       WHERE id = $2`,
      [cancelReason, sessionId]
    );

    if (session.conversation_id) {
      await query(
        "UPDATE conversations SET is_closed = TRUE, closed_at = CURRENT_TIMESTAMP WHERE id = $1",
        [session.conversation_id]
      ).catch(() => {});
    }

    await reconcileBookingQueueFromDatabase();

    const peerId = session.mentor_id === userId ? session.learner_id : session.mentor_id;
    const peerView = session.mentor_id === userId ? "learning" : "teaching";
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        peerId,
        "booking_cancelled",
        "Session Booking Cancelled",
        `The session for "${session.topic}" was cancelled: ${cancelReason}`,
        `/history?view=${peerView}`,
      ]
    ).catch(() => {});

    return response.status(200).json({
      success: true,
      message: "Session booking cancelled.",
      status: "cancelled",
      booking: { id: sessionId, status: "cancelled" },
    });
  } catch (error) {
    console.error("Error cancelling session booking:", error);
    return response.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT: POST /api/sessions/:id/complete
 * Either session participant marks an accepted session as completed.
 */
application.post("/api/sessions/:id/complete", authenticateToken, async (request, response) => {
  try {
    const sessionId = request.params.id;
    const userId = request.user.userId;

    const sessRes = await query("SELECT * FROM session_bookings WHERE id = $1", [sessionId]);
    if (sessRes.rows.length === 0) {
      return response.status(404).json({ error: "Session booking not found." });
    }

    const session = sessRes.rows[0];
    if (session.mentor_id !== userId && session.learner_id !== userId) {
      return response.status(403).json({ error: "Only session participants may mark this session completed." });
    }

    if (session.status !== "accepted" && session.status !== "confirmed") {
      return response.status(400).json({
        error: `Only accepted or confirmed sessions can be marked completed (current status: "${session.status}").`,
      });
    }

    await query("UPDATE session_bookings SET status = 'completed' WHERE id = $1", [sessionId]);

    // Notify learner to leave feedback on the dedicated session feedback page
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        session.learner_id,
        "session_completed",
        "Session Completed - Leave Feedback",
        `Your session on "${session.topic}" has concluded. Share your session feedback and rating!`,
        `/sessions/${sessionId}/feedback`,
      ]
    ).catch(() => {});

    return response.status(200).json({
      success: true,
      message: "Session marked as completed. Feedback form is now open for learner.",
      status: "completed",
      booking: { id: sessionId, status: "completed" },
    });
  } catch (error) {
    console.error("Error marking session completed:", error);
    return response.status(500).json({ error: error.message });
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
               (SELECT COUNT(*)::int FROM reviews r WHERE r.mentor_id = u.id) as review_count,
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
        const mentorList = dbResult.rows.map((row) => {
          const repSummary = reputationEngine.getTeacherReputation(row.id);
          const dbRep = parseFloat(row.reputation_score);
          const effectiveRep = repSummary.reviewCount > 0
            ? repSummary.boundedReputation
            : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));
          const allSkillEntries = row.skill_entries && row.skill_entries.length > 0 ? row.skill_entries : [];
          const verifiedSkillEntries = allSkillEntries.filter(
            (s) => s && (s.type === "teach" || !s.type) && s.is_verified === true
          );
          return {
            id: row.id,
            userId: row.id,
            name: row.name,
            role: row.role || "Peer Mentor",
            skills: allSkillEntries.length > 0 ? allSkillEntries : (row.skills || []),
            verified_skills: verifiedSkillEntries,
            verifiedSkills: verifiedSkillEntries,
            bio: row.bio || row.profile_summary || "",
            profile_summary: row.profile_summary || row.bio || "",
            specialization_domain: row.specialization_domain || null,
            work_experience: row.work_experience || [],
            social_profiles: row.social_profiles || {},
            avatar_url: row.avatar_url || null,
            is_demo: Boolean(row.is_demo),
            reputationScore: effectiveRep,
            reputation_score: effectiveRep,
            review_count: parseInt(row.review_count, 10) || 0,
            reviewCount: parseInt(row.review_count, 10) || 0,
          };
        });

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

      // Step 2a: Validate all incoming skills against canonical PostgreSQL skill_catalog
      const validatedIncomingSkills = [];
      for (const skill of incomingSkills) {
        const rawName = skill.skill_name || skill.skillName;
        if (!rawName || typeof rawName !== "string" || !rawName.trim()) continue;

        const validation = await validateSkillAgainstCatalog(rawName);
        if (!validation.valid) {
          await client.query("ROLLBACK");
          return response.status(400).json({
            error: validation.message,
            suggestion: validation.suggestion || null,
            invalidSkill: rawName,
          });
        }

        validatedIncomingSkills.push({
          skillName: validation.canonicalName,
          level: skill.level || "intermediate",
          type: skill.type === "learn" ? "learn" : "teach",
        });
      }

      // Step 2b: Preserve verified status from existing verified skills or approved teacher_verification_applications
      const verifiedSkillMap = new Map();
      const existingVerifiedSkills = await client.query(
        `SELECT LOWER(skill_name) as lower_skill, MAX(verified_at) as verified_at
         FROM skills
         WHERE user_id = $1 AND type = 'teach' AND is_verified = TRUE
         GROUP BY LOWER(skill_name)`,
        [targetUserId]
      );
      for (const row of existingVerifiedSkills.rows) {
        verifiedSkillMap.set(row.lower_skill, row.verified_at || new Date());
      }

      const approvedApps = await client.query(
        `SELECT LOWER(skill_name) as lower_skill, MAX(COALESCE(reviewed_at, updated_at, created_at)) as approved_at
         FROM teacher_verification_applications
         WHERE user_id = $1 AND status = 'approved'
         GROUP BY LOWER(skill_name)`,
        [targetUserId]
      );
      for (const row of approvedApps.rows) {
        if (!verifiedSkillMap.has(row.lower_skill)) {
          verifiedSkillMap.set(row.lower_skill, row.approved_at || new Date());
        }
      }

      // Delete existing skills for this user and insert validated skills list
      await client.query(`DELETE FROM skills WHERE user_id = $1`, [targetUserId]);

      const teachSkillNames = [];
      for (const skill of validatedIncomingSkills) {
        const lowerName = skill.skillName.toLowerCase();
        // Server-side verification enforcement: user cannot spoof is_verified
        const isVerified = skill.type === "teach" && verifiedSkillMap.has(lowerName);
        const verifiedAt = isVerified ? (verifiedSkillMap.get(lowerName) || new Date()) : null;

        await client.query(
          `INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at, forfeited)
           VALUES ($1, $2, $3, $4, $5, $6, FALSE)
           ON CONFLICT ON CONSTRAINT uq_user_skill_type DO UPDATE SET
             level = EXCLUDED.level,
             is_verified = EXCLUDED.is_verified,
             verified_at = EXCLUDED.verified_at,
             forfeited = FALSE`,
          [targetUserId, skill.skillName, skill.level, skill.type, isVerified, verifiedAt]
        );

        if (skill.type === "teach") {
          teachSkillNames.push(skill.skillName);
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

    // Step 3: Reconcile in-memory HashTable and Graph vertex with PostgreSQL
    await reconcileTeacherDsaState(updatedUser.userId);

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

    // Ensure every account can freely switch between Learner and Teacher modes
    updateClauses.push(`can_teach = $${paramIndex++}`);
    updateValues.push(can_teach !== undefined ? (Boolean(can_teach) || true) : true);
    updateClauses.push(`can_learn = $${paramIndex++}`);
    updateValues.push(can_learn !== undefined ? (Boolean(can_learn) || true) : true);

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
        can_teach: true,
        can_learn: true,
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
 * ENDPOINT 4B-MODE: PATCH / PUT /api/users/:userId/mode
 * Allows any authenticated account (demo or personal) to switch freely between Learner and Teacher modes.
 */
const updateUserModeHandler = async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    if (request.user.userId !== targetUserId) {
      return response.status(403).json({
        error: "Forbidden: You can only switch mode for your own account.",
      });
    }

    const rawMode = request.body.active_mode || request.body.mode;
    const cleanMode = String(rawMode || "").toLowerCase() === "teacher" ? "teacher" : "learner";

    const conn = await checkConnection();
    if (conn.reachable) {
      await query(
        `UPDATE users
         SET active_mode = $1, can_teach = TRUE, can_learn = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [cleanMode, targetUserId]
      );
    }

    return response.status(200).json({
      success: true,
      active_mode: cleanMode,
      can_teach: true,
      can_learn: true,
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
};
application.patch("/api/users/:userId/mode", authenticateToken, updateUserModeHandler);
application.put("/api/users/:userId/mode", authenticateToken, updateUserModeHandler);

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
 * Retrieves a user's full profile details including skills and submitted reviews from PostgreSQL.
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
        const reviewsRes = await query(
          `SELECT r.id, r.mentor_id, r.rating, r.comment,
                  r.clarity_rating, r.interaction_rating, r.preparation_rating,
                  r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
                  r.created_at, sb.topic as topic
           FROM reviews r
           LEFT JOIN session_bookings sb ON r.session_id = sb.id
           WHERE r.mentor_id = $1
           ORDER BY r.created_at DESC, r.id DESC`,
          [targetUserId]
        );
        const rawReviews = reviewsRes.rows || [];
        const reviews = rawReviews.map((r) => ReputationEngine.sanitizeReviewForTeacher(r));
        const structuredSummary = ReputationEngine.summarizeStructuredFeedback(reviews);
        const repSummary = reputationEngine.getTeacherReputation(targetUserId);
        const dbRep = parseFloat(u.reputation_score);
        const effectiveRep = reviews.length > 0
          ? (repSummary.reviewCount > 0 ? repSummary.boundedReputation : ReputationEngine.calculateBoundedScore(reviews))
          : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));

        const verifiedTeachSkills = (u.skills || []).filter(
          (s) => s && s.type === "teach" && s.is_verified === true
        );

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
          reputation_score: effectiveRep,
          reputationScore: effectiveRep,
          review_count: reviews.length,
          reviewCount: reviews.length,
          reviews,
          feedbackSummary: {
            reputationScore: effectiveRep,
            reviewCount: reviews.length,
            categoryAverages: structuredSummary.categoryAverages,
            dimensionBreakdown: structuredSummary.dimensionBreakdown,
            improvementAreas: structuredSummary.improvementAreas,
            strengths: structuredSummary.strengths,
          },
          active_mode: u.active_mode || "learner",
          can_teach: u.can_teach !== false,
          can_learn: u.can_learn !== false,
          skills: u.skills || [],
          verified_skills: verifiedTeachSkills,
          verifiedSkills: verifiedTeachSkills,
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
 * ENDPOINT 4D: GET /api/users/:userId/reviews
 * Retrieves authentic learner feedback (with learner identity kept private) and bounded reputation summary for a teacher.
 */
application.get("/api/users/:userId/reviews", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable.", reviews: [] });
    }

    const userRes = await query("SELECT id, name, reputation_score FROM users WHERE id = $1", [targetUserId]);
    if (userRes.rows.length === 0) {
      return response.status(404).json({ error: "User not found." });
    }

    const reviewsRes = await query(
      `SELECT r.id, r.mentor_id, r.rating, r.comment,
              r.clarity_rating, r.interaction_rating, r.preparation_rating,
              r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
              r.created_at, sb.topic as topic
       FROM reviews r
       LEFT JOIN session_bookings sb ON r.session_id = sb.id
       WHERE r.mentor_id = $1
       ORDER BY r.created_at DESC, r.id DESC`,
      [targetUserId]
    );

    const rawReviews = reviewsRes.rows || [];
    const reviews = rawReviews.map((r) => ReputationEngine.sanitizeReviewForTeacher(r));
    const structuredSummary = ReputationEngine.summarizeStructuredFeedback(reviews);
    const repSummary = reputationEngine.getTeacherReputation(targetUserId);
    const dbRep = parseFloat(userRes.rows[0].reputation_score);
    const effectiveRep = reviews.length > 0
      ? (repSummary.reviewCount > 0 ? repSummary.boundedReputation : ReputationEngine.calculateBoundedScore(reviews))
      : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));

    return response.status(200).json({
      userId: targetUserId,
      reputation_score: effectiveRep,
      reputationScore: effectiveRep,
      review_count: reviews.length,
      reviewCount: reviews.length,
      rawAverage: repSummary.rawAverage || null,
      reviews,
      feedbackSummary: {
        reputationScore: effectiveRep,
        reviewCount: reviews.length,
        categoryAverages: structuredSummary.categoryAverages,
        dimensionBreakdown: structuredSummary.dimensionBreakdown,
        improvementAreas: structuredSummary.improvementAreas,
        strengths: structuredSummary.strengths,
      },
    });
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    return response.status(500).json({ error: "Failed to fetch user reviews." });
  }
});

/**
 * ENDPOINT 4E: GET /api/users/:userId/verified-skills
 * Retrieves a mentor's currently verified teachable skills directly from PostgreSQL.
 */
application.get("/api/users/:userId/verified-skills", async (request, response) => {
  try {
    const targetUserId = request.params.userId;
    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable.", verifiedSkills: [] });
    }

    const userRes = await query("SELECT id, name FROM users WHERE id = $1", [targetUserId]);
    if (userRes.rows.length === 0) {
      return response.status(404).json({ error: "Mentor not found.", verifiedSkills: [] });
    }

    const skillsRes = await query(
      `SELECT id, skill_name, level, type, is_verified, verified_at
       FROM skills
       WHERE user_id = $1 AND type = 'teach' AND is_verified = TRUE
       ORDER BY skill_name ASC`,
      [targetUserId]
    );

    const verifiedSkills = skillsRes.rows || [];
    return response.status(200).json({
      userId: targetUserId,
      mentorName: userRes.rows[0].name,
      verifiedSkills,
      verified_skills: verifiedSkills,
      count: verifiedSkills.length,
    });
  } catch (error) {
    console.error("Error fetching mentor verified skills:", error);
    return response.status(500).json({ error: "Failed to fetch mentor verified skills." });
  }
});

/**
 * ENDPOINT 5: GET /api/users/:userId
 *
 * Retrieves a user's full profile, skills, and anonymized reviews from PostgreSQL.
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
        const reviewsRes = await query(
          `SELECT r.id, r.mentor_id, r.rating, r.comment,
                  r.clarity_rating, r.interaction_rating, r.preparation_rating,
                  r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
                  r.created_at, sb.topic as topic
           FROM reviews r
           LEFT JOIN session_bookings sb ON r.session_id = sb.id
           WHERE r.mentor_id = $1
           ORDER BY r.created_at DESC, r.id DESC`,
          [targetUserId]
        );
        const rawReviews = reviewsRes.rows || [];
        const reviews = rawReviews.map((r) => ReputationEngine.sanitizeReviewForTeacher(r));
        const structuredSummary = ReputationEngine.summarizeStructuredFeedback(reviews);
        const repSummary = reputationEngine.getTeacherReputation(targetUserId);
        const dbRep = parseFloat(u.reputation_score);
        const effectiveRep = reviews.length > 0
          ? (repSummary.reviewCount > 0 ? repSummary.boundedReputation : ReputationEngine.calculateBoundedScore(reviews))
          : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));

        const verifiedTeachSkills = (u.skills || []).filter(
          (s) => s && s.type === "teach" && s.is_verified === true
        );

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
          reputation_score: effectiveRep,
          reputationScore: effectiveRep,
          review_count: reviews.length,
          reviewCount: reviews.length,
          reviews,
          feedbackSummary: {
            reputationScore: effectiveRep,
            reviewCount: reviews.length,
            categoryAverages: structuredSummary.categoryAverages,
            dimensionBreakdown: structuredSummary.dimensionBreakdown,
            improvementAreas: structuredSummary.improvementAreas,
            strengths: structuredSummary.strengths,
          },
          skills: u.skills || [],
          verified_skills: verifiedTeachSkills,
          verifiedSkills: verifiedTeachSkills,
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
      reputationScore: found.reputationScore,
      review_count: 0,
      reviews: [],
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
 * - In Learner mode: returns learner's sessions with their own submitted review on completed sessions.
 * - In Teacher mode: keeps learner identity private on feedback! Individual teaching session cards
 *   do NOT expose which learner submitted which review; instead, returns anonymized feedback and
 *   structured improvement areas in `anonymousFeedback` and `feedbackSummary`.
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

    // Strictly separate learner and teacher queries: no combined list ever appears
    const requestedRole = (roleFilter || request.headers["x-active-mode"] || "").toLowerCase();
    const isTeacherHistory = requestedRole === "teacher" || requestedRole === "teach";
    const filterClause = isTeacherHistory ? "WHERE sb.mentor_id = $1" : "WHERE sb.learner_id = $1";

    const dbResult = await query(
      `SELECT sb.id, sb.mentor_id, sb.learner_id, sb.scheduled_at, sb.status, sb.topic, sb.notes,
              sb.declined_reason, sb.conversation_id,
              json_build_object(
                'id', m.id,
                'name', m.name,
                'role', m.role,
                'avatar_url', m.avatar_url,
                'is_demo', m.is_demo,
                'reputation_score', m.reputation_score,
                'review_count', (SELECT COUNT(*)::int FROM reviews mr WHERE mr.mentor_id = m.id)
              ) as mentor,
              json_build_object(
                'id', l.id,
                'name', l.name,
                'role', l.role,
                'avatar_url', l.avatar_url,
                'is_demo', l.is_demo
              ) as learner,
              CASE WHEN r.id IS NOT NULL THEN
                json_build_object(
                  'id', r.id,
                  'rating', r.rating,
                  'comment', r.comment,
                  'clarity_rating', r.clarity_rating,
                  'interaction_rating', r.interaction_rating,
                  'preparation_rating', r.preparation_rating,
                  'materials_rating', r.materials_rating,
                  'engagement_rating', r.engagement_rating,
                  'feedback_answers', COALESCE(r.feedback_answers, '{}'::jsonb),
                  'created_at', r.created_at
                )
              ELSE NULL END as review
       FROM session_bookings sb
       JOIN users m ON sb.mentor_id = m.id
       JOIN users l ON sb.learner_id = l.id
       LEFT JOIN reviews r ON sb.id = r.session_id
       ${filterClause}
       ORDER BY sb.scheduled_at DESC`,
      [targetUserId]
    );

    const rawRows = dbResult.rows || [];

    // Protect learner privacy in Teacher view: strip per-session review link from individual student session rows
    const rows = rawRows.map((row) => {
      if (isTeacherHistory) {
        return {
          ...row,
          review: null,
        };
      }
      if (row.review) {
        const qs = ReputationEngine.extractStructuredQuestions(row.review);
        return {
          ...row,
          review: {
            ...row.review,
            rating: Math.max(1, Math.min(5, Math.round(Number(row.review.rating) || 0))),
            questions: qs,
          },
        };
      }
      return row;
    });

    const incomingRequests = isTeacherHistory
      ? rows.filter((r) => r.status === "pending" || r.status === "queued")
      : [];
    const acceptedTeachingSessions = isTeacherHistory
      ? rows.filter((r) => r.status !== "pending" && r.status !== "queued")
      : [];

    let anonymousFeedback = [];
    let feedbackSummary = null;

    if (isTeacherHistory) {
      const teacherReviewsRes = await query(
        `SELECT r.id, r.mentor_id, r.rating, r.comment,
                r.clarity_rating, r.interaction_rating, r.preparation_rating,
                r.materials_rating, r.engagement_rating, r.feedback_answers, r.session_score,
                r.created_at, sb.topic AS topic
         FROM reviews r
         LEFT JOIN session_bookings sb ON r.session_id = sb.id
         WHERE r.mentor_id = $1
         ORDER BY r.created_at DESC, r.id DESC`,
        [targetUserId]
      );
      anonymousFeedback = (teacherReviewsRes.rows || []).map((r) =>
        ReputationEngine.sanitizeReviewForTeacher(r)
      );
      const structuredSummary = ReputationEngine.summarizeStructuredFeedback(anonymousFeedback);
      const repRecord = reputationEngine.getTeacherReputation(targetUserId);
      const userRepRes = await query("SELECT reputation_score FROM users WHERE id = $1", [targetUserId]);
      const dbRep = userRepRes.rows[0] ? parseFloat(userRepRes.rows[0].reputation_score) : 4.0;
      const effectiveRep =
        anonymousFeedback.length > 0
          ? repRecord.reviewCount > 0
            ? repRecord.boundedReputation
            : ReputationEngine.calculateBoundedScore(anonymousFeedback)
          : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));

      feedbackSummary = {
        reputationScore: effectiveRep,
        reviewCount: anonymousFeedback.length,
        categoryAverages: structuredSummary.categoryAverages,
        dimensionBreakdown: structuredSummary.dimensionBreakdown,
        improvementAreas: structuredSummary.improvementAreas,
        strengths: structuredSummary.strengths,
      };
    }

    return response.status(200).json({
      role: isTeacherHistory ? "teacher" : "learner",
      sessions: rows,
      learningSessions: isTeacherHistory ? [] : rows,
      teachingSessions: isTeacherHistory ? rows : [],
      incomingRequests,
      acceptedTeachingSessions,
      anonymousFeedback,
      feedbackSummary,
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
 * ENDPOINT 6B: GET /api/sessions/:id/feedback
 * Retrieves session context and existing feedback state for the dedicated learner feedback page.
 * - Only the learner for the session can access this feedback form.
 * - Reports whether the session is eligible (`status === 'completed'` and not yet reviewed).
 * - Never exposes the teacher's updated reputation score on the learner feedback confirmation.
 */
application.get("/api/sessions/:id/feedback", authenticateToken, async (request, response) => {
  try {
    const sessionId = request.params.id;
    const userId = request.user.userId;

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Could not load session feedback details.",
      });
    }

    const sessRes = await query(
      `SELECT sb.id, sb.mentor_id, sb.learner_id, sb.scheduled_at, sb.status, sb.topic, sb.notes,
              sb.declined_reason, sb.conversation_id,
              json_build_object(
                'id', m.id,
                'name', m.name,
                'role', m.role,
                'avatar_url', m.avatar_url,
                'specialization_domain', m.specialization_domain
              ) AS mentor
       FROM session_bookings sb
       JOIN users m ON sb.mentor_id = m.id
       WHERE sb.id = $1`,
      [sessionId]
    );

    if (sessRes.rows.length === 0) {
      return response.status(404).json({
        error: "Session not found.",
      });
    }

    const session = sessRes.rows[0];
    if (String(session.learner_id) !== String(userId)) {
      return response.status(403).json({
        error: "Only the learner who attended this session can access or submit session feedback.",
      });
    }

    const revRes = await query(
      `SELECT id, session_id, rating, comment,
              clarity_rating, interaction_rating, preparation_rating,
              materials_rating, engagement_rating, feedback_answers, created_at
       FROM reviews
       WHERE session_id = $1`,
      [sessionId]
    );

    const existingRow = revRes.rows[0] || null;
    const existingReview = existingRow
      ? {
          id: existingRow.id,
          sessionId: existingRow.session_id,
          session_id: existingRow.session_id,
          rating: Math.max(1, Math.min(5, Math.round(Number(existingRow.rating) || 0))),
          comment: existingRow.comment || "",
          questions: ReputationEngine.extractStructuredQuestions(existingRow),
          clarity_rating: existingRow.clarity_rating,
          interaction_rating: existingRow.interaction_rating,
          preparation_rating: existingRow.preparation_rating,
          materials_rating: existingRow.materials_rating,
          engagement_rating: existingRow.engagement_rating,
          created_at: existingRow.created_at,
        }
      : null;

    return response.status(200).json({
      session,
      questions: ReputationEngine.getFeedbackDimensions(),
      canSubmitFeedback: session.status === "completed" && !existingReview,
      alreadySubmitted: Boolean(existingReview),
      review: existingReview,
    });
  } catch (error) {
    console.error("Error loading session feedback context:", error);
    return response.status(500).json({
      error: "Failed to load session feedback details.",
      details: error.message,
    });
  }
});

/**
 * ENDPOINT 7: POST /api/reviews
 *
 * Real learner session feedback workflow:
 * - Requires JWT authentication.
 * - Enforces: only the learner who attended a completed session may submit feedback.
 * - Enforces: rejects pending, queued, accepted, confirmed, declined, or cancelled sessions.
 * - Enforces: exactly one review per completed booking in API and database.
 * - Stores exact integer star rating (1-5) without rounding or transformation, plus 5 structured
 *   question ratings (clarity, interaction, preparation, materials, engagement) and written comment.
 * - Updates teacher reputation via custom HashTable & bounded Bayesian damped score.
 * - Confirms feedback was recorded without displaying the teacher's updated reputation score to the learner.
 */
application.post("/api/reviews", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const sessionId = request.body.sessionId || request.body.session_id;
    const rating = request.body.rating;
    const rawComment = request.body.comment !== undefined ? request.body.comment : request.body.review_text;

    if (!sessionId || rating === undefined || rating === null) {
      return response.status(400).json({
        error: "Missing required review fields. Please provide sessionId and rating.",
      });
    }

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return response.status(400).json({
        error: "Rating must be a whole number between 1 and 5.",
      });
    }

    const cleanComment = typeof rawComment === "string" ? rawComment.trim() : "";
    if (cleanComment.length > 1000) {
      return response.status(400).json({
        error: "Written feedback must not exceed 1000 characters.",
      });
    }

    // Validate structured 5-question answers if provided
    const dimensions = ReputationEngine.getFeedbackDimensions();
    const rawQuestionsObj =
      request.body.questions && typeof request.body.questions === "object"
        ? request.body.questions
        : request.body.feedback_answers && typeof request.body.feedback_answers === "object"
        ? request.body.feedback_answers
        : null;

    const hasAnyStructuredField =
      Boolean(rawQuestionsObj) ||
      dimensions.some(
        (d) => request.body[d.key] !== undefined || request.body[d.column] !== undefined
      );

    const structuredQuestions = {};
    for (const dim of dimensions) {
      const rawVal =
        rawQuestionsObj && rawQuestionsObj[dim.key] !== undefined
          ? rawQuestionsObj[dim.key]
          : rawQuestionsObj && rawQuestionsObj[dim.column] !== undefined
          ? rawQuestionsObj[dim.column]
          : request.body[dim.key] !== undefined
          ? request.body[dim.key]
          : request.body[dim.column];

      if (hasAnyStructuredField) {
        const parsedQ = Number(rawVal);
        if (!Number.isInteger(parsedQ) || parsedQ < 1 || parsedQ > 5) {
          return response.status(400).json({
            error: `Please answer "${dim.label}" with a rating from 1 to 5.`,
          });
        }
        structuredQuestions[dim.key] = parsedQ;
      } else {
        structuredQuestions[dim.key] = numRating;
      }
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Review could not be saved to persistent storage.",
        database: "unreachable",
        details: conn.reason || "Local PostgreSQL is not connected.",
      });
    }

    // Find session in PostgreSQL
    const sessRes = await query("SELECT * FROM session_bookings WHERE id = $1", [sessionId]);
    if (sessRes.rows.length === 0) {
      return response.status(404).json({
        error: `Session "${sessionId}" was not found in the database.`,
      });
    }

    const sess = sessRes.rows[0];

    // Enforce: only learner who attended may submit feedback
    if (sess.learner_id !== userId) {
      return response.status(403).json({
        error: "Only the learner who attended this session may submit a review.",
      });
    }

    // Enforce: session MUST be completed (reject pending, queued, accepted, confirmed, declined, cancelled)
    if (sess.status !== "completed") {
      return response.status(400).json({
        error: `Reviews can only be submitted for completed sessions. Current status is "${sess.status}".`,
      });
    }

    // Enforce: exactly one review per completed booking
    const existingReview = await query("SELECT id FROM reviews WHERE session_id = $1", [sessionId]);
    if (existingReview.rows.length > 0) {
      return response.status(409).json({
        error: "A review has already been submitted for this session. Duplicate reviews are not permitted.",
      });
    }

    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionScore = ReputationEngine.calculateReviewCompositeScore(numRating, structuredQuestions);

    // Insert review into PostgreSQL — storing exact integer numRating in `rating`
    let createdAt = new Date().toISOString();
    try {
      const insertRes = await query(
        `INSERT INTO reviews (
           id, session_id, reviewer_id, mentor_id, rating, comment,
           clarity_rating, interaction_rating, preparation_rating,
           materials_rating, engagement_rating, feedback_answers, session_score, created_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, CURRENT_TIMESTAMP)
         RETURNING created_at`,
        [
          reviewId,
          sessionId,
          userId,
          sess.mentor_id,
          numRating,
          cleanComment,
          structuredQuestions.clarity,
          structuredQuestions.interaction,
          structuredQuestions.preparation,
          structuredQuestions.materials,
          structuredQuestions.engagement,
          JSON.stringify(structuredQuestions),
          sessionScore,
        ]
      );
      if (insertRes.rows[0] && insertRes.rows[0].created_at) {
        createdAt = insertRes.rows[0].created_at;
      }
    } catch (insertErr) {
      if (insertErr && insertErr.code === "23505") {
        return response.status(409).json({
          error: "A review has already been submitted for this session. Duplicate reviews are not permitted.",
        });
      }
      throw insertErr;
    }

    // Update teacher reputation using bounded Bayesian prior via ReputationEngine (HashTable + PostgreSQL)
    await reputationEngine.updateTeacherReputationFromDatabase(
      sess.mentor_id,
      query
    );

    // Reconcile teacher skillHashTable and mentorGraph state with updated PostgreSQL reputation
    await reconcileTeacherDsaState(sess.mentor_id);

    // Update relationship edge weight in the Adjacency Graph (DSA Feature)
    mentorGraph.updateEdgeWeight(sess.learner_id, sess.mentor_id, numRating, true);

    // Notify mentor in-app without revealing which learner submitted the feedback
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        sess.mentor_id,
        "review_received",
        "New Anonymous Session Feedback",
        `Anonymous learner feedback (${numRating}/5 stars) was submitted for "${sess.topic || "your session"}". View your feedback and improvement areas in Teaching History.`,
        "/history?view=teaching",
      ]
    ).catch(() => {});

    return response.status(201).json({
      success: true,
      message: "Thank you! Your session feedback has been recorded.",
      review: {
        id: reviewId,
        sessionId,
        session_id: sessionId,
        mentor_id: sess.mentor_id,
        rating: numRating,
        comment: cleanComment,
        questions: structuredQuestions,
        clarity_rating: structuredQuestions.clarity,
        interaction_rating: structuredQuestions.interaction,
        preparation_rating: structuredQuestions.preparation,
        materials_rating: structuredQuestions.materials,
        engagement_rating: structuredQuestions.engagement,
        created_at: createdAt,
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

    // Requirement: Show recommendations only in Learner mode
    if (conn.reachable) {
      const userRes = await query("SELECT active_mode, role FROM users WHERE id = $1", [targetUserId]);
      const userRow = userRes.rows[0];
      const effectiveMode = (request.headers["x-active-mode"] || (userRow && userRow.active_mode) || "learner").toLowerCase();
      if (effectiveMode !== "learner") {
        return response.status(200).json({
          recommendations: [],
          mode: "teacher",
          message: "Mentor recommendations are reserved for Learner mode. Switch to Learner mode to discover mentors.",
          totalCandidatesEvaluated: 0,
        });
      }
    }

    if (conn.reachable) {
      // 1. Fetch learner's saved learning interests (type = 'learn') and active skill requests
      const learnerSkillsRes = await query(
        `SELECT skill_name, level FROM skills WHERE user_id = $1 AND type = 'learn'`,
        [targetUserId]
      );
      const learnerRequestsRes = await query(
        `SELECT title FROM course_requests WHERE requester_id = $1 AND status IN ('open', 'in_progress')`,
        [targetUserId]
      );

      const seenDesired = new Set();
      learnerDesiredSkills = [];
      for (const row of learnerSkillsRes.rows || []) {
        const name = (row.skill_name || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!seenDesired.has(key)) {
          seenDesired.add(key);
          learnerDesiredSkills.push({ skill_name: name, level: row.level || "intermediate" });
        }
      }
      for (const reqRow of learnerRequestsRes.rows || []) {
        const name = (reqRow.title || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (!seenDesired.has(key)) {
          seenDesired.add(key);
          learnerDesiredSkills.push({ skill_name: name, level: "beginner" });
        }
      }

      // If learner has no learning interests or skill requests listed, return honest empty state
      if (learnerDesiredSkills.length === 0) {
        return response.status(200).json({
          recommendations: [],
          totalCount: 0,
          desiredSkills: [],
          message: "Add learning interests to your Profile or submit a skill request to receive matching mentor recommendations.",
          totalCandidatesEvaluated: 0,
        });
      }

      const desiredLowerNames = learnerDesiredSkills.map((s) => s.skill_name.trim().toLowerCase());

      // 2. Fetch all eligible mentors who have at least one VERIFIED teaching skill matching
      // the learner's learning interests or skill requests (excluding the learner themselves).
      const dbResult = await query(
        `SELECT u.id, u.name, u.role, u.bio, u.reputation_score, u.avatar_url, u.is_demo,
                (SELECT COUNT(*)::int FROM reviews r WHERE r.mentor_id = u.id) as review_count,
                COALESCE(array_agg(DISTINCT s.skill_name) FILTER (WHERE s.type = 'teach' AND COALESCE(s.is_verified, FALSE) = TRUE AND s.skill_name IS NOT NULL), '{}') as skills,
                COALESCE(
                  json_agg(
                    DISTINCT jsonb_build_object(
                      'skill_name', s.skill_name,
                      'level', s.level,
                      'type', s.type,
                      'is_verified', TRUE
                    )
                  ) FILTER (WHERE s.type = 'teach' AND COALESCE(s.is_verified, FALSE) = TRUE AND s.skill_name IS NOT NULL),
                  '[]'::json
                ) as skill_entries
         FROM users u
         JOIN skills s ON u.id = s.user_id AND s.type = 'teach' AND COALESCE(s.is_verified, FALSE) = TRUE
         WHERE u.id <> $1
           AND EXISTS (
             SELECT 1 FROM skills sm
             WHERE sm.user_id = u.id
               AND sm.type = 'teach'
               AND COALESCE(sm.is_verified, FALSE) = TRUE
               AND LOWER(TRIM(sm.skill_name)) = ANY($2)
           )
         GROUP BY u.id, u.name, u.role, u.bio, u.reputation_score, u.avatar_url, u.is_demo
         ORDER BY u.reputation_score DESC`,
        [targetUserId, desiredLowerNames]
      );

      candidateMentors = dbResult.rows || [];

      // Dynamically sync Graph edges from PostgreSQL connections and sessions
      const connectionsDb = await query(
        `SELECT user_id, peer_id FROM connections WHERE status = 'connected'`
      );
      for (const edge of connectionsDb.rows) {
        mentorGraph.addEdge(edge.user_id, edge.peer_id, 5.0, true);
      }
      const completedSessionsDb = await query(
        `SELECT learner_id, mentor_id FROM session_bookings WHERE status = 'completed'`
      );
      for (const sess of completedSessionsDb.rows) {
        mentorGraph.addEdge(sess.learner_id, sess.mentor_id, 4.5, true);
      }
    }

    // Initialize the Max-Heap priority queue
    const recommendationHeap = new MaxHeap();

    // Score and insert each candidate into the Max-Heap
    for (const mentor of candidateMentors) {
      const mentorId = mentor.id || mentor.userId;
      const skillsList = Array.isArray(mentor.skills) ? mentor.skills : (mentor.skills ? [mentor.skills] : []);

      // Reconcile reputation from ReputationEngine HashTable and PostgreSQL
      const repSummary = reputationEngine.getTeacherReputation(mentorId);
      const dbRep = parseFloat(mentor.reputation_score || mentor.reputationScore);
      const effectiveReputation = repSummary.reviewCount > 0
        ? repSummary.boundedReputation
        : Math.min(5.0, Math.max(1.0, !isNaN(dbRep) ? dbRep : 4.0));
      const reviewCount = parseInt(mentor.review_count, 10) || repSummary.reviewCount || 0;

      // Calculate graph network distance (hops) using BFS
      const networkDistance = mentorGraph.getDegreesOfSeparation(targetUserId, mentorId);

      // Compute composite recommendation score (strictly capped at 100)
      const scoreResult = MaxHeap.computeRecommendationScore(
        {
          id: mentorId,
          name: mentor.name,
          skills: mentor.skill_entries && Array.isArray(mentor.skill_entries) && mentor.skill_entries.length > 0
            ? mentor.skill_entries
            : skillsList,
          reputation_score: effectiveReputation,
        },
        learnerDesiredSkills,
        networkDistance
      );

      const clampedScore = Math.min(100, Math.max(0, Math.round(scoreResult.score || 0)));

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
          reputationScore: effectiveReputation,
          reputation_score: effectiveReputation,
          review_count: reviewCount,
          reviewCount: reviewCount,
        },
        score: clampedScore,
        reason: scoreResult.reason,
        networkProximity: networkDistance === Infinity ? "community" : `${networkDistance}-hop`,
        breakdown: scoreResult.breakdown,
      };

      recommendationHeap.insert(candidateRecord);
    }

    // Extract ALL eligible ranked recommendations from Max-Heap (strongest to weakest)
    const topMentors = recommendationHeap.extractTopK(recommendationHeap.size());

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

    const emptyMessage = candidateMentors.length === 0
      ? `No verified mentors are currently teaching your requested skills (${learnerDesiredSkills.map(s => s.skill_name).join(', ')}). You can submit a course request to attract mentors!`
      : null;

    return response.status(200).json({
      recommendations: rankedRecommendations,
      totalCount: rankedRecommendations.length,
      totalCandidatesEvaluated: candidateMentors.length,
      desiredSkills: learnerDesiredSkills.map(s => s.skill_name),
      message: emptyMessage,
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

    const cleanTitle = title.trim().replace(/\s+/g, " ");
    if (cleanTitle.length > 120 || !/[a-zA-Z]/.test(cleanTitle)) {
      return response.status(400).json({
        error: "Please enter a valid skill or course title containing letters (2–120 characters).",
      });
    }

    const cleanDesc = description && typeof description === "string" ? description.trim() : "";
    const requestedCategory =
      category && typeof category === "string" && category.trim() !== ""
        ? category.trim()
        : "General";

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({
        error: "Database unavailable. Course request could not be saved.",
      });
    }

    await ensureCuratedCatalogSynced();

    // Check against canonical skill_catalog for canonical casing/category or close spelling suggestions,
    // WITHOUT rejecting legitimate unavailable skills that are not yet in skill_catalog
    // and WITHOUT inserting unapproved skills into skill_catalog.
    const validation = await validateSkillAgainstCatalog(cleanTitle);
    const finalTitle = validation.valid ? validation.canonicalName : cleanTitle;
    const finalCategory =
      validation.valid && validation.category && requestedCategory === "General"
        ? validation.category
        : requestedCategory;

    // Check if the learner already has an active open request for this skill
    const duplicateRequest = await query(
      `SELECT id FROM course_requests
       WHERE requester_id = $1 AND LOWER(TRIM(title)) = LOWER(TRIM($2)) AND status = 'open'`,
      [requesterId, finalTitle]
    );

    if (duplicateRequest.rows.length > 0) {
      return response.status(409).json({
        error: `You already have an open course request for "${finalTitle}".`,
      });
    }

    // Insert new pending ('open') course request into course_requests (never mutates skill_catalog)
    const insertRes = await query(
      `INSERT INTO course_requests (requester_id, title, description, category, status, votes_count)
       VALUES ($1, $2, $3, $4, 'open', 1)
       RETURNING id, requester_id, title, description, category, status, votes_count, created_at, updated_at`,
      [requesterId, finalTitle, cleanDesc, finalCategory]
    );

    return response.status(201).json({
      message: validation.valid
        ? `Course request for "${finalTitle}" created successfully. You will be notified as soon as an eligible teacher responds.`
        : `New skill request for "${finalTitle}" saved as a pending course request. You will be notified when a verified teacher offers this skill.`,
      courseRequest: insertRes.rows[0],
      isCatalogSkill: Boolean(validation.valid),
      suggestion: !validation.valid ? validation.suggestion || null : null,
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
      requests: res.rows || [],
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
      requests: res.rows || [],
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
      requests: res.rows || [],
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

/**
 * ENDPOINT: POST /api/course-requests/:id/respond
 * Allows an eligible teacher to offer to teach an open course request.
 */
application.post("/api/course-requests/:id/respond", authenticateToken, async (request, response) => {
  try {
    const teacherId = request.user.userId;
    const requestId = parseInt(request.params.id, 10);
    const { message } = request.body;

    if (isNaN(requestId)) {
      return response.status(400).json({ error: "Invalid course request ID." });
    }

    const conn = await checkConnection();
    if (!conn.reachable) {
      return response.status(503).json({ error: "Database unavailable." });
    }

    const teacherRes = await query(
      `SELECT id, name, role, active_mode FROM users WHERE id = $1`,
      [teacherId]
    );
    if (teacherRes.rows.length === 0) {
      return response.status(404).json({ error: "Teacher user not found." });
    }
    const teacher = teacherRes.rows[0];

    const reqRes = await query(
      `SELECT cr.id, cr.requester_id, cr.title, cr.category, cr.status, u.name as requester_name
       FROM course_requests cr
       JOIN users u ON cr.requester_id = u.id
       WHERE cr.id = $1`,
      [requestId]
    );
    if (reqRes.rows.length === 0) {
      return response.status(404).json({ error: "Course request not found." });
    }
    const courseReq = reqRes.rows[0];

    if (courseReq.requester_id === teacherId) {
      return response.status(400).json({ error: "You cannot respond to your own course request." });
    }

    // Check if teacher has this skill listed as teachable
    const teachesSkillRes = await query(
      `SELECT id, is_verified FROM skills
       WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2) AND type = 'teach'`,
      [teacherId, courseReq.title]
    );

    // If teacher doesn't have it listed, automatically add as teachable
    if (teachesSkillRes.rows.length === 0) {
      await query(
        `INSERT INTO skills (user_id, skill_name, level, type, is_verified)
         VALUES ($1, $2, 'intermediate', 'teach', FALSE)
         ON CONFLICT ON CONSTRAINT uq_user_skill_type DO NOTHING`,
        [teacherId, courseReq.title]
      );
    }

    // Update request to fulfilled
    await query(
      `UPDATE course_requests SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [requestId]
    );

    // Create notification for learner
    await query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'course_request_matched', $2, $3, $4)`,
      [
        courseReq.requester_id,
        `Teacher Found for: ${courseReq.title}`,
        `${teacher.name} has offered to teach your requested skill "${courseReq.title}"! ${message ? `Message: "${message}"` : "You can message them or book a session directly."}`,
        `/messages?userId=${teacherId}`,
      ]
    );

    return response.status(200).json({
      message: `You have offered to teach "${courseReq.title}"! The requesting learner has been notified.`,
      status: "fulfilled",
      requestId,
    });
  } catch (error) {
    console.error("Error responding to course request:", error);
    return response.status(500).json({
      error: "An internal server error occurred while responding to course request.",
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

    await cleanupObsoleteNotifications();

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

    await cleanupObsoleteNotifications();

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

    await cleanupAutomatedBookingChatMessages().catch(() => {});

    const convRes = await query(
      `SELECT c.id, c.user1_id, c.user2_id,
              CASE
                WHEN sb.status IN ('accepted', 'confirmed') THEN c.session_id
                WHEN fallback_sb.id IS NOT NULL THEN fallback_sb.id
                ELSE c.session_id
              END as session_id,
              c.is_closed, c.closed_at, c.last_message_at, c.created_at,
              CASE
                WHEN sb.status IN ('accepted', 'confirmed') THEN sb.status
                WHEN fallback_sb.status IS NOT NULL THEN fallback_sb.status
                ELSE sb.status
              END as session_status,
              CASE
                WHEN sb.status IN ('accepted', 'confirmed') THEN sb.topic
                WHEN fallback_sb.topic IS NOT NULL THEN fallback_sb.topic
                ELSE sb.topic
              END as session_skill,
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
       LEFT JOIN session_bookings sb ON c.session_id = sb.id
       LEFT JOIN LATERAL (
         SELECT s.id, s.status, s.topic
         FROM session_bookings s
         WHERE (s.learner_id = c.user1_id AND s.mentor_id = c.user2_id)
            OR (s.learner_id = c.user2_id AND s.mentor_id = c.user1_id)
         ORDER BY
           CASE
             WHEN s.status IN ('accepted', 'confirmed') THEN 1
             WHEN s.status IN ('pending', 'queued') THEN 2
             WHEN s.status = 'completed' THEN 3
             ELSE 4
           END ASC,
           s.created_at DESC
         LIMIT 1
       ) fallback_sb ON TRUE
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

    // Find the most relevant session between the two users if one exists
    const sessRes = await query(
      `SELECT id, status, topic
       FROM session_bookings
       WHERE (learner_id = $1 AND mentor_id = $2) OR (learner_id = $2 AND mentor_id = $1)
       ORDER BY
         CASE
           WHEN status IN ('accepted', 'confirmed') THEN 1
           WHEN status IN ('pending', 'queued') THEN 2
           WHEN status = 'completed' THEN 3
           ELSE 4
         END ASC,
         created_at DESC
       LIMIT 1`,
      [u1, u2]
    );
    const bestSession = sessRes.rows[0] || null;

    // Check existing or insert
    let convRes = await query(
      `SELECT id, user1_id, user2_id, session_id, is_closed, closed_at, last_message_at, created_at
       FROM conversations
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [u1, u2]
    );

    if (convRes.rows.length === 0) {
      convRes = await query(
        `INSERT INTO conversations (user1_id, user2_id, session_id, is_closed, last_message_at)
         VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
         RETURNING id, user1_id, user2_id, session_id, is_closed, closed_at, last_message_at, created_at`,
        [u1, u2, bestSession ? bestSession.id : null]
      );

      // Record mutual connection
      await query(
        `INSERT INTO connections (user_id, peer_id, status)
         VALUES ($1, $2, 'connected')
         ON CONFLICT (user_id, peer_id) DO NOTHING`,
        [currentUserId, recipientId]
      );
    } else if (bestSession && (!convRes.rows[0].session_id || ["accepted", "confirmed"].includes(bestSession.status))) {
      // Ensure conversation points to active session if one exists
      const shouldReopen = ["accepted", "confirmed", "pending", "queued"].includes(bestSession.status);
      convRes = await query(
        `UPDATE conversations
         SET session_id = COALESCE(session_id, $1),
             is_closed = CASE WHEN $2::boolean THEN FALSE ELSE is_closed END
         WHERE id = $3
         RETURNING id, user1_id, user2_id, session_id, is_closed, closed_at, last_message_at, created_at`,
        [bestSession.id, shouldReopen, convRes.rows[0].id]
      );
    }

    const conv = convRes.rows[0];
    let sessionStatus = bestSession ? bestSession.status : null;
    let sessionSkill = bestSession ? bestSession.topic : null;
    if (conv.session_id && (!bestSession || bestSession.id !== conv.session_id)) {
      const linkedRes = await query(
        `SELECT status, topic FROM session_bookings WHERE id = $1`,
        [conv.session_id]
      );
      if (linkedRes.rows[0]) {
        sessionStatus = linkedRes.rows[0].status;
        sessionSkill = linkedRes.rows[0].topic;
      }
    }

    return response.status(200).json({
      conversation: {
        id: conv.id,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        session_id: conv.session_id || (bestSession ? bestSession.id : null),
        session_status: sessionStatus,
        session_skill: sessionSkill,
        is_closed: Boolean(conv.is_closed),
        closed_at: conv.closed_at || null,
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

    await cleanupAutomatedBookingChatMessages().catch(() => {});

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

    // Fetch messages with attachments, voice notes, and call logs
    const msgRes = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
              m.message_type, m.attachment_filename, m.attachment_original_name,
              m.attachment_mimetype, m.attachment_size, m.duration_seconds, m.call_action,
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

    await cleanupAutomatedBookingChatMessages().catch(() => {});

    // Ownership check: must be a participant
    const convCheck = await query(
      `SELECT id, user1_id, user2_id, is_closed FROM conversations WHERE id = $1`,
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

    if (conv.is_closed) {
      return response.status(400).json({
        error: "This session coordination conversation is closed. New messages cannot be sent.",
      });
    }

    const recipientId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

    // Insert message
    const msgRes = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at, message_type)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'text')
       RETURNING id, conversation_id, sender_id, content, is_read, created_at, message_type,
                 attachment_filename, attachment_original_name, attachment_mimetype,
                 attachment_size, duration_seconds, call_action`,
      [convId, userId, content.trim()]
    );
    const newMessage = msgRes.rows[0];

    // Update conversation timestamp
    await query(
      `UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [convId]
    );

    // Fetch sender info for notification
    const senderRes = await query(`SELECT name, avatar_url FROM users WHERE id = $1`, [userId]);
    const senderName = senderRes.rows[0]?.name || "A community member";
    const senderAvatar = senderRes.rows[0]?.avatar_url || null;

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
        sender_avatar: senderAvatar,
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
// TEACHER DOCUMENT VERIFICATION ENDPOINTS (PostgreSQL-backed & JWT-authorized)
// ----------------------------------------------------------------------------

/**
 * Safely extracts real plain text from supported uploaded files (PDF, DOCX) using Node.js built-ins.
 * - For DOCX: Locates 'word/document.xml' within the zip stream, decompresses it with zlib, and strips XML tags.
 * - For PDF: Extracts text from text operators (BT ... ET, Tj, TJ) with /FlateDecode decompression.
 * - Never treats raw binary bytes as ASCII text. Returns empty string if text cannot be safely extracted.
 * - The pre-check remains strictly advisory: human reviewers make all final decisions.
 */
function extractDocumentText(filePath, originalName = "") {
  if (!filePath || !fs.existsSync(filePath)) return "";
  try {
    const buffer = fs.readFileSync(filePath);
    if (!buffer || buffer.length === 0) return "";
    const ext = path.extname(originalName || filePath).toLowerCase();

    // 1. DOCX (PKZIP containing word/document.xml)
    if (ext === ".docx" || (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)) {
      try {
        let offset = 0;
        while (offset < buffer.length - 30) {
          if (buffer[offset] === 0x50 && buffer[offset + 1] === 0x4b && buffer[offset + 2] === 0x03 && buffer[offset + 3] === 0x04) {
            const compMethod = buffer.readUInt16LE(offset + 8);
            const compSize = buffer.readUInt32LE(offset + 18);
            const fileNameLen = buffer.readUInt16LE(offset + 26);
            const extraLen = buffer.readUInt16LE(offset + 28);
            const nameStart = offset + 30;
            const name = buffer.toString("utf8", nameStart, nameStart + fileNameLen);
            const dataStart = nameStart + fileNameLen + extraLen;

            if (name === "word/document.xml" && dataStart + compSize <= buffer.length) {
              const slice = buffer.slice(dataStart, dataStart + compSize);
              let xml = "";
              if (compMethod === 8) {
                xml = zlib.inflateRawSync(slice).toString("utf8");
              } else if (compMethod === 0) {
                xml = slice.toString("utf8");
              }
              if (xml) {
                return xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              }
            }
            offset = dataStart + compSize;
          } else {
            offset++;
          }
        }
      } catch (docxErr) {
        // Fallback gracefully on parsing edge cases
      }
    }

    // 2. PDF (stream objects and text operators BT ... ET)
    if (ext === ".pdf" || buffer.slice(0, 5).toString() === "%PDF-") {
      let extracted = [];
      try {
        const content = buffer.toString("latin1");
        const streamRegex = /<<([\s\S]*?)>>[\r\n\s]*stream[\r\n\s]([\s\S]*?)endstream/g;
        let match;
        while ((match = streamRegex.exec(content)) !== null) {
          const dict = match[1];
          const streamData = match[2];
          let streamBuf = Buffer.from(streamData, "latin1");

          if (dict.includes("/FlateDecode")) {
            try {
              streamBuf = zlib.inflateSync(streamBuf);
            } catch (e) {
              try {
                streamBuf = zlib.inflateRawSync(streamBuf);
              } catch (e2) {}
            }
          }

          const decodedStr = streamBuf.toString("latin1");
          const textRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
          let tm;
          while ((tm = textRegex.exec(decodedStr)) !== null) {
            extracted.push(tm[1]);
          }
          const tjRegex = /\[(.*?)\]\s*TJ/g;
          while ((tm = tjRegex.exec(decodedStr)) !== null) {
            const parts = tm[1].match(/\(([^)]+)\)/g);
            if (parts) {
              parts.forEach((p) => extracted.push(p.slice(1, -1)));
            }
          }
        }
        if (extracted.length > 0) {
          return extracted.join(" ").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
        }
      } catch (pdfErr) {
        // Fallback gracefully
      }
    }

    return "";
  } catch (err) {
    return "";
  }
}

/**
 * ENDPOINT: POST /api/teacher-verification/apply
 *
 * Dedicated teacher verification application submission:
 * - Requires JWT authentication.
 * - Accepts resume (PDF/DOCX), certificate (PDF/JPG/PNG), or both.
 * - Requires at least one document.
 * - Validates file types and sizes (<= 5MB).
 * - Executes rules-based resume pre-check (skills, sections, dates) via ResumePreChecker.
 * - Runs VerificationDecisionTree to classify document choice and routing tier.
 * - Persists application metadata, document references, and precheck results in PostgreSQL.
 * - Notifies applicant that review typically takes 2 business days.
 * - Explicit notice: Pre-check is preliminary feedback only; final review is human-adjudicated.
 */
application.post(
  "/api/teacher-verification/apply",
  authenticateToken,
  (request, response, next) => {
    documentUpload.fields([
      { name: "resume", maxCount: 1 },
      { name: "certificate", maxCount: 1 },
    ])(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return response.status(400).json({ error: "File size exceeds the 5MB limit." });
        }
        return response.status(400).json({ error: `File upload error: ${err.message}` });
      } else if (err) {
        return response.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const { skillName, notes, resumeText } = request.body;

      if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
        return response.status(400).json({
          error: "Skill name is required for verification.",
        });
      }

      const cleanSkill = skillName.trim();
      const catalogValidation = await validateSkillAgainstCatalog(cleanSkill);
      if (!catalogValidation.valid) {
        return response.status(400).json({
          error: catalogValidation.message,
          suggestion: catalogValidation.suggestion || null,
        });
      }
      const canonicalSkill = catalogValidation.canonicalName;

      const resumeFile = request.files && request.files["resume"] ? request.files["resume"][0] : null;
      const certFile = request.files && request.files["certificate"] ? request.files["certificate"][0] : null;

      if (!resumeFile && !certFile) {
        return response.status(400).json({
          error: "At least one document (resume or certificate) is required for teacher verification.",
        });
      }

      // Strict file signature (magic byte) verification
      if (resumeFile) {
        const sig = validateFileSignature(resumeFile.path, resumeFile.mimetype);
        if (!sig.valid) {
          try { fs.unlinkSync(resumeFile.path); } catch (e) {}
          if (certFile) try { fs.unlinkSync(certFile.path); } catch (e) {}
          return response.status(400).json({
            error: `Resume file validation failed: ${sig.reason}`,
          });
        }
      }

      if (certFile) {
        const sig = validateFileSignature(certFile.path, certFile.mimetype);
        if (!sig.valid) {
          if (resumeFile) try { fs.unlinkSync(resumeFile.path); } catch (e) {}
          try { fs.unlinkSync(certFile.path); } catch (e) {}
          return response.status(400).json({
            error: `Certificate file validation failed: ${sig.reason}`,
          });
        }
      }

      const submissionType = (resumeFile && certFile) ? 'both' : (resumeFile ? 'resume_only' : 'certificate_only');
      const appId = `tva_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const reviewMetadata = {
        reviewMode: "human_only",
        hasResume: Boolean(resumeFile),
        hasCertificate: Boolean(certFile),
        submissionType,
        notice: "All applications are reviewed manually by our designated reviewer. Review typically takes 2 business days.",
      };
      const initialHistory = JSON.stringify([
        {
          action: "initial_submission",
          timestamp: new Date().toISOString(),
          submission_type: submissionType,
          has_resume: Boolean(resumeFile),
          has_certificate: Boolean(certFile),
          notes: notes ? notes.trim() : null,
        },
      ]);

      const insertRes = await query(
        `INSERT INTO teacher_verification_applications (
           id, user_id, skill_name, status, submission_type,
           resume_filename, resume_original_name, resume_mimetype, resume_size,
           certificate_filename, certificate_original_name, certificate_mimetype, certificate_size,
           precheck_results, history, created_at, updated_at
         ) VALUES ($1, $2, $3, 'submitted', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          appId,
          userId,
          canonicalSkill,
          submissionType,
          resumeFile ? resumeFile.filename : null,
          resumeFile ? resumeFile.originalname : null,
          resumeFile ? resumeFile.mimetype : null,
          resumeFile ? resumeFile.size : null,
          certFile ? certFile.filename : null,
          certFile ? certFile.originalname : null,
          certFile ? certFile.mimetype : null,
          certFile ? certFile.size : null,
          JSON.stringify(reviewMetadata),
          initialHistory,
        ]
      );

      // In-app notification for the applicant
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          "verification_submitted",
          "Verification Application Submitted",
          `Your verification application for "${canonicalSkill}" has been submitted. Review typically takes 2 business days.`,
          "/teacher-verification",
        ]
      ).catch(() => {});

      // In-app notification for the designated reviewer
      const reviewerUser = await query("SELECT id FROM users WHERE LOWER(email) = $1", [SOLE_REVIEWER_EMAIL]);
      if (reviewerUser.rows.length > 0) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            reviewerUser.rows[0].id,
            "verification_submitted",
            "New Verification Application",
            `A new teacher verification application was submitted for "${canonicalSkill}" (Application ID: ${appId}).`,
            "/reviewer",
          ]
        ).catch(() => {});
      }

      return response.status(201).json({
        message: "Application submitted successfully. Review typically takes 2 business days.",
        application: insertRes.rows[0],
        estimatedReviewTime: "Typically 2 business days",
      });
    } catch (error) {
      console.error("Error submitting teacher verification application:", error);
      return response.status(500).json({
        error: "An error occurred while submitting teacher verification application.",
        details: error.message,
      });
    }
  }
);

/**
 * ENDPOINT: POST /api/teacher-verification/applications/:id/resubmit
 *
 * Allows an applicant to submit corrected or additional documents
 * (resume, certificate, or both) for an existing application, while
 * preserving application history and previous reviewer feedback.
 */
application.post(
  "/api/teacher-verification/applications/:id/resubmit",
  authenticateToken,
  (request, response, next) => {
    documentUpload.fields([
      { name: "resume", maxCount: 1 },
      { name: "certificate", maxCount: 1 },
    ])(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return response.status(400).json({ error: "File size exceeds the 5MB limit." });
        }
        return response.status(400).json({ error: `File upload error: ${err.message}` });
      } else if (err) {
        return response.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const appId = request.params.id;
      const { notes, resumeText } = request.body;

      const appRes = await query(
        "SELECT * FROM teacher_verification_applications WHERE id = $1",
        [appId]
      );

      if (appRes.rows.length === 0) {
        return response.status(404).json({ error: "Verification application not found." });
      }

      const app = appRes.rows[0];

      if (app.user_id !== userId) {
        return response.status(403).json({
          error: "Unauthorized. You may only resubmit documents for your own application.",
        });
      }

      if (app.status === "approved") {
        return response.status(400).json({
          error: "This application is already approved. No further documents are required.",
        });
      }

      const newResume = request.files && request.files["resume"] ? request.files["resume"][0] : null;
      const newCert = request.files && request.files["certificate"] ? request.files["certificate"][0] : null;

      if (!newResume && !newCert && (!notes || typeof notes !== "string" || notes.trim() === "")) {
        return response.status(400).json({
          error: "Please provide at least one updated document (resume or certificate) or an explanatory note.",
        });
      }

      // Strict file signature validation for newly uploaded files
      if (newResume) {
        const sig = validateFileSignature(newResume.path, newResume.mimetype);
        if (!sig.valid) {
          try { fs.unlinkSync(newResume.path); } catch (e) {}
          if (newCert) try { fs.unlinkSync(newCert.path); } catch (e) {}
          return response.status(400).json({
            error: `Resume file validation failed: ${sig.reason}`,
          });
        }
      }

      if (newCert) {
        const sig = validateFileSignature(newCert.path, newCert.mimetype);
        if (!sig.valid) {
          if (newResume) try { fs.unlinkSync(newResume.path); } catch (e) {}
          try { fs.unlinkSync(newCert.path); } catch (e) {}
          return response.status(400).json({
            error: `Certificate file validation failed: ${sig.reason}`,
          });
        }
      }

      // Preserve application history
      const existingHistory = Array.isArray(app.history) ? app.history : [];
      const historyEntry = {
        action: "resubmitted_documents",
        timestamp: new Date().toISOString(),
        previous_status: app.status,
        previous_resume: app.resume_original_name || null,
        previous_certificate: app.certificate_original_name || null,
        previous_reviewer_notes: app.reviewer_notes || null,
        previous_rejection_reason: app.rejection_reason || null,
        new_resume_uploaded: Boolean(newResume),
        new_certificate_uploaded: Boolean(newCert),
        applicant_notes: (notes && typeof notes === "string") ? notes.trim() : null,
      };
      const updatedHistory = JSON.stringify([...existingHistory, historyEntry]);

      // Resolve final document pointers
      const finalResumeFile = newResume ? newResume.filename : app.resume_filename;
      const finalResumeOriginal = newResume ? newResume.originalname : app.resume_original_name;
      const finalResumeMime = newResume ? newResume.mimetype : app.resume_mimetype;
      const finalResumeSize = newResume ? newResume.size : app.resume_size;

      const finalCertFile = newCert ? newCert.filename : app.certificate_filename;
      const finalCertOriginal = newCert ? newCert.originalname : app.certificate_original_name;
      const finalCertMime = newCert ? newCert.mimetype : app.certificate_mimetype;
      const finalCertSize = newCert ? newCert.size : app.certificate_size;

      const submissionType = (finalResumeFile && finalCertFile) ? "both" : (finalResumeFile ? "resume_only" : "certificate_only");

      const reviewMetadata = {
        reviewMode: "human_only",
        hasResume: Boolean(finalResumeFile),
        hasCertificate: Boolean(finalCertFile),
        submissionType,
        notice: "All applications are reviewed manually by our designated reviewer. Review typically takes 2 business days.",
      };

      const updateRes = await query(
        `UPDATE teacher_verification_applications
         SET status = 'submitted',
             submission_type = $1,
             resume_filename = $2,
             resume_original_name = $3,
             resume_mimetype = $4,
             resume_size = $5,
             certificate_filename = $6,
             certificate_original_name = $7,
             certificate_mimetype = $8,
             certificate_size = $9,
             precheck_results = $10,
             history = $11,
             rejection_reason = NULL,
             reviewer_notes = $12,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $13
         RETURNING *`,
        [
          submissionType,
          finalResumeFile,
          finalResumeOriginal,
          finalResumeMime,
          finalResumeSize,
          finalCertFile,
          finalCertOriginal,
          finalCertMime,
          finalCertSize,
          JSON.stringify(reviewMetadata),
          updatedHistory,
          notes ? `Applicant update: ${notes.trim()}` : null,
          appId,
        ]
      );

      // Notify applicant
      await query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          "verification_resubmitted",
          "Verification Documents Updated",
          `Updated documents for "${app.skill_name}" have been submitted. Review is expected within 2 business days.`,
          "/teacher-verification",
        ]
      ).catch(() => {});

      // Notify sole reviewer
      const reviewerUser = await query("SELECT id FROM users WHERE LOWER(email) = $1", [SOLE_REVIEWER_EMAIL]);
      if (reviewerUser.rows.length > 0) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            reviewerUser.rows[0].id,
            "verification_resubmitted",
            "Updated Verification Documents",
            `Applicant updated documents for "${app.skill_name}" (Application ID: ${app.id}).`,
            "/reviewer",
          ]
        ).catch(() => {});
      }

      return response.status(200).json({
        message: "Documents successfully updated and resubmitted. Review typically takes 2 business days.",
        application: updateRes.rows[0],
        estimatedReviewTime: "Typically 2 business days",
      });
    } catch (error) {
      console.error("Error resubmitting teacher verification documents:", error);
      return response.status(500).json({
        error: "An error occurred while resubmitting documents.",
        details: error.message,
      });
    }
  }
);

/**
 * ENDPOINT: GET /api/teacher-verification/my-applications
 * Returns all verification applications submitted by the authenticated user.
 */
application.get(
  "/api/teacher-verification/my-applications",
  authenticateToken,
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const res = await query(
        `SELECT id, user_id, skill_name, status, submission_type,
                resume_original_name, resume_size,
                certificate_original_name, certificate_size,
                precheck_results, history, reviewer_notes, rejection_reason, reviewed_at, created_at, updated_at
         FROM teacher_verification_applications
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      // Also retrieve verified skills
      const verifiedSkillsRes = await query(
        `SELECT id, skill_name, level, is_verified, verified_at
         FROM skills
         WHERE user_id = $1 AND is_verified = TRUE AND type = 'teach'
         ORDER BY verified_at DESC`,
        [userId]
      );

      return response.status(200).json({
        applications: res.rows || [],
        verifiedSkills: verifiedSkillsRes.rows || [],
      });
    } catch (error) {
      console.error("Error retrieving user verification applications:", error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * ENDPOINT: GET /api/teacher-verification/documents/:appId/:docType
 *
 * Secure document retrieval:
 * - Requires JWT authentication.
 * - Authorized ONLY for the applicant or designated reviewers.
 * - Serves requested document stream securely with inline Content-Disposition.
 */
/**
 * ENDPOINT: GET /api/teacher-verification/documents/:appId/:docType
 *
 * Secure document retrieval:
 * - Requires JWT authentication.
 * - Authorized ONLY for the applicant or the sole reviewer (kailashsampath15@gmail.com).
 * - Serves requested document stream securely with inline Content-Disposition.
 */
application.get(
  "/api/teacher-verification/documents/:appId/:docType",
  authenticateToken,
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const { appId, docType } = request.params;

      if (docType !== "resume" && docType !== "certificate") {
        return response.status(400).json({ error: "Invalid document type. Must be 'resume' or 'certificate'." });
      }

      const appRes = await query(
        "SELECT * FROM teacher_verification_applications WHERE id = $1",
        [appId]
      );

      if (appRes.rows.length === 0) {
        return response.status(404).json({ error: "Verification application not found." });
      }

      const application = appRes.rows[0];

      // Check if user is sole reviewer from PostgreSQL
      const userRes = await query("SELECT email FROM users WHERE id = $1", [userId]);
      const dbEmail = (userRes.rows && userRes.rows[0] ? userRes.rows[0].email : "").trim().toLowerCase();
      const isSoleReviewer = dbEmail === SOLE_REVIEWER_EMAIL;

      // Authorization check: User must be applicant or sole reviewer
      if (application.user_id !== userId && !isSoleReviewer) {
        return response.status(403).json({
          error: "Unauthorized. Only the applicant or the designated reviewer may access this document.",
        });
      }

      const filename = docType === "resume" ? application.resume_filename : application.certificate_filename;
      const originalName = docType === "resume" ? application.resume_original_name : application.certificate_original_name;
      const mimetype = docType === "resume" ? application.resume_mimetype : application.certificate_mimetype;

      if (!filename) {
        return response.status(404).json({ error: `No ${docType} document was uploaded for this application.` });
      }

      const filePath = path.join(documentsDir, filename);
      if (!fs.existsSync(filePath)) {
        return response.status(404).json({ error: "Document file not found on disk." });
      }

      response.setHeader("Content-Type", mimetype || "application/octet-stream");
      response.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(originalName || filename)}"`
      );

      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(response);
    } catch (error) {
      console.error("Error serving verification document:", error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * ENDPOINT: GET /api/teacher-verification/admin/queue
 *
 * Dedicated Sole Reviewer Queue:
 * - Requires JWT authentication AND reviewer email check (kailashsampath15@gmail.com).
 * - Lists all teacher-verification applications—not just pending ones.
 * - Supports status filter, search keyword, skill filter, and pagination.
 * - Returns status breakdown counts across the entire catalog.
 */
application.get(
  "/api/teacher-verification/admin/queue",
  authenticateToken,
  requireReviewerAuth,
  async (request, response) => {
    try {
      const { status, search, skill, page = 1, limit = 15 } = request.query;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
      const offset = (pageNum - 1) * limitNum;

      const whereClauses = [];
      const params = [];

      // Status filter
      if (status && typeof status === "string" && status.trim() !== "" && status.toLowerCase() !== "all") {
        params.push(status.trim().toLowerCase());
        whereClauses.push(`tva.status = $${params.length}`);
      }

      // Skill filter
      if (skill && typeof skill === "string" && skill.trim() !== "" && skill.toLowerCase() !== "all") {
        params.push(skill.trim().toLowerCase());
        whereClauses.push(`LOWER(tva.skill_name) = $${params.length}`);
      }

      // Search across applicant name, email, or skill
      if (search && typeof search === "string" && search.trim() !== "") {
        params.push(`%${search.trim().toLowerCase()}%`);
        const pIdx = params.length;
        whereClauses.push(`(LOWER(u.name) LIKE $${pIdx} OR LOWER(u.email) LIKE $${pIdx} OR LOWER(tva.skill_name) LIKE $${pIdx})`);
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      // Total count matching query
      const countRes = await query(
        `SELECT COUNT(*) as count
         FROM teacher_verification_applications tva
         JOIN users u ON tva.user_id = u.id
         ${whereSql}`,
        params
      );
      const totalCount = parseInt(countRes.rows[0].count, 10);

      // Paginated applications
      const dataParams = [...params, limitNum, offset];
      const queueRes = await query(
        `SELECT tva.*,
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'avatar_url', u.avatar_url,
                  'role', u.role,
                  'reputation_score', u.reputation_score
                ) as applicant
         FROM teacher_verification_applications tva
         JOIN users u ON tva.user_id = u.id
         ${whereSql}
         ORDER BY tva.created_at DESC
         LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
        dataParams
      );

      // Global status breakdown counts
      const statusCountsRes = await query(
        `SELECT status, COUNT(*)::int as count
         FROM teacher_verification_applications
         GROUP BY status`
      );
      const statusCounts = {
        all: 0,
        submitted: 0,
        under_review: 0,
        needs_information: 0,
        approved: 0,
        rejected: 0,
      };
      (statusCountsRes.rows || []).forEach((row) => {
        statusCounts[row.status] = row.count;
        statusCounts.all += row.count;
      });

      return response.status(200).json({
        applications: queueRes.rows || [],
        queue: queueRes.rows || [],
        totalCount,
        count: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
        statusCounts,
      });
    } catch (error) {
      console.error("Error retrieving reviewer queue:", error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * ENDPOINT: GET /api/teacher-verification/admin/application/:id
 * Dedicated Detail View for Reviewer Portal
 */
application.get(
  "/api/teacher-verification/admin/application/:id",
  authenticateToken,
  requireReviewerAuth,
  async (request, response) => {
    try {
      const appId = request.params.id;
      const appRes = await query(
        `SELECT tva.*,
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'avatar_url', u.avatar_url,
                  'role', u.role,
                  'bio', u.bio,
                  'reputation_score', u.reputation_score,
                  'specialization_domain', u.specialization_domain,
                  'created_at', u.created_at
                ) as applicant,
                rev.name as reviewer_name,
                rev.email as reviewer_email
         FROM teacher_verification_applications tva
         JOIN users u ON tva.user_id = u.id
         LEFT JOIN users rev ON tva.reviewer_id = rev.id
         WHERE tva.id = $1`,
        [appId]
      );

      if (appRes.rows.length === 0) {
        return response.status(404).json({ error: "Verification application not found." });
      }

      return response.status(200).json({
        application: appRes.rows[0],
      });
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * ENDPOINT: POST /api/teacher-verification/admin/application/:id/review
 *
 * Authorized review decision endpoint:
 * - Strictly guarded by requireReviewerAuth (kailashsampath15@gmail.com).
 * - Reviewer can approve, reject (with mandatory reason), or request more information (with mandatory notes).
 * - Enforces explicit state lifecycle transitions via VerificationLifecycleManager.
 * - On approval, marks applicant's skill as verified in PostgreSQL and qualifies them to teach.
 * - Dispatches in-app notifications to applicant.
 */
application.post(
  "/api/teacher-verification/admin/application/:id/review",
  authenticateToken,
  requireReviewerAuth,
  async (request, response) => {
    try {
      const reviewerId = request.user.userId;
      const appId = request.params.id;
      const { action, reason, notes } = request.body;

      if (!["approve", "reject", "request_info", "mark_under_review"].includes(action)) {
        return response.status(400).json({
          error: "Invalid action. Must be 'approve', 'reject', 'request_info', or 'mark_under_review'.",
        });
      }

      const appRes = await query(
        "SELECT * FROM teacher_verification_applications WHERE id = $1",
        [appId]
      );

      if (appRes.rows.length === 0) {
        return response.status(404).json({ error: "Verification application not found." });
      }

      const app = appRes.rows[0];

      // Map action to target lifecycle status
      let targetStatus;
      if (action === "approve") targetStatus = "approved";
      else if (action === "reject") targetStatus = "rejected";
      else if (action === "request_info") targetStatus = "needs_information";
      else if (action === "mark_under_review") targetStatus = "under_review";

      // Validate transition using VerificationLifecycleManager
      // Direct reviewer adjudication from 'submitted' is permitted by advancing through 'under_review'
      let transitionValidation;
      if (app.status === "submitted" && targetStatus !== "under_review") {
        const toUnderReview = VerificationLifecycleManager.validateTransition("submitted", "under_review");
        const toFinal = VerificationLifecycleManager.validateTransition("under_review", targetStatus);
        transitionValidation = (!toUnderReview.allowed) ? toUnderReview : toFinal;
      } else {
        transitionValidation = VerificationLifecycleManager.validateTransition(
          app.status,
          targetStatus
        );
      }
      if (!transitionValidation.allowed) {
        return response.status(400).json({
          error: transitionValidation.reason,
        });
      }

      if (action === "reject" && (!reason || typeof reason !== "string" || reason.trim() === "")) {
        return response.status(400).json({
          error: "A specific rejection reason is mandatory when rejecting an application.",
        });
      }

      if (action === "request_info" && (!notes || typeof notes !== "string" || notes.trim() === "")) {
        return response.status(400).json({
          error: "Please specify what additional information is needed from the applicant.",
        });
      }

      // Preserve adjudication in history
      const existingHistory = Array.isArray(app.history) ? app.history : [];
      const historyEvent = {
        action: `reviewer_${action}`,
        status: targetStatus,
        reviewer_id: reviewerId,
        timestamp: new Date().toISOString(),
        rejection_reason: (action === "reject" && reason) ? reason.trim() : null,
        reviewer_notes: notes ? notes.trim() : null,
      };
      const updatedHistory = JSON.stringify([...existingHistory, historyEvent]);

      // Execute review action
      if (action === "approve") {
        await query(
          `UPDATE teacher_verification_applications
           SET status = 'approved',
               reviewer_id = $1,
               reviewer_notes = $2,
               history = $3,
               reviewed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [reviewerId, notes || "Approved after document verification.", updatedHistory, appId]
        );

        // Check if skill entry already exists for user
        const existingSkill = await query(
          "SELECT id FROM skills WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2) AND type = 'teach'",
          [app.user_id, app.skill_name]
        );

        if (existingSkill.rows.length > 0) {
          await query(
            "UPDATE skills SET is_verified = TRUE, verified_at = CURRENT_TIMESTAMP WHERE id = $1",
            [existingSkill.rows[0].id]
          );
        } else {
          await query(
            `INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at, created_at)
             VALUES ($1, $2, 'intermediate', 'teach', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [app.user_id, app.skill_name]
          );
        }

        // Ensure user can_teach is true
        await query("UPDATE users SET can_teach = TRUE WHERE id = $1", [app.user_id]);

        // Reconcile teacher skillHashTable and mentorGraph state with newly verified skill
        await reconcileTeacherDsaState(app.user_id);

        // Notify applicant in-app
        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            app.user_id,
            "verification_approved",
            "Verification Approved!",
            `Your application to teach "${app.skill_name}" has been approved! You are now verified to teach this skill.`,
            "/teacher-verification",
          ]
        ).catch(() => {});
      } else if (action === "reject") {
        await query(
          `UPDATE teacher_verification_applications
           SET status = 'rejected',
               reviewer_id = $1,
               rejection_reason = $2,
               reviewer_notes = $3,
               history = $4,
               reviewed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $5`,
          [reviewerId, reason.trim(), notes || "", updatedHistory, appId]
        );

        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            app.user_id,
            "verification_rejected",
            "Verification Decision: Rejected",
            `Your application for "${app.skill_name}" was not approved. Reason: ${reason.trim()}`,
            "/teacher-verification",
          ]
        ).catch(() => {});
      } else if (action === "request_info") {
        await query(
          `UPDATE teacher_verification_applications
           SET status = 'needs_information',
               reviewer_id = $1,
               reviewer_notes = $2,
               history = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [reviewerId, notes.trim(), updatedHistory, appId]
        );

        await query(
          `INSERT INTO notifications (user_id, type, title, message, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            app.user_id,
            "verification_info_needed",
            "Additional Information Requested",
            `A reviewer requested additional details for your "${app.skill_name}" application: ${notes.trim()}`,
            "/teacher-verification",
          ]
        ).catch(() => {});
      } else if (action === "mark_under_review") {
        await query(
          `UPDATE teacher_verification_applications
           SET status = 'under_review',
               reviewer_id = $1,
               history = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [reviewerId, updatedHistory, appId]
        );
      }

      const updatedRes = await query(
        `SELECT tva.*,
                json_build_object(
                  'id', u.id,
                  'name', u.name,
                  'email', u.email,
                  'avatar_url', u.avatar_url
                ) as applicant
         FROM teacher_verification_applications tva
         JOIN users u ON tva.user_id = u.id
         WHERE tva.id = $1`,
        [appId]
      );

      return response.status(200).json({
        message: `Application marked as ${targetStatus}.`,
        application: updatedRes.rows[0],
      });
    } catch (error) {
      console.error("Error executing reviewer action:", error);
      return response.status(500).json({ error: error.message });
    }
  }
);


// ----------------------------------------------------------------------------
// PRESENCE & ACTIVE ONLINE HEARTBEAT ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: POST /api/presence/heartbeat
 * Authenticated heartbeat indicating active user presence.
 */
application.post("/api/presence/heartbeat", authenticateToken, (request, response) => {
  const userId = request.user.userId;
  userPresenceMap.set(userId, Date.now());
  return response.status(200).json({ success: true, timestamp: Date.now() });
});

/**
 * ENDPOINT: GET /api/presence/active
 * Returns user IDs currently active within the past 65 seconds.
 */
application.get("/api/presence/active", (request, response) => {
  const now = Date.now();
  const activeUserIds = [];
  for (const [userId, lastSeen] of userPresenceMap.entries()) {
    if (now - lastSeen < 65000) {
      activeUserIds.push(userId);
    }
  }
  return response.status(200).json({ activeUserIds });
});

/**
 * ENDPOINT: GET /api/presence/:userId
 * Returns online status and last seen timestamp for a specific user.
 */
application.get("/api/presence/:userId", (request, response) => {
  const targetId = request.params.userId;
  const lastSeen = userPresenceMap.get(targetId) || null;
  const isOnline = lastSeen ? (Date.now() - lastSeen < 65000) : false;
  return response.status(200).json({
    userId: targetId,
    online: isOnline,
    lastSeen,
  });
});

// ----------------------------------------------------------------------------
// SESSION CHAT ATTACHMENTS & VOICE NOTES ENDPOINTS
// ----------------------------------------------------------------------------

/**
 * ENDPOINT: POST /api/conversations/:id/attachments
 * Uploads an image, document (PDF/DOCX/XLSX), or audio voice note to a conversation.
 * Strict authorization: Only participants in the conversation may upload attachments.
 */
application.post(
  "/api/conversations/:id/attachments",
  authenticateToken,
  (request, response, next) => {
    attachmentUpload.single("file")(request, response, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return response.status(400).json({
            error: "Attachment exceeds the maximum allowed size (15 MB for documents/images, 10 MB for voice notes).",
          });
        }
        return response.status(400).json({ error: `Upload limit error: ${err.message}` });
      } else if (err) {
        return response.status(400).json({ error: err.message });
      }
      next();
    });
  },
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const convId = parseInt(request.params.id, 10);
      const file = request.file;
      const rawDuration = request.body.durationSeconds !== undefined ? Number(request.body.durationSeconds) : null;
      const durationSeconds = rawDuration !== null && !Number.isNaN(rawDuration) && rawDuration >= 0
        ? Math.min(Math.round(rawDuration), 300)
        : null;

      if (isNaN(convId)) {
        if (file) try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(400).json({ error: "Invalid conversation ID." });
      }

      if (!file) {
        return response.status(400).json({ error: "No attachment file uploaded." });
      }

      if (!file.size || file.size <= 0) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(400).json({ error: "Uploaded file is empty (0 bytes)." });
      }

      // Check participant authorization first before further processing
      const convRes = await query(
        "SELECT id, user1_id, user2_id, is_closed FROM conversations WHERE id = $1",
        [convId]
      );
      if (convRes.rows.length === 0) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(404).json({ error: "Conversation not found." });
      }

      const conv = convRes.rows[0];
      if (conv.user1_id !== userId && conv.user2_id !== userId) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(403).json({ error: "Unauthorized: You are not a participant in this conversation." });
      }

      if (conv.is_closed) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(400).json({ error: "This conversation is closed." });
      }

      // Validate file signature / magic bytes and declared MIME/extension match
      const sigValidation = validateFileSignature(file.path, file.mimetype, file.originalname);
      if (!sigValidation.valid) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(400).json({
          error: `File validation failed: ${sigValidation.reason}`,
        });
      }

      const isVoice =
        sigValidation.detectedCategory === "audio" ||
        (file.mimetype || "").toLowerCase().startsWith("audio/") ||
        Boolean(path.extname(file.originalname || "").match(/\.(webm|ogg|wav|mp3|m4a)$/i));

      // Enforce 10 MB limit specifically on audio voice recordings
      const MAX_VOICE_BYTES = 10 * 1024 * 1024;
      if (isVoice && file.size > MAX_VOICE_BYTES) {
        try { fs.unlinkSync(file.path); } catch (e) {}
        return response.status(400).json({
          error: "Voice note exceeds the 10 MB size limit. Please record a shorter voice note.",
        });
      }

      const messageType = isVoice ? "voice" : "attachment";
      const sanitizedOriginalName = path.basename(file.originalname || (isVoice ? "voice_note.webm" : "attachment"));
      const content = isVoice ? "Audio Voice Note" : sanitizedOriginalName;
      const normalizedMime = isVoice && (file.mimetype === "video/webm" || !file.mimetype)
        ? "audio/webm"
        : (file.mimetype || "application/octet-stream");

      const insertRes = await query(
        `INSERT INTO messages (
           conversation_id, sender_id, content, is_read, created_at,
           message_type, attachment_filename, attachment_original_name,
           attachment_mimetype, attachment_size, duration_seconds
         ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          convId,
          userId,
          content,
          messageType,
          file.filename,
          sanitizedOriginalName,
          normalizedMime,
          file.size,
          durationSeconds,
        ]
      );

      await query("UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1", [convId]);

      const senderRes = await query(`SELECT name, avatar_url FROM users WHERE id = $1`, [userId]);
      const senderName = senderRes.rows[0]?.name || "A community member";
      const senderAvatar = senderRes.rows[0]?.avatar_url || null;
      const recipientId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

      await query(
        `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
         VALUES ($1, 'message', $2, $3, $4, FALSE, CURRENT_TIMESTAMP)`,
        [
          recipientId,
          isVoice ? `New voice note from ${senderName}` : `New attachment from ${senderName}`,
          isVoice ? `Sent a voice note${durationSeconds ? ` (${durationSeconds}s)` : ""}` : `Shared file: ${sanitizedOriginalName}`,
          `/messages?conversationId=${convId}`,
        ]
      ).catch(() => {});

      return response.status(201).json({
        message: {
          ...insertRes.rows[0],
          sender_name: senderName,
          sender_avatar: senderAvatar,
        },
      });
    } catch (error) {
      console.error("Error saving attachment:", error);
      return response.status(500).json({ error: error.message });
    }
  }
);

/**
 * ENDPOINT: GET /api/conversations/:convId/attachments/:messageId
 * Securely stream or download attachment / voice note for conversation participants.
 * Supports HTTP Range requests (206 Partial Content) for reliable HTML5 audio playback and seeking.
 */
application.get(
  "/api/conversations/:convId/attachments/:messageId",
  authenticateToken,
  async (request, response) => {
    try {
      const userId = request.user.userId;
      const convId = parseInt(request.params.convId, 10);
      const messageId = parseInt(request.params.messageId, 10);

      if (isNaN(convId) || isNaN(messageId)) {
        return response.status(400).json({ error: "Invalid conversation or message ID." });
      }

      const convRes = await query("SELECT user1_id, user2_id FROM conversations WHERE id = $1", [convId]);
      if (convRes.rows.length === 0) {
        return response.status(404).json({ error: "Conversation not found." });
      }
      const conv = convRes.rows[0];
      if (conv.user1_id !== userId && conv.user2_id !== userId) {
        return response.status(403).json({ error: "Unauthorized access to attachment." });
      }

      const msgRes = await query("SELECT * FROM messages WHERE id = $1 AND conversation_id = $2", [messageId, convId]);
      if (msgRes.rows.length === 0 || !msgRes.rows[0].attachment_filename) {
        return response.status(404).json({ error: "Attachment not found." });
      }

      const msg = msgRes.rows[0];
      const safeStoredFilename = path.basename(msg.attachment_filename);
      const filePath = path.join(attachmentsDir, safeStoredFilename);
      if (!fs.existsSync(filePath)) {
        return response.status(404).json({ error: "Attachment file missing from storage." });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const contentType = msg.attachment_mimetype || "application/octet-stream";
      const dispositionType = request.query.download === "1" || request.query.download === "true" ? "attachment" : "inline";
      const safeDisplayName = encodeURIComponent(msg.attachment_original_name || safeStoredFilename);

      response.setHeader("Content-Type", contentType);
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Cache-Control", "private, max-age=3600");
      response.setHeader("Accept-Ranges", "bytes");
      response.setHeader("Content-Disposition", `${dispositionType}; filename="${safeDisplayName}"`);

      const range = request.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
          response.setHeader("Content-Range", `bytes */${fileSize}`);
          return response.status(416).end();
        }

        const chunksize = end - start + 1;
        response.status(206);
        response.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        response.setHeader("Content-Length", chunksize);
        const partialStream = fs.createReadStream(filePath, { start, end });
        return partialStream.pipe(response);
      }

      response.setHeader("Content-Length", fileSize);
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(response);
    } catch (error) {
      return response.status(500).json({ error: error.message });
    }
  }
);

// ----------------------------------------------------------------------------
// WEBRTC CALL SIGNALING ENDPOINTS (Accepted Sessions & Active Conversations)
// ----------------------------------------------------------------------------

// Monotonic sequence counter and active call state map per conversation
let globalCallSignalSeq = 1;
const activeCallStateMap = new Map();

function getOrInitActiveCallState(convId) {
  if (!activeCallStateMap.has(convId)) {
    activeCallStateMap.set(convId, null);
  }
  return activeCallStateMap.get(convId);
}

/**
 * ENDPOINT: GET /api/calls/ice-servers
 * Provides configurable STUN/TURN server configuration with network requirements disclosure.
 */
application.get("/api/calls/ice-servers", authenticateToken, (request, response) => {
  const customStun = process.env.STUN_SERVER_URL ? process.env.STUN_SERVER_URL.trim() : null;
  const stunServers = [
    ...(customStun ? [{ urls: customStun }] : []),
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ];

  const iceServers = [...stunServers];
  const turnUrl = process.env.TURN_SERVER_URL ? process.env.TURN_SERVER_URL.trim() : "";
  const turnUsername = process.env.TURN_USERNAME ? process.env.TURN_USERNAME.trim() : "";
  const turnCredential = process.env.TURN_CREDENTIAL ? process.env.TURN_CREDENTIAL.trim() : "";

  if (turnUrl) {
    const urls = turnUrl.includes(",")
      ? turnUrl.split(",").map((u) => u.trim()).filter(Boolean)
      : turnUrl;
    const turnEntry = { urls };
    if (turnUsername) turnEntry.username = turnUsername;
    if (turnCredential) turnEntry.credential = turnCredential;
    iceServers.push(turnEntry);
  }

  return response.status(200).json({
    iceServers,
    hasTurnConfigured: Boolean(turnUrl),
    notice: "Configured STUN servers enabled for NAT traversal. Note: HTTPS is strictly required for WebRTC camera/microphone outside localhost, and symmetric NAT / restrictive institutional firewalls require a self-hosted TURN relay server configured via TURN_SERVER_URL, TURN_USERNAME, and TURN_CREDENTIAL.",
  });
});

/**
 * Helper: Formats call duration in seconds as human-readable minutes and seconds (e.g., "2m 25s").
 */
function formatCallDurationText(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(sec / 60);
  const remSecs = sec % 60;
  return `${mins}m ${remSecs}s`;
}

/**
 * Helper: Resolves a conversation and its session status for call authorization.
 */
async function resolveConversationForCall(convId) {
  const convRes = await query(
    `SELECT c.id, c.user1_id, c.user2_id, c.is_closed,
            c.session_id as direct_session_id,
            sb.status as direct_session_status,
            CASE
              WHEN sb.status IN ('accepted', 'confirmed') THEN c.session_id
              WHEN fallback_sb.id IS NOT NULL THEN fallback_sb.id
              ELSE c.session_id
            END as session_id,
            CASE
              WHEN sb.status IN ('accepted', 'confirmed') THEN sb.status
              WHEN fallback_sb.status IS NOT NULL THEN fallback_sb.status
              ELSE sb.status
            END as session_status,
            CASE
              WHEN sb.status IN ('accepted', 'confirmed') THEN sb.topic
              WHEN fallback_sb.topic IS NOT NULL THEN fallback_sb.topic
              ELSE sb.topic
            END as session_skill
     FROM conversations c
     LEFT JOIN session_bookings sb ON c.session_id = sb.id
     LEFT JOIN LATERAL (
       SELECT s.id, s.status, s.topic
       FROM session_bookings s
       WHERE (s.learner_id = c.user1_id AND s.mentor_id = c.user2_id)
          OR (s.learner_id = c.user2_id AND s.mentor_id = c.user1_id)
       ORDER BY
         CASE
           WHEN s.status IN ('accepted', 'confirmed') THEN 1
           WHEN s.status IN ('pending', 'queued') THEN 2
           WHEN s.status = 'completed' THEN 3
           ELSE 4
         END ASC,
         s.created_at DESC
       LIMIT 1
     ) fallback_sb ON TRUE
     WHERE c.id = $1`,
    [convId]
  );
  return convRes.rows[0] || null;
}

/**
 * ENDPOINT: POST /api/calls/signal
 * Sends a WebRTC signaling message (start, offer, accept, answer, candidate, connected,
 * decline, missed, failed, end, media-state, chat_sync, reaction).
 * Strictly authorizes that the caller is one of the two conversation participants.
 */
application.post("/api/calls/signal", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const { conversationId, type, payload } = request.body;

    if (!conversationId || !type) {
      return response.status(400).json({ error: "conversationId and type are required." });
    }

    const convId = parseInt(conversationId, 10);
    if (isNaN(convId)) {
      return response.status(400).json({ error: "Invalid conversationId." });
    }

    const conv = await resolveConversationForCall(convId);
    if (!conv) {
      return response.status(404).json({ error: "Conversation not found." });
    }

    if (conv.user1_id !== userId && conv.user2_id !== userId) {
      return response.status(403).json({ error: "Unauthorized: You are not in this conversation." });
    }

    if (conv.is_closed) {
      return response.status(400).json({ error: "Cannot place or signal a call in a closed conversation." });
    }

    const peerId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

    // Push signal to in-memory call signaling queue for this conversation
    if (!callSignalingMap.has(convId)) {
      callSignalingMap.set(convId, []);
    }
    const queue = callSignalingMap.get(convId);

    const now = Date.now();
    const seq = globalCallSignalSeq++;
    const signalObj = {
      id: `sig_${now}_${seq}_${Math.random().toString(36).substring(2, 6)}`,
      seq,
      from: userId,
      type,
      payload: payload || {},
      timestamp: now,
    };
    queue.push(signalObj);

    // Keep queue trimmed to last 200 signals so rapid ICE candidates never evict offer/answer
    if (queue.length > 200) {
      queue.splice(0, queue.length - 200);
    }

    // Maintain structured activeCall state per conversation for late-join/switch recovery
    let activeCall = getOrInitActiveCallState(convId);
    const senderRes = await query(`SELECT name FROM users WHERE id = $1`, [userId]).catch(() => ({ rows: [] }));
    const senderName = senderRes.rows[0]?.name || (payload && payload.callerName) || "Participant";

    if (type === "start") {
      const callMode = payload && payload.mode === "audio" ? "audio" : "video";
      const callId = (payload && payload.callId) || `call_${convId}_${now}`;
      activeCall = {
        callId,
        conversationId: convId,
        callerId: userId,
        callerName: senderName,
        calleeId: peerId,
        mode: callMode,
        status: "ringing",
        startedAt: now,
        connectedAt: null,
        updatedAt: now,
        offer: null,
        answer: null,
        candidates: [],
        mediaState: {
          [userId]: {
            micMuted: false,
            cameraOff: callMode === "audio",
            screenSharing: false,
          },
        },
        terminalLogged: false,
      };
      activeCallStateMap.set(convId, activeCall);

      const modeLabel = callMode === "audio" ? "Audio Call" : "Video Call";
      await query(
        `INSERT INTO messages (
           conversation_id, sender_id, content, is_read, created_at,
           message_type, call_action
         ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'call_log', 'started')`,
        [convId, userId, `${modeLabel} started`]
      ).catch(() => {});
      await query(`UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [convId]).catch(() => {});
    } else if (type === "offer") {
      if (!activeCall || ["ended", "declined", "missed", "failed"].includes(activeCall.status)) {
        const callMode = payload && payload.mode === "audio" ? "audio" : "video";
        activeCall = {
          callId: (payload && payload.callId) || `call_${convId}_${now}`,
          conversationId: convId,
          callerId: userId,
          callerName: senderName,
          calleeId: peerId,
          mode: callMode,
          status: "ringing",
          startedAt: now,
          connectedAt: null,
          updatedAt: now,
          offer: payload.sdp || payload,
          answer: null,
          candidates: [],
          mediaState: {},
          terminalLogged: false,
        };
      } else {
        activeCall.offer = payload.sdp || payload;
        activeCall.updatedAt = now;
      }
      activeCallStateMap.set(convId, activeCall);
    } else if (type === "accept") {
      if (activeCall) {
        activeCall.status = "connecting";
        activeCall.updatedAt = now;
      }
    } else if (type === "answer") {
      if (activeCall) {
        activeCall.answer = payload.sdp || payload;
        activeCall.status = "connecting";
        activeCall.updatedAt = now;
      }
    } else if (type === "connected") {
      if (activeCall) {
        activeCall.status = "connected";
        if (!activeCall.connectedAt) activeCall.connectedAt = now;
        activeCall.updatedAt = now;
      }
    } else if (type === "candidate") {
      if (activeCall && payload && payload.candidate) {
        activeCall.candidates.push({
          from: userId,
          candidate: payload.candidate,
          timestamp: now,
          seq,
        });
        if (activeCall.candidates.length > 120) {
          activeCall.candidates.splice(0, activeCall.candidates.length - 120);
        }
        activeCall.updatedAt = now;
      }
    } else if (type === "media-state") {
      if (activeCall) {
        activeCall.mediaState = activeCall.mediaState || {};
        activeCall.mediaState[userId] = {
          ...(activeCall.mediaState[userId] || {}),
          ...(payload || {}),
        };
        activeCall.updatedAt = now;
      }
    } else if (type === "decline" || (type === "end" && payload && payload.reason === "declined")) {
      const modeLabel = (activeCall && activeCall.mode === "audio") || (payload && payload.mode === "audio")
        ? "Audio Call"
        : "Video Call";
      if (!activeCall || !activeCall.terminalLogged) {
        if (activeCall) {
          activeCall.status = "declined";
          activeCall.updatedAt = now;
          activeCall.terminalLogged = true;
        }
        await query(
          `INSERT INTO messages (
             conversation_id, sender_id, content, is_read, created_at,
             message_type, call_action, duration_seconds
           ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'call_log', 'declined', 0)`,
          [convId, userId, `${modeLabel} declined`]
        ).catch(() => {});
        await query(`UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [convId]).catch(() => {});
      }
    } else if (type === "missed" || (type === "end" && payload && payload.reason === "missed")) {
      const modeLabel = (activeCall && activeCall.mode === "audio") || (payload && payload.mode === "audio")
        ? "Audio Call"
        : "Video Call";
      if (!activeCall || !activeCall.terminalLogged) {
        if (activeCall) {
          activeCall.status = "missed";
          activeCall.updatedAt = now;
          activeCall.terminalLogged = true;
        }
        await query(
          `INSERT INTO messages (
             conversation_id, sender_id, content, is_read, created_at,
             message_type, call_action, duration_seconds
           ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'call_log', 'missed', 0)`,
          [convId, userId, `Missed ${modeLabel.toLowerCase()}`]
        ).catch(() => {});
        await query(`UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [convId]).catch(() => {});
      }
    } else if (type === "failed" || (type === "end" && payload && payload.reason === "failed")) {
      const modeLabel = (activeCall && activeCall.mode === "audio") || (payload && payload.mode === "audio")
        ? "Audio Call"
        : "Video Call";
      if (!activeCall || !activeCall.terminalLogged) {
        if (activeCall) {
          activeCall.status = "failed";
          activeCall.updatedAt = now;
          activeCall.terminalLogged = true;
        }
        await query(
          `INSERT INTO messages (
             conversation_id, sender_id, content, is_read, created_at,
             message_type, call_action, duration_seconds
           ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'call_log', 'failed', 0)`,
          [convId, userId, `${modeLabel} failed to connect`]
        ).catch(() => {});
      }
    } else if (type === "end") {
      let duration = payload && payload.duration ? Math.max(0, parseInt(payload.duration, 10) || 0) : 0;
      if (duration === 0 && activeCall && activeCall.connectedAt) {
        duration = Math.max(1, Math.round((now - activeCall.connectedAt) / 1000));
      }
      const formattedDuration = formatCallDurationText(duration);
      if (!activeCall || !activeCall.terminalLogged) {
        if (activeCall) {
          activeCall.status = "ended";
          activeCall.updatedAt = now;
          activeCall.terminalLogged = true;
        }
        await query(
          `INSERT INTO messages (
             conversation_id, sender_id, content, is_read, created_at,
             message_type, call_action, duration_seconds
           ) VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, 'call_log', 'ended', $4)`,
          [convId, userId, `Call ended (${formattedDuration})`, duration]
        ).catch(() => {});
        await query(`UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [convId]).catch(() => {});
      }
    }

    return response.status(200).json({
      success: true,
      signal: signalObj,
      latestSeq: seq,
      activeCall: activeCall || null,
    });
  } catch (error) {
    console.error("Error processing call signal:", error);
    return response.status(500).json({ error: error.message });
  }
});

/**
 * ENDPOINT: GET /api/calls/signal/:conversationId
 * Retrieves pending WebRTC signals directed to the current user for the specified conversation,
 * plus any ringing incoming calls across the user's other conversations.
 */
application.get("/api/calls/signal/:conversationId", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const convId = parseInt(request.params.conversationId, 10);
    if (isNaN(convId)) {
      return response.status(400).json({ error: "Invalid conversation ID." });
    }

    const hasSinceSeq = request.query.sinceSeq !== undefined && request.query.sinceSeq !== "";
    const sinceSeq = hasSinceSeq ? parseInt(request.query.sinceSeq, 10) : null;
    const since = request.query.since ? parseInt(request.query.since, 10) : (Date.now() - 15000);

    const conv = await resolveConversationForCall(convId);
    if (!conv) {
      return response.status(404).json({ error: "Conversation not found." });
    }
    if (conv.user1_id !== userId && conv.user2_id !== userId) {
      return response.status(403).json({ error: "Unauthorized: You are not a participant in this conversation." });
    }

    const queue = callSignalingMap.get(convId) || [];
    const pending = queue.filter((s) => {
      if (s.from === userId) return false;
      if (sinceSeq !== null && !isNaN(sinceSeq) && sinceSeq > 0) {
        return s.seq > sinceSeq;
      }
      return s.timestamp >= since;
    });

    const latestSeq = queue.length > 0 ? queue[queue.length - 1].seq : (sinceSeq || 0);

    // Expire stale ringing calls older than 45 seconds
    const now = Date.now();
    const currentActiveCall = getOrInitActiveCallState(convId);
    if (currentActiveCall && currentActiveCall.status === "ringing" && now - currentActiveCall.startedAt > 45000) {
      currentActiveCall.status = "missed";
      currentActiveCall.updatedAt = now;
    }

    // Also check if the user has any ringing incoming call in any of their conversations
    const incomingCalls = [];
    for (const [cId, callState] of activeCallStateMap.entries()) {
      if (
        callState &&
        callState.calleeId === userId &&
        callState.status === "ringing" &&
        now - callState.startedAt <= 45000
      ) {
        incomingCalls.push({
          conversationId: cId,
          callId: callState.callId,
          callerId: callState.callerId,
          callerName: callState.callerName,
          mode: callState.mode,
          startedAt: callState.startedAt,
          hasOffer: Boolean(callState.offer),
        });
      }
    }

    return response.status(200).json({
      signals: pending,
      latestSeq,
      serverTime: now,
      activeCall: currentActiveCall || null,
      incomingCalls,
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------------------------------
// RETIRED QUIZ ENDPOINTS (Preserves historical quiz_attempts in PostgreSQL)
// ----------------------------------------------------------------------------
application.all(["/api/quizzes", "/api/quizzes/*", "/api/quiz", "/api/quiz/*"], (request, response) => {
  return response.status(410).json({
    error: "The quiz verification feature has been retired. Teacher verification is conducted exclusively through document verification (Resume & Certificate) under /api/teacher-verification.",
    status: 410,
    retired: true,
  });
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
              u.active_mode, u.can_teach, u.can_learn, COALESCE(u.is_reviewer, FALSE) as is_reviewer,
              COALESCE(u.is_demo, FALSE) as is_demo,
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
    let passwordMatches = false;
    if (dbUser.password_hash) {
      passwordMatches = await bcrypt.compare(password, dbUser.password_hash);
    }

    if (!passwordMatches) {
      return response.status(401).json({
        error: "Invalid email or password. Please check your credentials and try again.",
      });
    }

    // Ensure existing account has both learner and teacher capabilities enabled
    if (dbUser.can_teach !== true || dbUser.can_learn !== true) {
      await query(
        `UPDATE users SET can_teach = TRUE, can_learn = TRUE WHERE id = $1`,
        [dbUser.id]
      ).catch(() => {});
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
      active_mode: dbUser.active_mode === "teacher" ? "teacher" : "learner",
      can_teach: true,
      can_learn: true,
      is_reviewer: Boolean(dbUser.is_reviewer),
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
 * ENDPOINT: GET /api/auth/me
 *
 * Validates the caller's JWT token and returns their current profile from PostgreSQL.
 * Used on app startup and session restoration to prevent stale or expired session tokens.
 */
application.get("/api/auth/me", authenticateToken, async (request, response) => {
  try {
    const userId = request.user.userId;
    const res = await query(
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
      [userId]
    );

    if (res.rows.length === 0) {
      return response.status(404).json({ error: "User account not found." });
    }

    const u = res.rows[0];
    if (u.can_teach !== true || u.can_learn !== true) {
      await query(
        `UPDATE users SET can_teach = TRUE, can_learn = TRUE WHERE id = $1`,
        [u.id]
      ).catch(() => {});
    }
    const safeUser = {
      id: u.id,
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
      active_mode: u.active_mode === "teacher" ? "teacher" : "learner",
      can_teach: true,
      can_learn: true,
      is_reviewer: Boolean(u.is_reviewer),
      skills: u.skills || [],
    };

    return response.status(200).json({ user: safeUser });
  } catch (err) {
    console.error("Error in GET /api/auth/me:", err.message);
    return response.status(500).json({ error: "Internal server error." });
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
};
