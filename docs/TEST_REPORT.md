# Informe de pruebas

Fecha de ejecución local: 2026-11-20. Entorno: Node.js 24.22.0; PostgreSQL local disponible durante el desarrollo.

## Resultado de esta entrega

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `cd backend && npm test` | **PASS** — 16 tests, 0 fallos | Tests unitarios puros de registro, niveles, selección múltiple, chat, URL y avatares. |
| `cd frontend && npm run build` | **PASS** — Vite produjo `dist/` | Compilación de producción Vite. |
| Migración `005_level_requirements.sql` en PostgreSQL local | **PASS** | Columnas y restricciones de modalidad/Top/requisito mínimo verificadas en la tabla `levels`. |
| Pruebas unitarias backend tras T-10 | **PASS** | `npm test`: 11 pruebas aprobadas, incluyendo validación de imágenes opcionales. |
| Compilación frontend tras T-10 | **PASS** | `npm run build` completado. |
| Migración `006_level_images.sql` en PostgreSQL local | **PASS** | Columnas BYTEA/MIME aplicadas para imágenes opcionales de niveles. |
| Pruebas unitarias de selección múltiple de postulaciones | **PASS** | Se validan listas vacías, duplicadas, IDs inválidos y el máximo de 100 selecciones. |
| `cd backend && npm test` tras menú y selección múltiple | **PASS** — 13 tests, 0 fallos | Incluye selección múltiple vacía, duplicada, inválida y su máximo permitido. |
| `cd frontend && npm run build` tras menú y selección múltiple | **PASS** | Vite produjo `dist/`. |
| Migración `007_multiple_accepted_applications.sql` en PostgreSQL local | **PASS** | Eliminada la restricción de aceptación única por nivel. |
| Rutas de consulta y selección de postulantes sin token | **PASS** | GET y PATCH responden HTTP 401 sin autenticación. |
| `cd backend && npm test` tras chat y vistas | **PASS** — 16 tests, 0 fallos | Incluye límites de mensajes y autorización de creador/verificadores aceptados. |
| `cd frontend && npm run build` tras chat y vistas | **PASS** | Vite produjo `dist/`. |
| Migración `008_level_chat.sql` en PostgreSQL local | **PASS** | Tabla e índice de mensajes creados. |
| Endpoint de chat sin token | **PASS** | Responde HTTP 401; las reglas de acceso para creador/verificadores se validan además en backend. |
| Apertura/cierre de detalles desde el catálogo | **PASS (anterior)** | Se comprobó la versión modal previa; T-13 la reemplaza por expansión en línea y requiere validación visual actualizada. |

Comprobaciones de T-13 (chat multimedia, detalle integrado y calidad de imágenes):

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 17 tests, 0 fallos | Incluye validación determinista de firma, tipo y tamaño de adjuntos. |
| `cd frontend && npm run build` | **PASS** | Vite compiló el chat independiente y los detalles integrados. |
| Migración `009_chat_attachments.sql` en PostgreSQL local | **PASS** | Ejecutada correctamente. En Render también debe aplicarse antes de habilitar adjuntos. |
| Endpoint de chat local sin token | **PASS** — HTTP 401 | Confirma que la ruta continúa requiriendo autenticación. |

Comprobaciones de T-14 (imagen cross-origin, modal y navegación):

| Comprobación | Resultado | Alcance |
|---|---|---|
| Imagen del nivel `asd` en `/levels` | **PASS** — natural size 1600×900 | API responde HTTP 200 (`image/webp`, 90 KB) con `Cross-Origin-Resource-Policy: cross-origin`; el navegador la decodifica entre puertos. |
| Modal de detalles en `/levels` | **PASS** | Se verificó superpuesto, mantiene la ruta y su panel tiene `overflow: visible`/`max-height: none`, sin scroll interno. |

Comprobaciones de T-15:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 17 tests, 0 fallos | Suite completa sin regresiones. |
| `cd frontend && npm run build` | **PASS** | Vite compiló el frontend actualizado. |
| Scroll del modal | **PASS** | `overflow-y: auto`; al limitarlo a 300 px, el contenido (765 px) se desplaza dentro del panel. |
| Etiqueta de dificultad | **PASS** | En catálogo y detalles se muestra `Top ~1`, sin espacio entre `~` y el número. |

Comprobaciones ejecutadas después de los últimos cambios de aplicación.

Comprobaciones de T-16:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd frontend && npm run build` | **PASS** | Vite compiló el botón de chat y sus estilos adaptables. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-18:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 18 tests, 0 fallos | Incluye permiso del creador y validación de estado/verificadores aceptados para marcar como verificado. |
| `cd frontend && npm run build` | **PASS** | Vite compiló filtros, acción de verificación y bloque de landing. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-19:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 18 tests, 0 fallos | Suite de reglas del backend completa. |
| `cd frontend && npm run build` | **PASS** | Vite compiló las secciones permanentes, los filtros y la acción de verificación en Niveles creados. |
| Catálogo `/levels` en navegador | **PASS** | Las seis categorías aparecen apiladas, la lista completa muestra Ambos / más reciente / sin verificar por defecto y Verificados recientemente queda al final. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-17:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** | Suite unitaria del backend sin regresiones. |
| `cd frontend && npm run build` | **PASS** | Vite compiló la condición de visibilidad del acceso al chat. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

## Cobertura actual y límites

- Las pruebas automatizadas actuales no requieren credenciales, PostgreSQL ni acceso a AREDL.
- Aún no existen pruebas de integración para rutas HTTP, JWT con base real, la secuencia completa de migraciones, solicitudes contra AREDL ni pruebas end-to-end.
- El health check se probó previamente contra la base local durante el desarrollo; esto no prueba la base de Render ni la disponibilidad pública.
- No hay URL pública de Cloudflare Pages o Render confirmada en esta entrega. La validación de publicación queda en T-04/T-09.
