import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { restoreExpiredBans } from '../services/bans.js';

export async function authenticateToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    const token = authorization.slice(7);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userResult = await pool.query(
      'SELECT id, username, role, banned_at, ban_until FROM users WHERE id = $1',
      [decoded.id]
    );
    const currentUser = userResult.rows[0];
    if (!currentUser) return res.status(401).json({ error: 'Usuario no encontrado' });
    const banActive = Boolean(currentUser.banned_at && (!currentUser.ban_until || new Date(currentUser.ban_until) > new Date()));
    if (currentUser.banned_at && currentUser.ban_until && !banActive) await restoreExpiredBans();
    req.user = { id: currentUser.id, username: currentUser.username, role: currentUser.role, isBanned: banActive };
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') return next(error);
    return res.status(401).json({
      error: 'Sesión inválida o expirada'
    });
  }
}

export function requireActiveUser(req, res, next) {
  if (req.user?.isBanned) return res.status(403).json({ error: 'Tu cuenta está suspendida y no puede realizar esta acción' });
  next();
}

export function optionalToken(req, _res, next) {
  try {
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
      req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    }
  } catch {
    req.user = null;
  }
  next();
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ error: 'No autenticado' });
    try {
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      if (!result.rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
      req.user.role = result.rows[0].role;
      if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'No tenés permisos para realizar esta acción' });
      next();
    } catch (error) { next(error); }
  };
}
