/**
 * Additive Database Migration:
 * - Ensures unique constraint on reviews(session_id) to guarantee single review per booking.
 * - Adds attachment and call columns to messages table.
 * - Non-destructive and idempotent.
 */

const { pool } = require('../db/index');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = await pool.connect();
  try {
    console.log('[Migration] Applying additive schema columns and constraints...');
    await client.query('BEGIN');

    // 1. Unique constraint / index on reviews(session_id)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_session ON reviews (session_id);
    `);

    // 2. Additive columns for messages (attachments, voice notes, WebRTC call logs)
    await client.query(`
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_original_name VARCHAR(255);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_mimetype VARCHAR(100);
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_size INT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_seconds INT;
      ALTER TABLE messages ADD COLUMN IF NOT EXISTS call_action VARCHAR(50);
    `);

    // 3. Ensure attachments directory exists
    const attachmentsDir = path.join(__dirname, '..', 'uploads', 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    await client.query('COMMIT');
    console.log('[Migration] Additive schema updates applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
