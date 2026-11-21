# GD Verifications

Plataforma comunitaria propia para Geometry Dash: perfiles de jugadores y, como objetivo del proyecto, publicación de niveles y su proceso de verificación.

Link a la página: gd-verifications.matyzur.workers.dev

> **Estado del proyecto:** la interfaz bilingüe incluye perfiles, niveles, actividad, chats, notificaciones y panel administrativo. La API Express con PostgreSQL implementa autenticación, postulaciones, permisos de propietario/admin, moderación y notificaciones. La cuenta owner inicial se crea con la migración 011 y su contraseña debe cambiarse antes de producción. Revisá el informe de pruebas y la sección de despliegue para confirmar el estado de los servicios públicos.

## Documentación del proyecto

- [Manual de usuario](https://docs.google.com/document/d/1gD1WXD5BR9XZh4fTzxv66P4tTD750u5A9dHY3E0c5O0/edit?usp=sharing)
- [Manual técnico](https://docs.google.com/document/d/1r_U9tC1NptVyeNYuwHLNbeUf188OKJH1342dwTVY9uU/edit?usp=sharing)
- [Spec funcional con reglas numeradas](./docs/SPEC.md)
- [Plan de tareas y estado](./docs/PLAN.md)
- [Informe de pruebas](./docs/TEST_REPORT.md)
- [Reglas para agentes](./AGENTS.md)

## Arquitectura

- `frontend/`: React + Vite; interfaz en español/inglés.
- `backend/`: Node.js + Express; API REST bajo `/api/v1`.
- PostgreSQL: usuarios, perfiles y tablas preparadas para el flujo futuro de verificaciones.
- Render Blueprint: `render.yaml` declara API y PostgreSQL relacionados.
- Cloudflare Pages: frontend estático generado en `frontend/dist`.

## Requisitos y ejecución local

- Node.js 20 o superior.
- PostgreSQL local o accesible.

1. Crear la base `gd_verifications` y ejecutar las migraciones, en orden y una sola vez:

   ```bash
   psql -d gd_verifications -f backend/migrations/001_initial_schema.sql
   psql -d gd_verifications -f backend/migrations/002_user_profiles.sql
   psql -d gd_verifications -f backend/migrations/003_profile_hardest_types.sql
   psql -d gd_verifications -f backend/migrations/004_user_pronouns_country.sql
   psql -d gd_verifications -f backend/migrations/005_level_requirements.sql
   psql -d gd_verifications -f backend/migrations/006_level_images.sql
   psql -d gd_verifications -f backend/migrations/007_multiple_accepted_applications.sql
   psql -d gd_verifications -f backend/migrations/008_level_chat.sql
   psql -d gd_verifications -f backend/migrations/009_chat_attachments.sql
   psql -d gd_verifications -f backend/migrations/010_level_applications_open.sql
   psql -d gd_verifications -f backend/migrations/011_owner_and_moderation.sql
   ```

   La migración 011 crea la cuenta inicial `owner` con contraseña `owner`. Iniciá sesión y cambiá esa contraseña desde el perfil antes de publicar la aplicación; nunca dejes la credencial inicial activa en producción.

2. Copiar `backend/.env.example` a `backend/.env`, completar `DATABASE_URL` y reemplazar `JWT_SECRET` con un secreto aleatorio privado. Luego:

   ```bash
   cd backend
   npm ci
   npm run dev
   ```

3. Copiar `frontend/.env.example` a `frontend/.env`. Para desarrollo conserva `VITE_API_URL=http://localhost:3000/api/v1`. En otra terminal:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

Frontend: <http://localhost:5173>  
API health check: <http://localhost:3000/api/v1/health>

## Niveles disponibles en esta versión

- `GET /api/v1/levels`: catálogo público de niveles disponibles, en progreso o verificados.
- `GET /api/v1/levels/:id`: detalle público de un nivel.
- `POST /api/v1/levels` (Bearer token): publica nombre, modalidad, Top estimado, enlace HTTPS de YouTube y descripción opcional.
- `POST /api/v1/levels/:id/applications` (Bearer token): solicita verificarlo. Si el nivel define hardest mínimo, solo acepta perfiles cuyo hardest AREDL de la modalidad tenga una posición igual o menor (más difícil) que el mínimo.
- `GET /api/v1/users/aredl/extremes`: listas AREDL que alimentan el selector de mínimos.

Por ahora, los niveles se publican directamente como `AVAILABLE`; no hay moderación ni resolución de solicitudes en la interfaz.

## Pruebas

Desde `backend/`:

```bash
npm test
```

Desde `frontend/`:

```bash
npm run build
```

Los tests de backend actuales validan reglas aisladas de registro, enlaces y avatares; no son pruebas de integración de base de datos ni E2E. Ver [informe de pruebas](./docs/TEST_REPORT.md) para el alcance y estado actualizado.

## Despliegue

### 1. API + PostgreSQL en Render

El archivo [render.yaml](./render.yaml) declara un Blueprint con una API Node y una base PostgreSQL conectada mediante `DATABASE_URL`; Render genera `JWT_SECRET` y solicita `FRONTEND_URL` como valor externo. En Render, crear un Blueprint desde este repositorio y revisar los recursos y costos antes de confirmar.

El Blueprint asigna el plan gratuito al servicio web y el plan PostgreSQL persistente mínimo (`0.1c-256mb`). Según la [página de precios de Render](https://render.com/pricing), ese plan de PostgreSQL figura actualmente a USD 6/mes; el precio puede cambiar. La base gratuita de Render expira a los 30 días, por lo que no se usa para una entrega que deba conservar datos a largo plazo ([límites del plan gratuito](https://render.com/docs/free)).

Después de crear la base, ejecutar las cinco migraciones SQL de arriba **una sola vez y en orden** contra la base de Render, usando la conexión de PostgreSQL que muestra el Dashboard. La API responderá `503` en `/api/v1/health` si no puede conectarse a PostgreSQL; las rutas que dependen de tablas requieren que las migraciones estén aplicadas. Copiar la URL pública del servicio (por ejemplo, `https://gd-verifications-api.onrender.com`) para el siguiente paso.

### 2. Frontend en Cloudflare Pages

Crear un proyecto Pages conectado al repositorio con estos valores, de acuerdo con la [configuración de build de Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/):

| Ajuste | Valor |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `VITE_API_URL=https://<API-RENDER>/api/v1` |

Configurar el valor de `VITE_API_URL` para producción en Cloudflare Pages y volver a desplegar. Después, configurar `FRONTEND_URL` en Render con el origen exacto de Pages, sin una ruta final (por ejemplo `https://<proyecto>.pages.dev`), para habilitar CORS. Verificar el health check público, registro, inicio de sesión y edición de perfil desde el dominio de Pages.

## Seguridad y límites conocidos

- No subir archivos `.env`; el repositorio ignora `.env` y `.env.*`, excepto los `.env.example` con placeholders.
- Nunca registrar usuarios como `ADMIN` desde el endpoint público.
- Backend debe validar identidad, rol y propiedad para cada nueva operación; la UI sola no protege acciones.
- Antes de producción: rate limiting, reglas de contraseñas más robustas, validación integral de entradas, estrategia de expiración/revocación JWT, monitoreo y pruebas de integración/E2E.
- No almacenar videos: se guardarán enlaces validados de YouTube cuando se implemente el flujo de niveles/verificaciones. AREDL provee actualmente los hardest del perfil; GD Browser queda previsto para los niveles.

## Repositorio

<https://github.com/MatiZur/GD-Verifications>
