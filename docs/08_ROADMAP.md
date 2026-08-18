# Roadmap de Implementación

## 1. Propósito

Este documento define el orden de implementación del MVP del Sistema de Gestión Documental.

El roadmap divide el desarrollo en milestones pequeños, verificables y con dependencias claras.

Su objetivo es:

* Reducir el riesgo.
* Evitar implementar funcionalidades fuera de orden.
* Facilitar el trabajo con Codex.
* Permitir commits pequeños y reversibles.
* Validar cada etapa antes de continuar.
* Mantener siempre una versión ejecutable del proyecto.

Este documento complementa:

* `01_CONTEXT.md`
* `02_REQUIREMENTS.md`
* `03_USER_FLOWS.md`
* `04_DOMAIN_MODEL.md`
* `05_API.md`
* `06_ARCHITECTURE.md`
* `07_UI_UX.md`

---

# 2. Principios del roadmap

El desarrollo seguirá estas reglas:

1. No implementar funcionalidades futuras antes del MVP.
2. No avanzar de milestone si el anterior no funciona correctamente.
3. Cada milestone debe terminar con una versión verificable.
4. Cada etapa deberá incluir pruebas y revisión antes del commit.
5. Los cambios de arquitectura deberán documentarse antes de aplicarse.
6. El flujo crítico tendrá prioridad sobre funcionalidades administrativas secundarias.
7. Codex deberá trabajar en una sola tarea o milestone claramente definido por vez.

---

# 3. Flujo general de implementación

```text
M0 — Preparación
   ↓
M1 — Bootstrap del proyecto
   ↓
M2 — Persistencia y modelo de datos
   ↓
M3 — Autenticación y seguridad
   ↓
M4 — Administración de usuarios
   ↓
M5 — Empresas y convenios
   ↓
M6 — Plantillas y variantes
   ↓
M7 — Motor de generación PDF
   ↓
M8 — Frontend base
   ↓
M9 — Integración de autenticación
   ↓
M10 — Integración del flujo documental
   ↓
M11 — Panel administrativo
   ↓
M12 — Testing y hardening
   ↓
M13 — Preparación de producción
   ↓
M14 — Deploy MVP
```

---

# 4. M0 — Preparación del proyecto

`PLAN.md` es el plan operativo vigente. Este documento es únicamente una guía general y no prevalece sobre `PLAN.md`.

## Objetivo

Dejar lista la información y los recursos necesarios antes de generar código.

## Tareas

* Revisar toda la documentación.
* Confirmar que no existan contradicciones.
* Guardar wireframes definitivos.
* Guardar PDF original de Permiso Gremial.
* Guardar las variantes disponibles.
* Definir nombre definitivo del proyecto.
* Crear repositorio Git.
* Configurar `.gitignore`.
* Definir estrategia de ramas.
* Crear `PLAN.md`.
* Crear `AGENTS.md`.

## Resultado esperado

Codex dispone de una fuente de verdad completa antes de escribir código.

## Criterio de salida

* Documentación consistente.
* Wireframes disponibles.
* PDFs disponibles.
* `PLAN.md` aprobado.
* `AGENTS.md` aprobado.
* Repositorio inicial creado.

---

# 5. M1 — Bootstrap del proyecto

## Objetivo

Crear la estructura técnica base.

## Frontend

Inicializar:

* React.
* TypeScript.
* Vite.
* Tailwind CSS.
* shadcn/ui.
* React Router.
* TanStack Query.
* React Hook Form.
* Zod.

## Backend

Inicializar:

* Java 21.
* Spring Boot.
* Spring Web.
* Spring Security.
* Spring Data JPA.
* Bean Validation.
* Flyway.
* PostgreSQL Driver.
* PDFBox.

## Infraestructura local

* Docker Compose.
* PostgreSQL local.
* Variables de entorno.
* `.env.example`.
* README inicial.

## Criterio de salida

* Frontend inicia correctamente.
* Backend inicia correctamente.
* Backend se conecta a PostgreSQL.
* Flyway ejecuta una migración inicial.
* Build frontend exitoso.
* Build backend exitoso.

