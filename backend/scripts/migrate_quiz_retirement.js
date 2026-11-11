/**
 * Transactional Migration: Remove obsolete quiz history, drop quiz_attempts table,
 * drop obsolete quiz fields, and remove quiz-only notifications.
 * Preserves all unrelated data, users, skills, bookings, messages, and document verification records.
 */

const path = require('path');
const { pool } = require('../db/index');

async function runQuizRetirementMigration() {
  const client = await pool.connect();
  try {
    console.log('=== BEFORE MIGRATION ROW COUNTS ===');
    const beforeCounts = {};
    
    // Check quiz_attempts before
    const qaCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
      ) as exists;
    `);
    if (qaCheck.rows[0].exists) {
      const qaRes = await client.query('SELECT COUNT(*) as count FROM quiz_attempts');
      beforeCounts.quiz_attempts = parseInt(qaRes.rows[0].count, 10);
    } else {
      beforeCounts.quiz_attempts = 0;
    }

    const notifRes = await client.query('SELECT COUNT(*) as count FROM notifications');
    beforeCounts.notifications = parseInt(notifRes.rows[0].count, 10);

    const quizNotifRes = await client.query(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE type IN ('quiz_passed', 'quiz_failed', 'quiz_attempt') 
         OR title ILIKE '%quiz%' 
         OR message ILIKE '%quiz%'
    `);
    beforeCounts.quiz_notifications = parseInt(quizNotifRes.rows[0].count, 10);

    const usersRes = await client.query('SELECT COUNT(*) as count FROM users');
    beforeCounts.users = parseInt(usersRes.rows[0].count, 10);

    const skillsRes = await client.query('SELECT COUNT(*) as count FROM skills');
    beforeCounts.skills = parseInt(skillsRes.rows[0].count, 10);

    const bookingsRes = await client.query('SELECT COUNT(*) as count FROM session_bookings');
    beforeCounts.session_bookings = parseInt(bookingsRes.rows[0].count, 10);

    console.log(JSON.stringify(beforeCounts, null, 2));

    console.log('\n--- BEGINNING TRANSACTION ---');
    await client.query('BEGIN');

    // 1. Delete quiz-only notifications
    const deleteNotifResult = await client.query(`
      DELETE FROM notifications 
      WHERE type IN ('quiz_passed', 'quiz_failed', 'quiz_attempt') 
         OR title ILIKE '%quiz%' 
         OR message ILIKE '%quiz%'
    `);
    const deletedNotifCount = deleteNotifResult.rowCount;
    console.log(`[Migration] Deleted ${deletedNotifCount} quiz-only notification(s).`);

    // 2. Drop obsolete quiz_attempts table
    await client.query('DROP TABLE IF EXISTS quiz_attempts CASCADE');
    console.log('[Migration] Dropped quiz_attempts table and associated indexes.');

    // 3. Drop obsolete quiz-only columns from skills (forfeited was only used for quiz answer reveals)
    const forfeitedCol = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'skills' AND column_name = 'forfeited'
    `);
    let droppedForfeited = false;
    if (forfeitedCol.rows.length > 0) {
      await client.query('ALTER TABLE skills DROP COLUMN IF EXISTS forfeited');
      droppedForfeited = true;
      console.log('[Migration] Dropped obsolete forfeited column from skills table.');
    }

    await client.query('COMMIT');
    console.log('--- TRANSACTION COMMITTED SUCCESSFULLY ---\n');

    console.log('=== AFTER MIGRATION ROW COUNTS ===');
    const afterCounts = {};

    const qaAfter = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'quiz_attempts'
      ) as exists;
    `);
    afterCounts.quiz_attempts_table_exists = qaAfter.rows[0].exists;

    const notifAfter = await client.query('SELECT COUNT(*) as count FROM notifications');
    afterCounts.notifications = parseInt(notifAfter.rows[0].count, 10);

    const usersAfter = await client.query('SELECT COUNT(*) as count FROM users');
    afterCounts.users = parseInt(usersAfter.rows[0].count, 10);

    const skillsAfter = await client.query('SELECT COUNT(*) as count FROM skills');
    afterCounts.skills = parseInt(skillsAfter.rows[0].count, 10);

    const bookingsAfter = await client.query('SELECT COUNT(*) as count FROM session_bookings');
    afterCounts.session_bookings = parseInt(bookingsAfter.rows[0].count, 10);

    console.log(JSON.stringify(afterCounts, null, 2));
    console.log('\n[Summary of Affected Counts]:');
    console.log(`- Dropped quiz_attempts table (previously had ${beforeCounts.quiz_attempts} records).`);
    console.log(`- Deleted ${deletedNotifCount} quiz-only notification row(s).`);
    console.log(`- Dropped forfeited column from skills: ${droppedForfeited}.`);
    console.log(`- Unrelated notifications preserved: ${afterCounts.notifications} remaining.`);
    console.log(`- Users preserved: ${afterCounts.users}.`);
    console.log(`- Skills preserved: ${afterCounts.skills}.`);
    console.log(`- Session bookings preserved: ${afterCounts.session_bookings}.`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed and was rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runQuizRetirementMigration().catch(err => {
  console.error(err);
  process.exit(1);
});
