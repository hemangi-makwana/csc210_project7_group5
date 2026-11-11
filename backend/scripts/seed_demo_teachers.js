/**
 * Idempotent Demo Teacher Seeding Script
 * 
 * Ensures every canonical course in skill_catalog has 3-4 clearly labeled
 * fictional demo teachers with different persisted sample ratings and sample feedback.
 * 
 * Safety:
 * - Only operates on accounts with is_demo = TRUE or demo_ prefixed IDs.
 * - Never modifies or overwrites real user accounts.
 * - Fully idempotent: checks existing verified teachers before adding.
 */

const { pool } = require('../db/index');
const bcrypt = require('bcryptjs');

const SAMPLE_TEACHER_PROFILES = [
  // Programming & Software
  { name: 'Dr. Alan Vance', role: 'professional', bio: 'Computer Science faculty & systems architect.', baseRating: 4.90 },
  { name: 'Elena Rostova', role: 'professional', bio: 'Full-stack software engineer & open source contributor.', baseRating: 4.75 },
  { name: 'Karthik Raman', role: 'student', bio: 'Senior CS student, competitive programming finalist.', baseRating: 4.50 },
  { name: 'Grace Hopper-Smith', role: 'professional', bio: 'Compiler engineer and programming mentor.', baseRating: 4.85 },

  // Data Science & AI
  { name: 'Dr. Miriam Chen', role: 'professional', bio: 'Deep learning research scientist with focus on NLP.', baseRating: 4.95 },
  { name: 'Lucas Dubois', role: 'professional', bio: 'Data engineer specializing in distributed data pipelines.', baseRating: 4.65 },
  { name: 'Aisha Al-Mansoor', role: 'student', bio: 'Graduate student researcher in neural representations.', baseRating: 4.40 },
  { name: 'Dr. Gregory House-ML', role: 'professional', bio: 'Applied machine learning and diagnostic modeling mentor.', baseRating: 4.80 },

  // Cloud & DevOps
  { name: 'Mateo Rossi', role: 'professional', bio: 'DevOps & Site Reliability Engineer at cloud provider.', baseRating: 4.85 },
  { name: 'Priya Sharma', role: 'professional', bio: 'Cloud infrastructure architect & Kubernetes administrator.', baseRating: 4.70 },
  { name: 'Jonas Lindqvist', role: 'student', bio: 'Systems administration TA and Linux kernel enthusiast.', baseRating: 4.55 },
  { name: 'Tariq Benali', role: 'professional', bio: 'Infrastructure automation and CI/CD specialist.', baseRating: 4.90 },

  // UI/UX & Design
  { name: 'Chloe Laurent', role: 'professional', bio: 'Design lead with 8+ years building enterprise design systems.', baseRating: 4.90 },
  { name: 'Samira Khan', role: 'professional', bio: 'Product designer and accessibility advocate.', baseRating: 4.70 },
  { name: 'Oscar Mendez', role: 'student', bio: 'Interactive media major & front-end UI prototyper.', baseRating: 4.45 },
  { name: 'Linnea Holm', role: 'professional', bio: 'UX researcher and design sprint facilitator.', baseRating: 4.80 },

  // Productivity & Analytics
  { name: 'Arthur Pendelton', role: 'professional', bio: 'Financial analyst & advanced spreadsheet modeling instructor.', baseRating: 4.85 },
  { name: 'Beatriz Silva', role: 'professional', bio: 'Business intelligence analyst and SQL/Excel coach.', baseRating: 4.75 },
  { name: 'Chen Wei', role: 'student', bio: 'Economics & data analytics student tutor.', baseRating: 4.50 },
  { name: 'Nadia Volkova', role: 'professional', bio: 'Operations research and spreadsheet automation consultant.', baseRating: 4.65 },

  // Academics & Mathematics
  { name: 'Prof. Henrik Weber', role: 'professional', bio: 'Pure mathematics professor specializing in linear systems.', baseRating: 4.95 },
  { name: 'Fatima Zahra', role: 'student', bio: 'Mathematics graduate teaching assistant & Olympiad trainer.', baseRating: 4.60 },
  { name: 'Julian Thorne', role: 'professional', bio: 'Applied statistician and stochastic modeling coach.', baseRating: 4.80 },
  { name: 'Dr. Paul Erdös-Jr', role: 'professional', bio: 'Discrete mathematics and mathematical reasoning instructor.', baseRating: 4.70 },

  // Languages & Communication
  { name: 'Isabelle Moreau', role: 'professional', bio: 'Certified bilingual language instructor & translator.', baseRating: 4.90 },
  { name: 'Diego Ramirez', role: 'professional', bio: 'Speech coach and corporate communication consultant.', baseRating: 4.75 },
  { name: 'Sunita Patel', role: 'student', bio: 'Debate team captain and rhetoric tutor.', baseRating: 4.55 },
  { name: 'Liam O’Connor', role: 'professional', bio: 'Public relations director and presentation coach.', baseRating: 4.65 },

  // Arts & Creative
  { name: 'Gabriel Santos', role: 'professional', bio: 'Studio portrait photographer and visual arts instructor.', baseRating: 4.90 },
  { name: 'Clara Schumann-Lee', role: 'professional', bio: 'Classical and acoustic guitar conservatory graduate.', baseRating: 4.80 },
  { name: 'Chef Marco Bellini', role: 'professional', bio: 'Culinary school instructor and pastry chef.', baseRating: 4.70 },
  { name: 'Zara Novak', role: 'student', bio: 'Fine arts student and darkroom photography tutor.', baseRating: 4.50 },

  // Social Sciences & Psychology
  { name: 'Dr. Evelyn Reed', role: 'professional', bio: 'Cognitive psychologist and research methods mentor.', baseRating: 4.95 },
  { name: 'Prof. Dmitri Volkov', role: 'professional', bio: 'Sociology and macroeconomics faculty advisor.', baseRating: 4.90 },
  { name: 'Ananya Deshmukh', role: 'student', bio: 'Psychology honors student and peer study lead.', baseRating: 4.50 },
  { name: 'Dr. Hannah Arendt-Smith', role: 'professional', bio: 'Social theory, political philosophy, and ethics lecturer.', baseRating: 4.85 },

  // Sports & Athletics
  { name: 'Coach Marcus Vance', role: 'professional', bio: 'Collegiate basketball skills coach and athletic trainer.', baseRating: 4.85 },
  { name: 'Grandmaster Levon Petrov', role: 'professional', bio: 'FIDE Master and youth chess academy director.', baseRating: 4.92 },
  { name: 'Sofia Martínez', role: 'professional', bio: 'Club tennis coach and tournament biomechanics analyst.', baseRating: 4.75 },
  { name: 'Kobe Miller', role: 'student', bio: 'Varsity tennis player and fundamentals tutor.', baseRating: 4.60 },
];

