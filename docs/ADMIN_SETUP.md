# Activar el panel interno

El panel está en `/admin` (en el dominio de prueba: `https://nicolino.zip/testsite/caravelas/admin`). Edita clases y coaches, equipo, precios, título, ubicación, horario de apertura y contacto. El sitio público lee los cambios desde una única base de datos Postgres.

Para revisar el diseño antes de activar Google, abre `/admin/prototipo`. Esta vista usa una copia inicial de los datos, permite probar todos los campos y no guarda ningún cambio ni consulta la base de datos.

## Base de datos

Neon Postgres ya está conectado al proyecto Vercel y proporciona `DATABASE_URL`. Producción usa `CONTENT_SOURCE=db` y la primera lectura creó la tabla `site_content` con una copia validada de la [hoja compartida](https://docs.google.com/spreadsheets/d/1CNeCzSB0iNEcwi0OME1E7v2DqRFZ3Dg6QWi2xPEVCKY/edit) recibida el 5 de noviembre de 2026 (47 clases, 4 precios y 2 coaches). La base de desarrollo se inicializó con `scripts/seed-admin-db.mjs`; el script es seguro de repetir porque no sobrescribe los cambios del panel.

Cada guardado actualiza solo la sección elegida. El servidor valida la información con el mismo esquema que usa la web y compara la versión de esa sección para evitar sobrescribir un cambio reciente de otro editor. Se guarda el correo del último editor y la fecha de actualización.

## Acceso con Google

1. En Google Cloud, configura la pantalla de consentimiento OAuth y crea un cliente OAuth de tipo **Aplicación web**. Añade como URI de redirección autorizado `https://nicolino.zip/testsite/caravelas/api/admin/auth/callback` (y `http://localhost:3000/testsite/caravelas/api/admin/auth/callback` para desarrollo local). Solo se solicitan los permisos básicos de identidad y correo.
2. Configura `ADMIN_SITE_ORIGIN` (solo esquema y dominio), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS` (correos separados por coma) y `ADMIN_SESSION_SECRET` en Vercel y localmente. Genera el último con `openssl rand -base64 32 | tr '+/' '-_' | tr -d '='`. Nunca publiques estos secretos en Git ni en variables `NEXT_PUBLIC_`.
3. Si la aplicación OAuth está en modo de prueba, añade los correos permitidos como usuarios de prueba en Google Cloud.

La lista se verifica en el servidor al iniciar sesión y en cada guardado. La sesión tiene una duración de doce horas y usa una cookie cifrada, `HttpOnly`, `SameSite=Lax` y `Secure` en producción. El inicio de sesión usa `state`, PKCE y `nonce`; los guardados comprueban el origen de la petición.

## Idiomas

El panel cambia los textos en portugués. Conserva las traducciones existentes en los otros idiomas. Si cambias el significado de un texto, también debes actualizar sus traducciones para evitar mensajes distintos según el idioma. Los anuncios y los bloques destacados todavía se editan fuera del panel.
