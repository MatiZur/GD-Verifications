# Informe de pruebas

Fecha de ejecución local: 2026-11-20. Entorno: Node.js 24.22.0; PostgreSQL local disponible durante el desarrollo.

## Cambios locales T-25 (2026-11-21; pendientes de desplegar)

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `cd backend && npm test` | **PASS** — 38 tests, 0 fallos | Incluye preservación de postulaciones abiertas, aceptación automática, validación de entregas, moderación de reportes, acceso de staff solo con caso activo y suspensión de actividades protegidas. |
| `cd frontend && npm run build` | **PASS** | Compilación con formularios de entrega/reporte y colas de administración bilingües. |
| `node --check` en rutas, middleware, servidor y servicio de suspensiones | **PASS** | Sintaxis válida. |
| `git diff --check` | **PASS** | Sin errores de whitespace. |
| Ejecución de `backend/schema.sql` contra PostgreSQL | **NO EJECUTADA** | No se aplicó el nuevo esquema a la base alojada; se aplicará al reiniciar la API después del despliegue. No se realizaron cambios en Render desde este entorno. |

Estas comprobaciones son locales y no prueban el despliegue de los nuevos flujos en Render/Cloudflare. La publicación requiere subir los cambios y verificar allí los casos de aceptación, revisión, reportes y expiración de suspensiones.

## Resultado de esta entrega

Las filas históricas que mencionan migraciones registran comprobaciones realizadas durante el desarrollo anterior; esos archivos ya no forman parte del despliegue. La inicialización vigente es únicamente `backend/schema.sql`, ejecutada por la API al arrancar sobre una base vacía.

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

