# GD Verifications — especificación funcional

Esta especificación distingue lo implementado hoy de las reglas objetivo. **Implementada** significa que existe código en este repositorio; **Planificada** significa que guía el desarrollo y todavía no debe presentarse como funcionalidad disponible.

## Cuentas, acceso y perfiles

1. **Implementada** — El registro público requiere username, email y contraseña; el username admite de 3 a 30 letras, números o guiones bajos.
2. **Implementada** — El email se normaliza a minúsculas y no puede repetirse; username y email son únicos.
3. **Implementada** — La contraseña debe tener entre 8 y 72 caracteres y se almacena con bcrypt, nunca en texto plano.
4. **Implementada** — El registro público asigna `USER`; el cliente no puede elegir el rol `ADMIN`.
5. **Implementada** — El inicio de sesión entrega un JWT con vencimiento de siete días; las rutas protegidas verifican el token.
6. **Implementada** — Un usuario puede consultar el perfil público por username; los campos privados (email y hash de contraseña) no se exponen en esa respuesta.
7. **Implementada** — El dueño del perfil puede editar nombre visible, pronombres, país, avatar, username de Geometry Dash, hardest clásico/plataforma, descripción, YouTube y Discord.
8. **Implementada** — El dueño puede cambiar la contraseña desde su perfil confirmando la contraseña actual; no se envía correo.
9. **Implementada** — El avatar acepta JPG, PNG o WebP, se optimiza en el navegador y el backend restringe formato/tamaño.
10. **Implementada** — El perfil enlaza el username de Geometry Dash a `gdbrowser.com/u/{username}` y los hardest a la lista correspondiente de AREDL.
11. **Implementada** — Los hardest se eligen de las listas AREDL de extremos clásicos o plataforma; la selección vacía está permitida y la API vuelve a validar el ID al guardar.
12. **Implementada** — YouTube debe usar HTTPS y un dominio permitido de YouTube; otras URL de perfil admiten HTTP/HTTPS.
13. **Implementada** — La interfaz admite español e inglés, conserva el idioma elegido y mantiene el nombre `GD Verifications` en ambos.

## Niveles, verificaciones y moderación

14. **Implementada** — Publicar un nivel requiere autenticación y guarda nombre, modalidad (`CLASSIC` o `PLATFORMER`), dificultad estimada `Top N` (N entre 1 y 10000), video de YouTube, descripción opcional y creador. Si se define un hardest mínimo, debe pertenecer a la lista AREDL de la modalidad elegida. Los niveles nuevos quedan `PENDING_REVIEW` y no aparecen en el catálogo hasta que un admin o el owner los apruebe.
15. **Implementada** — Solo el creador puede editar su nivel; los cambios no pueden saltarse moderación ni alterar la propiedad.
16. **Implementada** — Los niveles usan estados definidos: `PENDING_REVIEW`, `AVAILABLE`, `IN_PROGRESS`, `VERIFIED`, `REJECTED` o `CANCELLED`. El backend implementa asignación de verificadores, cierre de postulaciones, retiro/restauración y la transición a `VERIFIED` únicamente al aprobar administración una entrega (regla 20).
17. **Implementada** — Un usuario autenticado puede postularse una sola vez por nivel disponible; el autor no puede postularse para verificar su propio nivel. Una postulación rechazada permanece registrada y el jugador no puede volver a postularse a ese nivel. Si hay hardest mínimo, el backend compara el puesto AREDL del perfil en la misma modalidad: una posición numéricamente igual o menor (más difícil) cumple el requisito. Sin mínimo, cualquier usuario salvo el autor puede postularse.
18. **Implementada** — El creador puede consultar los postulantes de su nivel (sin datos privados), aceptar en una operación atómica una o varias postulaciones pendientes y rechazar individualmente una postulación pendiente. Rechazar no elimina el registro y no permite que ese jugador vuelva a postularse. Aceptar no modifica `applications_open`; solo el creador puede cerrarlas explícitamente. Otros usuarios no pueden verlas ni resolverlas.
19. **Implementada** — El creador envía una entrega de verificación eligiendo un verificador aceptado, ingresando el ID público de Geometry Dash y un video HTTPS de YouTube. La entrega queda `PENDING` y el nivel no se considera verificado hasta la decisión administrativa.
20. **Implementada** — Admin u owner pueden aprobar o rechazar entregas pendientes. Al aprobar, el nivel pasa a `VERIFIED`, guarda el ID público, muestra como video principal la prueba aprobada y atribuye la verificación al jugador seleccionado. El rechazo conserva el nivel en progreso.
21. **Implementada** — La API privada y la campana muestran notificaciones persistentes de postulaciones recibidas/aceptadas, verificaciones aceptadas y mensajes nuevos en chats. Solo el destinatario puede consultarlas o marcarlas como leídas.
22. **Implementada** — Admin y owner pueden consultar jugadores, revisar niveles nuevos y resolver entregas de verificación `PENDING`; cada decisión se registra en `admin_logs`. Solo `OWNER` puede promover una cuenta `USER` a `ADMIN`. La API vuelve a comprobar el rol vigente en PostgreSQL.

