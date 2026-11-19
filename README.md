# GD Verifications

Plataforma comunitaria propia para Geometry Dash: perfiles de jugadores y, como objetivo del proyecto, publicación de niveles y su proceso de verificación. No es ReservaClub.

> **Estado honesto de la entrega:** hay una interfaz React bilingüe de inicio y perfiles, API Express para autenticación y perfiles, esquema/migraciones PostgreSQL y pruebas unitarias iniciales. El catálogo, CRUD de niveles, postulaciones, entregas, notificaciones y administración todavía no están implementados. La configuración de despliegue está preparada, pero los servicios públicos aún deben crearse y probarse; clonar el repositorio no significa que ya esté online.

## Documentación del proyecto

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
   ```

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

Después de crear la base, ejecutar las cuatro migraciones SQL de arriba **una sola vez y en orden** contra la base de Render, usando la conexión de PostgreSQL que muestra el Dashboard. La API responderá `503` en `/api/v1/health` si no puede conectarse a PostgreSQL; las rutas que dependen de tablas requieren que las migraciones estén aplicadas. Copiar la URL pública del servicio (por ejemplo, `https://gd-verifications-api.onrender.com`) para el siguiente paso.

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
