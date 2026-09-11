# Arquitectura Técnica

## 1. Propósito

Este documento define la arquitectura técnica del MVP del Sistema de Gestión Documental.

Su objetivo es establecer:

* Tecnologías.
* Responsabilidades por capa.
* Organización del repositorio.
* Comunicación entre frontend y backend.
* Persistencia.
* Seguridad.
* Generación de PDF.
* Configuración por entorno.
* Estrategia de crecimiento.

Este documento complementa:

* `01_CONTEXT.md`
* `02_REQUIREMENTS.md`
* `03_USER_FLOWS.md`
* `04_DOMAIN_MODEL.md`
* `05_API.md`

---

# 2. Arquitectura general

El sistema seguirá una arquitectura cliente-servidor.

```text
┌────────────────────────────┐
│          Usuario           │
│   Mobile / Tablet / PC     │
└─────────────┬──────────────┘
              │ HTTPS
              ▼
┌────────────────────────────┐
│         Frontend           │
│ React + TypeScript         │
│ Tailwind CSS               │
└─────────────┬──────────────┘
              │ REST API
              ▼
┌────────────────────────────┐
│          Backend           │
│ Java 21 + Spring Boot      │
└───────┬────────┬───────────┘
        │        │
        │        └───────────────┐
        ▼                        ▼
┌──────────────┐        ┌────────────────┐
│ PostgreSQL   │        │ PDF Templates  │
│ Datos        │        │ PDFBox         │
└──────────────┘        └────────────────┘
```

En el estado actual no existen:

* Google Drive.
* Almacenamiento cloud de PDFs generados.
* Auditoría persistente de emails.

---

# 3. Frontend

## 3.1. Tecnologías

El frontend actual utiliza:

* React.
* TypeScript.
* Vite.
* Tailwind CSS.
* React Router.
* TanStack Query.
* Zod.
* Vitest.

---

## 3.2. Responsabilidades

El frontend será responsable de:

* Navegación.
* Interfaz de usuario.
* Formularios.
* Validaciones de experiencia de usuario.
* Manejo de sesión desde el punto de vista de la UI.
* Consumo de la API.
* Visualización del PDF generado.
* Descarga.
* Impresión.
* Estados de carga.
* Estados de error.
* Estados vacíos.

El frontend no deberá contener lógica de negocio sensible.

---

## 3.3. Organización propuesta

```text
frontend/
└── src/
    ├── app/
    ├── components/
    ├── features/
    │   ├── auth/
    │   ├── users/
    │   ├── companies/
    │   ├── agreements/
    │   ├── templates/
    │   └── documents/
    ├── hooks/
    ├── lib/
    ├── services/
    ├── types/
    ├── utils/
    └── styles/
```

Se priorizará una organización por funcionalidades.

Ejemplo:

```text
features/auth/
├── components/
├── hooks/
├── schemas/
├── services/
└── types/
```

---

# 4. Backend

## 4.1. Tecnologías

Se utilizará:

* Java 21.
* Spring Boot.
* Spring Web.
* Spring Security.
* Spring Data JPA.
* Hibernate.
* Bean Validation.
* PostgreSQL Driver.
* Flyway.
* Apache PDFBox.

Para testing:

* JUnit.
* Spring Boot Test.
* Mockito cuando aporte valor.
* Testcontainers si se considera necesario para pruebas de integración.

---

## 4.2. Responsabilidades

El backend será responsable de:

* Autenticación.
* Autorización.
* Usuarios.
* Empresas.
* Convenios.
* Provincias.
* Administración de plantillas.
* Administración de variantes.
* Validaciones de negocio.
* Persistencia.
* Generación de PDF.
* Manejo de errores.
* Seguridad de la API.

El backend será la autoridad final sobre los datos y permisos.

---

# 5. Organización del backend

Se utilizará una estructura modular por dominio.

```text
backend/
└── src/main/java/com/stiapba/documentmanagement/
    ├── auth/
    ├── user/
    ├── company/
    ├── agreement/
    ├── province/
    ├── template/
    ├── document/
    ├── security/
    ├── common/
    └── config/
```

Dentro de cada módulo podrán existir:

```text
user/
├── controller/
├── service/
├── repository/
├── dto/
├── entity/
├── mapper/
└── exception/
```

No será obligatorio replicar exactamente esta estructura si un módulo es muy pequeño.

Se evitará crear carpetas vacías o capas sin necesidad.

---

# 6. Base de datos

## 6.1. Motor

PostgreSQL.

---

## 6.2. Responsabilidades

La base de datos persistirá únicamente la información necesaria para el MVP:

* Usuarios.
* Empresas.
* Convenios.
* Provincias.
* Plantillas.
* Variantes.

No almacenará PDFs generados.

---

## 6.3. Migraciones

La evolución del esquema se realizará mediante Flyway.

No se modificarán esquemas manualmente una vez iniciadas las migraciones.

Ejemplo:

```text
V1__bootstrap.sql
V2__create_mvp_schema.sql
V3__create_provinces.sql
```

---

# 7. Identificadores

Se recomienda utilizar UUID para las entidades principales.

Ventajas:

* No exponen secuencias internas.
* Funcionan bien en APIs.
* Evitan dependencia de identificadores incrementales externos.

La implementación concreta deberá mantener consistencia en todo el sistema.

---

# 8. Autenticación

## 8.1. Modelo

El usuario inicia sesión mediante:

* DNI.
* Contraseña.

La contraseña deberá almacenarse usando BCrypt.

---

## 8.2. Estrategia recomendada

La implementacion actual utiliza autenticación basada en JWT:

* JWT en cookie HttpOnly, Secure en producción y con SameSite compatible con el rewrite same-origin.
* CSRF double-submit mediante cookie y header.
* `sessionVersion` para invalidar sesiones tras cambios de contraseña.

---

# 9. Autorización

El backend verificará permisos mediante Spring Security.

Roles:

```text
ADMIN
DELEGADO
```

Ejemplo conceptual:

```text
ADMIN:
- /users/**
- escritura en companies
- escritura en agreements
- escritura en templates

DELEGADO:
- lectura de datos activos
- generación de PDF
```

La autorización nunca dependerá únicamente del frontend.

---

# 10. Primer login

La entidad Usuario contendrá:

```text
firstLogin
```

Cuando sea `true`:

* El usuario podrá autenticarse.
* Deberá cambiar su contraseña.
* No podrá utilizar normalmente las demás funcionalidades protegidas hasta completar el cambio.

Cada request protegido deberá verificar que el usuario autenticado continúe activo. Un token o cookie anterior no debe conservar acceso efectivo después de la desactivación.

La implementación podrá utilizar una autorización especial o una validación adicional en backend para restringir el resto de endpoints.

---

# 11. Administrador inicial

El sistema necesita disponer de al menos un usuario `ADMIN` al instalarse.

No se habilitará registro público.

El administrador inicial se crea únicamente mediante variables de entorno y solo si todavía no existe ningún ADMIN. Debe quedar con `firstLogin = true`.

La contraseña nunca deberá quedar escrita directamente en una migración versionada.

Ejemplo conceptual:

```text
INITIAL_ADMIN_DNI
INITIAL_ADMIN_PASSWORD
INITIAL_ADMIN_NAME
INITIAL_ADMIN_LASTNAME
```

Después del primer acceso, deberá cambiar su contraseña.

---

# 12. Sesión expirada

Cuando la autenticación deje de ser válida:

* Backend devuelve `401`.
* Frontend limpia el estado de sesión.
* Se informa al usuario.
* Se redirige al Login.

No deberá mantenerse una interfaz que aparente seguir autenticada.

---

# 13. CORS

Durante desarrollo:

```text
frontend: localhost
backend: localhost
```

El backend aceptará únicamente el origen configurado.

En producción, los orígenes permitidos deberán definirse mediante variables de entorno.

No se utilizará:

```text
Access-Control-Allow-Origin: *
```

en endpoints autenticados.

---

# 14. Generación de PDF

## 14.1. Librería

Apache PDFBox.

---

## 14.2. Fuente de los PDFs

Cada `TemplateVariant` tendrá asociada una referencia `fileKey` a un archivo PDF base. PostgreSQL no almacenará los bytes del PDF.

