/**
 * ============================================================================
 * DATABASE SETUP SCRIPT (LOCAL POSTGRESQL)
 * ============================================================================
 *
 * Reads schema.sql and applies it to the local PostgreSQL database.
 * Uses "CREATE TABLE IF NOT EXISTS" for idempotent, non-destructive execution.
 *
 * Usage:
 *   node db/setup.js
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const { pool, checkConnection } = require("./index");

async function setupDatabase(closePool = true) {
  console.log("Checking connection to local PostgreSQL...");
  const conn = await checkConnection();

  if (!conn.reachable) {
    console.warn(`[Warning] Could not connect to local PostgreSQL: ${conn.reason}`);
    console.warn("Ensure PostgreSQL is running locally on port 5432 and configured in backend/.env.");
    return false;
  }

  console.log(`Connected to local PostgreSQL database: "${conn.database}" (${conn.version})`);

  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  try {
    await pool.query(schemaSql);
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("PostgreSQL schema applied successfully! Tables currently in database:");
    result.rows.forEach((row) => console.log(` - ${row.table_name}`));
    return true;
  } catch (err) {
    console.error("Failed to apply PostgreSQL schema:", err.message);
    return false;
  } finally {
    if (closePool && pool) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  setupDatabase(true)
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };
