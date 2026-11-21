# GD Verifications

Plataforma comunitaria para Geometry Dash: perfiles de jugadores, publicación y descubrimiento de niveles, postulaciones, verificaciones, chats y moderación.

Link a la página: https://gd-verifications.matyzur.workers.dev

**Estado del proyecto:** la interfaz bilingüe incluye perfiles, catálogo, postulaciones, actividad, chats, notificaciones y administración. La API Express con PostgreSQL implementa autenticación, permisos, Open verification, revisión administrativa de pruebas y reportes de chat con suspensiones. El frontend está publicado en Cloudflare y la API con PostgreSQL en Render.

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
- Render: un servicio web para la API y una base PostgreSQL, creados por separado desde el panel.
- Cloudflare Workers: frontend estático publicado en <https://gd-verifications.matyzur.workers.dev>.

## Requisitos y ejecución local

- Node.js 20 o superior.
- PostgreSQL local o accesible.

1. Crear una base PostgreSQL vacía llamada `gd_verifications` y configurar `DATABASE_URL` en `backend/.env`. Al iniciar la API, `backend/schema.sql` crea automáticamente todas las tablas, restricciones e índices y agrega la cuenta inicial `owner` (`owner` / `owner`). No hace falta ejecutar scripts SQL manualmente. Cambiá esa contraseña desde el perfil antes de exponer la aplicación a internet. Admins y owner revisan los niveles nuevos antes de publicarlos; el owner es el único rol que puede promover usuarios a admin.

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
- `PATCH /api/v1/levels/:id/applications/:applicationId/reject` (Bearer token): el creador rechaza una postulación pendiente; la fila se conserva y la restricción única impide que ese jugador vuelva a postularse a ese nivel.
- `/api/v1/levels/:id/chat` y `/messages`: chat y adjuntos limitados al creador y verificadores aceptados; las cuentas admin y owner no tienen acceso.
- `POST /api/v1/levels/:id/verification-submissions`: entrega de ID pública, video de YouTube y verificador aceptado; admin/owner resuelven la cola en `/api/v1/admin/verification-submissions/pending`.
- `POST /api/v1/levels/:id/chat-reports`: reporte de otro participante; un caso abierto habilita lectura administrativa del chat. `/api/v1/admin/chat-reports` permite descartarlo o suspender al usuario.
- `/api/v1/notifications`: consulta y actualización de notificaciones propias.
- `/api/v1/admin/users` y `/api/v1/admin/levels/pending`: administración de jugadores y niveles pendientes, restringida a admins y owner. `PATCH /api/v1/admin/levels/:id/review` aprueba o rechaza con auditoría; `PATCH /api/v1/admin/users/:id/promote` es exclusivo del owner.
- `GET /api/v1/users/aredl/extremes`: listas AREDL que alimentan los selectores de hardest.

El creador puede aceptar varias postulaciones o rechazar una pendiente; una postulación rechazada permanece registrada y bloquea nuevos intentos del mismo jugador en ese nivel. También están implementados la entrega de pruebas por el creador en nombre de un verificador aceptado, la revisión administrativa, Open verification y los reportes de chat con suspensiones. Ver [SPEC](./docs/SPEC.md) y [PLAN](./docs/PLAN.md) para el alcance detallado.

## Pruebas

Desde `backend/`:

```bash
npm test
```

Desde `frontend/`:

```bash
npm run build
```

La suite actual contiene 44 tests automatizados y el frontend compila para producción. Ver [informe de pruebas](./docs/TEST_REPORT.md) para resultados locales, comprobaciones públicas y límites.

## Despliegue

### 1. API + PostgreSQL en Render

1. **Crear PostgreSQL:** en Render, elegí `New` → `PostgreSQL`; poné un nombre (por ejemplo `gd-verifications-db`), la base `gd_verifications` y seleccioná el plan **Free**. Elegí una región y anotala para usar la misma en el servicio web. Una base gratuita de Render es temporal: expira a los 30 días y tiene límites de almacenamiento, conexiones y disponibilidad; exportá los datos antes de esa fecha si necesitás conservarlos ([detalles y límites del plan gratuito](https://render.com/docs/free)).
2. **Crear la API:** elegí `New` → `Web Service`, conectá este repositorio y configurá `Root Directory` como `backend`, `Build Command` como `npm ci`, `Start Command` como `npm start`, la misma región de PostgreSQL y el plan **Free**. Configurá el health check como `/api/v1/health`.
3. **Agregar variables del servicio web:**

   | Variable | Valor |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | Secreto aleatorio largo y privado; generarlo en Render o localmente y guardarlo como secreto. |
   | `DATABASE_URL` | Internal Database URL de PostgreSQL, disponible en la página de la base. No la publiques. |
   | `FRONTEND_URL` | Origen exacto del frontend; en el despliegue actual, `https://gd-verifications.matyzur.workers.dev`. |

   Mantené la base y el Web Service en la misma región y usá la URL interna de conexión. No copies credenciales de producción al repositorio.
4. **Desplegar y comprobar:** guardá la configuración y esperá el primer deploy. Al arrancar, la API aplica automáticamente `backend/schema.sql` sobre la base vacía. Revisá los logs para confirmar la inicialización y probá `https://<servicio>.onrender.com/api/v1/health`. El esquema crea la cuenta `owner` con contraseña inicial `owner`: cambiala inmediatamente antes de habilitar el acceso público.
5. **Conectar Cloudflare:** configurá `VITE_API_URL=https://<servicio>.onrender.com/api/v1` en Cloudflare Pages y volvé a desplegar el frontend.

El Web Service gratuito puede suspenderse cuando no recibe tráfico y tardar en responder al primer acceso. La base PostgreSQL gratuita también es efímera; no es una opción permanente sin costo para conservar datos. Consultá las [condiciones del nivel gratuito](https://render.com/docs/free) antes de usarlo como producción.

### 2. Frontend en Cloudflare Pages (alternativa de publicación)

El frontend comprobado actualmente está publicado en Cloudflare Workers en <https://gd-verifications.matyzur.workers.dev>. Los siguientes valores describen una alternativa para desplegarlo como un proyecto de Pages; no indican que el sitio actual use Pages.

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
