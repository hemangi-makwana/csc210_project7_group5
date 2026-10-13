/**
 * DATABASE SETUP SCRIPT
 *
 * Reads schema.sql and runs it against our Neon PostgreSQL database,
 * creating any tables that do not exist yet.
 *
 * Usage (from the backend folder):  node db/setup.js
 *
 * Safe to run repeatedly: schema.sql uses "CREATE TABLE IF NOT EXISTS".
 */
const fs = require("fs");
const path = require("path");
const { pool } = require("../db");

async function setupDatabase() {
  // Read the SQL file as plain text
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

  try {
    // Send the whole file to PostgreSQL in one call; it runs every statement
    await pool.query(schemaSql);

    // Ask PostgreSQL which tables now exist, to confirm the result
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables " +
        "WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log("Schema applied. Tables in database:");
    result.rows.forEach((row) => console.log(" -", row.table_name));
  } catch (error) {
    console.error("Schema setup failed:", error.message);
    process.exitCode = 1; // signal failure to whoever ran the script
  } finally {
    await pool.end(); // close connections so the script can exit
  }
}

setupDatabase();
