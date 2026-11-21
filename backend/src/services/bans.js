import { pool } from '../config/database.js';

export async function restoreExpiredBans() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const expired = await client.query(
      `SELECT id FROM users WHERE banned_at IS NOT NULL AND ban_until IS NOT NULL AND ban_until <= NOW() FOR UPDATE`
    );
    for (const { id } of expired.rows) {
      await client.query(
        `UPDATE levels l
         SET status = snapshot.previous_status,
             applications_open = snapshot.previous_applications_open,
             updated_at = NOW()
         FROM temporary_level_ban_snapshots snapshot
         WHERE snapshot.level_id = l.id AND l.creator_id = $1 AND l.status = 'CANCELLED'`,
        [id]
      );
      await client.query(
        `DELETE FROM temporary_level_ban_snapshots snapshot
         USING levels l WHERE snapshot.level_id = l.id AND l.creator_id = $1`,
        [id]
      );
      await client.query(
        'UPDATE users SET banned_at = NULL, ban_until = NULL, ban_reason = NULL WHERE id = $1',
        [id]
      );
    }
    await client.query('COMMIT');
    return expired.rowCount;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}
