# Sistema de Gestión Documental

Bootstrap técnico del MVP para generar documentos PDF a partir de plantillas predefinidas.

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

3. Iniciar el backend desde `backend/` con Maven.
4. Iniciar el frontend desde `frontend/`:

```bash
npm install
npm run dev
```

El frontend queda disponible en `http://localhost:5173` y el backend en `http://localhost:8080`.

## Estado

M1 configura la base técnica. Las entidades, endpoints funcionales y flujos de negocio se implementarán en milestones posteriores.
