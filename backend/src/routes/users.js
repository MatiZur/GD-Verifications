import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { isAvatarValue, isHttpUrl, isYouTubeUrl } from '../validators/profile.js';
import { getAredlLevels } from '../services/aredl.js';

const router = Router();
const PROFILE_FIELDS = {
  display_name: { column: 'display_name', max: 50 },
  pronouns: { column: 'pronouns', max: 40 },
  country: { column: 'country', max: 80 },
  gd_username: { column: 'gd_username', max: 50 },
  bio: { column: 'bio', max: 500 },
  avatar_url: { column: 'avatar_url', max: 1_500_000, url: true },
  youtube_url: { column: 'youtube_url', max: 2048, url: true, youtube: true },
  discord_username: { column: 'discord_username', max: 32 }
};

const publicProfileFields = `
  id, username, display_name, pronouns, country, gd_username,
  hardest_classic_aredl_id, hardest_classic_aredl_name,
  hardest_platformer_aredl_id, hardest_platformer_aredl_name,
  avatar_url, bio, youtube_url, discord_username,
  created_at
`;

router.get('/aredl/extremes', async (_req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=900');
    const [classic, platformer] = await Promise.all([
      getAredlLevels('classic'),
      getAredlLevels('platformer')
    ]);
    res.json({ classic, platformer });
  } catch (error) {
    console.error('Could not load AREDL levels:', error.message);
    res.status(503).json({ error: 'No se pudo cargar la lista de AREDL. Probá de nuevo más tarde.' });
  }
});

// Public profile by account username.
router.get('/:username', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ${publicProfileFields},
              (SELECT COUNT(*) FROM levels WHERE creator_id = users.id) AS level_count,
              (SELECT COUNT(*) FROM verification_submissions WHERE verifier_id = users.id) AS verification_count
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [req.params.username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = result.rows[0];
    user.created_at_formatted = new Date(user.created_at).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.patch('/me/profile', authenticateToken, async (req, res, next) => {
  let client;
  try {
    client = await pool.connect();
    const body = req.body ?? {};
    const updates = [];
    const values = [];

    for (const [field, config] of Object.entries(PROFILE_FIELDS)) {
      if (!Object.hasOwn(body, field)) continue;
      const value = body[field];
      if (value !== null && typeof value !== 'string') {
        return res.status(400).json({ error: `El campo ${field} no es válido` });
      }
      const normalized = value?.trim() || null;
      if (normalized && normalized.length > config.max) {
        return res.status(400).json({ error: `El campo ${field} supera el máximo de ${config.max} caracteres` });
      }
      const isAvatarData = field === 'avatar_url' && normalized?.startsWith('data:image/');
      if (config.url && !isAvatarData && !isHttpUrl(normalized)) {
        return res.status(400).json({ error: `El campo ${field} debe ser una URL HTTP o HTTPS válida` });
      }
      if (field === 'avatar_url' && !isAvatarValue(normalized)) {
        return res.status(400).json({ error: 'La imagen no es válida o supera el tamaño permitido' });
      }
      if (config.youtube && !isYouTubeUrl(normalized)) {
        return res.status(400).json({ error: 'Ingresá un enlace válido de YouTube' });
      }
      values.push(normalized);
      updates.push(`${config.column} = $${values.length}`);
    }

    const currentHardests = await client.query(
      `SELECT hardest_classic_aredl_id, hardest_classic_aredl_name,
              hardest_platformer_aredl_id, hardest_platformer_aredl_name
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    for (const type of ['classic', 'platformer']) {
      const idField = `hardest_${type}_aredl_id`;
      const nameField = `hardest_${type}_aredl_name`;
      if (!Object.hasOwn(body, idField)) continue;

      const hardestId = body[idField] || null;
      if (hardestId !== null && typeof hardestId !== 'string') {
        return res.status(400).json({ error: 'El hardest seleccionado no es válido' });
      }

      let hardestName = null;
      if (hardestId) {
        const oldId = currentHardests.rows[0]?.[idField];
        if (oldId === hardestId) {
          hardestName = currentHardests.rows[0][nameField];
        } else {
          let levels;
          try {
            levels = await getAredlLevels(type);
          } catch (error) {
            console.error(`Could not validate ${type} AREDL selection:`, error.message);
            return res.status(503).json({ error: 'No se pudo validar el nivel con AREDL. Probá de nuevo más tarde.' });
          }
          const selectedLevel = levels.find((level) => level.id === hardestId);
          if (!selectedLevel) {
            return res.status(400).json({ error: `Elegí un nivel de la lista AREDL de ${type === 'classic' ? 'clásicos' : 'plataforma'}` });
          }
          hardestName = selectedLevel.name;
        }
      }

      values.push(hardestId, hardestName);
      updates.push(`${idField} = $${values.length - 1}`, `${nameField} = $${values.length}`);
    }

    const newPassword = body.new_password;
    if (newPassword !== undefined && newPassword !== '') {
      if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 72) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener entre 8 y 72 caracteres' });
      }
      if (typeof body.current_password !== 'string' || !body.current_password) {
        return res.status(400).json({ error: 'Ingresá tu contraseña actual para cambiarla' });
      }
      const current = await client.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
      if (!current.rows[0] || !(await bcrypt.compare(body.current_password, current.rows[0].password_hash))) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }
      values.push(await bcrypt.hash(newPassword, 12));
      updates.push(`password_hash = $${values.length}`);
    } else if (body.current_password) {
      return res.status(400).json({ error: 'Ingresá una nueva contraseña para completar el cambio' });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay cambios para guardar' });
    }

    values.push(req.user.id);
    const result = await client.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING ${publicProfileFields}, role`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = result.rows[0];
    user.created_at_formatted = new Date(user.created_at).toLocaleDateString('es-AR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    res.json({ user });
  } catch (error) {
    next(error);
  } finally {
    client?.release();
  }
});

export default router;