En el MVP, ADMIN podrá cargar y reemplazar PDFs desde la interfaz. Los archivos se almacenarán mediante `TemplateFileStorage`. Desarrollo local utiliza `LocalTemplateFileStorage`; el despliegue administrado utiliza una implementación S3-compatible con un bucket privado de Supabase Storage. El frontend nunca accede directamente al bucket.

Ejemplo:

```text
storage/templates/
└── permiso-gremial/
    └── <safe-file-key>.pdf
```

La ruta física no deberá exponerse al frontend.

---

# 15. Abstracción de almacenamiento de plantillas

El backend evita acoplar directamente la generación de PDF a una ruta física concreta mediante una abstraccion de storage.

La interfaz actual es:

```text
TemplateFileStorage
```

Con implementaciones:

```text
LocalTemplateFileStorage
S3TemplateFileStorage
```

La implementacion local es `LocalTemplateFileStorage`; produccion utiliza `S3TemplateFileStorage` contra Supabase Storage. Google Drive no forma parte del sistema.

---

# 16. Motor de generación

Se recomienda una abstracción:

```text
DocumentGenerator
```

El primer generador será:

```text
PermisoGremialGenerator
```

Esto no significa que `PermisoGremial` sea una entidad.

Representa únicamente la lógica específica necesaria para completar ese tipo de PDF.

Ejemplo conceptual:

```text
DocumentGenerationService
        │
        ▼
PermisoGremialGenerator
        │
        ▼
PDFBox
```

---

# 17. Campos configurables y formularios

El sistema actual administra `FieldDefinition` y `TemplateField`. Permite asociar campos logicos reutilizables a variantes en modo `ACROFORM`, `POSITIONED` o hibrido, con editor visual, coordenadas, alineacion, multilinea y shrink-to-fit.

La configuracion de campos no reemplaza los formularios y generadores de negocio: Permiso Gremial mantiene un flujo tipado y un generador especifico. Un tipo nuevo requiere soporte de desarrollo aunque pueda reutilizar el modelo de campos.

---

# 18. Flujo de generación PDF

```text
React
  │
  │ POST datos
  ▼
Spring Controller
  │
  ▼
Validation
  │
  ▼
DocumentGenerationService
  │
  ├── carga Usuario autenticado
  ├── carga Provincia
   ├── carga Delegado seleccionado
   ├── carga Empresa
   ├── carga Convenio
   ├── carga TemplateVariant
   ├── recibe issueDate y permitDay
  │
  ▼
PermisoGremialGenerator
  │
  ▼
TemplateFileStorage
  │
  ▼
PDFBox
  │
  ▼
byte[]
  │
  ▼
application/pdf
  │
  ▼
React
```

---

# 19. PDFs AcroForm

Si los PDFs base contienen campos AcroForm compatibles, se utilizarán sus nombres reales para completar el documento.

Se evitará escribir mediante coordenadas absolutas cuando exista un campo rellenable adecuado.

Antes de implementar el generador deberá inspeccionarse el PDF real.

Se documentarán los nombres de campos utilizados.

---

# 20. Mutabilidad del PDF

El archivo base:

* Nunca deberá modificarse.
* Deberá abrirse como plantilla.
* Cada request generará un nuevo resultado en memoria o en un archivo temporal controlado.

El MVP deberá preferir generación en memoria cuando el tamaño del PDF lo permita.

---

# 21. Ciclo de vida del PDF generado

En el MVP:

```text
Request
  ↓
Generación en memoria
  ↓
Response application/pdf
  ↓
Frontend
```

El backend no persistirá el resultado después de finalizar la respuesta.

El historial conserva datos lógicos y snapshot JSONB en PostgreSQL, pero los bytes del PDF generado o regenerado siguen siendo efímeros.

---

# 22. Frontend y PDF

El frontend recibirá:

```text
Blob / application/pdf
```

Ese mismo archivo deberá utilizarse para:

* Vista previa.
* Descarga.
* Impresión.

No deberá generarse nuevamente sin necesidad.

---

# 23. Manejo de errores

El backend utilizará un manejador global de excepciones.

Ejemplo conceptual:

```text
GlobalExceptionHandler
```

Las excepciones internas se transformarán en errores HTTP consistentes según `05_API.md`.

No se devolverán:

