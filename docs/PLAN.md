# Plan de tareas

Una tarea terminada tiene un commit propio. El estado describe este repositorio al momento de esta entrega; las funcionalidades futuras no se marcan como hechas.

## Tareas completadas en esta entrega

- [x] **T-01 — Especificación y acuerdos de colaboración.** Reglas de negocio numeradas, estados de implementación y planificación, instrucciones para agentes y plan de trabajo. Confirmación: `Docs: Especificación, reglas para agentes y plan de tareas`.
- [x] **T-02 — Pruebas automatizadas iniciales.** Extraer validadores de registro/perfil y cubrirlos con Node.js Test Runner. Confirmación: `Test: Cobertura automática de validación de cuentas y perfiles`.
- [x] **T-03 — Preparación de documentación y despliegue.** README de uso/despliegue, variables de ejemplo y Blueprint para API + PostgreSQL en Render. Confirmación: `Docs: Preparación del despliegue y entrega del proyecto`.

## Próximas tareas (pendientes, no desplegadas)

- [ ] **T-04 — Publicar infraestructura.** Crear recursos en Render, ejecutar migraciones 001–004 y registrar una URL saludable de la API; configurar Cloudflare Pages y `VITE_API_URL`.
- [ ] **T-05 — CRUD de niveles y catálogo.** API, validación de IDs/links y pantallas para publicar, descubrir y consultar niveles con datos reales.
- [ ] **T-06 — Postulaciones y entregas.** Reglas de propiedad, aceptación única, envío de pruebas y transiciones de estado cubiertas por pruebas.
- [ ] **T-07 — Notificaciones y panel administrativo.** Autorización de rol en backend, moderación y auditoría.
- [ ] **T-08 — Pruebas de integración y recorrido end-to-end.** Probar PostgreSQL/migraciones y flujos completos en un entorno de staging.
- [ ] **T-09 — Evidencia de entrega final.** Actualizar `docs/TEST_REPORT.md` con resultados del entorno publicado y enlazar frontend/API públicos.

## Criterio para marcar una tarea como hecha

Implementación y reglas reflejadas en `docs/SPEC.md`, tests relevantes ejecutados, documentación actualizada, sin secretos, y un commit enfocado que corresponda a esa tarea. Un commit no sustituye el despliegue ni evidencia que un enlace público funcione.
