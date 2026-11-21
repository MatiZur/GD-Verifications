import { Router } from 'express';
import multer from 'multer';
import { pool } from '../config/database.js';
import { authenticateToken, optionalToken } from '../middleware/auth.js';
import { getAredlLevels } from '../services/aredl.js';
import { canCreatorCloseApplications, canCreatorMarkLevelVerified, canCreatorRestoreLevel, canCreatorWithdrawLevel, isLevelId, meetsHardestRequirement, validateLevelInput } from '../services/levelRules.js';
import { validateApplicationSelection } from '../services/applicationRules.js';
import { canAccessLevelChat, validateChatAttachment, validateChatMessage } from '../services/chatRules.js';

const router = Router();
const chatUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } }).single('attachment');
const levelFields = `
  l.id, l.creator_id, l.name, l.description, l.gd_level_id, l.difficulty,
  l.difficulty_estimate, l.game_mode, l.showcase_url, l.status, l.applications_open,
  l.minimum_hardest_aredl_id, l.minimum_hardest_aredl_name,
  (l.image_data IS NOT NULL) AS has_image,
  (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS accepted_verifier_count,
  CASE WHEN l.status = 'VERIFIED' THEN COALESCE((
    SELECT json_agg(json_build_object('username', verifier.username, 'display_name', verifier.display_name) ORDER BY a.updated_at, a.id)
    FROM applications a JOIN users verifier ON verifier.id = a.verifier_id
    WHERE a.level_id = l.id AND a.status = 'ACCEPTED'
  ), '[]'::json) ELSE '[]'::json END AS verified_by,
  l.created_at, l.updated_at, u.username AS creator_username, u.display_name AS creator_display_name
`;

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${levelFields}
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.status IN ('PENDING_REVIEW', 'AVAILABLE', 'IN_PROGRESS', 'VERIFIED', 'REJECTED')
       ORDER BY l.created_at DESC`
    );
    res.json({ levels: result.rows });
  } catch (error) { next(error); }
});

router.get('/recent-verifications', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${levelFields}
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.status = 'VERIFIED'
       ORDER BY l.updated_at DESC, l.id DESC
       LIMIT 5`
    );
    res.json({ levels: result.rows });
  } catch (error) { next(error); }
});

router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    let list = [];
    if (body.minimum_hardest_aredl_id) {
      try {
        list = await getAredlLevels(body.game_mode === 'PLATFORMER' ? 'platformer' : 'classic');
      } catch (error) {
        console.error('Could not load AREDL requirements:', error.message);
        return res.status(503).json({ error: 'No se pudo cargar la lista AREDL. Probá de nuevo más tarde.' });
      }
    }
    const validationError = validateLevelInput(body, list);
    if (validationError) return res.status(400).json({ error: validationError });

    const minimum = body.minimum_hardest_aredl_id
      ? list.find((level) => level.id === body.minimum_hardest_aredl_id)
      : null;
    const estimate = body.difficulty_estimate;
    const imageData = body.image_data ? Buffer.from(body.image_data.slice(body.image_data.indexOf(',') + 1), 'base64') : null;
    const imageMimeType = body.image_data?.match(/^data:(image\/(?:jpeg|webp));base64,/)?.[1] ?? null;
    const result = await pool.query(
      `INSERT INTO levels (
         creator_id, name, description, difficulty, difficulty_estimate, game_mode,
         showcase_url, minimum_hardest_aredl_id, minimum_hardest_aredl_name, status,
         image_data, image_mime_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'AVAILABLE', $10, $11)
       RETURNING id, creator_id, name, description, difficulty, difficulty_estimate,
                 game_mode, showcase_url, minimum_hardest_aredl_id,
                 minimum_hardest_aredl_name, status, created_at, (image_data IS NOT NULL) AS has_image`,
      [req.user.id, body.name.trim(), body.description?.trim() || null, `Top ${estimate}`, estimate,
        body.game_mode, body.showcase_url.trim(), minimum?.id ?? null, minimum?.name ?? null, imageData, imageMimeType]
    );
    res.status(201).json({ level: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/mine', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${levelFields},
              (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id) AS application_count
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.creator_id = $1 ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json({ levels: result.rows });
  } catch (error) { next(error); }
});