const SAMPLE_FEEDBACK_COMMENTS = [
  '[Sample Feedback] Outstanding session! Clear explanations and great real-world examples.',
  '[Sample Feedback] Very patient and thorough. Solved several tricky bottlenecks in our 1:1 session.',
  '[Sample Feedback] Excellent structured lessons with practical hands-on exercises.',
  '[Sample Feedback] Great mentor, very encouraging pacing and highly recommended!',
];

async function seedDemoTeachers() {
  const client = await pool.connect();
  try {
    console.log('[Demo Seeder] Starting idempotent verification and demo teacher seeding...');
    await client.query('BEGIN');

    // 1. Ensure sample demo learner exists for review linkage
    const demoLearnerId = 'demo_learner_sample';
    const pwHash = await bcrypt.hash('DemoPass123!', 10);
    await client.query(`
      INSERT INTO users (id, name, email, password_hash, role, bio, is_demo, can_learn, can_teach, active_mode)
      VALUES ($1, 'Sample Learner (Demo)', 'sample_learner@skillexchange.demo', $2, 'student',
              'Fictional sample learner profile for review and booking fidelity.', TRUE, TRUE, FALSE, 'learner')
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        is_demo = TRUE;
    `, [demoLearnerId, pwHash]);

    // 2. Fetch all canonical courses from skill_catalog
    const catalogRes = await client.query('SELECT name, category FROM skill_catalog ORDER BY category, name');
    const courses = catalogRes.rows;
    console.log(`[Demo Seeder] Found ${courses.length} canonical catalog courses.`);

    let profileIdx = 0;
    let seededCount = 0;

    for (const course of courses) {
      const skillName = course.name;

      // Count existing verified teachers for this skill
      const existingRes = await client.query(`
        SELECT COUNT(DISTINCT s.user_id) as count
        FROM skills s
        JOIN users u ON s.user_id = u.id
        WHERE LOWER(s.skill_name) = LOWER($1) AND s.type = 'teach' AND s.is_verified = TRUE
      `, [skillName]);
      const currentCount = parseInt(existingRes.rows[0].count, 10);

      const needed = Math.max(0, 3 - currentCount);
      if (needed === 0) {
        continue;
      }

      console.log(`[Demo Seeder] Course "${skillName}" currently has ${currentCount} verified teacher(s). Adding ${needed} sample teacher(s)...`);

      for (let i = 0; i < needed; i++) {
        const template = SAMPLE_TEACHER_PROFILES[profileIdx % SAMPLE_TEACHER_PROFILES.length];
        profileIdx++;

        const slug = skillName.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const teacherId = `demo_teacher_${slug}_${i + 1}`;
        const teacherEmail = `${teacherId}@skillexchange.demo`;
        const displayName = `${template.name} (Demo Teacher)`;
        const targetRating = Number((template.baseRating - (i * 0.15)).toFixed(2));

        // Insert or update demo teacher user
        await client.query(`
          INSERT INTO users (
            id, name, email, password_hash, role, bio, reputation_score,
            is_demo, can_teach, can_learn, active_mode
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE, TRUE, 'teacher')
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            bio = EXCLUDED.bio,
            reputation_score = EXCLUDED.reputation_score,
            is_demo = TRUE,
            can_teach = TRUE;
        `, [
          teacherId,
          displayName,
          teacherEmail,
          pwHash,
          template.role,
          `${template.bio} Verified demo teacher for ${skillName}.`,
          targetRating,
        ]);

        // Insert verified skill for teacher (id is SERIAL in PostgreSQL)
        await client.query(`
          INSERT INTO skills (user_id, skill_name, level, type, is_verified, verified_at, created_at)
          VALUES ($1, $2, 'expert', 'teach', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [teacherId, skillName]);

        // Create completed session booking and review so review-based rating is persisted
        const bookingId = `sb_${teacherId}_sample_${Date.now()}_${i}`;
        await client.query(`
          INSERT INTO session_bookings (
            id, mentor_id, learner_id, scheduled_at, status, topic, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP - INTERVAL '2 days', 'completed', $4, 'Sample 1:1 mentorship booking', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days')
          ON CONFLICT (id) DO NOTHING;
        `, [bookingId, teacherId, demoLearnerId, skillName]);

        const reviewId = `rev_${teacherId}_sample_${Date.now()}_${i}`;
        const starRating = targetRating >= 4.7 ? 5 : (targetRating >= 4.2 ? 4 : 5);
        const comment = SAMPLE_FEEDBACK_COMMENTS[i % SAMPLE_FEEDBACK_COMMENTS.length];

        await client.query(`
          INSERT INTO reviews (id, session_id, reviewer_id, mentor_id, rating, comment, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP - INTERVAL '2 days')
          ON CONFLICT (session_id) DO NOTHING;
        `, [reviewId, bookingId, demoLearnerId, teacherId, starRating, comment]);

        seededCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`[Demo Seeder] Completed successfully! Added/verified ${seededCount} sample demo teacher profiles.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Demo Seeder Error]', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoTeachers().catch((err) => {
  console.error(err);
  process.exit(1);
});