Comprobaciones de T-20:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 18 tests, 0 fallos | Suite unitaria del backend completa. |
| `cd frontend && npm run build` | **PASS** | Vite produjo la compilación de producción. |
| Página `/levels/all` en navegador | **PASS** | Lista completa separada de categorías; filtros iniciales: ambos modos, más reciente y sin verificar. |
| Modal de nivel | **PASS** | El hardest mínimo aparece dentro del modal, junto al botón para postularse; no aparece en las tarjetas. |
| Niveles verificados | **PASS** | Se muestra el verificador junto al creador en la tarjeta y en los detalles. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-21:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 20 tests, 0 fallos | Incluye reglas de permisos para retirar niveles y cerrar postulaciones. |
| `cd frontend && npm run build` | **PASS** | Vite produjo la compilación de producción. |
| Migración `010_level_applications_open.sql` en PostgreSQL local | **PASS** | Agrega el estado persistente de postulaciones y cierra automáticamente niveles ya asignados/finalizados. |
| API local `/api/v1/levels` | **PASS** | Devuelve `applications_open` para niveles y permite que la interfaz refleje el cierre. |
| Rutas PATCH de cierre y retiro sin token | **PASS** — HTTP 401 en ambas | Ambas acciones requieren autenticación; propiedad y condiciones se validan dentro de transacciones en backend. |
| Catálogo `/levels` en navegador | **PASS** | “Siendo verificados” aparece antes de “Verificados recientemente”. |
| Filtro `/levels/all` en navegador | **PASS** | Incluye “Siendo verificados” y mantiene “Sin verificar” como valor inicial. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-22:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd frontend && npm run build` | **PASS** | Vite produjo la compilación de producción. |
| Catálogo `/levels` en navegador | **PASS** | Se verificó espacio de 28 px entre las categorías anteriores y “Siendo verificados”. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-23:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 21 tests, 0 fallos | Incluye autorización para restaurar niveles cancelados. |
| `cd frontend && npm run build` | **PASS** | Compilación de producción para la página Acerca de, campana, tarjetas compactas y avisos temporales. |
| `node --check` en rutas/middleware backend | **PASS** | Sin errores de sintaxis en API, autenticación opcional y notificaciones. |
| Health check local | **PASS** — PostgreSQL conectado | API reiniciada con las rutas actualizadas y la base local responde. |
| `GET /api/v1/notifications` sin token | **PASS** — HTTP 401 | El feed de notificaciones requiere autenticación. |
| Página `/about` en navegador | **PASS** | Se verificaron contenido en español e inglés y enlace de navegación a la página dedicada. |
| Modal de nivel | **PASS** | El contenido desplazable deja 28 px entre el botón de postulación y el final del modal. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-17:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** | Suite unitaria del backend sin regresiones. |
| `cd frontend && npm run build` | **PASS** | Vite compiló la condición de visibilidad del acceso al chat. |
| `git diff --check` | **PASS** | Sin errores de whitespace en los cambios. |

Comprobaciones de T-24:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 23 tests, 0 fallos | Incluye reglas para quitar verificadores, borrar niveles cancelados y cerrar postulaciones explícitamente. |
| `cd frontend && npm run build` | **PASS** | Vite produjo la compilación de producción. |
| `node --check` en rutas backend | **PASS** | Sintaxis válida en rutas de niveles y autenticación. |
| Login en navegador | **PASS** | El formulario solicita nombre de usuario y contraseña, no email. |
| Menú de idioma en navegador | **PASS** | Se verificó que se cierre al hacer clic fuera. |
| Health check local | **PASS** — PostgreSQL conectado | API reiniciada con las rutas actualizadas. |
| Rutas para borrar nivel, remover verificador y cerrar postulaciones sin sesión | **PASS** — HTTP 401 | Las tres requieren autenticación. |
| Login sin username | **PASS** — HTTP 400 | La API informa que username y contraseña son obligatorios. |
| `git diff --check` | **PASS** | Sin errores de whitespace. |

Comprobaciones de T-07:

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 26 tests, 0 fallos | Incluye autorización de administración, promoción exclusiva del owner, moderación y exclusión de roles de staff del chat. |
| `cd frontend && npm run build` | **PASS** | Incluye `/admin`, listado de jugadores, revisión pendiente y controles bilingües. |
| `node --check` en rutas/middleware backend | **PASS** | Sintaxis válida en administración, niveles, autorización y app Express. |
| Inicio local como `owner` / `owner` | **PASS** | La cuenta inicial responde con rol `OWNER`. Credenciales usadas solo en la base local de desarrollo. |
| `GET /api/v1/admin/users` y `/admin/levels/pending` autenticado como owner | **PASS** | Devuelven usuarios y niveles pendientes desde PostgreSQL local. |
| Rutas `/admin/users` y `/admin/levels/pending` sin sesión | **PASS** — HTTP 401 | El middleware bloquea solicitudes sin JWT antes de listar datos. |
| `git diff --check` | **PASS** | Sin errores de whitespace. |

## Cobertura actual y límites

- Las pruebas automatizadas actuales no requieren credenciales, PostgreSQL ni acceso a AREDL.
- Aún no existen pruebas de integración para rutas HTTP, JWT con base real, inicialización del esquema contra PostgreSQL/Render, solicitudes contra AREDL ni pruebas end-to-end.
- El health check se probó previamente contra la base local durante el desarrollo; esto no prueba la base de Render ni la disponibilidad pública.
- Según el estado informado por el propietario, el frontend ya está alojado en Cloudflare. La API y la base de Render aún requieren validación pública; queda pendiente en T-04/T-09.
- El procedimiento documentado usa creación manual de un Web Service Free y una PostgreSQL Free en Render, sin Blueprint. La PostgreSQL Free expira a los 30 días; no se considera una base persistente para producción.

## Comprobaciones del bootstrap desde cero

| Comprobación | Resultado | Alcance |
|---|---|---|
| `cd backend && npm test` | **PASS** — 30 tests, 0 fallos | Incluye pruebas estáticas para tablas, columnas, seed owner y repetibilidad del esquema inicial. |
| `cd frontend && npm run build` | **PASS** | Vite produjo la compilación de producción; no hubo cambios en el frontend. |
| `node --check backend/src/server.js` y `test/schema.test.js` | **PASS** | Sintaxis válida en el arranque y las pruebas del esquema. |
| `git diff --check` | **PASS** | Sin errores de whitespace. |
| `backend/schema.sql` en PostgreSQL WASM en memoria, ejecutado dos veces | **PASS** | Crea las siete tablas y la cuenta `owner` una sola vez; no se conectó ni modificó PostgreSQL local o Render. |
| Inicialización contra PostgreSQL vacío | **NO EJECUTADA** | No se modificó la base local ni se aplicó el esquema a una base Render. Confirmar en Render con una base nueva. |
