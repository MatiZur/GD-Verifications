import { Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAredlLevels } from '../services/aredl.js';
import { isLevelId, meetsHardestRequirement, validateLevelInput } from '../services/levelRules.js';
import { validateApplicationSelection } from '../services/applicationRules.js';
import { canAccessLevelChat, validateChatMessage } from '../services/chatRules.js';

const router = Router();
const levelFields = `
  l.id, l.creator_id, l.name, l.description, l.gd_level_id, l.difficulty,
  l.difficulty_estimate, l.game_mode, l.showcase_url, l.status,
  l.minimum_hardest_aredl_id, l.minimum_hardest_aredl_name,
  (l.image_data IS NOT NULL) AS has_image,
  l.created_at, u.username AS creator_username, u.display_name AS creator_display_name
`;

router.get('/', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${levelFields}
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.status IN ('AVAILABLE', 'IN_PROGRESS', 'VERIFIED')
       ORDER BY l.created_at DESC`
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
              l.status AS level_status, l.minimum_hardest_aredl_name, l.created_at,
              (l.image_data IS NOT NULL) AS has_image,
              owner.username AS creator_username, owner.display_name AS creator_display_name
       FROM applications a JOIN levels l ON l.id = a.level_id
       JOIN users owner ON owner.id = l.creator_id
       WHERE a.verifier_id = $1 ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ applications: result.rows });
  } catch (error) { next(error); }
});

router.get('/:id/image', async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).end();
    const result = await pool.query(
      "SELECT image_data, image_mime_type FROM levels WHERE id = $1 AND status IN ('AVAILABLE', 'IN_PROGRESS', 'VERIFIED')",
      [req.params.id]
    );
    if (!result.rows[0]?.image_data) return res.status(404).end();
    res.type(result.rows[0].image_mime_type).set('Cache-Control', 'public, max-age=86400').send(result.rows[0].image_data);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const result = await pool.query(
      `SELECT ${levelFields}
       FROM levels l JOIN users u ON u.id = l.creator_id
       WHERE l.id = $1 AND l.status IN ('AVAILABLE', 'IN_PROGRESS', 'VERIFIED')`,
      [req.params.id]
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
       FROM levels l WHERE l.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!permission.rows[0]) return res.status(404).json({ error: 'Nivel no encontrado' });
    const { creator_id: creatorId, has_verifiers: hasVerifiers, is_verifier: isVerifier } = permission.rows[0];
    const authorized = canAccessLevelChat({ creatorId, userId: req.user.id, hasAcceptedVerifiers: hasVerifiers, isAcceptedVerifier: isVerifier });
    if (!authorized) return res.json({ authorized: false, messages: [] });
    const result = await pool.query(
      `SELECT m.id, m.message, m.created_at,
              u.id AS sender_id, u.username AS sender_username,
              u.display_name AS sender_display_name, u.avatar_url AS sender_avatar_url
       FROM level_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.level_id = $1 ORDER BY m.created_at DESC, m.id DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ authorized: true, messages: result.rows.reverse() });
  } catch (error) { next(error); }
});

router.post('/:id/messages', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const validationError = validateChatMessage(req.body?.message);
    if (validationError) return res.status(400).json({ error: validationError });
    const permission = await pool.query(
      `SELECT l.creator_id,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.status = 'ACCEPTED') AS has_verifiers,
              EXISTS (SELECT 1 FROM applications a WHERE a.level_id = l.id AND a.verifier_id = $2 AND a.status = 'ACCEPTED') AS is_verifier
       FROM levels l WHERE l.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!permission.rows[0]) return res.status(404).json({ error: 'Nivel no encontrado' });
    const { creator_id: creatorId, has_verifiers: hasVerifiers, is_verifier: isVerifier } = permission.rows[0];
    const authorized = canAccessLevelChat({ creatorId, userId: req.user.id, hasAcceptedVerifiers: hasVerifiers, isAcceptedVerifier: isVerifier });
    if (!authorized) return res.status(403).json({ error: 'Solo el creador y los verificadores aceptados pueden usar este chat' });
    const result = await pool.query(
      `INSERT INTO level_messages (level_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, message, created_at`,
      [req.params.id, req.user.id, req.body.message.trim()]
    );
    const message = result.rows[0];
    const sender = await pool.query(
      `SELECT id AS sender_id, username AS sender_username,
              display_name AS sender_display_name, avatar_url AS sender_avatar_url
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.status(201).json({ message: { ...message, ...sender.rows[0] } });
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
    const levelResult = await client.query('SELECT creator_id, status FROM levels WHERE id = $1 FOR UPDATE', [req.params.id]);
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
    await client.query("UPDATE levels SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1 AND status = 'AVAILABLE'", [req.params.id]);
    await client.query('COMMIT');
    res.json({ accepted: accepted.rows });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally { client?.release(); }
});

router.post('/:id/applications', authenticateToken, async (req, res, next) => {
  try {
    if (!isLevelId(req.params.id)) return res.status(404).json({ error: 'Nivel no encontrado' });
    const result = await pool.query(
      `SELECT l.id, l.creator_id, l.game_mode, l.status,
              l.minimum_hardest_aredl_id,
              u.hardest_classic_aredl_id, u.hardest_platformer_aredl_id
       FROM levels l CROSS JOIN users u
       WHERE l.id = $1 AND u.id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Nivel no encontrado' });
    const level = result.rows[0];
    if (level.status !== 'AVAILABLE') return res.status(409).json({ error: 'Este nivel no acepta postulaciones en este momento' });
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

    const application = await pool.query(
      `INSERT INTO applications (level_id, verifier_id, status)
       VALUES ($1, $2, 'PENDING')
       RETURNING id, level_id, verifier_id, status, created_at`,
      [level.id, req.user.id]
    );
    res.status(201).json({ application: application.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya te postulaste para este nivel' });
    next(error);
  }
});

export default router;
