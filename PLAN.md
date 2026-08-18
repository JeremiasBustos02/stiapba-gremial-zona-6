# PLAN.md — Plan de Implementación del MVP

## 1. Propósito

Este archivo define el plan de ejecución del MVP del Sistema de Gestión Documental.

Debe ser utilizado por Codex como guía operativa durante el desarrollo.

La documentación funcional y técnica se encuentra en `/docs`.

Antes de implementar cualquier milestone, Codex deberá revisar:

* `docs/01_CONTEXT.md`
* `docs/02_REQUIREMENTS.md`
* `docs/03_USER_FLOWS.md`
* `docs/04_DOMAIN_MODEL.md`
* `docs/05_API.md`
* `docs/06_ARCHITECTURE.md`
* `docs/07_UI_UX.md`
* `docs/08_ROADMAP.md`

Los wireframes disponibles en:

```text
docs/wireframes/
```

constituyen la referencia visual principal.

Las plantillas PDF disponibles en:

```text
docs/pdf-templates/
```

constituyen la fuente de verdad para la generación documental.

---

# 2. Alcance actual

El MVP debe implementar únicamente:

## Autenticación

* Login mediante DNI y contraseña.
* Roles `ADMIN` y `DELEGADO`.
* Contraseña almacenada de forma segura.
* Usuario activo/inactivo.
* Primer ingreso obligatorio.
* Cambio de contraseña.
* Logout.

## Administración

* Usuarios.
* Empresas.
* Convenios.
* Provincias.
* Templates y TemplateVariants.

## Documentos

* Lectura de tipos de documentos.
* Lectura de variantes.
* Permiso Gremial.
* Selección de variante.
* Formulario.
* Generación de PDF.
* Vista previa.
* Descarga.
* Impresión.

## Interfaz

* Mobile First.
* Responsive.
* Implementación consistente con los wireframes.
* Diferenciación por rol.

---

# 3. Fuera del alcance

NO implementar durante el MVP:

* SMTP.
* Envío de correos.
* Google Drive.
* Almacenamiento cloud.
* Historial persistente.
* Borradores persistentes.
* Entidad Documento persistente.
* Numeración oficial.
* WhatsApp.
* Firma digital.
* Estadísticas.
* Notificaciones.
* Aplicaciones móviles nativas.
* Registro público.
* Recuperación automática de contraseña mediante email.
* Formularios completamente dinámicos.

Si una tarea parece requerir alguno de estos puntos, detenerse y solicitar revisión antes de implementarlo.

---

# 4. Arquitectura objetivo

```text
React + TypeScript + Vite
          │
          │ REST / HTTPS
          ▼
Java 21 + Spring Boot
          │
          ├── PostgreSQL
          │
          └── PDFBox + PDF templates
```

El backend será un monolito modular.

No utilizar:

* Microservicios.
* Kafka.
* CQRS.
* Event sourcing.
* Kubernetes.
* Arquitecturas distribuidas innecesarias.

---

# 5. Stack

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* React Router
* TanStack Query
* React Hook Form
* Zod

## Backend

* Java 21
* Spring Boot
* Spring Web
* Spring Security
* Spring Data JPA
* Hibernate
* Bean Validation
* Flyway
* Apache PDFBox

## Datos

* PostgreSQL

## Desarrollo local

* Docker Compose
* Git

---

# 6. Entidades persistentes del MVP

Implementar únicamente:

```text
User
Company
Agreement
Province
Template
TemplateVariant
```

No crear todavía:

```text
Document
History
Draft
Recipient
EmailLog
StorageFile
Signature
TemplateField
```

---

# 7. Decisiones confirmadas

## Usuarios

* Login mediante DNI.
* Cada persona tiene una cuenta individual.
* `ADMIN` puede realizar también tareas de `DELEGADO`.
* `DELEGADO` no puede acceder a administración.

## Contraseña temporal

Al crear o resetear un usuario:

1. Backend genera una contraseña temporal.
2. Solo almacena su hash.
3. La contraseña se devuelve una única vez al ADMIN.
4. `firstLogin = true`.
5. El usuario debe cambiarla al ingresar.

## Plantillas

`Permiso Gremial` es un registro de `Template`.

No crear una clase JPA `PermisoGremial`.

## Variantes

Las distintas firmas son archivos PDF diferentes.

No existe entidad `Signature`.

Durante el MVP existe una única variante inicial: `Permiso Gremial / Bruna`. La estructura debe permitir agregar otras variantes posteriormente mediante configuración del backend.

## PDFs

Los PDFs no se almacenan en PostgreSQL. `TemplateVariant` conserva una referencia `fileKey`, y el archivo se gestiona mediante `TemplateFileStorage`. ADMIN puede subir el PDF al crear una variante y reemplazarlo posteriormente.

