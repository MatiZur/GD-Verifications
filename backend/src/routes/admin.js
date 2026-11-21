import { Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { canPromoteToAdmin, canReviewLevel } from '../services/adminRules.js';
import { isLevelId } from '../services/levelRules.js';

const router = Router();
const requireStaff = [authenticateToken, requireRole('ADMIN', 'OWNER')];

router.get('/users', ...requireStaff, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, display_name, avatar_url, role, created_at
       FROM users ORDER BY created_at DESC, id DESC`
    );
    res.json({ users: result.rows });
  } catch (error) { next(error); }
});

router.get('/levels/pending', ...requireStaff, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT l.id, l.creator_id, l.name, l.description, l.game_mode,
              l.difficulty_estimate, l.showcase_url, l.minimum_hardest_aredl_name,
              l.created_at, (l.image_data IS NOT NULL) AS has_image,
              u.username AS creator_username, u.display_name AS creator_display_name
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.status = 'PENDING_REVIEW'
       ORDER BY l.created_at ASC, l.id ASC`
    );
    res.json({ levels: result.rows });
  } catch (error) { next(error); }
});

router.patch('/levels/:id/review', ...requireStaff, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const { decision } = req.body ?? {};
    if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ error: 'Elegí una decisión de moderación válida' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query('SELECT id, status FROM levels WHERE id = $1 FOR UPDATE', [req.params.id]);
    const level = result.rows[0];
    if (!level) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Nivel no encontrado' }); }
    if (!canReviewLevel({ actorRole: req.user.role, levelStatus: level.status, decision })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este nivel ya fue revisado o no admite esta decisión' });
    }
    const status = decision === 'APPROVE' ? 'AVAILABLE' : 'REJECTED';
    const updated = await client.query(
      'UPDATE levels SET status = $2, applications_open = $3, updated_at = NOW() WHERE id = $1 RETURNING id, status, updated_at',
      [req.params.id, status, decision === 'APPROVE']
    );
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'LEVEL', $3, $4)`,
      [req.user.id, `LEVEL_${decision}`, req.params.id, `Estado resultante: ${status}`]
    );
    await client.query('COMMIT');
    res.json({ level: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.patch('/users/:id/promote', authenticateToken, requireRole('OWNER'), async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Usuario no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query('SELECT id, username, role FROM users WHERE id = $1 FOR UPDATE', [req.params.id]);
    const target = result.rows[0];
    if (!target) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Usuario no encontrado' }); }
    if (!canPromoteToAdmin({ actorRole: req.user.role, targetRole: target.role })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se puede promover a administrador a un usuario normal' });
    }
    const updated = await client.query(
      "UPDATE users SET role = 'ADMIN' WHERE id = $1 RETURNING id, username, role",
      [req.params.id]
    );
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'PROMOTE_TO_ADMIN', 'USER', $2, $3)`,
      [req.user.id, req.params.id, `Usuario ${target.username} promovido a ADMIN`]
    );
    await client.query('COMMIT');
    res.json({ user: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

export default router;