## Commit sugerido

```text
chore: bootstrap project architecture
```

---

# 6. M2 — Persistencia y modelo de datos

## Objetivo

Implementar el modelo persistente mínimo del MVP.

## Entidades

* Usuario.
* Empresa.
* Convenio.
* Provincia.
* Plantilla.
* TemplateVariant.

## Tareas

* Migraciones Flyway.
* Entidades JPA.
* Repositories.
* Enums.
* Constraints.
* Índices necesarios.
* Auditoría básica con `createdAt` y `updatedAt`.

## Reglas clave

* DNI único.
* TemplateVariant requiere Plantilla.
* Estados activos/inactivos.
* Contraseñas no se almacenan en texto plano.

## Criterio de salida

* Esquema reproducible desde cero.
* Tests de restricciones principales.
* Backend inicia con DB limpia.
* No hay modificaciones manuales fuera de Flyway.

## Commit sugerido

```text
feat: add initial database schema
```

---

# 7. M3 — Autenticación y seguridad

## Objetivo

Permitir acceso seguro mediante DNI y contraseña.

## Tareas

* BCrypt.
* Spring Security.
* JWT o mecanismo definido en arquitectura.
* Login.
* `/auth/me`.
* Logout.
* Cambio de contraseña.
* Primer login obligatorio.
* Usuario inactivo.
* Roles ADMIN / DELEGADO.
* Protección de rutas backend.
* Manejo de `401` y `403`.

## Casos de prueba

* Login válido.
* DNI inexistente.
* Contraseña incorrecta.
* Usuario inactivo.
* Primer login.
* Cambio de contraseña.
* Ruta protegida sin sesión.
* DELEGADO intentando ruta ADMIN.

## Criterio de salida

El sistema diferencia correctamente:

```text
No autenticado
DELEGADO
ADMIN
Primer ingreso
Usuario inactivo
```

## Commit sugerido

```text
feat: implement authentication and authorization
```

---

# 8. M4 — Administración de usuarios

## Objetivo

Permitir que un ADMIN gestione usuarios sin intervención técnica.

## Tareas

* Listar usuarios.
* Crear usuario.
* Editar datos permitidos.
* Activar.
* Desactivar.
* Resetear contraseña.
* Contraseña temporal.
* `firstLogin = true`.
* Validación de DNI duplicado.

## UX requerida

La contraseña temporal deberá mostrarse de forma segura únicamente cuando corresponda.

## Criterio de salida

Un administrador puede:

```text
Crear usuario
   ↓
Obtener contraseña temporal
   ↓
Nuevo usuario inicia sesión
   ↓
Cambia contraseña
   ↓
Accede normalmente
```

## Commit sugerido

```text
feat: add user administration
```

---

# 9. M5 — Empresas y convenios

## Objetivo

Implementar los datos reutilizables del formulario.

## Empresas

ADMIN:

* Crear.
* Editar.
* Activar.
* Desactivar.

DELEGADO:

* Consultar activas.

## Convenios

ADMIN:

* Crear.
* Editar.
* Activar.
* Desactivar.

DELEGADO:

* Consultar activos.

## Provincias

* Catálogo inicial controlado mediante Flyway.
* Consulta de provincias activas para el formulario.
* Sin CRUD administrativo durante el MVP actual.

## Criterio de salida

Frontend/backend podrán consultar listas activas para utilizar posteriormente en el formulario.

## Commit sugerido

```text
feat: add companies and agreements
```

---

# 10. M6 — Plantillas y variantes

## Objetivo

Implementar la estructura que permitirá soportar múltiples documentos.

## Tareas

* CRUD de Plantilla para ADMIN.
* CRUD de TemplateVariant para ADMIN.
* Relación Plantilla → Variante.
* Activar/desactivar.
* Upload de PDF al crear una variante.
* Reemplazo de PDF de una variante.
* Almacenamiento local configurable.
* `TemplateFileStorage`.
* Evitar exponer rutas físicas.

## Primer registro

```text
Plantilla:
Permiso Gremial
```

Con sus variantes disponibles.

## Criterio de salida

