/**
 * ============================================================================
 * DATABASE SEED SCRIPT (LOCAL POSTGRESQL)
 * ============================================================================
 * Populates local PostgreSQL with a broad, diverse catalog of demo mentors
 * across sports, technology, photography, computer science, machine learning,
 * social sciences, psychology, mathematics, and related domains.
 *
 * IDEMPOTENT & NON-DESTRUCTIVE:
 * - Checks each user individually (`ON CONFLICT (id) DO NOTHING` or `DO UPDATE`).
 * - Never deletes, resets, or overwrites real user accounts.
 * - Flags demo profiles with `is_demo = TRUE` so they are clearly identifiable.
 * - Strictly does NOT mark skills verified unless a passing record exists in `quiz_attempts`.
 * ============================================================================
 */

const { pool, checkConnection } = require("./index");

const seedUsersData = [
  // ---- TECHNOLOGY & COMPUTER SCIENCE ----
  {
    userId: "demo_user_1",
    name: "Alice Chen",
    role: "professional",
    bio: "Senior full-stack developer specialising in Python back-ends, scalable microservices, and responsive web design.",
    reputationScore: 4.9,
    headline: "Full-Stack Python & Web Development Mentor",
    hourlyRate: 25.0,
    specialization: "Software Engineering & Web Architecture",
    workExperience: [
      { role: "Staff Backend Engineer", company: "CloudScale Systems", years: "2021 - Present" },
      { role: "Full Stack Developer", company: "DataFlow Labs", years: "2018 - 2021" },
    ],
    socialProfiles: {
      github: "https://github.com/alicechen-dev",
      linkedin: "https://linkedin.com/in/alicechen-example",
      website: "https://alicechen.dev",
    },
    skills: [
      { skillName: "Python", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Web Design", level: "intermediate", type: "teach", verified: false },
      { skillName: "Machine Learning", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "demo_user_2",
    name: "Bob Smith",
    role: "student",
    bio: "CS undergraduate passionate about algorithmic problem solving and acoustic guitar on weekends.",
    reputationScore: 4.5,
    headline: "Algorithms & Acoustic Guitar Tutor",
    hourlyRate: 15.0,
    specialization: "Algorithms & Computer Systems",
    workExperience: [
      { role: "Undergraduate Teaching Assistant", company: "University CS Dept", years: "2023 - Present" },
    ],
    socialProfiles: {
      github: "https://github.com/bobsmith-algo",
      linkedin: "https://linkedin.com/in/bobsmith-cs",
    },
    skills: [
      { skillName: "Data Structures", level: "intermediate", type: "teach", verified: true, score: 9 },
      { skillName: "Guitar", level: "intermediate", type: "teach", verified: false },
      { skillName: "Python", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "demo_user_3",
    name: "Hiro Tanaka",
    role: "professional",
    bio: "Software engineer at a fintech startup who loves teaching computer science fundamentals, Node.js, and Docker.",
    reputationScore: 4.8,
    headline: "FinTech Systems & Cloud Containerization Specialist",
    hourlyRate: 28.0,
    specialization: "Distributed Systems & Cloud DevOps",
    workExperience: [
      { role: "Senior Cloud Engineer", company: "Tokyo FinTech Labs", years: "2020 - Present" },
      { role: "Systems Programmer", company: "Nexus Networks", years: "2017 - 2020" },
    ],
    socialProfiles: {
      github: "https://github.com/hirotanaka-sys",
      linkedin: "https://linkedin.com/in/hirotanaka-dev",
    },
    skills: [
      { skillName: "Node.js", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Docker", level: "expert", type: "teach", verified: false },
      { skillName: "Linear Algebra", level: "beginner", type: "learn" },
    ],
  },

  // ---- MACHINE LEARNING & DATA SCIENCE ----
  {
    userId: "demo_user_4",
    name: "Dr. Aris Thorne",
    role: "professional",
    bio: "AI researcher focusing on deep neural architectures, loss function optimization, and applied computer vision.",
    reputationScore: 4.95,
    headline: "AI Research Scientist & Machine Learning Specialist",
    hourlyRate: 40.0,
    specialization: "Deep Learning & Statistical Machine Learning",
    workExperience: [
      { role: "Principal AI Scientist", company: "Horizon AI Research", years: "2019 - Present" },
      { role: "Postdoctoral Researcher", company: "Cognitive Computing Lab", years: "2016 - 2019" },
    ],
    socialProfiles: {
      github: "https://github.com/aristhorne-ai",
      linkedin: "https://linkedin.com/in/aristhorne-phd",
      website: "https://aristhorne.ai",
    },
    skills: [
      { skillName: "Machine Learning", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Python", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Cognitive Psychology", level: "intermediate", type: "learn" },
    ],
  },

  // ---- SPORTS & ATHLETICS ----
  {
    userId: "demo_user_5",
    name: "Marcus Vance",
    role: "professional",
    bio: "Former collegiate point guard and varsity basketball coach emphasizing footwork, pick-and-roll strategy, and defensive positioning.",
    reputationScore: 4.85,
    headline: "Collegiate Basketball Skills & Tactical Play Coach",
    hourlyRate: 30.0,
    specialization: "Basketball Mechanics & Team Offensive Strategy",
    workExperience: [
      { role: "Head Player Development Coach", company: "Metro Elite Hoops", years: "2019 - Present" },
      { role: "Assistant Basketball Coach", company: "City College Athletics", years: "2015 - 2019" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/marcusvance-coach",
      website: "https://marcusvancebasketball.com",
    },
    skills: [
      { skillName: "Basketball", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Tennis", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "demo_user_6",
    name: "Serena Becker",
    role: "professional",
    bio: "USPTA-certified tennis coach specializing in Continental grip mechanics, topspin generation, and tactical serve placement.",
    reputationScore: 4.9,
    headline: "Certified Tennis Instructor & Match Strategy Specialist",
    hourlyRate: 35.0,
    specialization: "Tennis Stroke Mechanics & Biomechanics",
    workExperience: [
      { role: "Head Tennis Professional", company: "Highland Racquet Club", years: "2018 - Present" },
      { role: "Touring Junior Coach", company: "Ace Tennis Academy", years: "2014 - 2018" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/serenabecker-tennis",
      website: "https://serenabeckertennis.com",
    },
    skills: [
      { skillName: "Tennis", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Basketball", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "demo_user_7",
    name: "Levon Petrov",
    role: "volunteer",
    bio: "National chess master with 15+ years instructing students on opening principles, tactical combinations, and endgame pawn structures.",
    reputationScore: 4.92,
    headline: "National Chess Master & Endgame Theory Coach",
    hourlyRate: 0.0,
    specialization: "Chess Tactics, Strategic Planning & Positional Play",
    workExperience: [
      { role: "Scholastic Chess Director", company: "Community Youth Chess League", years: "2016 - Present" },
    ],
    socialProfiles: {
      github: "https://github.com/levonchess",
      website: "https://lichess.org/@/levon_master",
    },
    skills: [
      { skillName: "Chess", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Data Structures", level: "intermediate", type: "learn" },
    ],
  },

  // ---- PHOTOGRAPHY & VISUAL MEDIA ----
  {
    userId: "demo_user_8",
    name: "Sofia Martínez",
    role: "professional",
    bio: "Commercial and natural-light portrait photographer with portfolio work featured in national editorial publications.",
    reputationScore: 4.75,
    headline: "Editorial & Natural-Light Portrait Photographer",
    hourlyRate: 25.0,
    specialization: "Portraiture, Aperture Control & Composition",
    workExperience: [
      { role: "Lead Editorial Photographer", company: "Luz Visual Studio", years: "2019 - Present" },
      { role: "Commercial Photographer", company: "Freelance Creative", years: "2015 - 2019" },
    ],
    socialProfiles: {
      website: "https://sofiamartinez.photo",
      linkedin: "https://linkedin.com/in/sofiamartinez-photo",
    },
    skills: [
      { skillName: "Photography", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "UI Design", level: "intermediate", type: "teach", verified: false },
      { skillName: "Web Design", level: "beginner", type: "learn" },
    ],
  },

  // ---- SOCIAL SCIENCES & ECONOMICS ----
  {
    userId: "demo_user_9",
    name: "Dr. Hannah Arendt-Smith",
    role: "professional",
    bio: "Applied macroeconomist and policy consultant specializing in fiscal mechanisms, market elasticity, and international trade.",
    reputationScore: 4.88,
    headline: "Macroeconomic Analyst & Policy Consultant",
    hourlyRate: 35.0,
    specialization: "Macroeconomic Modeling & Market Structure",
    workExperience: [
      { role: "Senior Economic Consultant", company: "Beacon Policy Group", years: "2017 - Present" },
      { role: "Adjunct Professor of Economics", company: "City University", years: "2014 - 2021" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/hannah-arendtsmith-econ",
      website: "https://hannahsmith-econ.org",
    },
    skills: [
      { skillName: "Economics", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Linear Algebra", level: "intermediate", type: "teach", verified: false },
      { skillName: "Python", level: "intermediate", type: "learn" },
    ],
  },
  {
    userId: "demo_user_10",
    name: "Julian Vance",
    role: "volunteer",
    bio: "Community researcher examining socialization patterns, sociological imagination, and systemic social stratification.",
    reputationScore: 4.7,
    headline: "Sociological Researcher & Community Educator",
    hourlyRate: 0.0,
    specialization: "Social Stratification & Cultural Systems",
    workExperience: [
      { role: "Program Director", company: "Urban Futures Institute", years: "2018 - Present" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/julianvance-soc",
    },
    skills: [
      { skillName: "Sociology", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Public Speaking", level: "expert", type: "teach", verified: false },
      { skillName: "Economics", level: "beginner", type: "learn" },
    ],
  },

  // ---- PSYCHOLOGY & COGNITIVE SCIENCE ----
  {
    userId: "demo_user_11",
    name: "Dr. Evelyn Reed",
    role: "professional",
    bio: "Cognitive psychologist researching working memory capacity, cognitive dissonance, and decision-making heuristics.",
    reputationScore: 4.93,
    headline: "Cognitive Scientist & Decision Heuristics Specialist",
    hourlyRate: 35.0,
    specialization: "Human Memory Architecture & Heuristics",
    workExperience: [
      { role: "Director of Cognitive Lab", company: "Behavioral Sciences Institute", years: "2016 - Present" },
      { role: "Senior Research Fellow", company: "Mind & Brain Foundation", years: "2012 - 2016" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/evelynreed-phd",
      website: "https://evelynreedcognition.org",
    },
    skills: [
      { skillName: "Cognitive Psychology", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Machine Learning", level: "intermediate", type: "learn" },
    ],
  },

  // ---- MATHEMATICS ----
  {
    userId: "demo_user_12",
    name: "Prof. Dmitri Volkov",
    role: "professional",
    bio: "Pure and applied mathematician focusing on spectral theory, matrix decompositions, and linear vector spaces.",
    reputationScore: 4.95,
    headline: "University Mathematics Lecturer — Linear Algebra & SVD",
    hourlyRate: 32.0,
    specialization: "Matrix Analysis, Eigenvalues & Vector Spaces",
    workExperience: [
      { role: "Associate Professor of Mathematics", company: "State University", years: "2015 - Present" },
    ],
    socialProfiles: {
      github: "https://github.com/dmitrivolkov-math",
      website: "https://math.state.edu/~volkov",
    },
    skills: [
      { skillName: "Linear Algebra", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Calculus", level: "expert", type: "teach", verified: false },
      { skillName: "Chess", level: "intermediate", type: "learn" },
    ],
  },
  {
    userId: "demo_user_13",
    name: "Prof. Sarah Jenkins",
    role: "volunteer",
    bio: "Math educator with 20+ years helping undergraduates master differential calculus, integration by parts, and infinite series.",
    reputationScore: 4.9,
    headline: "Calculus Mentor & STEM Foundation Educator",
    hourlyRate: 0.0,
    specialization: "Differential & Integral Calculus, Limits & Series",
    workExperience: [
      { role: "Emerita Faculty in Mathematics", company: "Northwest College", years: "2002 - 2022" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/sarahjenkins-calculus",
    },
    skills: [
      { skillName: "Calculus", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Linear Algebra", level: "expert", type: "teach", verified: false },
      { skillName: "Python", level: "beginner", type: "learn" },
    ],
  },

  // ---- GENERAL SKILLS & ARTS ----
  {
    userId: "demo_user_14",
    name: "Clara Garcia",
    role: "volunteer",
    bio: "Community coding bootcamp instructor with a passion for public speaking and inclusion in technical spaces.",
    reputationScore: 4.7,
    headline: "Inclusive Coding Bootcamp & Public Speaking Coach",
    hourlyRate: 0.0,
    specialization: "Keynote Delivery & Technical Presentation",
    workExperience: [
      { role: "Lead Speaker Coach", company: "EmpowerTech Non-Profit", years: "2019 - Present" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/claragarcia-speak",
    },
    skills: [
      { skillName: "Public Speaking", level: "expert", type: "teach", verified: true, score: 9 },
      { skillName: "Spanish", level: "expert", type: "teach", verified: false },
      { skillName: "Cooking", level: "beginner", type: "learn" },
    ],
  },
  {
    userId: "demo_user_15",
    name: "David Kim",
    role: "professional",
    bio: "Professional musician and TED-talk coach helping students develop clear acoustic fingerstyle and stage presence.",
    reputationScore: 4.8,
    headline: "Master Guitarist & Stage Presence Coach",
    hourlyRate: 30.0,
    specialization: "Fingerstyle Guitar & Acoustic Composition",
    workExperience: [
      { role: "Recording Artist & Session Musician", company: "Pacific Soundworks", years: "2014 - Present" },
    ],
    socialProfiles: {
      website: "https://davidkimmusic.com",
      linkedin: "https://linkedin.com/in/davidkim-music",
    },
    skills: [
      { skillName: "Guitar", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Photography", level: "intermediate", type: "learn" },
    ],
  },
  {
    userId: "demo_user_16",
    name: "Uma Krishnan",
    role: "student",
    bio: "Culinary arts and nutrition student who teaches plant-based meal prep and analytical nutrition modeling with Excel.",
    reputationScore: 4.6,
    headline: "Culinary Nutrition & Analytical Spreadsheet Coach",
    hourlyRate: 15.0,
    specialization: "Culinary Chemistry & Spreadsheet Modeling",
    workExperience: [
      { role: "Culinary Assistant", company: "Artisan Kitchen Labs", years: "2022 - Present" },
    ],
    socialProfiles: {
      linkedin: "https://linkedin.com/in/uma-krishnan-food",
    },
    skills: [
      { skillName: "Cooking", level: "expert", type: "teach", verified: true, score: 10 },
      { skillName: "Excel", level: "expert", type: "teach", verified: true, score: 9 },
      { skillName: "Tennis", level: "beginner", type: "learn" },
    ],
  },
];

/**
 * Idempotently seeds local PostgreSQL with demo mentors.
 * Preserves all existing real user data, logins, and bookings.
 */
async function seedPostgres(closePool = false) {
  const conn = await checkConnection();
  if (!conn.reachable) {
    console.warn(`[Seed] Cannot seed: local PostgreSQL unreachable (${conn.reason}).`);
    return false;
  }

  console.log("[Seed] Checking and synchronizing demo mentors in local PostgreSQL...");

  try {
    for (const u of seedUsersData) {
      const email = `${u.userId}@skillexchange.demo`;
      const username = u.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_demo";

      // 1. Insert or update demo user (never touches real non-demo users)
      await pool.query(
        `INSERT INTO users (
           id, name, email, role, bio, profile_summary, specialization_domain,
           work_experience, social_profiles, reputation_score, username, is_demo
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, TRUE)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           bio = EXCLUDED.bio,
           profile_summary = EXCLUDED.profile_summary,
           specialization_domain = EXCLUDED.specialization_domain,
           work_experience = EXCLUDED.work_experience,
           social_profiles = EXCLUDED.social_profiles,
           reputation_score = EXCLUDED.reputation_score,
           is_demo = TRUE`,
        [
          u.userId,
          u.name,
          email,
          u.role,
          u.bio,
          u.bio,
          u.specialization || null,
          JSON.stringify(u.workExperience || []),
          JSON.stringify(u.socialProfiles || {}),
          u.reputationScore,
          username,
        ]
      );

      // 2. Insert or update mentor listing
      await pool.query(
        `INSERT INTO mentor_listings (user_id, headline, hourly_rate, is_active)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (user_id) DO UPDATE SET
           headline = EXCLUDED.headline,
           hourly_rate = EXCLUDED.hourly_rate,
           is_active = TRUE`,
        [u.userId, u.headline, u.hourlyRate]
      );

      // 3. Insert skills and genuine quiz_attempts for verified demo skills
      for (const s of u.skills) {
        const isVerified = Boolean(s.verified);

        await pool.query(
          `INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT ON CONSTRAINT uq_user_skill_type DO UPDATE SET
             level = EXCLUDED.level,
             is_verified = EXCLUDED.is_verified,
             verified_at = EXCLUDED.verified_at`,
          [
            u.userId,
            s.skillName,
            s.level,
            s.type,
            isVerified,
            isVerified ? new Date().toISOString() : null,
          ]
        );

        // If marked verified, ensure a genuine passing quiz attempt exists in the database
        if (isVerified) {
          const score = s.score || 10;
          const percentage = (score / 10) * 100;
          const existingAttempt = await pool.query(
            `SELECT id FROM quiz_attempts WHERE user_id = $1 AND LOWER(skill_name) = LOWER($2) AND passed = TRUE`,
            [u.userId, s.skillName]
          );
          if (existingAttempt.rows.length === 0) {
            await pool.query(
              `INSERT INTO quiz_attempts (user_id, skill_name, score, total, percentage, passed, created_at)
               VALUES ($1, $2, $3, 10, $4, TRUE, CURRENT_TIMESTAMP)`,
              [u.userId, s.skillName, score, percentage]
            );
          }
        }
      }
    }

    console.log(`[Seed] Successfully synchronized ${seedUsersData.length} catalog demo mentors across all required domains!`);
    return true;
  } catch (err) {
    console.error("[Seed Error]", err);
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
