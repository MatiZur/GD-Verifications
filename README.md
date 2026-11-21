# GD Verifications

Plataforma comunitaria para Geometry Dash: perfiles de jugadores, publicación y descubrimiento de niveles, postulaciones, verificaciones, chats y moderación.

Link a la página: https://gd-verifications.matyzur.workers.dev

**Estado del proyecto:** la interfaz bilingüe incluye perfiles, catálogo y publicación moderada de niveles, postulaciones, actividad, chats, notificaciones y panel administrativo. La API Express con PostgreSQL implementa autenticación, permisos por rol y propiedad, moderación auditada y las funciones descritas en esta documentación. La migración 011 crea la cuenta inicial `owner`; cambiá su contraseña antes de exponer el servicio. El frontend está publicado en Cloudflare. El estado de la API y la base de datos depende del despliegue configurado en Render; consultá el informe de pruebas para el alcance verificado.

## Documentación del proyecto

- [Manual de usuario](https://docs.google.com/document/d/1u6SzjtVL5mSNFIp3FXwzHChtGPNT6coAoHiRv-iWZHU/edit?usp=sharing)
- [Manual técnico](https://docs.google.com/document/d/1MRefNMPLrScuJvHlq8ypYJUEAAQ6QeBRHxCgxUFFeUs/edit?usp=sharing)
- [Spec funcional con reglas numeradas](./docs/SPEC.md)
- [Plan de tareas y estado](./docs/PLAN.md)
- [Informe de pruebas](./docs/TEST_REPORT.md)
- [Reglas para agentes](./AGENTS.md)

## Arquitectura

- `frontend/`: React + Vite; interfaz en español/inglés.
- `backend/`: Node.js + Express; API REST bajo `/api/v1`.
- PostgreSQL: usuarios, perfiles, niveles, postulaciones, chats, notificaciones y auditoría administrativa.
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

   La migración 011 crea la cuenta inicial `owner` con contraseña `owner`. Iniciá sesión y cambiá esa contraseña desde el perfil antes de publicar la aplicación; nunca dejes la credencial inicial activa en producción. Admins y owner revisan los niveles nuevos antes de publicarlos; el owner es el único rol que puede promover usuarios a admin.

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

## Funcionalidades y API

- `GET /api/v1/levels`: catálogo público de niveles aprobados, en progreso o verificados. Los niveles nuevos quedan pendientes hasta que un admin o el owner los revise.
- `GET /api/v1/levels/:id` y `POST /api/v1/levels` (Bearer token): consulta y publicación de niveles con modalidad, Top estimado, video de YouTube y requisito AREDL mínimo opcional.
- `POST /api/v1/levels/:id/applications` (Bearer token): postulación como verificador. El backend valida que el hardest del perfil cumpla el mínimo y corresponda a la modalidad.
- `/api/v1/levels/:id/chat` y `/messages`: chat y adjuntos limitados al creador y verificadores aceptados; las cuentas admin y owner no tienen acceso.
- `/api/v1/notifications`: consulta y actualización de notificaciones propias.
- `/api/v1/admin/users` y `/api/v1/admin/levels/pending`: administración de jugadores y niveles pendientes, restringida a admins y owner. `PATCH /api/v1/admin/levels/:id/review` aprueba o rechaza con auditoría; `PATCH /api/v1/admin/users/:id/promote` es exclusivo del owner.
- `GET /api/v1/users/aredl/extremes`: listas AREDL que alimentan los selectores de hardest.

La aceptación múltiple de verificadores está implementada. El rechazo individual de postulaciones y el flujo de entrega y resolución de pruebas de verificación siguen pendientes; ver [SPEC](./docs/SPEC.md) y [PLAN](./docs/PLAN.md) para el estado detallado.

## Pruebas

Desde `backend/`:

```bash
npm test
```

Desde `frontend/`:

```bash
npm run build
```

Los tests actuales cubren reglas de negocio y validaciones del backend, pero no reemplazan las pruebas de integración con PostgreSQL ni E2E. Ver [informe de pruebas](./docs/TEST_REPORT.md) para resultados y límites actualizados.

## Despliegue

### 1. API + PostgreSQL en Render

El archivo [render.yaml](./render.yaml) declara un Blueprint con una API Node y una base PostgreSQL conectada mediante `DATABASE_URL`; Render genera `JWT_SECRET` y solicita `FRONTEND_URL` como valor externo. En Render, crear un Blueprint desde este repositorio y revisar los recursos y costos antes de confirmar.

El Blueprint asigna el plan gratuito al servicio web y el plan PostgreSQL persistente mínimo (`0.1c-256mb`). Según la [página de precios de Render](https://render.com/pricing), ese plan de PostgreSQL figura actualmente a USD 6/mes; el precio puede cambiar. La base gratuita de Render expira a los 30 días, por lo que no se usa para una entrega que deba conservar datos a largo plazo ([límites del plan gratuito](https://render.com/docs/free)).

Después de crear la base, ejecutar las once migraciones SQL de arriba **una sola vez y en orden** contra la base de Render, usando la conexión de PostgreSQL que muestra el Dashboard. La migración 011 crea la cuenta owner inicial; cambiá su contraseña inmediatamente. La API responde `503` en `/api/v1/health` si no puede conectarse a PostgreSQL; las rutas que dependen de tablas requieren que las migraciones estén aplicadas. Copiar la URL pública del servicio para el siguiente paso.

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
- Nunca registrar usuarios como `ADMIN` u `OWNER` desde el endpoint público. Solo el owner puede promover usuarios normales a admin.
- Backend debe validar identidad, rol y propiedad para cada nueva operación; la UI sola no protege acciones.
- Antes de producción: rate limiting, reglas de contraseñas más robustas, validación integral de entradas, estrategia de expiración/revocación JWT, monitoreo y pruebas de integración/E2E.
- Los videos se muestran mediante enlaces validados de YouTube; no se suben archivos de video. AREDL provee los hardest del perfil y los requisitos de niveles.

## Repositorio

<https://github.com/MatiZur/GD-Verifications>
