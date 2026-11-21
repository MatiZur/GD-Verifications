import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import app from './app.js';
import { pool } from './config/database.js';

const port = Number(process.env.PORT) || 3000;

async function start() {
  try {
    const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
    await pool.query(schema);
    console.log('Esquema PostgreSQL comprobado e inicializado.');
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
