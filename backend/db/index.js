/**
 * ============================================================================
 * DATABASE CONNECTION - LOCAL POSTGRESQL POOL
 * ============================================================================
 *
 * This module connects directly to a standard local PostgreSQL database
 * running in development (e.g. on localhost:5432).
 *
 * WHY A CONNECTION POOL?
 * Rather than opening a new TCP connection on every API request, pg.Pool maintains
 * a pool of reusable connections to local PostgreSQL. This maximizes performance
 * and throughput under concurrent workloads.
 *
 * CONFIGURATION:
 * Reads configuration from the local ignored .env file via dotenv:
 * - PGHOST (default: localhost)
 * - PGPORT (default: 5432)
 * - PGDATABASE (default: skill_exchange)
 * - PGUSER (default: postgres)
 * - PGPASSWORD (default: postgres)
 * Or via standard DATABASE_URL.
 * ============================================================================
 */

const path = require("path");
const fs = require("fs");

// Load local environment variables from backend/.env (or root .env if present)
const backendEnvPath = path.join(__dirname, "..", ".env");
const rootEnvPath = path.join(__dirname, "..", "..", ".env");

let dotenvLoaded = false;
try {
  const dotenv = require("dotenv");
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath });
    dotenvLoaded = true;
  } else if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath });
    dotenvLoaded = true;
  } else {
    dotenv.config();
    dotenvLoaded = true;
  }
} catch (e) {
  // dotenv not installed yet, fall back to process.env
}

let Pool = null;
try {
  const pg = require("pg");
  Pool = pg.Pool;
} catch (e) {
  // pg driver will be loaded once installed
}

// Build pool configuration for local PostgreSQL
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Local development does not require SSL
      ssl: false,
    }
  : {
      host: process.env.PGHOST || "localhost",
      port: parseInt(process.env.PGPORT || "5432", 10),
      database: process.env.PGDATABASE || "skill_exchange",
      user: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "postgres",
      ssl: false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000,
    };

let pool = null;
if (Pool) {
  pool = new Pool(poolConfig);

  // Pool error handling to prevent uncaught process exceptions
  pool.on("error", (err) => {
    console.error("[PostgreSQL Pool Error]", err.message);
  });
}

/**
 * Executes a parameterized SQL query against the local PostgreSQL database.
 * @param {string} text - SQL query statement with placeholders ($1, $2, etc.)
 * @param {Array} [params] - Values to bind to placeholders
 * @returns {Promise<object>} Query result object with .rows
 */
async function query(text, params) {
  if (!pool) {
    throw new Error(
      "PostgreSQL driver (pg) is not available in node_modules. Please install 'pg' and 'dotenv'."
    );
  }
  return await pool.query(text, params);
}

/**
 * Checks connection status to local PostgreSQL.
 * @returns {Promise<{reachable: boolean, latencyMs: number, database: string, serverTime?: string, version?: string}>}
 */
async function checkConnection() {
  if (!pool) {
    return {
      reachable: false,
      reason: "PostgreSQL driver (pg) not installed.",
      database: poolConfig.database || "skill_exchange",
      latencyMs: -1,
    };
  }

  const startAt = Date.now();
  try {
    const result = await pool.query(
      "SELECT NOW() AS server_time, current_database() AS current_db, version() AS version"
    );
    return {
      reachable: true,
      latencyMs: Date.now() - startAt,
      database: result.rows[0].current_db,
      serverTime: result.rows[0].server_time,
      version: result.rows[0].version.split(" on ")[0],
    };
  } catch (error) {
    return {
      reachable: false,
      reason: error.message,
      database: poolConfig.database || "skill_exchange",
      latencyMs: Date.now() - startAt,
    };
  }
}

/**
 * Returns whether a connection pool is initialized.
 */
function isPoolInitialized() {
  return pool !== null;
}

module.exports = {
  pool,
  query,
  checkConnection,
  isPoolInitialized,
  poolConfig,
};