Los Templates y TemplateVariants iniciales se provisionan mediante seed, migración o configuración del backend. ADMIN puede administrarlos desde la aplicación y DELEGADO solo puede consultar los activos. Inicialmente existe la variante `Permiso Gremial / Bruna`.

Los archivos se almacenan fuera de PostgreSQL mediante `TemplateFileStorage`; PostgreSQL conserva `fileKey`. `LocalTemplateFileStorage` será la primera implementación y deberá usar almacenamiento persistente en producción. Los uploads deben validar PDF, tamaño y nombres/rutas seguras. Google Drive queda fuera del MVP.

Crear un Template no habilita automáticamente nuevos tipos generables: cada tipo nuevo requiere soporte de desarrollo hasta que exista un sistema de campos dinámicos.

## Commit sugerido

```text
feat: add document templates and variants
```

---

# 11. M7 — Motor de generación PDF

## Objetivo

Completar correctamente el documento Permiso Gremial.

## Tareas

* Inspeccionar campos AcroForm.
* Documentar nombres de campos.
* Implementar `DocumentGenerator`.
* Implementar `PermisoGremialGenerator`.
* Cargar TemplateVariant.
* Obtener datos de Empresa y Convenio.
* Obtener usuario autenticado como generador y delegado seleccionado de forma independiente.
* Completar:

  * Provincia.
  * Fecha de emisión.
  * Día de permiso gremial.
  * Empresa.
  * Delegado.
  * DNI.
  * Convenio.
* Generar `byte[]`.
* Devolver `application/pdf`.
* Mantener PDF original intacto.

## Tests

* PDF válido.
* Campos correctamente completados.
* Variante inválida.
* Variante inactiva.
* Empresa inválida.
* Convenio inválido.
* Archivo ausente.
* Original no modificado.

## Criterio de salida

Mediante API puede generarse correctamente un Permiso Gremial real.

## Commit sugerido

```text
feat: implement permiso gremial pdf generation
```

---

# 12. M8 — Frontend base

## Objetivo

Implementar visualmente la aplicación utilizando datos mock.

## Pantallas

* Login.
* Primer ingreso.
* Home.
* Nuevo documento.
* Selección de plantilla.
* Selección de variante.
* Formulario.
* Vista previa.
* Perfil.
* Administración base.

## Reglas

* Seguir `07_UI_UX.md`.
* Seguir wireframes.
* Mobile First.
* Responsive.
* shadcn/ui.
* Estados loading/error/empty.
* Sin conexión real todavía.

## Verificación visual

Probar:

```text
390px
768px
1440px
```

## Criterio de salida

La interfaz coincide razonablemente con los wireframes y todos los flujos pueden recorrerse usando mocks.

## Commit sugerido

```text
feat: implement frontend application shell
```

---

# 13. M9 — Integración de autenticación

## Objetivo

Conectar el frontend con la autenticación real.

## Tareas

* Login API.
* Estado de sesión.
* `/auth/me`.
* Rutas protegidas.
* Roles.
* Primer login.
* Cambio de contraseña.
* Logout.
* Sesión expirada.
* Manejo de `401`.
* Manejo de `403`.

## Flujo E2E

```text
Login
  ↓
firstLogin?
  ↓
Cambiar contraseña
  ↓
Home
```

## Criterio de salida

La aplicación ya funciona con usuarios reales.

## Commit sugerido

```text
feat: connect authentication flow
```

---

# 14. M10 — Integración del flujo documental

## Objetivo

Conectar el flujo principal completo con el backend.

## Tareas

* Obtener Plantillas.
* Obtener variantes.
* Obtener empresas.
* Obtener convenios.
* Obtener provincias.
* Seleccionar delegado y mostrar su DNI automáticamente.
* Capturar fecha de emisión y el único día de permiso gremial.
* Validar formulario.
* Generar PDF.
* Recibir Blob.
* Mostrar preview.
* Volver conservando datos.
* Descargar.
* Imprimir.

## Flujo crítico

