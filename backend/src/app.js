import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

app.use(express.json({ limit: '3mb' }));

// HEALTH CHECK
app.get('/api/v1/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'unavailable'
    });
  }
});

// AUTENTICACIÓN
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// RUTAS INEXISTENTES
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado'
  });
});

// MANEJO DE ERRORES
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: 'Error interno del servidor'
  });
});

export default app;
