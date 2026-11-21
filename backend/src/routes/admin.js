import { Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { canPromoteToAdmin, canReviewLevel } from '../services/adminRules.js';
import { isLevelId } from '../services/levelRules.js';
import { canReviewVerification, validateBanDuration } from '../services/verificationRules.js';

const router = Router();
const requireStaff = [authenticateToken, requireRole('ADMIN', 'OWNER')];

router.get('/users', ...requireStaff, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, display_name, avatar_url, role, created_at, banned_at, ban_until
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

router.get('/verification-submissions/pending', ...requireStaff, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT submission.id, submission.level_id, submission.verifier_id,
              submission.public_level_id, submission.video_url, submission.submitted_at,
              level.name AS level_name, level.creator_id, level.game_mode,
              creator.username AS creator_username, creator.display_name AS creator_display_name,
              verifier.username AS verifier_username, verifier.display_name AS verifier_display_name
       FROM verification_submissions submission
       JOIN levels level ON level.id = submission.level_id
       JOIN users creator ON creator.id = level.creator_id
       JOIN users verifier ON verifier.id = submission.verifier_id
       WHERE submission.status = 'PENDING' AND level.status = 'IN_PROGRESS'
       ORDER BY submission.submitted_at ASC, submission.id ASC`
    );
    res.json({ submissions: result.rows });
  } catch (error) { next(error); }
});

router.patch('/verification-submissions/:id/review', ...requireStaff, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Entrega no encontrada' });
    const { decision } = req.body ?? {};
    if (!['APPROVE', 'REJECT'].includes(decision)) return res.status(400).json({ error: 'Elegí una decisión válida' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT submission.*, level.name AS level_name, level.status AS level_status
       FROM verification_submissions submission
       JOIN levels level ON level.id = submission.level_id
       WHERE submission.id = $1 FOR UPDATE OF submission, level`,
      [req.params.id]
    );
    const submission = result.rows[0];
    if (!submission) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Entrega no encontrada' }); }
    if (!canReviewVerification({ actorRole: req.user.role, status: submission.status, decision }) || submission.level_status !== 'IN_PROGRESS') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Esta entrega ya fue resuelta o el nivel ya no está en progreso' });
    }
    const status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await client.query(
      'UPDATE verification_submissions SET status = $2, admin_comment = $3 WHERE id = $1',
      [req.params.id, status, typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 1000) || null : null]
    );
    if (decision === 'APPROVE') {
      await client.query(
        `UPDATE levels
         SET status = 'VERIFIED', gd_level_id = $2, showcase_url = $3,
             applications_open = FALSE, updated_at = NOW()
         WHERE id = $1`,
        [submission.level_id, submission.public_level_id, submission.video_url]
      );
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, related_level_id)
         VALUES ($1, 'Verificación aceptada', $2, 'VERIFICATION_ACCEPTED', $3)`,
        [submission.verifier_id, `La verificación de "${submission.level_name}" fue aprobada.`, submission.level_id]
      );
    }
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'VERIFICATION_SUBMISSION', $3, $4)`,
      [req.user.id, `VERIFICATION_${decision}`, req.params.id, `Entrega ${status} para nivel ${submission.level_id}`]
    );
    await client.query('COMMIT');
    res.json({ submission: { id: req.params.id, status } });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.get('/chat-reports', ...requireStaff, async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT report.id, report.level_id, report.reporter_id, report.reported_user_id,
              report.reason, report.status, report.created_at,
              level.name AS level_name,
              reporter.username AS reporter_username,
              reported.username AS reported_username, reported.display_name AS reported_display_name
       FROM chat_reports report
       JOIN levels level ON level.id = report.level_id
       JOIN users reporter ON reporter.id = report.reporter_id
       JOIN users reported ON reported.id = report.reported_user_id
       WHERE report.status = 'OPEN'
       ORDER BY report.created_at ASC, report.id ASC`
    );
    res.json({ reports: result.rows });
  } catch (error) { next(error); }
});

router.patch('/chat-reports/:id/resolve', ...requireStaff, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Reporte no encontrado' });
    const { decision, days } = req.body ?? {};
    if (!['DISMISS', 'BAN'].includes(decision)) return res.status(400).json({ error: 'Elegí una resolución válida' });
    if (decision === 'BAN' && !validateBanDuration(days)) return res.status(400).json({ error: 'La duración debe ser entre 1 y 3650 días o permanente' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT report.*, reported.username AS reported_username, reported.role AS reported_role, reported.banned_at
       FROM chat_reports report JOIN users reported ON reported.id = report.reported_user_id
       WHERE report.id = $1 FOR UPDATE OF report, reported`,
      [req.params.id]
    );
    const report = result.rows[0];
    if (!report || report.status !== 'OPEN') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El reporte ya fue resuelto o no existe' }); }
    if (decision === 'BAN') {
      if (report.reported_role !== 'USER') { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Solo se puede suspender una cuenta de jugador' }); }
      if (report.banned_at) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'El usuario ya tiene una suspensión activa' }); }
      await client.query('SELECT id FROM levels WHERE creator_id = $1 FOR UPDATE', [report.reported_user_id]);
      await client.query(
        `INSERT INTO temporary_level_ban_snapshots (level_id, previous_status, previous_applications_open)
         SELECT id, status, applications_open FROM levels
         WHERE creator_id = $1 AND status <> 'CANCELLED'
         ON CONFLICT (level_id) DO NOTHING`,
        [report.reported_user_id]
      );
      await client.query(
        `UPDATE levels SET status = 'CANCELLED', applications_open = FALSE, updated_at = NOW()
         WHERE creator_id = $1 AND status <> 'CANCELLED'`,
        [report.reported_user_id]
      );
      await client.query(
        `UPDATE applications SET status = 'WITHDRAWN', updated_at = NOW()
         WHERE verifier_id = $1 AND status = 'PENDING'`,
        [report.reported_user_id]
      );
      await client.query(
        `UPDATE users SET banned_at = NOW(),
           ban_until = CASE WHEN $2::integer IS NULL THEN NULL ELSE NOW() + ($2::integer * INTERVAL '1 day') END,
           ban_reason = $3
         WHERE id = $1`,
        [report.reported_user_id, days, report.reason]
      );
    }
    const reportStatus = decision === 'BAN' ? 'ACTIONED' : 'DISMISSED';
    const updated = await client.query(
      `UPDATE chat_reports SET status = $2, resolved_by = $3, resolved_at = NOW(),
         ban_until = CASE WHEN $4::integer IS NULL OR $4::integer < 1 THEN NULL ELSE NOW() + ($4::integer * INTERVAL '1 day') END
       WHERE id = $1 RETURNING id, status, ban_until`,
      [req.params.id, reportStatus, req.user.id, decision === 'BAN' ? days : 0]
    );
    await client.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, 'CHAT_REPORT', $3, $4)`,
      [req.user.id, `CHAT_REPORT_${decision}`, req.params.id, decision === 'BAN' ? `Usuario ${report.reported_username}; duración: ${days === null ? 'permanente' : `${days} días`}` : 'Reporte descartado']
    );
    await client.query('COMMIT');
    res.json({ report: updated.rows[0] });
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
