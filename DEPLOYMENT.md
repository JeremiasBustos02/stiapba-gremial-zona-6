# Despliegue de producción

## Arquitectura inicial gratuita

```text
React + Vite (Vercel)
        |
        | HTTPS + cookies cross-site
        v
Spring Boot (Render Docker)
        |
        +-- Supabase PostgreSQL
        +-- Supabase Storage S3-compatible (bucket privado de templates)
```

PostgreSQL conserva solo `TemplateVariant.fileKey`. Los PDFs generados continúan siendo efímeros: se generan en memoria, se envían al navegador y no se almacenan en Supabase Storage.

No versionar valores de producción. Configurarlos únicamente desde los paneles de Vercel, Render y Supabase.

## Supabase

1. Crear un proyecto y obtener los datos de conexión PostgreSQL para el backend. No usar Supabase Auth.
2. Crear un bucket de Storage **privado** para las plantillas, por ejemplo con un nombre decidido al crear el recurso.
3. Activar el protocolo S3 de Supabase Storage y crear un par de credenciales S3 con acceso limitado al bucket de templates.
4. Tomar el endpoint S3, que tiene el formato `https://<project-ref>.storage.supabase.co/storage/v1/s3`, y la región del proyecto.

Supabase Storage requiere acceso path-style para este flujo; la aplicación lo activa exclusivamente en el cliente S3 del backend. No se generan URLs públicas ni presigned URLs y las credenciales S3 no salen de Render.

## Variables

### Vercel

| Variable | Valor |
| --- | --- |
| `VITE_API_URL` | URL HTTPS del backend terminada en `/api/v1`, por ejemplo `https://<api>.onrender.com/api/v1`. |

Vite solo incorpora variables con prefijo `VITE_` al bundle. No definir allí secretos, contraseñas, JWT ni credenciales S3.

### Render

| Variable | Uso |
| --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod`. La imagen también lo establece por defecto. |
| `PORT` | Lo proporciona Render. Spring escucha `server.port=${PORT:8080}`. |
| `DB_HOST` | Host PostgreSQL proporcionado por Supabase. |
| `DB_PORT` | Puerto PostgreSQL proporcionado por Supabase. |
| `DB_NAME` | Base de datos proporcionada por Supabase. |
| `DB_USERNAME` | Usuario PostgreSQL proporcionado por Supabase. |
| `DB_PASSWORD` | Secreto PostgreSQL proporcionado por Supabase. |
| `DB_SSL_MODE` | `require` para Supabase. El valor se aplica como `sslmode` JDBC. |
| `DB_POOL_MAX_SIZE` | Máximo de conexiones Hikari por instancia Render. Default seguro: `3`. |
| `DB_POOL_MIN_IDLE` | Conexiones Hikari inactivas mantenidas por instancia Render. Default seguro: `1`. |
| `JWT_SECRET` | Secreto Base64 de al menos 32 bytes aleatorios, único por entorno. |
| `JWT_EXPIRATION_SECONDS` | Duración positiva del JWT, por ejemplo `3600`. |
| `AUTH_COOKIE_SECURE` | `true`. El perfil `prod` fuerza Secure igualmente. |
| `AUTH_COOKIE_SAME_SITE` | `None` para Vercel y Render en sitios distintos. Requiere HTTPS. |
| `FRONTEND_URL` | Origen exacto de Vercel, por ejemplo `https://<app>.vercel.app`, sin barra final. |
| `INITIAL_ADMIN_DNI` | DNI del ADMIN inicial, solo mientras aún no exista uno. |
| `INITIAL_ADMIN_PASSWORD` | Contraseña temporal inicial, secreto de 10 a 72 caracteres. |
| `INITIAL_ADMIN_NAME` | Nombre del ADMIN inicial. |
| `INITIAL_ADMIN_LASTNAME` | Apellido del ADMIN inicial. |
| `TEMPLATE_STORAGE_TYPE` | `s3`. |
| `TEMPLATE_MAX_FILE_SIZE` | Límite multipart, por ejemplo `10MB`. |
| `TEMPLATE_MAX_FILE_SIZE_BYTES` | El mismo límite en bytes, por ejemplo `10485760`. |
| `TEMPLATE_SEED_ENABLED` | `true` para crear o reparar la variante Bruna; `false` para provisionarla manualmente mediante ADMIN. |
| `TEMPLATE_SEED_FILE` | Opcional con Docker: por defecto `/app/seed/Permiso-Gremial-Bruna.pdf`. |
| `S3_ENDPOINT` | Endpoint S3-compatible de Supabase Storage. |
| `S3_REGION` | Región del proyecto Supabase. |
| `S3_ACCESS_KEY` | Access key S3 de Supabase, secreto. |
| `S3_SECRET_KEY` | Secret key S3 de Supabase, secreto. |
| `S3_BUCKET` | Nombre del bucket privado creado en Supabase. |

`TEMPLATE_STORAGE_PATH` queda disponible solo para `TEMPLATE_STORAGE_TYPE=local`; no se configura ni se usa en Render. Si Supabase entrega una URL JDBC completa en vez de los componentes `DB_*`, se puede configurar como `SPRING_DATASOURCE_URL`; debe incluir `sslmode=require` o una política TLS más estricta compatible.

