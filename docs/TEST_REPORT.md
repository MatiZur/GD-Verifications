# Informe de pruebas

Última actualización y ejecución: **2026-11-21**. Este informe separa las pruebas locales repetibles de las comprobaciones de disponibilidad pública; un smoke test no demuestra que todos los flujos estén correctos.

## Comprobaciones locales

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `cd backend && npm test` | **PASS** — 38 tests, 0 fallos | Suite determinista de reglas de autenticación, perfiles, niveles, postulaciones, chat, moderación, suspensiones, entregas y estructura del esquema. |
| `cd frontend && npm run build` | **PASS** | Vite generó correctamente la compilación de producción. |
| Pruebas de `backend/schema.sql` | **PASS** | Verifican tablas/campos esperados, seed inicial de owner, transacción e idempotencia de índices. La ejecución doble en PostgreSQL WASM en memoria quedó registrada anteriormente. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios de documentación. |

## Comprobaciones públicas

Realizadas el **2026-11-21** desde el entorno de desarrollo, mediante solicitudes HTTP de solo lectura:

| Recurso | Resultado | Alcance |
| --- | --- | --- |
| [Frontend Cloudflare](https://gd-verifications.matyzur.workers.dev) | **PASS** — HTTP 200 | La página entrega el documento HTML de la aplicación. |
| [Health check de Render](https://gd-verifications.onrender.com/api/v1/health) | **PASS** — HTTP 200 | La API informa `status: ok` y `database: connected`. |
| `GET https://gd-verifications.onrender.com/api/v1/levels` | **PASS** — HTTP 200 | La API devuelve el catálogo y autoriza CORS para `https://gd-verifications.matyzur.workers.dev`. |
| Preflight `OPTIONS /api/v1/levels` desde Cloudflare | **PASS** — HTTP 204 | CORS devuelve el origen exacto del frontend y permite el método `GET`. |

Estas comprobaciones confirman que el frontend, el endpoint público de la API y su conexión a PostgreSQL responden desde internet. No prueban registro/login en producción, mutaciones autenticadas, revisión administrativa, carga multimedia ni el recorrido completo de un usuario.

## Límites y alcance pendiente de pruebas

- No se ejecutó el esquema contra una base PostgreSQL vacía alojada en Render ni se alteró la base de producción. Las pruebas WASM previas son aisladas y no equivalen a una inicialización real en Render.
- La suite automatizada no levanta Express contra una base real y no incluye un recorrido end-to-end de navegador. La disponibilidad pública es un smoke test, no una prueba de regresión de todos los flujos.
- La interfaz todavía no ofrece al creador una acción para rechazar individualmente postulaciones pendientes; este alcance permanece abierto en T-06.
- No se realizaron solicitudes de escritura ni autenticación contra la instancia pública durante esta comprobación.
- El esquema vigente para nuevas instalaciones es `backend/schema.sql`; las migraciones mencionadas en registros históricos ya no forman parte del proceso de despliegue.
- Render puede aplicar límites de disponibilidad o persistencia según el plan configurado. Confirmar las condiciones vigentes en el panel del servicio antes de usar la base como almacenamiento de producción.
