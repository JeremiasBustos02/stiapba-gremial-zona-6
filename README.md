# STIA PBA Gremial Zona 6

Sistema web de gestión documental para usuarios autorizados. Permite generar, consultar y regenerar Permisos Gremiales a partir de plantillas PDF administrables.

## Funcionalidades

- Autenticación mediante DNI y contraseña, cambio obligatorio en el primer ingreso y cierre de sesión.
- Roles `ADMIN` y `DELEGADO`, con autorización aplicada en backend.
- Generación individual y masiva de Permisos Gremiales; la generación masiva admite `manualValues` comunes y hasta 100 delegados.
- Vista previa, descarga, impresión, regeneración y uso de un documento histórico como base.
- Historial `DocumentRecord` con numeración `PG-YYYY-NNNNNN`, búsqueda, filtros, paginación y exportación XLSX.
- Búsqueda global y sugerencias personales para completar formularios.
- Administración de usuarios, empresas, convenios, plantillas, variantes y campos posicionados.
- Reset de contraseña administrado por `ADMIN`.
- Reportes por período, exportaciones administrativas y reportes mensuales persistidos.
- Editor de campos posicionados accesible por teclado.
- Envío por Resend implementado en backend. La acción de enviar desde la interfaz está actualmente deshabilitada.

Los PDFs normales se generan en memoria y no se persisten. Los archivos de plantillas y reportes se guardan mediante el storage configurado; PostgreSQL conserva sus referencias y metadatos.

## Roles

| Rol | Acceso |
| --- | --- |
| `ADMIN` | Generación documental y administración de usuarios, empresas, convenios, plantillas, campos, historial y reportes. |
| `DELEGADO` | Generación documental, historial propio, regeneración de registros propios y consulta de catálogos y plantillas activas. |

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zod, Vitest.
- Backend: Java 21, Spring Boot 3.5.9, Spring Security, Spring Data JPA/Hibernate, Flyway, PostgreSQL, Apache PDFBox, Apache POI y AWS SDK S3.
- Despliegue previsto: Vercel para frontend, Render para backend y PostgreSQL/storage compatibles con la configuración del entorno.

## Arquitectura

SPA React/Vite → API REST Spring Boot → PostgreSQL. El backend valida permisos, persiste entidades e historial, genera PDFs en memoria y utiliza `TemplateFileStorage` para PDFs de plantillas y storage de reportes.

## Estructura

```text
frontend/                 SPA React/Vite
backend/                  API Spring Boot
docs/                     Documentación funcional y técnica
docs/pdf-templates/       PDFs de referencia y seed
backend/.../db/migration/ Migraciones Flyway (V1 a V12)
docker-compose.yml        PostgreSQL para desarrollo local
```

## Desarrollo local

Requisitos: Java 21, Node.js 20 o superior, npm, Docker Desktop y Docker Compose.

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

En otra terminal:

```bash
cd frontend
npm ci
npm run dev
```

La aplicación queda disponible en `http://localhost:5173` y la API en `http://localhost:8080`. Vite reenvía `/api` al backend local.

## Variables de entorno

Usar `.env.example` como referencia y completar los valores sólo en el entorno local o del proveedor. No versionar secretos. Las variables cubren conexión PostgreSQL, autenticación/JWT, CORS, storage de plantillas/reportes y Resend. Los nombres y ejemplos seguros están en [DEPLOYMENT.md](DEPLOYMENT.md).

## Tests y builds

```bash
cd frontend
npm run lint
npm test -- --run
npm run build
```

```bash
cd backend
mvn test -Dapp.template.seed-enabled=true -Dapp.template.seed-file="../docs/pdf-templates/Permiso Gremial Bruna.pdf"
```

## Deploy

El procedimiento de configuración, migraciones, storage, seed, CORS, health check y variables de entorno está en [DEPLOYMENT.md](DEPLOYMENT.md). Las migraciones Flyway vigentes llegan hasta `V12__create_monthly_reports.sql`.

## Documentación

- [Requisitos](docs/02_REQUIREMENTS.md)
- [Flujos de usuario](docs/03_USER_FLOWS.md)
- [Modelo de dominio](docs/04_DOMAIN_MODEL.md)
- [Contrato API](docs/05_API.md)
- [Arquitectura](docs/06_ARCHITECTURE.md)
- [UI/UX](docs/07_UI_UX.md)
- [Roadmap](docs/08_ROADMAP.md)
- [Plantillas PDF](docs/PDF_TEMPLATES.md)
- [Testing](docs/TESTING.md)

## Estado pre-v1.0.0

El alcance funcional previsto para v1.0.0 está implementado en el repositorio. La interfaz de envío por email permanece deshabilitada aunque el backend ya integra Resend. La automatización de reportes mensuales mediante scheduler sigue diferida. No se incluyen documentos nuevos fuera de Permiso Gremial, almacenamiento persistente de PDFs generados, borradores persistentes en servidor, auditoría de emails ni registro público.