* Stack traces.
* SQL.
* Rutas físicas.
* Credenciales.
* Mensajes internos de librerías.

---

# 24. Validación

Se utilizará validación en dos niveles.

## Frontend

Orientada a experiencia de usuario.

Con:

* Zod.

## Backend

Autoridad final.

Con:

* Bean Validation.
* Validaciones de negocio en services.

Nunca se confiará únicamente en Zod.

---

# 25. DTOs

Los controllers no expondrán entidades JPA directamente.

Ejemplo:

```text
User
  │
  ▼
UserResponse
```

Requests y responses tendrán modelos propios.

Esto permite desacoplar API y persistencia.

---

# 26. Mappers

No se incorporará una librería de mapping automáticamente.

Se utilizará mapping manual o funciones simples mientras el volumen sea pequeño.

MapStruct podrá evaluarse si aparece suficiente repetición.

La prioridad será reducir dependencias innecesarias.

---

# 27. Transacciones

Las operaciones que modifiquen múltiples datos relacionados deberán ejecutarse dentro de transacciones apropiadas.

Ejemplos:

* Crear usuario.
* Resetear contraseña.
* Administrar variantes.
* Actualizar contadores futuros.

Las operaciones de solo lectura podrán optimizarse cuando aporte valor.

---

# 28. Numeración futura

`Plantilla` contempla:

La numeración pública actual usa `PG-YYYY-NNNNNN` y una secuencia global; no requiere campos persistentes `prefijo` ni `ultimoNumero`.

Cuando se implemente, deberá hacerse de manera atómica para evitar duplicados.

Ejemplo futuro:

```text
PG-000001
PG-000002
```

La concurrencia deberá controlarse desde la base de datos o mediante locking/transacciones apropiadas.

---

# 29. Configuración

Toda configuración dependiente del entorno deberá quedar fuera del código.

Ejemplos:

```text
DB_URL
DB_USERNAME
DB_PASSWORD

JWT_SECRET

FRONTEND_URL

INITIAL_ADMIN_DNI
INITIAL_ADMIN_PASSWORD

TEMPLATE_STORAGE_TYPE
TEMPLATE_STORAGE_PATH
S3_ENDPOINT
S3_REGION
S3_ACCESS_KEY
S3_SECRET_KEY
S3_BUCKET
```

Se mantendrá:

```text
.env.example
```

o documentación equivalente.

Nunca se versionarán secretos reales.

---

# 30. Perfiles de Spring

Se utilizarán perfiles o configuración equivalente para separar:

```text
development
test
production
```

Ejemplo:

```text
application.yml
application-dev.yml
application-test.yml
application-prod.yml
```

Los archivos de producción no deberán contener secretos reales.

---

# 31. Desarrollo local

El entorno local deberá poder levantarse de forma reproducible.

Se recomienda:

```text
Docker Compose
```

para PostgreSQL.

Ejemplo conceptual:

```text
docker compose up -d postgres
```

Frontend y backend podrán ejecutarse localmente desde sus herramientas habituales para facilitar debugging.

---

# 32. Docker Compose

El repositorio podrá incluir:

```text
docker-compose.yml
```

Inicialmente para PostgreSQL.

No será obligatorio dockerizar frontend y backend durante la primera etapa si eso dificulta el desarrollo local.

Podrán dockerizarse posteriormente para producción si resulta conveniente.

---

# 33. Testing Backend

Se deberán cubrir especialmente:

### Autenticación

* Login correcto.
* Contraseña incorrecta.
* Usuario inexistente.
* Usuario inactivo.
* Primer login.
* Cambio de contraseña.
* Roles.

### Datos administrativos

* DNI duplicado.
* Activar/desactivar.
* Permisos ADMIN.

### PDF

* Variante válida.
* Variante inexistente.
* Variante inactiva.
* Empresa inexistente.
* Convenio inexistente.
* PDF generado correctamente.
* PDF base no modificado.

---

# 34. Testing Frontend

Se deberán probar:

* Formularios.
* Validaciones.
* Navegación protegida.
* Primer login.
* Diferencias por rol.
* Estados loading/error.
* Flujo de generación.
* Responsive.

Cuando sea útil se utilizarán pruebas de navegador para el flujo crítico.

