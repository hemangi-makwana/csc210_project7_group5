/**
 * Safely updates seeded demo accounts with standard bcrypt hashes of 'password123'.
 * Only touches accounts explicitly marked with is_demo = TRUE.
 * Never touches real, non-demo users.
 */
const bcrypt = require('bcryptjs');
const { pool } = require('../db/index');

async function updateDemoPasswords() {
  const hash = await bcrypt.hash('password123', 10);
  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1
     WHERE is_demo = TRUE
     RETURNING id, email`,
    [hash]
  );

  console.log(`Updated ${result.rowCount} demo accounts with valid bcrypt password hash.`);
  await pool.end();
}

updateDemoPasswords().catch((err) => {
  console.error('Failed to update demo passwords:', err);
  process.exit(1);
});
