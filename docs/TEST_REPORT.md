# Informe de pruebas

Fecha de ejecución local: 2026-11-19. Entorno: Node.js 24.22.0; PostgreSQL local disponible durante el desarrollo.

## Resultado de esta entrega

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `cd backend && npm test` | **PASS** — 6 tests, 0 fallos | Tests unitarios puros de reglas de registro, URL de perfil/YouTube y formato/tamaño/firma de avatar. |
| `cd frontend && npm run build` | **PASS** — Vite produjo `dist/` | Compilación de producción Vite. |

Comandos ejecutados después de los cambios de aplicación de esta entrega; el frontend no cambió después de la compilación y backend tests sí quedaron reflejados en los archivos finales.

## Cobertura actual y límites

- Las pruebas automatizadas actuales no requieren credenciales, PostgreSQL ni acceso a AREDL.
- Aún no existen pruebas de integración para rutas HTTP, JWT con base real, migraciones completas, permisos de postulaciones ni pruebas end-to-end.
- El health check se probó previamente contra la base local durante el desarrollo; esto no prueba la base de Render ni la disponibilidad pública.
- No hay URL pública de Cloudflare Pages o Render confirmada en esta entrega. La validación de publicación queda en T-04/T-09.