---

# 35. Pruebas end-to-end

El flujo E2E prioritario será:

```text
Login
  ↓
Home
  ↓
Nuevo Documento
  ↓
Permiso Gremial
  ↓
Formulario
  ↓
Generar
  ↓
Preview
```

También:

```text
ADMIN
  ↓
Crear usuario
  ↓
Usuario inicia sesión
  ↓
Cambio obligatorio de contraseña
```

---

# 36. Observabilidad

El backend deberá utilizar logs estructurados y útiles.

Se registrarán:

* Errores relevantes.
* Eventos importantes de startup.
* Problemas de generación PDF.

No se registrarán:

* Contraseñas.
* Tokens completos.
* Credenciales.
* Datos sensibles innecesarios.

---

# 37. Salud del servicio

El backend expone un endpoint propio de health check en `/api/v1/health`. Es publico, no consulta dependencias externas y responde informacion operativa minima.

---

# 38. Frontend: acceso a API

Las llamadas HTTP deberán centralizarse.

Ejemplo:

```text
services/api/
```

o mediante clientes específicos por feature.

No deberán existir URLs del backend repetidas por toda la aplicación.

La URL base se configurará mediante variable de entorno.

---

# 39. TanStack Query

Se utilizará para información obtenida desde backend, como:

* Empresas.
* Convenios.
* Plantillas.
* Variantes.
* Usuarios.

Permitirá gestionar:

* Cache.
* Loading.
* Error.
* Refetch.

No deberá utilizarse para estado local simple que no dependa del servidor.

---

# 40. Estado global

No se incorporará Redux u otra librería global de estado por defecto.

React Context o mecanismos simples serán suficientes para:

* Sesión.
* Datos globales pequeños.

Solo se añadirá otra solución si aparece una necesidad concreta.

---

# 41. UI

La implementación seguirá los wireframes definidos.

Se utilizaran componentes React y estilos Tailwind de acuerdo con los patrones existentes.

Se evitara:

* Duplicar componentes existentes.
* Crear estilos globales innecesarios.
* Hardcodear colores repetidamente.

---

# 42. Mobile First

La aplicación se diseñará primero para aproximadamente:

```text
390 px
```

y luego se adaptará a:

```text
768 px
1440 px
```

La navegación podrá cambiar según dispositivo.

Ejemplo:

```text
Mobile → Bottom navigation
Desktop → Sidebar/Header
```

si coincide con los wireframes aprobados.

---

# 43. Accesibilidad

Se utilizarán:

* Labels correctamente asociados.
* HTML semántico.
* Estados de foco visibles.
* Controles accesibles por teclado.
* Mensajes de error identificables.
* Contraste apropiado.

Las librerias de componentes no se asumen como garantia automatica de accesibilidad; cada composicion debera revisarse.

---

# 44. Seguridad de archivos

Durante el MVP solo ADMIN podrá cargar o reemplazar PDFs desde la aplicación.

El backend deberá validar:

* Tipo de archivo esperado.
* Tamaño máximo razonable.
* Nombre de archivo.
* Ubicación de almacenamiento.
* Validez real del PDF antes de persistirlo.

No se utilizará directamente el nombre recibido del usuario como ruta física sin sanitización.

---

# 45. Future-proofing controlado

Se permitirán abstracciones para integraciones futuras únicamente cuando tengan una utilidad clara hoy.

Ejemplo apropiado:

```text
TemplateFileStorage
```

porque ya existe almacenamiento de plantillas.

Ejemplo que NO deberá implementarse:

```text
GoogleDriveService
EmailHistoryService
```

porque esas funcionalidades todavía no existen en el MVP.

---

# 46. Integración de email mediante Resend

El envío actual desde el historial utiliza:

```text
DocumentRecord
   ↓
DocumentEmailService / Resend HTTPS API
   ↓
https://api.resend.com/emails
```

El PDF se regenera en memoria y se adjunta al mensaje. No se persiste el PDF ni un historial de emails.

---

# 47. Integración futura con Google Drive

La evolución esperada podrá ser:

```text
Generated PDF
      ↓
DocumentStorage
      ↓
Google Drive
```