## Conexiones PostgreSQL

Render debe usar el **Session Pooler** de Supabase para este backend. Hibernate/JPA y Flyway pueden mantener estado de sesión y usar prepared statements; el Transaction Pooler está orientado a funciones serverless y no soporta prepared statements.

En producción Hikari usa un máximo de `3` conexiones y mantiene `1` inactiva por instancia. Flyway y JPA comparten el DataSource auto-configurado por Spring Boot, por lo que no crean pools independientes. Con una instancia Render, la aplicación no mantiene más de tres clientes simultáneos del Session Pooler, dejando margen dentro del límite de 15.

## Seed Bruna

El Dockerfile copia `docs/pdf-templates/Permiso-Gremial-Bruna.pdf` a `/app/seed/Permiso-Gremial-Bruna.pdf` durante el build con el repositorio como contexto. El archivo empaquetado es inmutable y reproducible; el destino siempre se escribe mediante el `TemplateFileStorage` activo, incluido S3.

Con `TEMPLATE_SEED_ENABLED=true`, el seed es idempotente: crea `Permiso Gremial / Bruna` si falta, o repone el objeto S3 si la referencia existe pero el objeto no está disponible. El archivo origen nunca se modifica.

Con `TEMPLATE_SEED_ENABLED=false`, el primer ADMIN debe crear `Permiso Gremial` y cargar la variante Bruna mediante la interfaz. No establecer ese valor en un despliegue vacío salvo que se siga ese procedimiento.

## Cookies, CSRF y CORS

Vercel y Render usan sitios distintos. En producción deben usarse `AUTH_COOKIE_SECURE=true` y `AUTH_COOKIE_SAME_SITE=None`; ambos servicios deben estar detrás de HTTPS. `FRONTEND_URL` se registra como el único origen CORS permitido, con `allowCredentials=true`. No se usa `*` ni se permite un origen adicional por defecto.

La cookie JWT sigue siendo `HttpOnly`; no se mueve a `localStorage` ni `sessionStorage`. CSRF permanece habilitado con double-submit: antes de cada operación que modifica estado, el frontend solicita `GET /api/v1/auth/csrf` con credenciales y envía el token recibido en `X-XSRF-TOKEN`. Esto es necesario porque JavaScript servido desde Vercel no puede leer cookies alojadas en Render. Login conserva la excepción CSRF existente.

Algunos navegadores o configuraciones de privacidad bloquean cookies de terceros. Debe realizarse una prueba real en los navegadores objetivo antes de M16. Si se bloquean, la alternativa a evaluar es un dominio propio compartido o un proxy same-origin, no almacenar el JWT en el navegador.

## Render

Render debe crear un Web Service Docker con el repositorio como directorio raíz y `backend/Dockerfile` como Dockerfile. El contexto raíz es necesario porque la imagen incluye el PDF seed desde `docs/pdf-templates/`.

La imagen compila con Maven y Java 21, ejecuta un JRE 21 no privilegiado y no depende de almacenamiento local persistente. Render proporciona `PORT`; no definir un puerto público fijo ni montar un volumen de templates.

Build local equivalente desde la raíz del repositorio:

```bash
docker build -f backend/Dockerfile -t stiapba-backend .
```

Flyway se ejecuta al iniciar el backend con `ddl-auto=validate`. No ejecutar migraciones manuales ni habilitar `ddl-auto=update`.

## Vercel

Crear un proyecto Vercel cuyo Root Directory sea `frontend/`. La configuración detecta Vite y utiliza:

```bash
npm ci
npm run build
```

El artefacto publicado es `frontend/dist`. `frontend/vercel.json` redirige las rutas al `index.html` para que React Router funcione al refrescar URLs internas. Definir `VITE_API_URL` antes del build; las variables de Vite se incorporan de forma estática y requieren un nuevo deploy cuando cambian.

## Operación y recuperación

- Mantener el bucket privado y otorgar a las credenciales S3 solo los permisos mínimos necesarios sobre ese bucket.
- Respaldar PostgreSQL y los objetos `templates/` del bucket como una misma unidad lógica. Restaurarlos juntos para no dejar `fileKey` inválidos.
- Mantener `TEMPLATE_MAX_FILE_SIZE` y `TEMPLATE_MAX_FILE_SIZE_BYTES` alineados en 10 MB salvo revisión explícita.
- Tras crear el ADMIN inicial y validar el acceso, retirar `INITIAL_ADMIN_PASSWORD` del entorno.
- No registrar JWT, cookies, contraseñas, secretos JDBC ni credenciales S3.

## Verificación previa a M16

1. Configurar las variables sin valores reales en archivos versionados.
2. Crear el bucket privado y las credenciales S3 en Supabase.
3. Confirmar el arranque de Render, Flyway y la creación idempotente del seed.
4. Probar login, cambio de contraseña, CRUD de variantes, generación, descarga e impresión desde un celular.
5. Verificar desde Vercel que el preflight CORS permite solo `FRONTEND_URL`, las cookies llevan `Secure; SameSite=None` y las mutaciones incluyen `X-XSRF-TOKEN`.
