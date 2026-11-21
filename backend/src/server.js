import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import app from './app.js';
import { pool } from './config/database.js';
import { restoreExpiredBans } from './services/bans.js';

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    await pool.query(schema);
    await restoreExpiredBans();
    console.log('Esquema PostgreSQL comprobado e inicializado.');
    const banCleanup = setInterval(() => restoreExpiredBans().catch((error) => console.error('No se pudieron restaurar niveles tras una suspensión:', error)), 60_000);
    banCleanup.unref();
    app.listen(port, '0.0.0.0', () => {
      console.log(`GD Verifications API escuchando en el puerto ${port}`);
    });
  } catch (error) {
    console.error('No se pudo inicializar PostgreSQL. Verificá DATABASE_URL y que la base esté vacía o tenga el esquema completo.', error);
    await pool.end();
    process.exitCode = 1;
  }
}

start();
