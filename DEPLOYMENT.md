# Despliegue de producción

## Alcance

Esta guía prepara el MVP para un host, VM o plataforma de contenedores. No presupone proveedor cloud. El despliegue requiere cuatro componentes persistentes o configurados independientemente:

- Frontend estático (`frontend/dist`).
- Backend Spring Boot (`backend/target/document-management-0.0.1-SNAPSHOT.jar`).
- PostgreSQL.
- Directorio persistente de plantillas PDF (`TEMPLATE_STORAGE_PATH`).

El reverse proxy termina HTTPS, sirve el frontend y reenvía solo `/api/` al backend. PostgreSQL y el directorio de plantillas no se exponen por HTTP.

## Requisitos

- Java 21 para ejecutar el backend.
- Maven 3.9+ para construirlo.
- Node.js 20+ y npm para construir el frontend.
- PostgreSQL 16+.
- Un reverse proxy con TLS, por ejemplo Nginx.
- Un volumen/directorio persistente, de lectura y escritura para el usuario del backend.
- El PDF seed `Permiso-Gremial-Bruna.pdf` disponible en una ruta absoluta, de solo lectura para el backend.

## Variables

No versionar el archivo que contiene valores de producción. Usar el gestor de secretos de la plataforma o variables de servicio. `.env.example` es solo una referencia de desarrollo.

| Variable | Producción | Uso |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` | Activa el perfil seguro. |
| `BACKEND_PORT` | Sí, si no se usa `8080` | Puerto local del JAR. No publicar a Internet. |
| `DB_HOST` | Sí | Host privado de PostgreSQL. |
| `DB_PORT` | Sí | Puerto PostgreSQL. |
| `DB_NAME` | Sí | Base de datos de la aplicación. |
| `DB_USERNAME` | Sí | Usuario de aplicación con privilegios mínimos. |
| `DB_PASSWORD` | Sí, secreto | Contraseña del usuario de aplicación. |
| `JWT_SECRET` | Sí, secreto | Base64 de al menos 32 bytes aleatorios. No reutilizar entre entornos. |
| `JWT_EXPIRATION_SECONDS` | Sí | Duración positiva del JWT, por ejemplo `3600`. |
| `AUTH_COOKIE_SECURE` | No en prod | El perfil `prod` fuerza `Secure=true`; en dev controla la cookie. |
| `AUTH_COOKIE_SAME_SITE` | Sí | Normalmente `Lax`. Usar `None` solo si frontend y API están en sitios distintos; requiere HTTPS. |
| `FRONTEND_URL` | Sí | Origen exacto permitido por CORS, por ejemplo `https://documentos.example.org`. |
| `INITIAL_ADMIN_DNI` | Primer inicio | DNI del único ADMIN inicial. |
| `INITIAL_ADMIN_PASSWORD` | Primer inicio, secreto | Entre 10 y 72 caracteres. |
| `INITIAL_ADMIN_NAME` | Primer inicio | Nombre. |
| `INITIAL_ADMIN_LASTNAME` | Primer inicio | Apellido. |
| `TEMPLATE_STORAGE_PATH` | Sí | Ruta absoluta del volumen persistente, por ejemplo `/var/lib/stiapba/templates`. |
| `TEMPLATE_MAX_FILE_SIZE` | Sí | Límite multipart de Spring, por ejemplo `10MB`. |
| `TEMPLATE_MAX_FILE_SIZE_BYTES` | Sí | Mismo límite expresado en bytes, por ejemplo `10485760`. |
| `TEMPLATE_SEED_ENABLED` | Sí | `true` para provisionar/verificar Bruna; `false` si la variante ya se administra por la aplicación. |
| `TEMPLATE_SEED_FILE` | Si seed activo | Ruta absoluta al PDF seed, por ejemplo `/opt/stiapba/seed/Permiso-Gremial-Bruna.pdf`. |

`AUTH_COOKIE_SECURE=false` solo sirve para HTTP local. Producción falla si faltan las variables requeridas por `application-prod.yml`; en particular no existe un secreto JWT ni credencial DB de respaldo.

## Base de datos y Flyway

Flyway es la única autoridad del esquema. Hibernate opera con `ddl-auto=validate`, por lo que no crea ni modifica tablas. Al arrancar, Flyway valida/aplica las migraciones pendientes antes de usar el esquema.

