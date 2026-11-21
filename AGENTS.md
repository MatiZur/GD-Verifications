# AGENTS.md

## Alcance del proyecto
- Este repositorio corresponde a GD Verifications, una comunidad de verificación de niveles de Geometry Dash.
- Mantener `frontend/` (React + Vite) y `backend/` (Express + PostgreSQL) preparados para desplegarse por separado.
- Leer `docs/SPEC.md` antes de cambiar el comportamiento del producto y `docs/PLAN.md` antes de comenzar una tarea.

## Acuerdos de trabajo obligatorios
- Respetar las reglas de negocio numeradas en `docs/SPEC.md`. Si una regla cambia, actualizar la especificación y sus pruebas en la misma tarea.
- No afirmar que existe una ruta, pantalla, publicación o prueba sin comprobar que está implementada. Marcar explícitamente las funciones planeadas.
- Guardar secretos únicamente en archivos `.env` ignorados por Git o en el gestor de secretos del servicio de alojamiento. Nunca subir credenciales, tokens, direcciones privadas de bases de datos ni archivos `.env` reales. Los `.env.example` solo pueden incluir valores de ejemplo.
- La interfaz web está disponible en español e inglés. Todo texto nuevo que vea el usuario debe traducirse a ambos idiomas. Mantener el nombre del producto exactamente como `GD Verifications` en los dos.
- Comprobar la propiedad de los recursos y los roles en el servidor; ocultar un control en React no constituye autorización.
- Usar consultas SQL parametrizadas para los datos proporcionados por usuarios. Guardar contraseñas con bcrypt y no devolver nunca sus hashes.
- Para una base nueva, mantener `backend/schema.sql` como inicialización completa e idempotente; se aplica automáticamente al iniciar la API. No agregar ni volver a introducir una cadena de migraciones sin cambiar expresamente este acuerdo.
- Mantener las pruebas deterministas y sin dependencias de servicios externos, salvo que una prueba de integración las habilite expresamente.
- Crear una confirmación de Git enfocada por cada tarea terminada. No mezclar tareas que no estén relacionadas.

## Comprobaciones antes de entregar
- Backend: `cd backend && npm test`
- Compilación de producción del frontend: `cd frontend && npm run build`
- Informar las comprobaciones que no se ejecutaron y cualquier dependencia pendiente de integración o publicación.
