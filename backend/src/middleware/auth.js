import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';

export function authenticateToken(req, res, next) {
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

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Sesión inválida o expirada'
    });
  }
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