Crear una base y un usuario exclusivos de la aplicación. El usuario no debe ser superusuario, ni `CREATEDB`, ni `CREATEROLE`. Debe tener permisos sobre la base y el esquema `public` necesarios para que Flyway cree y migre sus tablas. Restringir la red de PostgreSQL a backend y operaciones administrativas; no publicar el puerto en Internet.

`docker-compose.yml` es exclusivamente una ayuda de desarrollo: inicia solo PostgreSQL, persiste en el volumen `postgres_data` y lo enlaza a `127.0.0.1`. No construye ni publica frontend/backend de producción.

## Templates y seed

Montar `TEMPLATE_STORAGE_PATH` como volumen persistente fuera del directorio de trabajo y otorgar lectura/escritura únicamente al usuario del backend. El backend crea archivos con claves internas y no publica esta ruta como recurso HTTP.

Para un primer despliegue reproducible, montar el PDF Bruna en una ruta absoluta de solo lectura, establecer `TEMPLATE_SEED_ENABLED=true` y `TEMPLATE_SEED_FILE` a esa ruta. El seed es idempotente: crea `Permiso Gremial / Bruna` solo si no existe y repone el archivo si la referencia existente quedó sin archivo. Nunca modifica el PDF origen. Tras verificar el provisionamiento puede mantenerse activo para reparación controlada o desactivarse; si se desactiva, conservar igualmente el PDF seed fuera del volumen como material de recuperación.

La actualización de una variante combina filesystem y DB. Una interrupción entre ambas operaciones puede dejar un archivo huérfano o, ante una falla de almacenamiento, requerir intervención operativa. Antes de reemplazar PDFs, respaldar DB y storage juntos; ante inconsistencia, restaurar ambos desde el mismo punto o reparar la variante desde ADMIN.

## Build y arranque

Desde `frontend/`:

```bash
npm ci
npm run build
```

Publicar el contenido de `frontend/dist`. El bundle utiliza `VITE_API_BASE_URL=/api/v1` por defecto y no incorpora una URL localhost. Si se usa un origen de API separado, definir `VITE_API_BASE_URL` con su URL HTTPS antes de `npm run build` y hacer coincidir `FRONTEND_URL`, CORS y la política de cookies.

Desde `backend/`:

```bash
mvn clean package
java -jar target/document-management-0.0.1-SNAPSHOT.jar
```

El proceso debe recibir `SPRING_PROFILES_ACTIVE=prod` y todas las variables de la tabla. Maven no es necesario para ejecutar el JAR ya construido.

En el primer arranque, si no existe ningún ADMIN y las cuatro variables `INITIAL_ADMIN_*` están completas, se crea uno con BCrypt y `firstLogin=true`. No se registra la contraseña, no se recrea ni restablece en reinicios y no se crean duplicados. El administrador debe iniciar sesión y cambiar esa contraseña inmediatamente. Después puede retirarse `INITIAL_ADMIN_PASSWORD` del entorno; dejar las cuatro variables vacías también es válido cuando ya existe un ADMIN.

## HTTPS, proxy y rate limit

HTTPS es obligatorio. Redirigir HTTP a HTTPS y dejar el backend accesible solo desde la red local/privada del proxy. Configuración Nginx de referencia, ajustando dominios, rutas de certificados y backend:

```nginx
# Contexto http {}
limit_req_zone $binary_remote_addr zone=login_per_ip:10m rate=5r/m;

server {
    listen 80;
    server_name documentos.example.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name documentos.example.org;
    ssl_certificate /etc/letsencrypt/live/documentos.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/documentos.example.org/privkey.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), geolocation=(), microphone=(), payment=(), usb=()" always;
    add_header X-Frame-Options "DENY" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; worker-src 'self' blob:" always;

    root /srv/stiapba/frontend;
    index index.html;
    client_max_body_size 10m;

    location = /api/v1/auth/login {
        limit_req zone=login_per_ip burst=5 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 30s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

El límite de login permite cinco solicitudes por minuto por IP con una ráfaga inicial de cinco; Nginx devuelve `503` cuando se supera. Ajustar según tráfico real y convertir ese `503` en `429` si la plataforma/proxy lo permite. Es deliberadamente infraestructura, no una dependencia de aplicación. Si el proxy está detrás de otro balanceador, configurar correctamente la IP real antes de usar `$binary_remote_addr`.

La CSP permite `frame-src blob:` porque el preview usa un `iframe` con una object URL; bloquearlo rompería vista previa e impresión. Probarla en el navegador objetivo antes de activar un cambio de CSP.

## Política PDF y operación

Solo ADMIN puede cargar o reemplazar PDFs. Mantener ambos límites de tamaño en 10 MB y el `client_max_body_size` del proxy alineado. El límite de bytes no limita páginas, objetos comprimidos ni complejidad interna: reservar memoria suficiente para PDFBox, conservar `proxy_read_timeout 30s` como límite inicial y observar errores de generación. Ante un PDF problemático, retirar/desactivar la variante, analizarla fuera de producción y cargar una versión validada. No aumentar límites ni reintentar automáticamente sin investigar.

No registrar passwords, contraseñas temporales, JWT, cookies, `JWT_SECRET` ni `DB_PASSWORD`. Los errores inesperados se registran en backend con stack trace para operación y el cliente recibe solo `INTERNAL_ERROR`, sin detalle interno. En producción mantener logs en `INFO` y proteger su acceso.

No se agrega Actuator al MVP. Para health checks, el supervisor debe comprobar que el proceso/JAR está vivo y que el puerto privado `127.0.0.1:8080` acepta TCP después del arranque; el proxy puede comprobar la misma conectividad. Validar además el arranque de Flyway en logs. No usar un endpoint autenticado como health check público.

## Backups y recuperación

PostgreSQL y `TEMPLATE_STORAGE_PATH` forman conjuntamente el estado persistente. Respaldarlos con una frecuencia acordada y conservar copias cifradas fuera del host. Usar `pg_dump` o backup nativo consistente de PostgreSQL y una copia consistente del volumen de templates. Etiquetar ambos con la misma fecha/hora, probar restauraciones periódicas y restaurarlos juntos para evitar referencias `fileKey` inválidas.

## Troubleshooting

- Arranque falla por `JWT_SECRET`: suministrar Base64 válido de 32 bytes o más y un `JWT_EXPIRATION_SECONDS` positivo.
- Arranque falla por DB: revisar conectividad privada, variables `DB_*`, privilegios Flyway y que no haya una base vacía con migraciones modificadas.
- Seed falla: comprobar que `TEMPLATE_SEED_FILE` es absoluto, existe, es un PDF válido y el usuario del backend puede leerlo.
- Upload/generación falla: confirmar espacio y permisos de `TEMPLATE_STORAGE_PATH`, y que el máximo de proxy/Spring sea el mismo.
- Cookies no persisten: confirmar HTTPS, `Secure=true`, `FRONTEND_URL` exacta, CORS y `SameSite`. Para dominios distintos se requiere `SameSite=None; Secure` y revisión explícita de seguridad.

## Riesgos residuales M13/M14

| Hallazgo | Estado M15 |
| --- | --- |
| Atomicidad filesystem/DB al reemplazar PDF | Mitigado operacionalmente con backup conjunto y procedimiento de reparación; deuda técnica sin transacción distribuida. |
| Ruta relativa del seed | Corregido para producción: el seed requiere una ruta configurada y se documenta como absoluta. |
| Rate limiting de login | Mitigado con límite Nginx concreto; requiere que el proxy sea desplegado. |
| Complejidad interna de PDF | Mitigado con política de tamaño, timeout, memoria y operación; no hay sandbox PDF. |
| Headers de seguridad | Mitigado por configuración Nginx de referencia, incluida CSP compatible con Blob. |
| Logging de errores 500 | Corregido: log operacional interno y respuesta genérica al cliente. |
| Longitud de búsquedas | Deuda técnica baja: los listados actuales no imponen máximo de query; el proxy puede limitar URI y el volumen MVP es pequeño. |
| Foco/accesibilidad avanzada de diálogos | Deuda técnica de UX: requiere prueba manual con teclado/lector de pantalla en cada diálogo. |
| Ausencia de E2E frontend | Deuda técnica: tests unitarios/build no sustituyen un flujo de navegador de producción. |