## Acceso y despliegue

23. **Implementada** — La API usa el prefijo `/api/v1`, ofrece comprobación de salud con PostgreSQL y configura CORS mediante el origen real del frontend en Cloudflare.
24. **Implementada** — El frontend está alojado en Cloudflare Workers y la API Express con PostgreSQL en Render. Las credenciales viven solo en variables secretas del servicio.
25. **Implementada** — Frontend, API y base de datos están publicados. El 2026-11-21 se comprobaron desde internet la página, el health check con base conectada y CORS; ver `docs/TEST_REPORT.md` para el alcance de esa verificación.
26. **Implementada** — Todas las rutas muestran el mismo encabezado, navegación e idioma y el mismo pie de página; el contenido de navegación depende de la sesión autenticada.
27. **Implementada** — Al publicar un nivel se puede subir una imagen opcional que se recorta y optimiza a JPG 1920×1080 (16:9), se limita a 4 MB y se guarda en PostgreSQL. Si no hay imagen, el frontend usa la miniatura de YouTube.
28. **Implementada** — La persona autenticada puede consultar por separado sus niveles publicados (incluyendo estado, postulaciones y datos del nivel) y sus postulaciones de verificación (incluyendo estado de solicitud, nivel, requisito, creador y video). El backend deriva el usuario del token y no acepta un ID de usuario indicado por el cliente.
29. **Implementada** — La navegación de cuenta se agrupa en un menú con foto/nombre y enlaces a Perfil, Verificaciones y Niveles creados, seguido de Cerrar sesión destacado en rojo. Cerrar sesión limpia la credencial, vuelve a la landing y presenta un aviso temporal. El menú ofrece las etiquetas correspondientes en español e inglés.
30. **Implementada** — Cada nivel con al menos un verificador aceptado tiene una conversación grupal compartida entre su creador y todos sus verificadores aceptados. Solo esos participantes autenticados pueden leer y enviar mensajes; el backend valida el acceso por nivel y limita el texto a 2000 caracteres.
31. **Implementada** — El catálogo público, los niveles creados y las postulaciones tienen presentaciones distintas. Abrir los detalles desde esas listas muestra un modal superpuesto a la página.
32. **Implementada** — El modal de detalles se superpone a la lista y el reproductor integrado usa un ID de YouTube extraído de un enlace validado.
33. **Implementada** — Las miniaturas de nivel enlazan directamente al video y no se muestra un botón para abrirlo. La vista de detalle muestra el reproductor de YouTube en lugar de la imagen.
34. **Implementada** — Las imágenes opcionales se recortan al centro a 16:9, se codifican como JPG de 1920×1080 y alta calidad, y se limitan a 4 MB antes de almacenarse en PostgreSQL. La API admite un cuerpo JSON de hasta 8 MB.
35. **Implementada** — El chat tiene una página propia y lista al creador y a todos los verificadores aceptados. Los participantes pueden enviar texto, imágenes JPG/PNG/WebP de hasta 8 MB y videos MP4/WebM de hasta 25 MB. El backend valida el permiso, tipo y firma de archivo y sirve los adjuntos solo a participantes; se guardan en PostgreSQL.
36. **Implementada** — La etiqueta española para el modo `CLASSIC` es `Clásico`.
37. **Implementada** — Si el contenido del modal supera la altura disponible, el panel ofrece su propio desplazamiento vertical y mantiene el aspecto, tamaño y ancho actuales; el fondo permanece fijo y conserva espacio inferior después de las acciones.
38. **Implementada** — Las imágenes de nivel se sirven con `Cross-Origin-Resource-Policy: cross-origin` para que la web de Vite/Cloudflare pueda cargarlas desde la API de otro origen.
39. **Implementada** — La dificultad relativa se muestra con tilde aproximada pegada al número (`Top ~N`) en el catálogo, detalles, actividad y formulario.
40. **Implementada** — En los detalles de un nivel, el acceso al chat se separa visualmente del bloque de postulantes, mantiene espacio respecto del borde inferior del modal y se adapta a pantallas pequeñas.
41. **Implementada** — El acceso al chat solo se muestra cuando el nivel tiene al menos una postulación aceptada; el backend sigue autorizando únicamente al creador y a verificadores aceptados.
42. **Implementada** — La página de categorías de Niveles presenta siempre y en columna las secciones Clásico, Plataforma, Recientes, Viejos, Más difíciles, Más fáciles, Siendo verificados y Verificados recientemente, con separación visual uniforme entre categorías. Las primeras seis contienen niveles disponibles; la séptima contiene niveles `IN_PROGRESS`. La lista completa con filtros vive en una página separada. Recientes ordena por fecha descendente, viejos ascendente, más difíciles por Top ascendente y más fáciles por Top descendente.
43. **Implementada** — Solo el creador puede marcar como `VERIFIED` un nivel `IN_PROGRESS` que tenga al menos una postulación `ACCEPTED`; la API valida propietario y estado dentro de una transacción y actualiza la fecha de verificación. El botón aparece únicamente en Niveles creados.
44. **Implementada** — La landing muestra hasta cinco niveles verificados más recientemente. La página de lista completa filtra por modalidad, rango Top, orden cronológico y estado de verificación (`Sin verificar`, `Siendo verificados`, `Verificados` o `Todos`); por defecto muestra ambos modos, más recientes primero y niveles sin verificar. Los niveles verificados siguen figurando en Niveles creados y en las postulaciones del verificador, donde su estado se presenta como Verificado.
45. **Implementada** — El hardest mínimo no aparece en las tarjetas de listados personales o públicos; se muestra solamente dentro del modal de detalles, junto al botón para postularse.
46. **Implementada** — Cada nivel verificado muestra junto al creador el nombre visible o username de todos sus verificadores aceptados.
47. **Implementada** — El creador puede cerrar explícitamente las postulaciones de un nivel `AVAILABLE` o `IN_PROGRESS`. El cierre impide nuevas postulaciones y conserva las existentes. Aceptar verificadores no cierra las postulaciones automáticamente.
48. **Implementada** — El creador puede retirar de la lista un nivel únicamente mientras está `AVAILABLE` y no tiene verificadores aceptados. El nivel pasa a `CANCELLED`, deja de aceptar postulaciones y permanece en el historial completo.
49. **Implementada** — Un nivel `CANCELLED` solo aparece en la actividad privada de su creador; el catálogo público, el historial de postulaciones de otros usuarios, los detalles y las imágenes no lo exponen.
50. **Implementada** — El creador puede restaurar desde Niveles creados un nivel `CANCELLED` sin verificadores aceptados. Vuelve a `AVAILABLE`, reabre postulaciones y reaparece en el catálogo público.
51. **Implementada** — La página Acerca de explica el propósito, el flujo y la necesidad de la plataforma en español e inglés; el enlace de navegación abre esa página dedicada.
52. **Implementada** — El creador recibe notificación al llegar una postulación; el verificador cuando se acepta su postulación y cuando se completa su verificación; todos los demás participantes reciben aviso por mensajes nuevos en el chat del nivel.
53. **Implementada** — Niveles creados usa tarjetas compactas con miniaturas y metadatos alineados en un formato similar a Verificaciones.
54. **Implementada** — Los avisos de inicio/cierre de sesión aparecen en la esquina inferior derecha, entran y salen con fundido y desaparecen automáticamente.
55. **Implementada** — El botón Abrir chat solo aparece para el creador o para un verificador con postulación aceptada; el backend conserva la misma autorización.
56. **Implementada** — Aceptar uno o más verificadores no cambia `applications_open`. El creador puede cerrar explícitamente las postulaciones desde un nivel disponible o en progreso; cerrar impide nuevas solicitudes, pero no borra las existentes.
57. **Implementada** — El creador puede remover verificadores aceptados de niveles `IN_PROGRESS`. La postulación removida pasa a `REJECTED`; si no quedan verificadores aceptados, el nivel vuelve a `AVAILABLE` y conserva el valor actual de `applications_open`.
58. **Implementada** — El creador puede borrar definitivamente niveles `CANCELLED`; la API comprueba propiedad y estado y elimina sus postulaciones relacionadas en una transacción. La etiqueta Cancelado se muestra en rojo en Niveles creados.
59. **Implementada** — El inicio de sesión utiliza el nombre de usuario y la contraseña; el email se conserva para el registro y otros usos de cuenta.
60. **Implementada** — Los menús de idioma y cuenta se cierran al hacer clic fuera de ellos.
61. **Implementada** — El esquema inicial `backend/schema.sql` crea el usuario `owner` con contraseña inicial `owner` y rol `OWNER`. Esta credencial débil debe cambiarse inmediatamente y antes de exponer la instancia a internet.
62. **Implementada** — Admin y owner tienen una página para consultar todos los jugadores y niveles pendientes de aprobación. Aprobar publica un nivel (`AVAILABLE`); rechazar lo deja `REJECTED`. Solo owner puede promover usuarios normales a `ADMIN`; las acciones quedan auditadas.
63. **Implementada** — Las salas, mensajes y adjuntos de chat son accesibles a cuentas `USER` que sean creadoras o verificadoras aceptadas. Admin y owner solo pueden leer el chat mientras exista un reporte activo asociado; no pueden enviar mensajes.
64. **Implementada** — El creador puede marcar un nivel como `Open verification`. Las postulaciones que cumplen los requisitos se aceptan automáticamente y el nivel pasa a `IN_PROGRESS`; nuevas postulaciones siguen permitidas mientras el creador no las cierre.
65. **Implementada** — Los participantes `USER` pueden reportar a otro participante del chat, seleccionándolo y describiendo el motivo. Admin y owner pueden leer el chat mientras el reporte está abierto, descartarlo o suspender al usuario reportado por días o permanentemente.
66. **Implementada** — Una cuenta suspendida no puede publicar niveles, postularse ni participar en chats. Los niveles del usuario pasan temporalmente a `CANCELLED` y, al expirar una suspensión temporal, recuperan su estado y apertura de postulaciones anteriores; una suspensión permanente no se revierte automáticamente.