La primera implementación será `LocalTemplateFileStorage`, con almacenamiento persistente en producción. No se implementará Google Drive.

Los registros iniciales de Template y TemplateVariant se provisionan mediante seed, migración o configuración del backend. Inicialmente solo existe funcionalmente `Permiso Gremial` y la variante `Bruna`.

## Numeración

No implementar numeración oficial en el MVP.

`prefijo` y `ultimoNumero` no forman parte del modelo persistente del MVP.

## Contraseñas y sesiones

Las contraseñas deben tener entre 10 y 72 caracteres. `newPassword` y `confirmPassword` deben coincidir. Al cambiar una contraseña existente, la nueva no puede ser igual a la actual. No se implementan historial de contraseñas ni reglas arbitrarias de composición.

El cambio obligatorio de primer ingreso utiliza `POST /api/v1/auth/first-login/change-password`. El cambio normal utiliza `POST /api/v1/auth/change-password`.

Un usuario desactivado debe perder acceso efectivo a endpoints protegidos aunque conserve una cookie o token anterior; el backend debe verificar el estado activo del usuario autenticado.

El ADMIN inicial se crea únicamente mediante variables de entorno, y solo cuando todavía no existe ningún ADMIN. Debe quedar con `firstLogin = true`.

---

# 8. Estrategia de autenticación

Utilizar Spring Security.

Preferencia:

* JWT.
* Cookie `HttpOnly`.
* `Secure` en producción.
* `SameSite` apropiado.
* Token de duración limitada.

Evitar almacenar JWT en `localStorage` por defecto.

Si durante la implementación existe una limitación real que obligue a modificar esta estrategia, documentar el motivo antes de hacerlo.

---

# 9. Estrategia de desarrollo

Cada milestone seguirá este ciclo:

1. Leer la documentación relevante.
2. Inspeccionar el estado actual del repositorio.
3. Explicar brevemente el cambio a realizar.
4. Implementar únicamente el alcance solicitado.
5. Ejecutar los tests correspondientes.
6. Ejecutar build y verificaciones necesarias.
7. Revisar el diff generado.
8. Informar:
   - archivos creados;
   - archivos modificados;
   - decisiones tomadas;
   - tests ejecutados;
   - resultado del build;
   - problemas encontrados;
   - posibles tareas pendientes.
9. Detenerse y esperar revisión del desarrollador.

Codex NO debe:

- Crear commits.
- Ejecutar `git commit`.
- Ejecutar `git push`.
- Crear tags.
- Hacer merge.
- Cambiar de rama sin autorización.
- Avanzar automáticamente al siguiente milestone.

El desarrollador será responsable de revisar los cambios y realizar manualmente los commits cuando considere que una etapa está terminada.

---

# 10. Milestone M0 — Preparación

## Objetivo

Preparar el repositorio antes de generar código funcional.

## Tareas

* Confirmar estructura del repo.
* Crear `.gitignore`.
* Crear carpetas:

  * `frontend/`
  * `backend/`
  * `docs/`
* Confirmar existencia de wireframes.
* Confirmar existencia de plantillas PDF.
* Crear `AGENTS.md`.
* Crear README inicial.
* Inicializar Git.

## Criterio de salida

El repositorio está listo para comenzar desarrollo.

---

# 11. Milestone M1 — Bootstrap técnico

## Backend

Crear proyecto Spring Boot con:

* Java 21.
* Spring Web.
* Spring Security.
* Spring Data JPA.
* Validation.
* Flyway.
* PostgreSQL Driver.
* PDFBox.

## Frontend

Crear proyecto con:

* React.
* TypeScript.
* Vite.
* Tailwind.
* shadcn/ui.
* React Router.
* TanStack Query.
* React Hook Form.
* Zod.

## Infraestructura local

Crear:

```text
docker-compose.yml
```

con PostgreSQL.

Agregar:

* variables de entorno;
* configuración de desarrollo;
* `.env.example`.

## Validación

* Frontend compila.
* Backend compila.
* Backend levanta.
* PostgreSQL levanta.
* Backend se conecta a PostgreSQL.
* Flyway ejecuta correctamente.

---

# 12. Milestone M2 — Modelo persistente

Implementar:

* User.
* Company.
* Agreement.
* Province.
* Template.
* TemplateVariant.

## Incluir

* Migraciones Flyway.
* JPA entities.
* Repositories.
* Enums.
* Constraints.
* Índices necesarios.
* Timestamps.

## Reglas

### User

* DNI único.
* passwordHash.
* role.
* active.
* firstLogin.

### TemplateVariant

* Siempre pertenece a un Template.

## Tests

