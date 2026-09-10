# STIA PBA Gremial Zona 6

Aplicacion web para que usuarios autorizados generen, previsualicen, descarguen e impriman documentos PDF a partir de plantillas administrables.

El documento soportado actualmente es **Permiso Gremial**. El sistema tiene dos roles: `ADMIN` y `DELEGADO`.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zod, Vitest.
- Backend: Java 21, Spring Boot 3.5, Spring Security, Spring Data JPA/Hibernate, Flyway, PostgreSQL, Apache PDFBox.
- Produccion: Vercel, Render, Supabase PostgreSQL y Supabase Storage mediante API compatible con S3.

## Funcionalidades principales

- Login mediante DNI y contraseña, cambio obligatorio en el primer ingreso y roles.
- Administracion de usuarios, empresas, convenios, plantillas, variantes y campos de plantilla.
- Configuracion de campos `ACROFORM` y `POSITIONED`, incluidos campos reutilizables y editor visual.
- Generacion en memoria de Permiso Gremial, preview, descarga e impresion.
- Recuperacion local limitada del formulario en `localStorage`.

## Estructura

```text
frontend/                 SPA React/Vite
backend/                  API Spring Boot
docs/                     Documentacion funcional y tecnica
docs/pdf-templates/       PDFs seed y referencias de plantillas
docker-compose.yml        PostgreSQL para desarrollo local
```

## Desarrollo local

Requisitos: Java 21, Node.js 20 o superior, npm y Docker Desktop con Docker Compose.

```bash
cp .env.example .env
docker compose up -d postgres
```

Backend:

```bash
cd backend
mvn spring-boot:run
```

Frontend:

```bash
cd frontend
npm ci
npm run dev
```

La aplicacion queda disponible en `http://localhost:5173` y el backend en `http://localhost:8080`. Vite reenvia `/api` al backend local.

## Configuracion y despliegue

Las variables de entorno seguras y el procedimiento de Vercel, Render, Supabase, Flyway, storage y seed estan en [DEPLOYMENT.md](DEPLOYMENT.md). El resumen tecnico actual esta distribuido en:

- [Arquitectura](docs/06_ARCHITECTURE.md)
- [Plantillas PDF](docs/PDF_TEMPLATES.md)
- [Decisiones tecnicas](docs/DECISIONS.md)
- [Testing](docs/TESTING.md)
- [Performance medida](docs/PERFORMANCE.md)
- [Deuda tecnica](docs/TECH_DEBT.md)
- [Contrato API](docs/05_API.md)

## Tests y builds

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
mvn test -Dapp.template.seed-enabled=true -Dapp.template.seed-file="../docs/pdf-templates/Permiso Gremial Bruna.pdf"
```

Para instalar o ejecutar Maven en Windows se puede usar Maven Wrapper si se incorpora al entorno, o el ejecutable `mvn.cmd` de una instalacion local de Maven. No se documentan rutas personales.
