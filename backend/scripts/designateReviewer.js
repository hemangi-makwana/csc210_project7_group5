/**
 * ============================================================================
 * DESIGNATE REVIEWER CLI SCRIPT (backend/scripts/designateReviewer.js)
 * ============================================================================
 * Safe, documented utility to designate or revoke reviewer privileges for
 * an existing user account in PostgreSQL.
 *
 * Usage:
 *   node backend/scripts/designateReviewer.js <email> [--revoke]
 *
 * Examples:
 *   node backend/scripts/designateReviewer.js alice@example.com
 *   node backend/scripts/designateReviewer.js alice@example.com --revoke
 *
 * Security & Defense Considerations:
 * - Does not create accounts or bypass authentication.
 * - Does not print credentials, hashes, or environment variables.
 * - Enforces explicit designation so regular users cannot self-promote.
 * ============================================================================
 */

const path = require('path');
const { query } = require('../db');

async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((a) => !a.startsWith('--'));
  const isRevoke = args.includes('--revoke');

  if (!emailArg) {
    console.error('Error: Please provide a user email address.');
    console.log('Usage: node backend/scripts/designateReviewer.js <email> [--revoke]');
    process.exit(1);
  }

  const cleanEmail = emailArg.trim().toLowerCase();
  const targetStatus = !isRevoke;

  try {
    const userRes = await query(
      `SELECT id, name, email, role, is_reviewer FROM users WHERE LOWER(email) = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      console.error(`User with email "${cleanEmail}" was not found in PostgreSQL.`);
      process.exit(1);
    }

    const user = userRes.rows[0];

    await query(
      `UPDATE users SET is_reviewer = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [targetStatus, user.id]
    );

    console.log('====================================================');
    console.log(`Reviewer Status Update Successful:`);
    console.log(`- User ID: ${user.id}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Reviewer Role: ${targetStatus ? 'DESIGNATED REVIEWER (TRUE)' : 'REVOKED (FALSE)'}`);
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('Database query error:', err.message);
    process.exit(1);
  }
}

main();
