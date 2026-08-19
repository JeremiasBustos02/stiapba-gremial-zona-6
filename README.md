# Sistema de Gestión Documental

MVP para generar documentos PDF a partir de plantillas predefinidas.

## Requisitos

- Java 21
- Node.js 20 o superior
- npm
- Docker Desktop con Docker Compose

## Configuración local

1. Copiar `.env.example` como `.env`.
2. Iniciar PostgreSQL:

```bash
docker compose up -d postgres
```

3. Iniciar el backend desde `backend/` con Maven:

```bash
cd backend
mvn spring-boot:run
```
4. Iniciar el frontend desde `frontend/`:

```bash
npm ci
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y el backend en `http://localhost:8080`. Vite reenvía `/api` al backend local; el frontend no necesita incluir una URL de API localhost.

## Producción

La guía completa de requisitos, variables, primer ADMIN, Flyway, storage de plantillas, HTTPS, proxy, backups y troubleshooting está en [DEPLOYMENT.md](DEPLOYMENT.md).

Resumen de build:

```bash
cd frontend && npm ci && npm run build
cd backend && mvn clean package
```

Ejecutar el JAR con Java 21, `SPRING_PROFILES_ACTIVE=prod` y las variables documentadas. No usar `docker-compose.yml` como configuración de producción: contiene únicamente PostgreSQL para desarrollo local.