router.get('/applications/mine', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS application_id, a.status AS application_status, a.created_at AS applied_at,
              l.id, l.name, l.description, l.game_mode, l.difficulty_estimate, l.showcase_url,
              l.status AS level_status, l.applications_open, l.minimum_hardest_aredl_name, l.created_at,
              (l.image_data IS NOT NULL) AS has_image,
              CASE WHEN l.status = 'VERIFIED' THEN COALESCE((
                SELECT json_agg(json_build_object('username', verifier.username, 'display_name', verifier.display_name) ORDER BY accepted.updated_at, accepted.id)
                FROM applications accepted JOIN users verifier ON verifier.id = accepted.verifier_id
                WHERE accepted.level_id = l.id AND accepted.status = 'ACCEPTED'
              ), '[]'::json) ELSE '[]'::json END AS verified_by,
              owner.username AS creator_username, owner.display_name AS creator_display_name
       FROM applications a JOIN levels l ON l.id = a.level_id
       JOIN users owner ON owner.id = l.creator_id
       WHERE a.verifier_id = $1 AND l.status <> 'CANCELLED' ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (error) { next(error); }
});

router.get('/:id/image', optionalToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).end();
    const result = await pool.query(
      `SELECT image_data, image_mime_type, status FROM levels
       WHERE id = $1 AND status IN ('PENDING_REVIEW', 'AVAILABLE', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'CANCELLED')
         AND (status <> 'CANCELLED' OR creator_id = $2)`,
      [req.params.id, req.user?.id ?? null]
    );
    if (!result.rows[0]?.image_data) return res.status(404).end();
    res.type(result.rows[0].image_mime_type)
      .set('Cross-Origin-Resource-Policy', 'cross-origin')
      .set('Cache-Control', result.rows[0].status === 'CANCELLED' ? 'private, no-store' : 'public, max-age=86400')
      .send(result.rows[0].image_data);
  } catch (error) { next(error); }
});