La aplicación no deberá incorporar SDKs ni credenciales de Google durante el MVP.

---

# 48. Historial documental actual

El historial actual:

* `DocumentRecord` persiste metadatos y snapshot JSONB.
* ADMIN ve todos los registros y DELEGADO solo los propios.
* La regeneración, descarga y emisión por email generan el PDF en memoria.

No se guardan archivos PDF directamente en PostgreSQL ni en storage permanente.

---

# 49. Repositorio

Estructura general esperada:

```text
sistema-documental/
├── frontend/
├── backend/
├── docs/
│   ├── 01_CONTEXT.md
│   ├── 02_REQUIREMENTS.md
│   ├── 03_USER_FLOWS.md
│   ├── 04_DOMAIN_MODEL.md
│   ├── 05_API.md
│   ├── 06_ARCHITECTURE.md
│   ├── 07_UI_UX.md
│   ├── 08_ROADMAP.md
│   ├── wireframes/
│   └── pdf-templates/
├── docker-compose.yml
├── AGENTS.md
├── PLAN.md
├── README.md
└── .gitignore
```

`PLAN.md` y `AGENTS.md` se redactarán una vez cerrada la documentación restante.

---

# 50. Git

Se recomienda una historia de commits pequeña y comprensible.

Ejemplos:

```text
chore: bootstrap project
feat: add database schema
feat: implement authentication
feat: add user management
feat: add company management
feat: add agreement management
feat: add document templates
feat: implement pdf generation
feat: add document generation UI
test: improve authentication coverage
```

No deberá realizarse un único commit con todo el proyecto terminado.

---

# 51. Definition of Done técnica

Una funcionalidad se considerará técnicamente completa cuando:

1. Cumpla sus requisitos.
2. Respete la arquitectura acordada.
3. Compile correctamente.
4. Tenga validaciones apropiadas.
5. Maneje errores esperados.
6. Respete permisos.
7. Tenga pruebas donde aporten valor.
8. No exponga secretos.
9. Funcione en móvil.
10. No incorpore funcionalidades fuera del alcance.

---

# 52. Principios arquitectónicos

## 52.1. Simplicidad

Elegir la solución más simple que satisfaga correctamente el requisito.

---

## 52.2. Separación de responsabilidades

Frontend, backend, persistencia y generación de PDF deberán tener responsabilidades claras.

---

## 52.3. Backend como autoridad

Las reglas sensibles se verifican siempre en el backend.

---

## 52.4. Modularidad

El código se organizará según funcionalidades del negocio.

---

## 52.5. Tipado fuerte

Se aprovecharán TypeScript y Java para evitar estados inválidos y contratos ambiguos.

---

## 52.6. Evitar sobreingeniería

No se incorporarán microservicios, event buses, CQRS, Kubernetes u otras arquitecturas complejas para este MVP.

El sistema será un monolito modular.

---

# 53. Decisión arquitectónica principal

La arquitectura del MVP será:

```text
React SPA
   │
   │ REST / HTTPS
   ▼
Spring Boot Modular Monolith
   │
   ├── PostgreSQL
   │
   └── PDF Template Storage
```

Esta arquitectura ofrece suficiente separación, seguridad y capacidad de crecimiento para el alcance actual sin introducir complejidad innecesaria.

---

# 54. Stack confirmado

## Frontend

```text
React
TypeScript
Vite
Tailwind CSS
React Router
TanStack Query
Zod
```

## Backend

```text
Java 21
Spring Boot
Spring Web
Spring Security
Spring Data JPA
Hibernate
Bean Validation
Flyway
Apache PDFBox
```

## Persistencia

```text
PostgreSQL
```

## Desarrollo local

```text
Docker Compose
Git
```

---

# 55. Fuente de verdad

Ante una contradicción:

1. `01_CONTEXT.md` define el alcance.
2. `02_REQUIREMENTS.md` define qué debe hacer el sistema.
3. `03_USER_FLOWS.md` define cómo interactúa el usuario.
4. `04_DOMAIN_MODEL.md` define el dominio.
5. `05_API.md` define el contrato HTTP.
6. Este documento define cómo se construirá técnicamente.

Una decisión de implementación no deberá modificar silenciosamente un requisito funcional.
