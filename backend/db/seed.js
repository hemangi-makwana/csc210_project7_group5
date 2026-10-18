/**
 * ============================================================================
 * DATABASE SEED SCRIPT (LOCAL POSTGRESQL)
 * ============================================================================
 *
 * Populates local PostgreSQL with the 20 seed mentors, their teach and learn
 * skills, mentor listings, initial session bookings, and notifications.
 *
 * Non-destructive: checks if users already exist before inserting, preventing
 * duplicates and data loss.
 *
 * Usage:
 *   node db/seed.js
 * ============================================================================
 */

const { pool, checkConnection } = require("./index");

const seedUsersData = [
  {
    userId: "user_1",
    name: "Alice Chen",
    role: "professional",
    bio: "Senior full-stack developer specialising in Python back-ends and responsive web design.",
    reputationScore: 4.9,
    headline: "Full-Stack Python & Web Development Mentor",
    hourlyRate: 25.0,
    skills: [
      { skillName: "Python", level: "expert", type: "teach" },
      { skillName: "Web Design", level: "intermediate", type: "teach" },
      { skillName: "Rust", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "user_2",
    name: "Bob Smith",
    role: "student",
    bio: "CS undergraduate who loves algorithms and plays acoustic guitar on weekends.",
    reputationScore: 4.5,
    headline: "Algorithms & Acoustic Guitar Tutor",
    hourlyRate: 15.0,
    skills: [
      { skillName: "Python", level: "intermediate", type: "teach" },
      { skillName: "Guitar", level: "beginner", type: "teach" },
      { skillName: "Machine Learning", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "user_3",
    name: "Clara Garcia",
    role: "volunteer",
    bio: "Community coding bootcamp instructor with a passion for public speaking and inclusion in tech.",
    reputationScore: 4.7,
    headline: "Inclusive Coding Bootcamp & Public Speaking Coach",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Python", level: "beginner", type: "teach" },
      { skillName: "Public Speaking", level: "expert", type: "teach" },
    ],
  },
  {
    userId: "user_4",
    name: "David Kim",
    role: "professional",
    bio: "Professional musician and TED-talk coach helping others find their stage voice.",
    reputationScore: 4.8,
    headline: "Master Guitarist & Stage Presence Coach",
    hourlyRate: 30.0,
    skills: [
      { skillName: "Guitar", level: "expert", type: "teach" },
      { skillName: "Public Speaking", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_5",
    name: "Elena Rostova",
    role: "professional",
    bio: "Lead UX engineer with 10+ years building production Python services and polished web interfaces.",
    reputationScore: 5.0,
    headline: "Lead UX Engineer & Python Architect",
    hourlyRate: 35.0,
    skills: [
      { skillName: "Python", level: "expert", type: "teach" },
      { skillName: "Web Design", level: "expert", type: "teach" },
    ],
  },
  {
    userId: "user_6",
    name: "Farhan Ali",
    role: "student",
    bio: "Music performance student who mentors beginners in guitar technique and stage confidence.",
    reputationScore: 4.3,
    headline: "Guitar Basics & Acoustic Performance Tutor",
    hourlyRate: 12.0,
    skills: [
      { skillName: "Guitar", level: "intermediate", type: "teach" },
      { skillName: "Public Speaking", level: "beginner", type: "teach" },
    ],
  },
  {
    userId: "user_7",
    name: "Grace Hopper",
    role: "volunteer",
    bio: "Retired software architect now volunteering to teach accessible web design and presentation skills.",
    reputationScore: 4.9,
    headline: "Community Tech Mentor & Accessibility Specialist",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Web Design", level: "intermediate", type: "teach" },
      { skillName: "Public Speaking", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_8",
    name: "Hiro Tanaka",
    role: "professional",
    bio: "Software engineer at a fintech company who loves teaching computer science fundamentals.",
    reputationScore: 4.7,
    headline: "FinTech Systems & Data Structures Engineer",
    hourlyRate: 28.0,
    skills: [
      { skillName: "Data Structures", level: "expert", type: "teach" },
      { skillName: "Python", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_9",
    name: "Isabelle Dupont",
    role: "volunteer",
    bio: "Bilingual community liaison with a background in corporate communications and language tutoring.",
    reputationScore: 4.6,
    headline: "Conversational Spanish & PR Volunteer",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Spanish", level: "expert", type: "teach" },
      { skillName: "Public Relations", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_10",
    name: "James O'Brien",
    role: "student",
    bio: "Hospitality student who jams on guitar and loves teaching basic home cooking techniques.",
    reputationScore: 3.9,
    headline: "Home Cooking & Acoustic Jamming",
    hourlyRate: 10.0,
    skills: [
      { skillName: "Guitar", level: "intermediate", type: "teach" },
      { skillName: "Cooking", level: "beginner", type: "teach" },
    ],
  },
  {
    userId: "user_11",
    name: "Kavya Reddy",
    role: "professional",
    bio: "Senior product designer at a SaaS startup with expertise in Figma, design systems, and CSS.",
    reputationScore: 4.9,
    headline: "Product Design, Figma & Design Systems",
    hourlyRate: 32.0,
    skills: [
      { skillName: "UI Design", level: "expert", type: "teach" },
      { skillName: "Web Design", level: "expert", type: "teach" },
    ],
  },
  {
    userId: "user_12",
    name: "Liam Foster",
    role: "student",
    bio: "Business analytics undergraduate learning Python for data work and sharing spreadsheet tips.",
    reputationScore: 3.8,
    headline: "Excel Modeling & Introductory Analytics",
    hourlyRate: 12.0,
    skills: [
      { skillName: "Python", level: "beginner", type: "teach" },
      { skillName: "Excel", level: "beginner", type: "teach" },
    ],
  },
  {
    userId: "user_13",
    name: "Mei Zhang",
    role: "volunteer",
    bio: "Freelance photographer and community workshop host teaching portrait and street photography.",
    reputationScore: 4.5,
    headline: "Portrait & Street Photography Mentor",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Photography", level: "expert", type: "teach" },
      { skillName: "Public Speaking", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_14",
    name: "Nadia Okonkwo",
    role: "professional",
    bio: "Principal engineer and former PR manager — rare blend of deep technical and communication expertise.",
    reputationScore: 5.0,
    headline: "Principal Engineer & Executive Communication",
    hourlyRate: 40.0,
    skills: [
      { skillName: "Data Structures", level: "expert", type: "teach" },
      { skillName: "Public Relations", level: "expert", type: "teach" },
    ],
  },
  {
    userId: "user_15",
    name: "Oscar Brennan",
    role: "student",
    bio: "Culinary arts student who picked up conversational Spanish while studying abroad in Madrid.",
    reputationScore: 4.1,
    headline: "Conversational Spanish & Culinary Basics",
    hourlyRate: 14.0,
    skills: [
      { skillName: "Spanish", level: "intermediate", type: "teach" },
      { skillName: "Cooking", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_16",
    name: "Priya Sharma",
    role: "professional",
    bio: "Financial analyst turned UX designer, expert in Excel modelling and clean interface design.",
    reputationScore: 4.8,
    headline: "Financial Models & Modern UI Design",
    hourlyRate: 30.0,
    skills: [
      { skillName: "Excel", level: "expert", type: "teach" },
      { skillName: "UI Design", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_17",
    name: "Rahul Nair",
    role: "volunteer",
    bio: "Open-source contributor and CS tutor specialising in algorithms, sorting, and graph theory.",
    reputationScore: 4.6,
    headline: "Algorithms, Sorting & Graph Theory Tutor",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Python", level: "expert", type: "teach" },
      { skillName: "Data Structures", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_18",
    name: "Sofia Martínez",
    role: "professional",
    bio: "Digital media creator blending photography portfolio work with clean, minimal web design.",
    reputationScore: 4.3,
    headline: "Visual Media & Responsive Web Design",
    hourlyRate: 22.0,
    skills: [
      { skillName: "Photography", level: "intermediate", type: "teach" },
      { skillName: "Web Design", level: "intermediate", type: "teach" },
    ],
  },
  {
    userId: "user_19",
    name: "Thomas Müller",
    role: "volunteer",
    bio: "Classical guitarist and TEDx speaker who mentors others in performance skills and stage presence.",
    reputationScore: 4.7,
    headline: "Classical Guitar & Public Presentation",
    hourlyRate: 0.0,
    skills: [
      { skillName: "Guitar", level: "expert", type: "teach" },
      { skillName: "Public Speaking", level: "expert", type: "teach" },
    ],
  },
  {
    userId: "user_20",
    name: "Uma Krishnan",
    role: "student",
    bio: "Nutrition science student who teaches healthy meal prep and uses Excel for diet tracking.",
    reputationScore: 4.2,
    headline: "Meal Prep Fundamentals & Nutrition Spreadsheets",
    hourlyRate: 15.0,
    skills: [
      { skillName: "Cooking", level: "expert", type: "teach" },
      { skillName: "Excel", level: "intermediate", type: "teach" },
    ],
  },
];

async function seedPostgres(closePool = false) {
  const conn = await checkConnection();
  if (!conn.reachable) {
    console.warn(`[Seed] Cannot seed: local PostgreSQL unreachable (${conn.reason}).`);
    return false;
  }

  try {
    // Check if users table already has data
    const existingUsers = await pool.query("SELECT COUNT(*) FROM users");
    const userCount = parseInt(existingUsers.rows[0].count, 10);

    if (userCount > 0) {
      console.log(`[Seed] Database already contains ${userCount} users. Preserving existing data.`);
      return true;
    }

    console.log("[Seed] Populating initial mentors, skills, and listings into PostgreSQL...");

    for (const u of seedUsersData) {
      const email = `${u.userId}@skillswap.local`;
      await pool.query(
        `INSERT INTO users (id, name, email, role, bio, reputation_score)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [u.userId, u.name, email, u.role, u.bio, u.reputationScore]
      );

      await pool.query(
        `INSERT INTO mentor_listings (user_id, headline, hourly_rate, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id) DO NOTHING`,
        [u.userId, u.headline, u.hourlyRate]
      );

      for (const s of u.skills) {
        await pool.query(
          `INSERT INTO skills (user_id, skill_name, level, type)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT ON CONSTRAINT uq_user_skill_type DO NOTHING`,
          [u.userId, s.skillName, s.level, s.type]
        );
      }
    }

    // Insert sample session booking between user_2 (Bob - student) and user_1 (Alice - mentor)
    await pool.query(
      `INSERT INTO session_bookings (id, mentor_id, learner_id, scheduled_at, status, topic, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        "booking_seed_1",
        "user_1",
        "user_2",
        new Date(Date.now() + 86400000 * 2).toISOString(),
        "confirmed",
        "Python Web APIs",
        "Exploring Express routes and Python backend design.",
      ]
    );

    // Insert completed session with a review
    await pool.query(
      `INSERT INTO session_bookings (id, mentor_id, learner_id, scheduled_at, status, topic, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [
        "booking_seed_2",
        "user_5",
        "user_2",
        new Date(Date.now() - 86400000 * 3).toISOString(),
        "completed",
        "UI Design Systems",
        "Introductory design token systems and clean layout patterns.",
      ]
    );

    await pool.query(
      `INSERT INTO reviews (id, session_id, reviewer_id, mentor_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [
        "rev_seed_1",
        "booking_seed_2",
        "user_2",
        "user_5",
        5,
        "Elena gave crystal-clear feedback on our component design. Highly recommended!",
      ]
    );

    console.log(`[Seed] Successfully seeded ${seedUsersData.length} mentors into local PostgreSQL!`);
    return true;
  } catch (err) {
    console.error("[Seed Error]", err.message);
    return false;
  } finally {
    if (closePool && pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seedPostgres(true)
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = { seedPostgres, seedUsersData };