Verificar restricciones principales.


---

# 13. Milestone M3 — Autenticación

Implementar:

* Login.
* `/auth/me`.
* Logout.
* Cambio de contraseña.
* BCrypt.
* JWT.
* Cookies.
* Primer login.
* Usuarios inactivos.
* Roles.
* `401`.
* `403`.

## Tests obligatorios

* Login válido.
* DNI inexistente.
* Password incorrecto.
* Usuario inactivo.
* firstLogin.
* Cambio de contraseña.
* Endpoint protegido sin sesión.
* DELEGADO intentando endpoint ADMIN.

---

# 14. Milestone M4 — Administración de usuarios

Implementar backend y frontend de:

* Listar usuarios.
* Crear usuario.
* Editar datos permitidos.
* Activar.
* Desactivar.
* Resetear contraseña.

## Crear usuario

Request:

* nombre;
* apellido;
* DNI;
* rol.

Backend:

* genera contraseña temporal;
* almacena BCrypt;
* firstLogin = true.

Frontend:

* mostrar contraseña una sola vez;
* permitir copiarla;
* aclarar que no podrá consultarse nuevamente.

---

# 15. Milestone M5 — Empresas y convenios

## Company

ADMIN:

* crear;
* editar;
* activar;
* desactivar.

ADMIN y DELEGADO:

* consultar registros activos cuando se utilicen en formularios.

## Agreement

Mismo patrón.

## Province

Catálogo inicial controlado mediante Flyway, disponible como consulta de provincias activas para el formulario. No se implementa CRUD administrativo de provincias en el MVP actual.

## UI

Mobile:

* listas/cards.

Desktop:

* tablas si resultan apropiadas.

---

# 16. Milestone M6 — Templates y variantes

## Backend

Implementar:

* Template.
* TemplateVariant.
* CRUD de Template para ADMIN;
* CRUD de TemplateVariant para ADMIN;
* consulta de registros activos para DELEGADO;
* relación Template 1:N TemplateVariant.

## Archivos PDF

ADMIN podrá subir un PDF al crear una variante y reemplazar el PDF de una variante existente mediante multipart upload.

Los PDFs no se almacenarán en PostgreSQL. La base guardará únicamente `fileKey`.

Crear abstracción:

```text
TemplateFileStorage
```

Implementación inicial:

```text
LocalTemplateFileStorage
```

El almacenamiento deberá ser persistente en producción. No implementar Google Drive.

## Seed inicial

Configurar inicialmente:

```text
Permiso Gremial
```

con la variante `Bruna`. La creación de nuevos Templates no implica generación automática de nuevos tipos: los formularios y generadores de nuevos documentos requieren soporte de desarrollo mientras no exista un sistema de campos dinámicos.

## Importante

No implementar:

* Google Drive;
* generación automática de tipos arbitrarios;
* upload dinámico;
* gestión cloud.

---

# 17. Milestone M7 — Inspección de PDF

Antes de implementar generación:

1. Abrir PDF real.
2. Identificar campos AcroForm.
3. Documentar nombres exactos.
4. Verificar variantes.
5. Confirmar que todos los campos necesarios son editables.

Crear documentación técnica dentro de:

```text
docs/pdf-templates/
```

Ejemplo:

```text
PERMISO_GREMIAL_FIELDS.md
```

No implementar escritura mediante coordenadas si los campos AcroForm son utilizables.

---

# 18. Milestone M8 — Motor de PDF

Crear:

```text
DocumentGenerator
PermisoGremialGenerator
DocumentGenerationService
```

## Datos

* provinceId;
* issueDate;
* companyId;
* delegateId;
* permitDay;
* agreementId;
* variantId.

Resolver el delegado y su DNI desde el `User` activo seleccionado mediante `delegateId`. El usuario autenticado es quien genera el documento y no se asume que sea el delegado seleccionado.

## Resultado

```text
application/pdf
```

Generado en memoria.

No persistir.

## Tests

* PDF válido.
* Campos rellenados.
* Variante correcta.
* PDF original no modificado.
* Variante inválida.
* Empresa inválida.
* Convenio inválido.
* Archivo faltante.

---

# 19. Milestone M9 — Frontend visual

Implementar primero utilizando datos mock.

## Pantallas

* Login.
* Cambio obligatorio de contraseña.
* Home.
* Nuevo documento.
* Selección de Template.
* Selección de variante.
* Permiso Gremial.
* Vista previa.
* Perfil.
* Administración.

## Requisitos

Seguir:

```text
docs/07_UI_UX.md
docs/wireframes/
```

## Verificar

```text
390px
768px
1440px
```

No conectar todavía todo al backend si eso dificulta la revisión visual.

---

# 20. Milestone M10 — Integración Auth

