import { Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { isLevelId } from '../services/levelRules.js';

const router = Router();

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT n.id, n.title, n.message, n.type, n.related_level_id,
              n.is_read, n.created_at, l.name AS level_name
       FROM notifications n
       LEFT JOIN levels l ON l.id = n.related_level_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (error) { next(error); }
});

router.patch('/:id/read', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Notificación no encontrada' });
    const result = await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ notification: result.rows[0] });
  } catch (error) { next(error); }
});

export default router;