```text
Login
  ↓
Home
  ↓
Nuevo documento
  ↓
Permiso Gremial
  ↓
Variante
  ↓
Formulario
  ↓
PDF
  ↓
Preview
  ↓
Descargar / Imprimir
```

## Criterio de salida

El problema principal del cliente ya puede resolverse de punta a punta.

## Commit sugerido

```text
feat: connect document generation flow
```

---

# 15. M11 — Panel administrativo

## Objetivo

Completar las interfaces administrativas.

## Módulos

* Usuarios.
* Empresas.
* Convenios.
* Plantillas.
* Variantes.

## Tareas

* CRUD UI.
* Loading.
* Error.
* Empty states.
* Confirm dialogs.
* Feedback de éxito.
* Responsive mobile.
* Tablas donde correspondan en desktop.

## Criterio de salida

El ADMIN puede mantener todo el contenido necesario sin tocar la base de datos manualmente.

## Commit sugerido

```text
feat: complete administration interface
```

---

# 16. M12 — Testing y hardening

## Objetivo

Revisar el MVP completo antes del deploy.

## Backend

Revisar:

* Security.
* DTOs.
* Validation.
* Exception handling.
* Permisos.
* Logs.
* Transacciones.
* Flyway.
* Tests.

## Frontend

Revisar:

* Mobile.
* Desktop.
* Accesibilidad.
* Formularios.
* Sesión.
* Errores.
* Estados vacíos.
* Loading.
* PDF preview.
* Descarga.

## E2E prioritarios

### Flujo usuario

```text
Login
→ Nuevo Documento
→ PDF
→ Download
```

### Primer ingreso

```text
Admin crea usuario
→ Usuario inicia sesión
→ Cambia contraseña
→ Home
```

### Seguridad

```text
DELEGADO
→ intenta acceder a ADMIN
→ acceso rechazado
```

## Criterio de salida

* Tests pasan.
* Build pasa.
* No existen bugs críticos conocidos.
* No existen secretos versionados.
* Flujo crítico verificado desde celular.

## Commit sugerido

```text
test: harden mvp workflows
```

---

# 17. M13 — Preparación de producción

## Objetivo

Preparar el sistema para desplegarse sin publicar todavía.

## Tareas

* Variables de entorno.
* Configuración production.
* CORS.
* Base de datos producción.
* Logging.
* Health check.
* Build reproducible.
* Documentación.
* Backups de DB.
* Estrategia de PDFs de plantilla.
* Usuario ADMIN inicial.
* README.
* Deployment guide.

## Criterio de salida

Un entorno nuevo puede configurarse siguiendo exclusivamente la documentación.

## Commit sugerido

```text
chore: prepare production deployment
```

---

# 18. M14 — Deploy MVP

## Objetivo

Publicar el sistema.

## Componentes

```text
Frontend
Backend
PostgreSQL
Dominio
HTTPS
```

## Tareas

* Publicar frontend.
* Publicar backend.
* Crear DB producción.
* Ejecutar Flyway.
* Configurar variables.
* Configurar dominio.
* Verificar HTTPS.
* Crear ADMIN inicial.
* Cargar empresas iniciales.
* Cargar convenios iniciales.
* Cargar Permiso Gremial.
* Cargar variantes.
* Smoke tests.

## Criterio de salida

El usuario puede abrir la URL pública desde su celular y completar el flujo crítico.

---

# 19. Smoke test de producción

Después del deploy realizar:

```text
1. Abrir aplicación.
2. Login ADMIN.
3. Crear usuario de prueba.
4. Login usuario.
5. Cambiar contraseña.
6. Crear Permiso Gremial.
7. Revisar vista previa.
8. Descargar.
9. Imprimir o verificar impresión.
10. Logout.
```

Después eliminar o desactivar los datos de prueba cuando corresponda.

---

# 20. Dependencias entre milestones

```text
M0
 ↓
M1
 ↓
M2
 ↓
M3
 ↓
M4 ─────────┐
 ↓          │
M5          │
 ↓          │
M6          │
 ↓          │
M7          │
 ↓          │
M8          │
 ↓          │
M9 ◄────────┘
 ↓
M10
 ↓
M11
 ↓
M12
 ↓
M13
 ↓
M14
```

