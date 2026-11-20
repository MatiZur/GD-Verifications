# Plan de tareas

Una tarea terminada tiene un commit propio. El estado describe este repositorio al momento de esta entrega; las funcionalidades futuras no se marcan como hechas.

## Tareas completadas en esta entrega

- [x] **T-01 — Especificación y acuerdos de colaboración.** Reglas de negocio numeradas, estados de implementación y planificación, instrucciones para agentes y plan de trabajo. Confirmación: `Docs: Especificación, reglas para agentes y plan de tareas`.
- [x] **T-02 — Pruebas automatizadas iniciales.** Extraer validadores de registro/perfil y cubrirlos con Node.js Test Runner. Confirmación: `Test: Cobertura automática de validación de cuentas y perfiles`.
- [x] **T-03 — Preparación de documentación y despliegue.** README de uso/despliegue, variables de ejemplo y Blueprint para API + PostgreSQL en Render. Confirmación: `Docs: Preparación del despliegue y entrega del proyecto`.

## Próximas tareas (pendientes, no desplegadas)

- [ ] **T-04 — Publicar infraestructura.** Crear recursos en Render, ejecutar migraciones 001–008 y registrar una URL saludable de la API; configurar Cloudflare Pages y `VITE_API_URL`.
- [x] **T-05 — Publicación y catálogo de niveles.** API y pantallas para publicar, descubrir y consultar niveles; validación de YouTube, modalidad y dificultad Top; postulación con requisito mínimo de hardest validado por AREDL. Confirmación: `Feat: Publicación y catálogo de niveles con requisito de hardest`.
- [x] **T-10 — Navegación común, imágenes y actividad personal.** Header/footer compartidos, imagen 16:9 con miniatura de YouTube de respaldo, y vistas privadas de niveles publicados y postulaciones. Confirmación: `Feat: Actividad personal e imágenes para niveles`.
- [x] **T-11 — Menú de cuenta y selección de verificadores.** Menú con foto/nombre y acceso agrupado a perfil, verificaciones, niveles creados y cierre de sesión; selección y aceptación de uno o varios postulantes con autorización del creador. Confirmación: `Feat: Menú de cuenta y selección múltiple de verificadores`.
- [x] **T-12 — Chat por nivel y vistas de actividad.** Chat grupal del creador con verificadores aceptados, permisos por participante y vistas diferenciadas de catálogo/propios/postulaciones. Confirmación: `Feat: Chat de nivel y detalles en contexto`.
- [x] **T-13 — Chat multimedia y detalles integrados.** Chat en página propia con participantes y adjuntos, imágenes optimizadas de nivel, reproductor de YouTube y detalles expandidos en las listas. Confirmación: `Feat: Chat multimedia y detalles integrados`.
- [x] **T-14 — Corrección de imágenes y modal de nivel.** Exposición cross-origin segura de las imágenes, modal sin scroll interno, limpieza de navegación, `Top ~N` y chat ampliado. Confirmación: `Fix: Imagen de niveles y ajustes de interfaz`.
- [ ] **T-06 — Resolución de postulaciones y entregas.** La aceptación múltiple quedó implementada en T-11; continúan pendientes el rechazo individual, el envío de pruebas y sus transiciones de estado.
- [ ] **T-07 — Notificaciones y panel administrativo.** Autorización de rol en backend, moderación y auditoría.
- [ ] **T-08 — Pruebas de integración y recorrido end-to-end.** Probar PostgreSQL/migraciones y flujos completos en un entorno de staging.
- [ ] **T-09 — Evidencia de entrega final.** Actualizar `docs/TEST_REPORT.md` con resultados del entorno publicado y enlazar frontend/API públicos.

## Criterio para marcar una tarea como hecha

Implementación y reglas reflejadas en `docs/SPEC.md`, tests relevantes ejecutados, documentación actualizada, sin secretos, y un commit enfocado que corresponda a esa tarea. Un commit no sustituye el despliegue ni evidencia que un enlace público funcione.