router.get('/:id', optionalToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const result = await pool.query(
      `SELECT ${levelFields}
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.id = $1 AND l.status IN ('PENDING_REVIEW', 'AVAILABLE', 'IN_PROGRESS', 'VERIFIED', 'REJECTED', 'CANCELLED')
         AND (l.status <> 'CANCELLED' OR l.creator_id = $2)`,
      [req.params.id, req.user?.id ?? null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nivel no encontrado' });
    res.json({ level: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/:id/applications', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const ownership = await pool.query('SELECT creator_id FROM levels WHERE id = $1', [req.params.id]);
    if (!ownership.rows[0]) return res.status(404).json({ error: 'Nivel no encontrado' });
    if (String(ownership.rows[0].creator_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Solo el creador puede ver las postulaciones de este nivel' });
    }
    const result = await pool.query(
      `SELECT a.id, a.status, a.created_at AS applied_at,
              u.username, u.display_name, u.avatar_url, u.pronouns, u.country, u.gd_username,
              l.game_mode,
              CASE WHEN l.game_mode = 'PLATFORMER' THEN u.hardest_platformer_aredl_name
                   ELSE u.hardest_classic_aredl_name END AS matching_hardest_name,
              CASE WHEN l.game_mode = 'PLATFORMER' THEN u.hardest_platformer_aredl_id
                   ELSE u.hardest_classic_aredl_id END AS matching_hardest_id
       FROM applications a JOIN users u ON u.id = a.verifier_id
       JOIN levels l ON l.id = a.level_id
       WHERE a.level_id = $1 ORDER BY a.created_at ASC`,
      [req.params.id]
    );
    res.json({ applications: result.rows });
  } catch (error) { next(error); }
});

router.get('/:id/chat', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const permission = await pool.query(
      `SELECT l.creator_id,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS has_verifiers,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.verifier_id = $2 AND a.status = 'ACCEPTED') AS is_verifier
       FROM levels l WHERE l.id = $1 AND (l.status <> 'CANCELLED' OR l.creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!permission.rows[0]) return res.status(404).json({ error: 'Nivel no encontrado' });
    const { creator_id: creatorId, has_verifiers: hasVerifiers, is_verifier: isVerifier } = permission.rows[0];
    const authorized = canAccessLevelChat({ creatorId, userId: req.user.id, hasAcceptedVerifiers: hasVerifiers, isAcceptedVerifier: isVerifier });
    if (!authorized) return res.json({ authorized: false, messages: [] });
    const participants = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_url,
              CASE WHEN u.id = l.creator_id THEN 'CREATOR' ELSE 'VERIFIER' END AS participant_role
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.id = $1
       UNION ALL
       SELECT u.id, u.username, u.display_name, u.avatar_url, 'VERIFIER' AS participant_role
       FROM applications a JOIN users u ON u.id = a.verifier_id
       WHERE a.level_id = $1 AND a.status = 'ACCEPTED'
       ORDER BY participant_role, display_name NULLS LAST, username`,
      [req.params.id]
    );
    const result = await pool.query(
      `SELECT m.id, m.message, m.created_at, m.attachment_mime_type, m.attachment_name,
              u.id AS sender_id, u.username AS sender_username,
              u.display_name AS sender_display_name, u.avatar_url AS sender_avatar_url
       FROM level_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.level_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ authorized: true, participants: participants.rows, messages: result.rows.reverse() });
  } catch (error) { next(error); }
});

router.post('/:id/messages', authenticateToken, (req, res, next) => {
  chatUpload(req, res, (uploadError) => {
    if (uploadError) return res.status(400).json({ error: uploadError.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el límite de 25 MB' : 'No se pudo procesar el archivo adjunto' });
    next();
  });
}, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const validationError = validateChatMessage(req.body?.message) || validateChatAttachment(req.file);
    if (validationError) return res.status(400).json({ error: validationError });
    if (!req.file && !req.body?.message?.trim()) return res.status(400).json({ error: 'El mensaje necesita texto o un archivo adjunto' });
    const permission = await pool.query(
      `SELECT l.creator_id,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS has_verifiers,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.verifier_id = $2 AND a.status = 'ACCEPTED') AS is_verifier
       FROM levels l WHERE l.id = $1 AND (l.status <> 'CANCELLED' OR l.creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!permission.rows[0]) return res.status(404).json({ error: 'Nivel no encontrado' });
    const { creator_id: creatorId, has_verifiers: hasVerifiers, is_verifier: isVerifier } = permission.rows[0];
    const authorized = canAccessLevelChat({ creatorId, userId: req.user.id, hasAcceptedVerifiers: hasVerifiers, isAcceptedVerifier: isVerifier });
    if (!authorized) return res.status(403).json({ error: 'Solo el creador y los verificadores aceptados pueden usar este chat' });
    const result = await pool.query(
      `INSERT INTO level_messages (level_id, sender_id, message, attachment_data, attachment_mime_type, attachment_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, message, created_at, attachment_mime_type, attachment_name`,
      [req.params.id, req.user.id, req.body?.message?.trim() || '', req.file?.buffer ?? null, req.file?.mimetype ?? null, req.file?.originalname.slice(0, 255) ?? null]
    );
    const message = result.rows[0];
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, related_level_id)
       SELECT participant_id, 'Nuevo mensaje', 'Hay nuevos mensajes en el chat.', 'CHAT_MESSAGE', $1
       FROM (
         SELECT l.creator_id AS participant_id FROM levels l WHERE l.id = $1 AND l.creator_id <> $2
         UNION
         SELECT a.verifier_id AS participant_id FROM applications a
         WHERE a.level_id = $1 AND a.status = 'ACCEPTED' AND a.verifier_id <> $2
       ) participants`,
      [req.params.id, req.user.id]
    );
    const sender = await pool.query(
      `SELECT id AS sender_id, username AS sender_username,
              display_name AS sender_display_name, avatar_url AS sender_avatar_url
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.status(201).json({ message: { ...message, ...sender.rows[0] } });
  } catch (error) { next(error); }
});

router.get('/:id/messages/:messageId/attachment', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id) || !isLevelId(req.params.messageId)) return res.status(404).end();
    const permission = await pool.query(
      `SELECT l.creator_id,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS has_verifiers,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.verifier_id = $2 AND a.status = 'ACCEPTED') AS is_verifier
       FROM levels l WHERE l.id = $1 AND (l.status <> 'CANCELLED' OR l.creator_id = $2)`,
      [req.params.id, req.user.id]
    );
    const p = permission.rows[0];
    if (!p || !canAccessLevelChat({ creatorId: p.creator_id, userId: req.user.id, hasAcceptedVerifiers: p.has_verifiers, isAcceptedVerifier: p.is_verifier })) return res.status(403).end();
    const result = await pool.query(
      'SELECT attachment_data, attachment_mime_type FROM level_messages WHERE id = $1 AND level_id = $2',
      [req.params.messageId, req.params.id]
    );
    const attachment = result.rows[0];
    if (!attachment?.attachment_data) return res.status(404).end();
    res.type(attachment.attachment_mime_type).set('Cache-Control', 'private, no-store').send(attachment.attachment_data);
  } catch (error) { next(error); }
});