Algunas tareas podrán desarrollarse parcialmente en paralelo, pero para un desarrollo individual se priorizará una secuencia simple.

---

# 21. Prioridad funcional

## Prioridad P0 — Imprescindible

* Login.
* Primer ingreso.
* Empresas.
* Convenios.
* Plantillas.
* Variantes.
* Generación PDF.
* Vista previa.
* Descarga.
* Mobile.

## Prioridad P1 — Necesaria para operación autónoma

* Administración de usuarios.
* Administración de datos.
* Perfil.
* Responsive desktop.

## Prioridad P2 — Mejora

* Refinamientos visuales.
* Búsqueda avanzada en listados.
* Optimizaciones no críticas.

---

# 22. Fuera del roadmap del MVP

No implementar durante estos milestones:

* SMTP.
* Google Drive.
* Historial de documentos.
* Borradores persistentes.
* WhatsApp.
* Notificaciones.
* Firma digital.
* Estadísticas.
* Exportaciones.
* Aplicaciones nativas.

---

# 23. Roadmap futuro

Una vez validado el MVP, podrán incorporarse nuevas fases.

## Fase futura A — Historial

```text
Documento persistente
Storage
Búsqueda
Filtros
Numeración oficial
```

## Fase futura B — Google Drive

```text
DocumentStorage
Drive API
Carpetas
Referencias
```

## Fase futura C — Correo

```text
SMTP
Editor de correo
Adjuntos
Registro de envíos
```

## Fase futura D — Nuevos documentos

```text
Actas
Notificaciones
Licencias
Otros formularios
```

---

# 24. Estrategia de commits

Cada milestone importante deberá terminar con un commit estable.

Se evitarán commits genéricos como:

```text
changes
fix
update
stuff
```

Se recomienda utilizar Conventional Commits.

Ejemplos:

```text
feat: implement authentication
fix: preserve form state when returning from preview
test: cover inactive user login
chore: configure flyway migrations
```

---

# 25. Estrategia de revisión con Codex

Cada milestone seguirá este ciclo:

```text
Leer documentación
      ↓
Inspeccionar estado del repo
      ↓
Planificar cambio
      ↓
Implementar
      ↓
Ejecutar tests
      ↓
Ejecutar build
      ↓
Revisar diff
      ↓
Validación humana
      ↓
Commit
```

Codex no deberá comenzar automáticamente el milestone siguiente sin aprobación.

---

# 26. Criterios para detener el desarrollo

Si durante un milestone aparece:

* Contradicción entre documentos.
* Requisito ambiguo.
* Cambio importante de arquitectura.
* Funcionalidad no contemplada.
* Dependencia externa inesperada.
* Riesgo de seguridad relevante.

El desarrollo de esa parte deberá detenerse hasta resolver la decisión.

No deberá asumirse silenciosamente una solución.

---

# 27. Definition of Ready

Una tarea está lista para comenzar cuando:

1. El requisito está documentado.
2. Su flujo está definido.
3. Las dependencias anteriores están completas.
4. Existe criterio de aceptación.
5. No hay dudas funcionales importantes.

---

# 28. Definition of Done

Una tarea está terminada cuando:

1. Funciona.
2. Respeta los requisitos.
3. Respeta permisos.
4. Maneja errores.
5. Tiene tests apropiados.
6. Compila.
7. Fue revisada.
8. Funciona en mobile cuando corresponda.
9. No incorpora alcance adicional.
10. Puede integrarse sin romper el estado estable del repositorio.

---

# 29. Objetivo final del roadmap

El roadmap se considerará completado cuando una persona pueda:

```text
Recibir credenciales
        ↓
Ingresar al sistema
        ↓
Cambiar contraseña
        ↓
Seleccionar Permiso Gremial
        ↓
Elegir variante
        ↓
Completar datos
        ↓
Visualizar PDF
        ↓
Descargarlo
        ↓
Imprimirlo
```

y un ADMIN pueda administrar toda la información requerida para que ese flujo funcione sin intervención técnica.

Ese será el alcance funcional del MVP 1.0.
