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
- [x] **T-15 — Scroll del modal y formato Top aproximado.** Desplazamiento interno del modal cuando hace falta y `~` pegado al puesto numérico. Confirmación: `Fix: Desplazamiento del modal y formato Top`.
- [x] **T-16 — Ajuste del botón de chat en detalles de nivel.** Separación y formato adaptable del acceso al chat para que no se superponga con postulantes ni quede pegado al borde del modal. Confirmación: `Fix: Espaciado del acceso al chat en niveles`.
- [x] **T-17 — Visibilidad del acceso al chat.** Mostrar “Abrir chat” únicamente cuando el nivel tenga verificadores aceptados, conservando el control de acceso del backend. Confirmación: `Fix: Ocultar chat sin verificadores aceptados`.
- [x] **T-18 — Listas del catálogo y cierre de verificaciones.** Filtros/orden de listas, transición del creador a `VERIFIED`, salida del catálogo activo, historial en niveles propios/postulaciones y cinco verificaciones recientes en la landing. Confirmación: `Feat: Listas y cierre de verificaciones`.
- [x] **T-19 — Catálogo vertical, filtros completos y verificación desde actividad.** Mostrar siempre todas las categorías en columna, agregar historial completo con filtros y sección final de verificados recientes; limitar la acción de verificación a Niveles creados. Confirmación: `Feat: Catálogo completo y acción en niveles creados`.
- [x] **T-20 — Separación de lista, requisito en modal y atribución de verificadores.** Separar `/levels/all` de las categorías, mostrar el hardest mínimo solo en el modal junto a postularse y publicar quién verificó cada nivel completado. Confirmación: `Feat: Lista separada y atribución de verificadores`.
- [x] **T-21 — Retiro y cierre de postulaciones.** Permitir al creador cerrar postulaciones o retirar niveles sin verificadores aceptados; agregar el estado Siendo verificados al catálogo y al filtro de la lista completa. Confirmación: `Feat: Retiro de niveles y cierre de postulaciones`.
- [x] **T-22 — Espaciado de categorías del catálogo.** Mantener una separación visual uniforme antes de la sección Siendo verificados. Confirmación: `Fix: Espaciado de categorías`.
- [x] **T-23 — Restauración, página informativa y avisos.** Restaurar niveles cancelados solo para su creador, restringir su visibilidad, compactar Niveles creados, agregar Acerca de y redirección de logout, y conectar notificaciones persistentes y avisos temporales. Confirmación: `Feat: Restauración y notificaciones de niveles`.
- [x] **T-24 — Gestión de verificadores, acceso y sesión.** Restringir el botón de chat a participantes, conservar abiertas las postulaciones al aceptar verificadores hasta que el creador las cierre, permitir remover verificadores y borrar niveles cancelados, e iniciar sesión con username. Confirmación: `Feat: Gestión de verificadores y acceso por usuario`.
- [ ] **T-06 — Resolución de postulaciones y entregas.** La aceptación múltiple quedó implementada en T-11; continúan pendientes el rechazo individual, el envío de pruebas y sus transiciones de estado.
- [x] **T-07 — Notificaciones, administración y roles.** Campana de notificaciones, panel de usuarios y niveles pendientes, moderación auditada, promoción exclusiva del owner, cuenta owner inicial y chats limitados a jugadores participantes. Confirmación: `Feat: Panel de administración y cuenta owner`.
- [ ] **T-08 — Pruebas de integración y recorrido end-to-end.** Probar PostgreSQL/migraciones y flujos completos en un entorno de staging.
- [ ] **T-09 — Evidencia de entrega final.** Actualizar `docs/TEST_REPORT.md` con resultados del entorno publicado y enlazar frontend/API públicos.

## Criterio para marcar una tarea como hecha

Implementación y reglas reflejadas en `docs/SPEC.md`, tests relevantes ejecutados, documentación actualizada, sin secretos, y un commit enfocado que corresponda a esa tarea. Un commit no sustituye el despliegue ni evidencia que un enlace público funcione.