Conectar frontend con backend.

Implementar:

* login;
* `/auth/me`;
* sesión;
* firstLogin;
* cambio de password;
* logout;
* protección de rutas;
* control por rol;
* expiración.

## Criterio de salida

La aplicación funciona con cuentas reales.

---

# 21. Milestone M11 — Integración administrativa

Conectar frontend con:

* usuarios;
* empresas;
* convenios.

Verificar:

* loading;
* success;
* error;
* empty states;
* permisos.
 connect administration modules

---

# 22. Milestone M12 — Integración de documentos

Conectar:

* templates;
* variants;
* companies;
* agreements;
* usuario autenticado;
* generación PDF.

## Flujo

```text
Home
→ Nuevo documento
→ Permiso Gremial
→ Variante
→ Formulario
→ Generate
→ Blob
→ Preview
→ Download / Print
```

## Requisitos

* Volver desde preview conserva los datos.
* Descargar reutiliza el Blob existente.
* Imprimir reutiliza el PDF existente.
* No generar dos veces innecesariamente.

---

# 23. Milestone M13 — Testing funcional completo

Revisar:

## Backend

* Auth.
* Roles.
* CRUD.
* Validation.
* Exception handling.
* PDF.
* Flyway.
* Security.

## Frontend

* Forms.
* Navigation.
* Roles.
* Loading.
* Errors.
* Empty states.
* Responsive.
* PDF preview.

## E2E

Flujos:

```text
ADMIN crea usuario
→ usuario entra
→ cambia contraseña
→ genera Permiso Gremial
→ preview
→ descarga
```

y:

```text
DELEGADO
→ intenta entrar a ADMIN
→ acceso rechazado
```

---

# 24. Milestone M14 — Revisión de seguridad

No agregar features.

Revisar:

* secretos;
* cookies;
* JWT;
* CORS;
* BCrypt;
* logs;
* input validation;
* upload/path handling interno;
* SQL/JPA;
* roles;
* errores;
* headers relevantes.

Clasificar problemas:

* crítico;
* alto;
* medio;
* bajo.

Corregir críticos y altos antes de producción.

---

# 25. Milestone M15 — Preparación de producción

Crear o completar:

```text
README.md
DEPLOYMENT.md
.env.example
```

Definir:

* configuración production;
* variables;
* DB;
* CORS;
* logging;
* health check;
* admin inicial;
* templates path;
* estrategia de backup.

## Validar

El proyecto debe poder configurarse desde cero siguiendo documentación.

---

# 26. Milestone M16 — Deploy

Publicar:

* Frontend.
* Backend.
* PostgreSQL.
* Dominio.
* HTTPS.

Después:

* Ejecutar migrations.
* Crear ADMIN inicial.
* Cargar datos.
* Configurar templates.
* Smoke test desde celular.

---

# 27. Smoke Test

Realizar:

1. Login ADMIN.
2. Crear usuario.
3. Copiar contraseña temporal.
4. Logout.
5. Login usuario.
6. Cambiar contraseña.
7. Nuevo documento.
8. Elegir Permiso Gremial.
9. Elegir variante.
10. Elegir empresa.
11. Elegir convenio.
12. Generar.
13. Revisar PDF.
14. Descargar.
15. Verificar impresión.
16. Logout.

---

# 28. Criterio de finalización del MVP

El MVP está terminado cuando:

### ADMIN

Puede administrar:

* usuarios;
* empresas;
* convenios;

sin modificar manualmente PostgreSQL.

### DELEGADO

Puede:

```text
Login
→ Nuevo Documento
→ Permiso Gremial
→ Completar
→ Preview
→ Descargar / Imprimir
```

desde un teléfono celular.

### Sistema

* respeta permisos;
* maneja errores;
* no expone secretos;
* genera correctamente el PDF;
* funciona en producción;
* puede ampliarse posteriormente sin rehacer la aplicación.

---

# 29. Regla de alcance

Si durante el desarrollo aparece una posible mejora no incluida en este plan:

1. No implementarla automáticamente.
2. Documentarla como propuesta.
3. Evaluar impacto.
4. Esperar aprobación.

No utilizar:

> "Ya que estamos..."

como criterio para ampliar el MVP.

---

# 30. Estado del plan

Estados permitidos para cada milestone:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
REVIEW
DONE
```

Codex podrá actualizar este archivo para reflejar progreso, pero no deberá modificar el alcance funcional sin aprobación.

---

# 31. Milestone actual

Al iniciar el proyecto:

```text
M0 — Preparación
Status: NOT_STARTED
```

Después de confirmar estructura, documentación y `AGENTS.md`, podrá pasar a:

```text
M1 — Bootstrap técnico
```
