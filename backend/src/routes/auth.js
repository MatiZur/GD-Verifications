import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { validateRegistration } from '../validators/auth.js';

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// REGISTRO
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body ?? {};
    const validationError = validateRegistration({ username, email, password });
    if (validationError) return res.status(400).json({ error: validationError });

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, avatar_url, role, created_at`,
      [username, normalizedEmail, passwordHash]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ese nombre de usuario o email ya está registrado'
      });
    }

    next(error);
  }
});

// INICIO DE SESIÓN
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};

    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string') {
      return res.status(400).json({
        error: 'El nombre de usuario y la contraseña son obligatorios'
      });
    }

    const result = await pool.query(
      `SELECT id, username, email, password_hash, avatar_url, role, created_at
       FROM users
       WHERE username = $1`,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    delete user.password_hash;

    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    next(error);
  }
});

// USUARIO AUTENTICADO
router.get('/me', async (req, res) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No autenticado'
      });
    }

    const token = authorization.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT id, username, email, avatar_url, role, created_at
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({ user: result.rows[0] });
  } catch {
    res.status(401).json({
      error: 'Sesión inválida o expirada'
    });
  }
});

export default router;
