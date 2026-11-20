import { Router } from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { getAredlLevels } from '../services/aredl.js';
import { isLevelId, meetsHardestRequirement, validateLevelInput } from '../services/levelRules.js';

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
