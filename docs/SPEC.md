# GD Verifications — especificación funcional

Esta especificación distingue lo implementado hoy de las reglas objetivo. **Implementada** significa que existe código en este repositorio; **Planificada** significa que guía el desarrollo y todavía no debe presentarse como funcionalidad disponible.

## Cuentas, acceso y perfiles

1. **Implementada** — El registro público requiere username, email y contraseña; el username admite de 3 a 30 letras, números o guiones bajos.
2. **Implementada** — El email se normaliza a minúsculas y no puede repetirse; username y email son únicos.
3. **Implementada** — La contraseña debe tener entre 8 y 72 caracteres y se almacena con bcrypt, nunca en texto plano.
4. **Implementada** — El registro público asigna `USER`; el cliente no puede elegir el rol `ADMIN`.
5. **Implementada** — El inicio de sesión entrega un JWT con vencimiento de siete días; las rutas protegidas verifican el token.
6. **Planificada** — Limitar intentos de inicio de sesión y aplicar políticas adicionales contra abuso antes de producción.
7. **Implementada** — Un usuario puede consultar el perfil público por username; los campos privados (email y hash de contraseña) no se exponen en esa respuesta.
8. **Implementada** — El dueño del perfil puede editar nombre visible, pronombres, país, avatar, username de Geometry Dash, hardest clásico/plataforma, descripción, YouTube y Discord.
9. **Implementada** — El dueño puede cambiar la contraseña desde su perfil confirmando la contraseña actual; no se envía correo.
10. **Implementada** — El avatar acepta JPG, PNG o WebP, se optimiza en el navegador y el backend restringe formato/tamaño.
11. **Implementada** — El perfil enlaza el username de Geometry Dash a `gdbrowser.com/u/{username}` y los hardest a la lista correspondiente de AREDL.
12. **Implementada** — Los hardest se eligen de las listas AREDL de extremos clásicos o plataforma; la selección vacía está permitida y la API vuelve a validar el ID al guardar.
13. **Implementada** — YouTube debe usar HTTPS y un dominio permitido de YouTube; otras URL de perfil admiten HTTP/HTTPS.
14. **Implementada** — La interfaz admite español e inglés, conserva el idioma elegido y mantiene el nombre `GD Verifications` en ambos.

## Niveles, verificaciones y moderación

15. **Implementada** — Publicar un nivel requiere autenticación y guarda nombre, modalidad (`CLASSIC` o `PLATFORMER`), dificultad estimada `Top N` (N entre 1 y 10000), video de YouTube, descripción opcional y creador. Si se define un hardest mínimo, debe pertenecer a la lista AREDL de la modalidad elegida. Los niveles nuevos quedan `AVAILABLE` y visibles en el catálogo; la moderación previa todavía no está implementada.
16. **Planificada** — Solo el creador puede editar su nivel; los cambios no pueden saltarse moderación ni alterar la propiedad.
17. **Planificada** — Un nivel pasa por estados definidos: `PENDING_REVIEW`, `AVAILABLE`, `IN_PROGRESS`, `VERIFIED`, `REJECTED` o `CANCELLED`; las transiciones inválidas se rechazan en el backend.
18. **Implementada** — Un usuario autenticado puede postularse una sola vez por nivel disponible; el autor no puede postularse para verificar su propio nivel. Si hay hardest mínimo, el backend compara el puesto AREDL del perfil en la misma modalidad: una posición numéricamente igual o menor (más difícil) cumple el requisito. Sin mínimo, cualquier usuario salvo el autor puede postularse.
19. **Planificada** — Solo el creador del nivel o un administrador puede resolver postulaciones; como máximo una puede estar `ACCEPTED` por nivel (índice único parcial en PostgreSQL).
20. **Planificada** — Solo el verificador con postulación aceptada puede entregar una prueba; la entrega debe incluir un enlace de video permitido y comenzar `PENDING`.
21. **Planificada** — Solo el creador o un administrador puede resolver una entrega; aprobarla marca el nivel como `VERIFIED`, y rechazarla mantiene registro del motivo.
22. **Planificada** — Las acciones relevantes generan notificaciones para las personas afectadas; solo el destinatario puede consultar o marcar como leídas sus notificaciones.
23. **Planificada** — Las acciones administrativas requieren rol `ADMIN`, se auditan en `admin_logs` y no se autorizan solamente ocultando controles en React.
24. **Planificada** — Videos se almacenan como URL de YouTube; no se suben archivos de video a Render ni a PostgreSQL.

## Acceso y despliegue

25. **Parcial** — La API usa el prefijo `/api/v1` y ofrece comprobación de salud con PostgreSQL. CORS debe configurarse con el origen real de Cloudflare Pages.
26. **Planificada** — La web se publica en Cloudflare Pages; la API Express y PostgreSQL se publican en Render. Las credenciales viven solo en variables secretas de Render.
27. **Pendiente de publicación** — La entrega final requiere URLs públicas funcionales del frontend y la API, además de un repositorio GitHub público. Subir el código no equivale a desplegar los servicios.
