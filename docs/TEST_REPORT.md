# Informe de pruebas

Fecha de ejecución local: 2026-11-20. Entorno: Node.js 24.22.0; PostgreSQL local disponible durante el desarrollo.

## Resultado de esta entrega

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `cd backend && npm test` | **PASS** — 10 tests, 0 fallos | Tests unitarios puros de registro, validación de niveles, elegibilidad por puesto AREDL, URL y avatares. |
| `cd frontend && npm run build` | **PASS** — Vite produjo `dist/` | Compilación de producción Vite. |
| Migración `005_level_requirements.sql` en PostgreSQL local | **PASS** | Columnas y restricciones de modalidad/Top/requisito mínimo verificadas en la tabla `levels`. |

Comprobaciones ejecutadas después de los últimos cambios de aplicación.

## Cobertura actual y límites

- Las pruebas automatizadas actuales no requieren credenciales, PostgreSQL ni acceso a AREDL.
- Aún no existen pruebas de integración para rutas HTTP, JWT con base real, la secuencia completa de migraciones, solicitudes contra AREDL ni pruebas end-to-end.
- El health check se probó previamente contra la base local durante el desarrollo; esto no prueba la base de Render ni la disponibilidad pública.
- No hay URL pública de Cloudflare Pages o Render confirmada en esta entrega. La validación de publicación queda en T-04/T-09.