router.patch('/:id/applications', authenticateToken, async (req, res, next) => {
  const applicationIds = req.body?.application_ids;
  const validationError = validateApplicationSelection(applicationIds);
  if (validationError) return res.status(400).json({ error: validationError });

  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const levelResult = await client.query('SELECT creator_id, name, status FROM levels WHERE id = $1 FOR UPDATE', [req.params.id]);
    const level = levelResult.rows[0];
    if (!level) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }
    if (String(level.creator_id) !== String(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el creador puede elegir verificadores para este nivel' });
    }
    if (!['AVAILABLE', 'IN_PROGRESS'].includes(level.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este nivel no admite cambios en sus verificadores' });
    }
    const selected = await client.query(
      `SELECT id, status FROM applications
       WHERE level_id = $1 AND id = ANY($2::bigint[]) FOR UPDATE`,
      [req.params.id, applicationIds]
    );
    if (selected.rows.length !== applicationIds.length || selected.rows.some((application) => application.status !== 'PENDING')) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Todas las postulaciones seleccionadas deben estar pendientes para este nivel' });
    }
    const accepted = await client.query(
      `UPDATE applications SET status = 'ACCEPTED', updated_at = NOW()
       WHERE level_id = $1 AND id = ANY($2::bigint[])
       RETURNING id, verifier_id, status, updated_at`,
      [req.params.id, applicationIds]
    );
    await client.query("UPDATE levels SET status = 'IN_PROGRESS', applications_open = FALSE, updated_at = NOW() WHERE id = $1 AND status = 'AVAILABLE'", [req.params.id]);
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_level_id)
       SELECT verifier_id, 'Postulación aceptada', $1, 'APPLICATION_ACCEPTED', $2
       FROM applications WHERE id = ANY($3::bigint[]) AND status = 'ACCEPTED'`,
      [`Tu postulación para verificar "${level.name}" fue aceptada.`, req.params.id, applicationIds]
    );
    await client.query('COMMIT');
    res.json({ accepted: accepted.rows });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.patch('/:id/verify', authenticateToken, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT l.id, l.creator_id, l.name, l.status,
              (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS accepted_verifier_count
       FROM levels l WHERE l.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const level = result.rows[0];
    if (!level) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }
    if (String(level.creator_id) !== String(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el creador puede marcar el nivel como verificado' });
    }
    if (!canCreatorMarkLevelVerified({ creatorId: level.creator_id, userId: req.user.id, status: level.status, acceptedVerifierCount: level.accepted_verifier_count })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El nivel debe estar en progreso y tener al menos un verificador aceptado' });
    }
    const updated = await client.query(
      "UPDATE levels SET status = 'VERIFIED', updated_at = NOW() WHERE id = $1 RETURNING id, status, updated_at",
      [req.params.id]
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, related_level_id)
       SELECT a.verifier_id, 'Verificación aceptada', $1, 'VERIFICATION_ACCEPTED', $2
       FROM applications a WHERE a.level_id = $2 AND a.status = 'ACCEPTED'`,
      [`La verificación de "${level.name}" fue aceptada.`, req.params.id]
    );
    await client.query('COMMIT');
    res.json({ level: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.patch('/:id/close-applications', authenticateToken, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT l.id, l.creator_id, l.status, l.applications_open,
              (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS accepted_verifier_count
       FROM levels l WHERE l.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const level = result.rows[0];
    if (!level) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }
    if (String(level.creator_id) !== String(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el creador puede cerrar las postulaciones' });
    }
    if (!canCreatorCloseApplications({ creatorId: level.creator_id, userId: req.user.id, status: level.status, applicationsOpen: level.applications_open, acceptedVerifierCount: level.accepted_verifier_count })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No se pueden cerrar las postulaciones para este nivel' });
    }
    const updated = await client.query(
      'UPDATE levels SET applications_open = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, status, applications_open, updated_at',
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ level: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.patch('/:id/withdraw', authenticateToken, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT l.id, l.creator_id, l.status,
              (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS accepted_verifier_count
       FROM levels l WHERE l.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const level = result.rows[0];
    if (!level) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }
    if (String(level.creator_id) !== String(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el creador puede retirar este nivel' });
    }
    if (!canCreatorWithdrawLevel({ creatorId: level.creator_id, userId: req.user.id, status: level.status, acceptedVerifierCount: level.accepted_verifier_count })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se puede retirar un nivel disponible sin verificadores aceptados' });
    }
    const updated = await client.query(
      "UPDATE levels SET status = 'CANCELLED', applications_open = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, status, applications_open, updated_at",
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ level: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.patch('/:id/restore', authenticateToken, async (req, res, next) => {
  let client;
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT l.id, l.creator_id, l.status,
              (SELECT COUNT(*)::int FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS accepted_verifier_count
       FROM levels l WHERE l.id = $1 FOR UPDATE`,
      [req.params.id]
    );
    const level = result.rows[0];
    if (!level) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Nivel no encontrado' });
    }
    if (String(level.creator_id) !== String(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Solo el creador puede restaurar este nivel' });
    }
    if (!canCreatorRestoreLevel({ creatorId: level.creator_id, userId: req.user.id, status: level.status, acceptedVerifierCount: level.accepted_verifier_count })) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Solo se puede restaurar un nivel cancelado sin verificadores aceptados' });
    }
    const updated = await client.query(
      "UPDATE levels SET status = 'AVAILABLE', applications_open = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id, status, applications_open, updated_at",
      [req.params.id]
    );
    await client.query('COMMIT');
    res.json({ level: updated.rows[0] });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.post('/:id/applications', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const result = await pool.query(
      `SELECT l.id, l.creator_id, l.game_mode, l.status, l.applications_open,
              l.minimum_hardest_aredl_id,
              u.hardest_classic_aredl_id, u.hardest_platformer_aredl_id
       FROM levels l CROSS JOIN users u
       WHERE l.id = $1 AND u.id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nivel no encontrado' });
    const level = result.rows[0];
    if (level.status !== 'AVAILABLE' || !level.applications_open) return res.status(409).json({ error: 'Este nivel no acepta postulaciones en este momento' });
    if (String(level.creator_id) === String(req.user.id)) return res.status(403).json({ error: 'No podés postularte para verificar tu propio nivel' });

    if (level.minimum_hardest_aredl_id) {
      const listType = level.game_mode === 'PLATFORMER' ? 'platformer' : 'classic';
      let list;
      try { list = await getAredlLevels(listType); }
      catch (error) {
        console.error('Could not validate verifier AREDL hardest:', error.message);
        return res.status(503).json({ error: 'No se pudo validar el hardest con AREDL. Probá de nuevo más tarde.' });
      }
      const minimum = list.find((item) => item.id === level.minimum_hardest_aredl_id);
      const playerId = listType === 'platformer' ? level.hardest_platformer_aredl_id : level.hardest_classic_aredl_id;
      const playerHardest = list.find((item) => item.id === playerId);
      if (!minimum) return res.status(409).json({ error: 'El requisito de hardest de este nivel ya no está disponible en AREDL' });
      if (!playerHardest || !meetsHardestRequirement(playerHardest.position, minimum.position)) {
        return res.status(403).json({ error: 'Tu hardest no alcanza el requisito mínimo de este nivel' });
      }
    }

    const client = await pool.connect();
    let application;
    try {
      await client.query('BEGIN');
      const locked = await client.query('SELECT status, applications_open FROM levels WHERE id = $1 FOR UPDATE', [level.id]);
      if (!locked.rows[0] || locked.rows[0].status !== 'AVAILABLE' || !locked.rows[0].applications_open) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Este nivel no acepta postulaciones en este momento' });
      }
      application = await client.query(
        `INSERT INTO applications (level_id, verifier_id, status)
         VALUES ($1, $2, 'PENDING')
         RETURNING id, level_id, verifier_id, status, created_at`,
        [level.id, req.user.id]
      );
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, related_level_id)
         SELECT creator_id, 'Nueva postulación', $1, 'APPLICATION_RECEIVED', $2
         FROM levels WHERE id = $2`,
        [`Tu nivel recibió una postulación: "${level.name}".`, level.id]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
    res.status(201).json({ application: application.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya te postulaste para este nivel' });
    next(error);
  }
});

export default router;
