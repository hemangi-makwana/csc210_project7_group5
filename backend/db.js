/**
 * ============================================================================
 * DATABASE CONNECTION — NEON POSTGRESQL
 * ============================================================================
 *
 * This module is the single entry point for talking to our PostgreSQL
 * database, hosted on Neon (this project's "skillswap-db" project).
 *
 * WHY NEON / POSTGRESQL (VIVA DEFENSE POINT):
 * - PostgreSQL is the industry-standard open-source relational database.
 *   Our data is highly relational (users -> skills -> sessions -> reviews),
 *   so relational tables with foreign keys map to it naturally and safely.
 * - Neon hosts PostgreSQL as a serverless service: the same connection
 *   string works in local development and in a production deployment, and
 *   Neon's free tier is designed for exactly this kind of project.
 *
 * WHY THE `pg` DRIVER:
 * - Our backend is a long-running Node.js/Express process, so the standard
 *   node-postgres driver (`pg`) with a connection pool is the recommended
 *   choice for this kind of server.
 * - A Pool keeps several connections ready, so every request does not pay
 *   the cost of opening a new TCP connection to the database.
 *
 * THE CONNECTION STRING:
 * - Loaded from the repo-root `.env.local` file (already covered by
 *   .gitignore, so it never reaches GitHub). `dotenv` loads it from there
 *   explicitly so we do not depend on ambient environment variables.
 * - `DATABASE_URL` is Neon's POOLED connection string, which Neon routes
 *   through its connection pooler (PgBouncer-compatible) — correct for a
 *   web application.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Encrypt the database connection with TLS and also verify Neon's
  // server certificate, so the password cannot be intercepted or the
  // connection silently redirected to a fake server (man-in-the-middle).
  ssl: true,
});

/**
 * Runs a trivial query to prove the database is reachable, and reports
 * latency + server version. Used by the /api/health/db endpoint.
 */
async function checkConnection() {
  const startAt = Date.now();
  const result = await pool.query(
    "SELECT NOW() AS server_time, version() AS version"
  );
  return {
    reachable: true,
    latencyMs: Date.now() - startAt,
    serverTime: result.rows[0].server_time,
    version: result.rows[0].version.split(" on ")[0],
  };
}

module.exports = { pool, checkConnection };
