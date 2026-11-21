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
17. **Parcial** — Los niveles usan estados definidos: `PENDING_REVIEW`, `AVAILABLE`, `IN_PROGRESS`, `VERIFIED`, `REJECTED` o `CANCELLED`. El backend implementa asignación de verificadores y transición a `VERIFIED` bajo las condiciones de la regla 45; las demás transiciones siguen pendientes.
18. **Implementada** — Un usuario autenticado puede postularse una sola vez por nivel disponible; el autor no puede postularse para verificar su propio nivel. Si hay hardest mínimo, el backend compara el puesto AREDL del perfil en la misma modalidad: una posición numéricamente igual o menor (más difícil) cumple el requisito. Sin mínimo, cualquier usuario salvo el autor puede postularse.
19. **Implementada** — El creador puede consultar los postulantes de su nivel (sin datos privados) y aceptar en una operación atómica una o varias postulaciones pendientes. El backend comprueba la propiedad, el estado de todas las postulaciones y actualiza el nivel a `IN_PROGRESS`; otros usuarios no pueden verlas ni resolverlas. Se permiten varios `ACCEPTED`; la migración `007_multiple_accepted_applications.sql` elimina el índice que lo impedía. El rechazo individual y la administración siguen pendientes.
20. **Planificada** — Solo el verificador con postulación aceptada puede entregar una prueba; la entrega debe incluir un enlace de video permitido y comenzar `PENDING`.
21. **Parcial** — El creador puede marcar como verificado un nivel en progreso con al menos un verificador aceptado. El flujo de entregas de prueba y su aprobación/rechazo sigue pendiente.
22. **Planificada** — Las acciones relevantes generan notificaciones para las personas afectadas; solo el destinatario puede consultar o marcar como leídas sus notificaciones.
23. **Planificada** — Las acciones administrativas requieren rol `ADMIN`, se auditan en `admin_logs` y no se autorizan solamente ocultando controles en React.
24. **Planificada** — Videos se almacenan como URL de YouTube; no se suben archivos de video a Render ni a PostgreSQL.

## Acceso y despliegue

25. **Parcial** — La API usa el prefijo `/api/v1` y ofrece comprobación de salud con PostgreSQL. CORS debe configurarse con el origen real de Cloudflare Pages.
26. **Planificada** — La web se publica en Cloudflare Pages; la API Express y PostgreSQL se publican en Render. Las credenciales viven solo en variables secretas de Render.
27. **Pendiente de publicación** — La entrega final requiere URLs públicas funcionales del frontend y la API, además de un repositorio GitHub público. Subir el código no equivale a desplegar los servicios.
28. **Implementada** — Todas las rutas muestran el mismo encabezado, navegación e idioma y el mismo pie de página; el contenido de navegación depende de la sesión autenticada.
29. **Implementada** — Al publicar un nivel se puede subir una imagen opcional que se recorta y optimiza a JPG 1920×1080 (16:9), se limita a 4 MB y se guarda en PostgreSQL. Si no hay imagen, el frontend usa la miniatura de YouTube. La migración correspondiente es `006_level_images.sql`.
30. **Implementada** — La persona autenticada puede consultar por separado sus niveles publicados (incluyendo estado, postulaciones y datos del nivel) y sus postulaciones de verificación (incluyendo estado de solicitud, nivel, requisito, creador y video). El backend deriva el usuario del token y no acepta un ID de usuario indicado por el cliente. La entrega de pruebas sigue pendiente según la regla 20.
31. **Implementada** — La navegación de cuenta se agrupa en un menú con foto/nombre y enlaces a Perfil, Verificaciones y Niveles creados, seguido de Cerrar sesión destacado en rojo. El menú ofrece las etiquetas correspondientes en español e inglés.
32. **Implementada** — Cada nivel con al menos un verificador aceptado tiene una conversación grupal compartida entre su creador y todos sus verificadores aceptados. Solo esos participantes autenticados pueden leer y enviar mensajes; el backend valida el acceso por nivel y limita el texto a 2000 caracteres. La migración es `008_level_chat.sql`.
33. **Implementada** — El catálogo público, los niveles creados y las postulaciones tienen presentaciones distintas. Abrir los detalles desde esas listas muestra un modal superpuesto a la página.
34. **Implementada** — El modal de detalles se superpone a la lista y el reproductor integrado usa un ID de YouTube extraído de un enlace validado.
35. **Implementada** — Las miniaturas de nivel enlazan directamente al video y no se muestra un botón para abrirlo. La vista de detalle muestra el reproductor de YouTube en lugar de la imagen.
36. **Implementada** — Las imágenes opcionales se recortan al centro a 16:9, se codifican como JPG de 1920×1080 y alta calidad, y se limitan a 4 MB antes de almacenarse en PostgreSQL. La API admite un cuerpo JSON de hasta 8 MB.
37. **Implementada** — El chat tiene una página propia y lista al creador y a todos los verificadores aceptados. Los participantes pueden enviar texto, imágenes JPG/PNG/WebP de hasta 8 MB y videos MP4/WebM de hasta 25 MB. El backend valida el permiso, tipo y firma de archivo y sirve los adjuntos solo a participantes; se guardan en PostgreSQL con la migración `009_chat_attachments.sql`.
38. **Implementada** — La etiqueta española para el modo `CLASSIC` es `Clásico`.
39. **Implementada** — Si el contenido del modal supera la altura disponible, el panel ofrece su propio desplazamiento vertical y mantiene el aspecto, tamaño y ancho actuales; el fondo permanece fijo.
40. **Implementada** — Las imágenes de nivel se sirven con `Cross-Origin-Resource-Policy: cross-origin` para que la web de Vite/Cloudflare pueda cargarlas desde la API de otro origen.
41. **Implementada** — La dificultad relativa se muestra con tilde aproximada pegada al número (`Top ~N`) en el catálogo, detalles, actividad y formulario.
42. **Implementada** — En los detalles de un nivel, el acceso al chat se separa visualmente del bloque de postulantes, mantiene espacio respecto del borde inferior del modal y se adapta a pantallas pequeñas.
43. **Implementada** — El acceso al chat solo se muestra cuando el nivel tiene al menos una postulación aceptada; el backend sigue autorizando únicamente al creador y a verificadores aceptados.
44. **Implementada** — El catálogo de Niveles ofrece las listas Clásico, Plataforma, Recientes, Viejos, Más difíciles y Más fáciles. Los niveles verificados salen del catálogo de búsqueda de verificadores; las modalidades conservan el orden de publicación, recientes ordena por fecha descendente, viejos ascendente, más difíciles por Top ascendente y más fáciles por Top descendente.
45. **Implementada** — Solo el creador puede marcar como `VERIFIED` un nivel `IN_PROGRESS` que tenga al menos una postulación `ACCEPTED`; la API valida propietario y estado dentro de una transacción y actualiza la fecha de verificación. Un usuario no puede marcar niveles ajenos ni niveles sin verificador aceptado.
46. **Implementada** — La landing muestra hasta cinco niveles verificados más recientemente. Los niveles verificados siguen figurando en Niveles creados y en las postulaciones del verificador, donde su estado se presenta como Verificado.
