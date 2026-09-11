# Contrato de API REST

## 1. Propósito

Este documento define el contrato inicial entre el frontend y el backend del MVP del Sistema de Gestión Documental.

La API será responsable de:

* Autenticación.
* Autorización.
* Gestión de usuarios.
* Gestión de empresas.
* Gestión de convenios.
* Gestión de plantillas.
* Gestión de variantes.
* Generación de documentos PDF.

Este documento describe:

* Endpoints.
* Métodos HTTP.
* Requests.
* Responses.
* Permisos.
* Errores esperados.

No define todavía detalles internos de implementación.

---

# 2. Convenciones generales

La API utilizará como prefijo:

```text
/api/v1
```

Ejemplo:

```text
/api/v1/auth/login
/api/v1/users
/api/v1/companies
```

---

# 3. Formato de datos

La comunicación normal entre frontend y backend utilizará:

```http
Content-Type: application/json
```

Excepto en operaciones relacionadas con archivos PDF.

---

# 4. Identificadores

Las entidades expuestas por la API utilizarán identificadores opacos.

Ejemplo:

```json
{
  "id": "a785f5f9-fbb6-43cb-b6a4-71c12a63cc18"
}
```

El frontend no deberá asumir cómo se generan internamente.

---

# 5. Fechas

Las fechas deberán intercambiarse utilizando formatos estándar ISO.

Ejemplo de fecha:

```text
2026-08-18
```

Ejemplo de fecha y hora:

```text
2026-08-18T14:30:00-03:00
```

---

# 6. Respuesta estándar de error

Los errores deberán devolver una estructura consistente.

Ejemplo:

```json
{
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Los datos enviados contienen errores.",
  "errors": {
    "dni": "El DNI es obligatorio."
  },
  "timestamp": "2026-08-18T14:30:00-03:00"
}
```

`errors` podrá omitirse cuando no existan errores asociados a campos específicos.

---

# 7. Códigos HTTP

Se utilizarán los códigos HTTP correspondientes.

### 200 OK

Operación completada correctamente.

### 201 Created

Recurso creado correctamente.

### 204 No Content

Operación completada sin contenido de respuesta.

### 400 Bad Request

Request inválido.

### 401 Unauthorized

Usuario no autenticado o sesión inválida.

### 403 Forbidden

Usuario autenticado sin permisos suficientes.

### 404 Not Found

Recurso inexistente.

### 409 Conflict

Conflicto con el estado actual del sistema.

Ejemplo:

* DNI duplicado.

### 422 Unprocessable Entity

Datos sintácticamente correctos pero incompatibles con una regla funcional, cuando resulte conveniente distinguirlo de un `400`.

### 500 Internal Server Error

Error interno inesperado.

Nunca deberá exponerse información técnica sensible.

---

# 8. Autenticación

## POST `/api/v1/auth/login`

Permite iniciar sesión mediante DNI y contraseña.

### Acceso

Público.

### Request

```json
{
  "dni": "40123456",
  "password": "********"
}
```

### Response — 200

```json
{
  "user": {
    "id": "...",
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "40123456",
    "role": "DELEGADO",
    "firstLogin": false
  }
}
```

El backend envía la cookie mediante Set-Cookie.

---

## Errores

### 401

Credenciales inválidas.

```json
{
  "status": 401,
  "code": "INVALID_CREDENTIALS",
  "message": "No pudimos iniciar sesión. Verificá tus datos e intentá nuevamente."
}
```

---

# 9. Obtener usuario autenticado

## GET `/api/v1/auth/me`

Devuelve la información del usuario correspondiente a la sesión actual.

### Acceso

Usuario autenticado.

### Response

```json
{
  "id": "uuid",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "40123456",
  "role": "DELEGADO",
  "active": true,
  "firstLogin": false
}
```

---

# 10. Cambiar contraseña

## POST `/api/v1/auth/first-login/change-password`

### Acceso

Usuario autenticado.

### Request

```json
{
  "newPassword": "nueva-contraseña",
  "confirmPassword": "nueva-contraseña"
}
```

Este endpoint se utiliza exclusivamente durante el primer ingreso. La sesión ya fue autenticada con la contraseña temporal, por lo que no se solicita nuevamente `currentPassword`.

### Response

```json
{
  "message": "Contraseña actualizada correctamente."
}
```

Cuando el cambio corresponda al primer ingreso:

```text
firstLogin = false
```

---

# Cambio normal de contraseña

## POST `/api/v1/auth/change-password`

Requiere la contraseña actual. La nueva contraseña debe tener entre 10 y 72 caracteres, coincidir con `confirmPassword` y ser distinta de la actual. No se implementan reglas arbitrarias de composición ni historial de contraseñas.

# 11. Cerrar sesión

## POST `/api/v1/auth/logout`

### Acceso

Usuario autenticado.

### Response

```http
204 No Content
```

La implementación concreta dependerá del mecanismo de autenticación seleccionado.

---

# 12. Usuarios

Todos los endpoints administrativos de usuarios requieren rol:

```text
ADMIN
```

---

# 13. Listar usuarios

## GET `/api/v1/users`

### Query params opcionales

```text
?page=0
&size=20
&search=juan
&active=true
&role=DELEGADO
```

### Response

```json
{
  "content": [
    {
      "id": "uuid",
      "nombre": "Juan",
      "apellido": "Pérez",
      "dni": "40123456",
      "role": "DELEGADO",
      "active": true,
      "firstLogin": false,
      "createdAt": "2026-08-18T10:00:00-03:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

Aunque inicialmente existan pocos usuarios, la API podrá utilizar paginación para mantener un contrato escalable.

---

# 14. Obtener usuario

## GET `/api/v1/users/{id}`

### Response

```json
{
  "id": "uuid",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "40123456",
  "role": "DELEGADO",
  "active": true,
  "firstLogin": false,
  "createdAt": "2026-08-18T10:00:00-03:00",
  "updatedAt": "2026-08-18T10:00:00-03:00"
}
```

Nunca deberá devolverse:

```text
passwordHash
```

---

# 15. Crear usuario

## POST `/api/v1/users`

### Request

```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "40123456",
  "role": "DELEGADO"
}
```

### Response — 201

```json
{
  "id": "uuid",
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "40123456",
  "role": "DELEGADO",
  "active": true,
  "firstLogin": true,
  "temporaryPassword": "..."
}
```

### Importante

Si el sistema decide mostrar la contraseña temporal al administrador:

* Deberá mostrarse únicamente como resultado de la creación o reset.
* No deberá poder consultarse posteriormente.
* No deberá persistirse en texto plano.

La decisión final sobre esta experiencia se definirá en `07_UI_UX.md`.

---

# 16. DNI duplicado

Si el DNI ya existe:

```http
409 Conflict
```

```json
{
  "status": 409,
  "code": "DNI_ALREADY_EXISTS",
  "message": "Ya existe un usuario registrado con ese DNI."
}
```

---

# 17. Editar usuario

## PUT `/api/v1/users/{id}`

### Request

```json
{
  "nombre": "Juan Carlos",
  "apellido": "Pérez",
  "role": "DELEGADO"
}
```

El DNI no deberá modificarse mediante este endpoint salvo que posteriormente se defina explícitamente esa necesidad.

---

# 18. Activar usuario

## PATCH `/api/v1/users/{id}/activate`

### Response

```http
204 No Content
```

---

# 19. Desactivar usuario

## PATCH `/api/v1/users/{id}/deactivate`

### Response

```http
204 No Content
```

No se realizará eliminación física.

---

# 20. Restablecer contraseña

## POST `/api/v1/users/{id}/reset-password`

### Response

```json
{
  "temporaryPassword": "..."
}
```

El usuario deberá quedar con:

```text
firstLogin = true
```

La contraseña temporal solo podrá devolverse en el momento del restablecimiento.

---

# 21. Catálogos para Permiso Gremial

## GET `/api/v1/provinces`

### Acceso

ADMIN / DELEGADO.

Devuelve únicamente provincias activas del catálogo controlado por backend. No existe escritura administrativa de provincias en el MVP.

### Response

```json
[
  {
    "id": "uuid",
    "name": "Buenos Aires"
  }
]
```

---

## GET `/api/v1/delegates`

### Acceso

ADMIN / DELEGADO.

Devuelve usuarios activos con rol `DELEGADO` para seleccionar quién figurará en Permiso Gremial. El usuario autenticado que genera el documento no se asume como delegado.

### Response

```json
[
  {
    "id": "uuid",
    "nombre": "Juan",
    "apellido": "Pérez",
    "dni": "40123456"
  }
]
```

---

## GET `/api/v1/companies`

### Acceso

ADMIN / DELEGADO.

Para usuarios normales deberán devolverse únicamente empresas utilizables para nuevos documentos.

### Query params opcionales

```text
?search=empresa
&active=true
```

### Response

```json
[
  {
    "id": "uuid",
    "nombre": "Empresa Ejemplo",
    "active": true,
    "agreementId": "uuid",
    "agreement": {
      "id": "uuid",
      "codigo": "CCT-001",
      "descripcion": "Convenio ejemplo"
    }
  }
]
```

---

# 22. Crear empresa

## POST `/api/v1/companies`

### Acceso

ADMIN.

### Request

```json
{
  "nombre": "Empresa Ejemplo",
  "agreementId": "uuid"
}
```

### Response — 201

```json
{
  "id": "uuid",
  "nombre": "Empresa Ejemplo",
  "active": true,
  "agreementId": "uuid"
}
```

---

# 23. Editar empresa

## PUT `/api/v1/companies/{id}`

### Acceso

ADMIN.

### Request

```json
{
  "nombre": "Nuevo nombre",
  "agreementId": "uuid"
}
```

`agreementId` es opcional y podrá enviarse como `null`. Si existe, deberá identificar un Convenio activo. Es una sugerencia para el formulario: la generación de PDF continúa recibiendo y validando `agreementId` explícitamente.

---

# 24. Activar / desactivar empresa

```http
PATCH /api/v1/companies/{id}/activate
PATCH /api/v1/companies/{id}/deactivate
```

### Acceso

ADMIN.

---

# 25. Convenios

## GET `/api/v1/agreements`

### Acceso

ADMIN / DELEGADO.

### Response

```json
[
  {
    "id": "uuid",
    "codigo": "CCT-001",
    "descripcion": "Convenio ejemplo",
    "active": true
  }
]
```

---

# 26. Crear convenio

## POST `/api/v1/agreements`

### Acceso

ADMIN.

### Request

```json
{
  "codigo": "CCT-001",
  "descripcion": "Convenio ejemplo"
}
```

---

# 27. Editar convenio

## PUT `/api/v1/agreements/{id}`

### Acceso

ADMIN.

---

# 28. Activar / desactivar convenio

```http
PATCH /api/v1/agreements/{id}/activate
PATCH /api/v1/agreements/{id}/deactivate
```

### Acceso

ADMIN.

---

# 29. Plantillas

## GET `/api/v1/templates`

### Acceso

ADMIN / DELEGADO.

DELEGADO solo recibe Templates activos.

### Query params

```text
?active=true
```

### Response

```json
[
  {
    "id": "uuid",
    "nombre": "Permiso Gremial",
    "descripcion": "Permiso gremial estándar",
    "active": true
  }
]
```

---

# 30. Obtener plantilla

## GET `/api/v1/templates/{id}`

### Acceso

ADMIN / DELEGADO. DELEGADO solo puede obtener plantillas activas.

### Response

```json
{
  "id": "uuid",
  "nombre": "Permiso Gremial",
  "descripcion": "Permiso gremial estándar",
  "active": true
}
```

La numeración oficial queda fuera del MVP; `prefijo` y `ultimoNumero` no forman parte del modelo persistente actual.

---

# 31. Crear plantilla

## POST `/api/v1/templates`

### Acceso

ADMIN.

### Request

```json
{
  "nombre": "Permiso Gremial",
  "descripcion": "Permiso gremial estándar",
}
```

Crear un Template no habilita automáticamente la generación de un nuevo tipo de documento. Aunque ADMIN puede configurar `FieldDefinition` y `TemplateField` para variantes, los formularios y generadores de tipos distintos de Permiso Gremial requieren soporte de desarrollo.

---

# 32. Editar plantilla

## PUT `/api/v1/templates/{id}`

### Acceso

ADMIN.

---

# 33. Activar / desactivar plantilla

### Acceso

ADMIN.

```http
PATCH /api/v1/templates/{id}/activate
PATCH /api/v1/templates/{id}/deactivate
```

---

# 34. Variantes

## GET `/api/v1/templates/{templateId}/variants`

### Acceso

ADMIN / DELEGADO.

DELEGADO solo recibe TemplateVariants activos.

### Response

```json
[
  {
    "id": "uuid",
    "nombre": "Firma A",
    "active": true
  },
  {
    "id": "uuid",
    "nombre": "Firma B",
    "active": true
  }
]
```

No deberá exponerse innecesariamente la ruta física del archivo PDF al frontend.

---

# 35. Crear variante

## POST `/api/v1/templates/{templateId}/variants`

### Acceso

ADMIN.

### Campos conceptuales

La operación utiliza `multipart/form-data` con los campos `nombre` y `archivoPdf`. El archivo debe ser un PDF válido, respetar el límite de tamaño configurado y almacenarse con un nombre/ruta segura. PostgreSQL conserva únicamente `fileKey`.

---

# 36. Editar variante

## PUT `/api/v1/templates/{templateId}/variants/{variantId}`

### Acceso

ADMIN.

---

# 37. Reemplazar archivo de variante

ADMIN puede reemplazar el PDF de la variante.

## PUT `/api/v1/templates/{templateId}/variants/{variantId}/file`

### Content-Type

`multipart/form-data`.

### Acceso

ADMIN.

Esto evita mezclar modificación de metadatos con carga de archivos.

---

# 38. Activar / desactivar variante

```http
PATCH /api/v1/templates/{templateId}/variants/{variantId}/activate
PATCH /api/v1/templates/{templateId}/variants/{variantId}/deactivate
```

---

# 39. Generación de documentos

# 38.1 Campos posicionados de variante

Estos endpoints permiten que un ADMIN configure campos sobre un PDF que no incluye AcroForm. Las coordenadas se expresan en puntos PDF, con origen en la esquina inferior izquierda. Los campos `ACROFORM` existentes no se modifican.

## GET `/api/v1/field-definitions`

### Acceso

ADMIN.

Devuelve las definiciones de datos disponibles para asociar a un campo posicionado.

```json
[
  { "id": "uuid", "key": "delegateFullName" }
]
```

## GET `/api/v1/templates/{templateId}/variants/{variantId}/file`

### Acceso

ADMIN.

Devuelve el PDF base como `application/pdf` para usarlo en el editor visual.

## GET `/api/v1/templates/{templateId}/variants/{variantId}/fields`

### Acceso

ADMIN.

Lista los campos configurados de la variante, tanto `ACROFORM` como `POSITIONED`.

## POST `/api/v1/templates/{templateId}/variants/{variantId}/fields`

## PUT `/api/v1/templates/{templateId}/variants/{variantId}/fields/{fieldId}`

### Acceso

ADMIN.

### Request

```json
{
  "fieldDefinitionId": "uuid",
  "required": true,
  "displayOrder": 0,
  "pageNumber": 1,
  "x": 72,
  "y": 640,
  "width": 180,
  "height": 18,
  "fontSize": 12,
  "minFontSize": 7,
  "maxFontSize": 12,
  "alignment": "LEFT",
  "multiline": false
}
```

El backend verifica que la página exista y que el rectángulo quede dentro de su `MediaBox`.

## DELETE `/api/v1/templates/{templateId}/variants/{variantId}/fields/{fieldId}`

### Acceso

ADMIN.

Elimina únicamente campos de modo `POSITIONED` y devuelve `204 No Content`.

---

Los endpoints de generación no persisten bytes PDF. Cada generación definitiva crea un registro lógico de historial con snapshot de los datos renderizados.

El backend recibe datos, genera el PDF y devuelve el resultado.

---

# 40. Preview de Permiso Gremial

## POST `/api/v1/documents/permiso-gremial/preview`

### Acceso

ADMIN / DELEGADO.

### Request

```json
{
  "provinceId": "uuid",
  "issueDate": "2026-08-18",
  "companyId": "uuid",
  "delegateId": "uuid",
  "permitDay": 21,
  "agreementId": "uuid",
  "variantId": "uuid"
}
```

`permitDay` es el número de día de ausencia gremial elegido por el usuario.

### Importante

No se enviarán como texto libre:

```text
delegado
dni
provincia
empresa
convenio
```

El backend resolverá los IDs contra los registros persistidos. `delegateId` debe identificar un `User` activo con rol `DELEGADO`; de allí se obtienen nombre, apellido y DNI. El usuario autenticado es quien genera el documento y puede ser distinto.

---

# 41. Validaciones del preview

Antes de generar el PDF, el backend deberá validar:

* Usuario autenticado.
* Usuario activo.
* Provincia existente y activa.
* Empresa existente.
* Empresa activa.
* Delegado existente, activo y con rol `DELEGADO`.
* Convenio existente.
* Convenio activo.
* Variante existente.
* Variante activa.
* Variante perteneciente a la plantilla Permiso Gremial.
* Archivo PDF disponible.
* Fecha de emisión válida.
* `permitDay` válido.
* Convenio con `codigo` disponible.
* `Mar del Plata` permanece fijo en la plantilla; `Province.name` completa el primer espacio posterior.

---

# 42. Response del preview

La respuesta será directamente un archivo PDF.

```http
200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="PG-preview.pdf"
```

El cuerpo contendrá los bytes del documento.

El frontend podrá convertir la respuesta en un `Blob` y mostrarla mediante el mecanismo de visualización elegido.

---

# 43. El preview no persiste

La operación:

```text
POST /documents/permiso-gremial/preview
```

NO deberá:

* Guardar el PDF en PostgreSQL.
* Guardar el PDF permanentemente en el servidor.
* Subirlo a Google Drive.
* Crear historial.
* Enviar correo.
* Crear una entidad Documento.

Su única responsabilidad es generar el resultado requerido.

---

# 44. Generación definitiva

Dado que el MVP no mantiene historial ni almacenamiento persistente, no es estrictamente necesario distinguir entre:

```text
preview
```

y

```text
generate
```

desde el punto de vista del contenido del archivo.

Sin embargo, para mantener una API semánticamente clara podrán existir dos enfoques.

---

## Alternativa A — Único endpoint

```text
POST /documents/permiso-gremial/generate
```

El frontend utiliza el mismo PDF tanto para preview como para descarga.

### Ventaja

Más simple.

---

## Alternativa B — Preview + Generate

```text
POST /documents/permiso-gremial/preview
POST /documents/permiso-gremial/generate
```

### Ventaja

Deja preparado el flujo para una futura generación definitiva persistente.

### Desventaja

En el MVP ambos endpoints harían prácticamente lo mismo.

---

# 45. Decisión recomendada para el MVP

Se utilizará inicialmente:

```text
POST /api/v1/documents/permiso-gremial/generate
```

La respuesta será un PDF.

El frontend lo utilizará para:

1. Mostrar vista previa.
2. Descargar el mismo archivo.
3. Imprimir el mismo archivo.

Esto evita generar dos veces el documento sin necesidad.

La interfaz podrá seguir llamando conceptualmente a la pantalla:

> Vista previa

aunque técnicamente el PDF ya haya sido generado en memoria.

---

# 46. Endpoint definitivo recomendado

## POST `/api/v1/documents/permiso-gremial/generate`

### Request

```json
{
  "provinceId": "uuid",
  "issueDate": "2026-08-18",
  "companyId": "uuid",
  "delegateId": "uuid",
  "permitDay": 21,
  "agreementId": "uuid",
  "variantId": "uuid"
}
```

### Response

```http
200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="pg-2026-000123_permiso-gremial_juan-perez.pdf"
X-Document-Id: uuid
X-Public-Number: PG-2026-000123
```

### Resolución futura de datos

```text
provinceId  -> Province.name -> puntos posteriores a "Mar del Plata,"
issueDate   -> día / mes en letras / últimos dos dígitos del año -> zonas punteadas de la cabecera
companyId   -> Company.nombre -> zona Empresa
delegateId  -> User nombre + apellido + DNI -> zona Delegado/documento
permitDay   -> número de día de ausencia gremial -> zona del corriente mes
agreementId -> Agreement.codigo -> zona Convenio
variantId   -> TemplateVariant -> PDF base
```

Las coordenadas de esas zonas se definen y verifican visualmente durante M8.

---

# 47. Flujo frontend usando el endpoint

```text
Formulario
    ↓
POST /documents/permiso-gremial/generate
    ↓
Backend genera PDF
    ↓
Frontend recibe Blob
    ↓
Vista previa
    │
    ├── Volver y modificar
    │
    ├── Descargar
    │
    └── Imprimir
```

Si el usuario vuelve y modifica información, se realiza una nueva solicitud.

---

# 48. Numeración del documento

Cada generación definitiva recibe un número público persistente con formato `PG-YYYY-NNNNNN`. La secuencia es global y segura ante concurrencia; el año es visual y no reinicia el contador.

Sin embargo, existe una consideración importante.

El MVP no persiste documentos generados.

Incrementar una numeración oficial únicamente por mostrar una vista previa podría producir:

```text
PG-000001
PG-000002
PG-000003
```

aunque los dos primeros fueran previews descartados.

Por este motivo, **la numeración definitiva no deberá implementarse hasta definir qué evento constituye formalmente la emisión del documento**.

Opciones futuras:

* Al descargar.
* Al confirmar.
* Al guardar en historial.
* Al enviar.
* Mediante una acción explícita "Emitir documento".

Hasta cerrar esa regla de negocio, el MVP podrá generar PDFs sin numeración oficial automática.

Esto evita consumir secuencias durante las vistas previas.

---

# 49. Descarga

No se requiere un endpoint adicional para descargar.

Una vez generado el PDF, el frontend ya dispone de los bytes del archivo.

Podrá crear una descarga local mediante el navegador.

Esto evita generar nuevamente el mismo documento.

---

# 50. Impresión

No requiere endpoint específico.

El frontend utilizará el PDF recibido y las capacidades de impresión del navegador.

---

# 51. Endpoint de salud

## GET `/api/v1/health`

Es público y responde desde memoria para verificar disponibilidad del backend.

### Response

```json
{
  "status": "UP"
}
```

No consulta PostgreSQL ni Supabase Storage y no requiere autenticación ni CSRF.

Los detalles se definirán en arquitectura.

---

# 52. Seguridad por endpoint

Resumen:

| Endpoint                     | Público | DELEGADO | ADMIN |
| ---------------------------- | ------: | -------: | ----: |
| POST `/auth/login`           |       ✅ |        ✅ |     ✅ |
| POST `/auth/first-login/change-password` |       ❌ |        ✅ |     ✅ |
| POST `/auth/change-password` |       ❌ |        ✅ |     ✅ |
| POST `/auth/logout`          |       ❌ |        ✅ |     ✅ |
| GET `/auth/me`               |       ❌ |        ✅ |     ✅ |
| GET `/users`                 |       ❌ |        ❌ |     ✅ |
| POST `/users`                |       ❌ |        ❌ |     ✅ |
| PUT `/users/{id}`            |       ❌ |        ❌ |     ✅ |
| Reset password               |       ❌ |        ❌ |     ✅ |
| GET `/companies`             |       ❌ |        ✅ |     ✅ |
| GET `/provinces`             |       ❌ |        ✅ |     ✅ |
| GET `/delegates`             |       ❌ |        ✅ |     ✅ |
| Administrar companies        |       ❌ |        ❌ |     ✅ |
| GET `/agreements`            |       ❌ |        ✅ |     ✅ |
| Administrar agreements       |       ❌ |        ❌ |     ✅ |
| GET `/templates`             |       ❌ |        ✅ |     ✅ |
| Administrar templates        |       ❌ |        ❌ |     ✅ |
| GET variants                 |       ❌ |        ✅ |     ✅ |
| Administrar variants         |       ❌ |        ❌ |     ✅ |
| Generar PDF                  |       ❌ |        ✅ |     ✅ |

---

# 53. Validación

El frontend realizará validaciones orientadas a experiencia de usuario.

Ejemplo:

```text
Campo requerido
Formato inválido
```

El backend será la autoridad final.

Nunca deberá asumir que un request es válido únicamente porque procede del frontend oficial.

---

# 54. DTOs

Las entidades de persistencia no deberán exponerse directamente desde los controllers.

La API utilizará DTOs para:

* Requests.
* Responses.

Ejemplo:

```text
UserEntity
    ↓
UserResponse
```

Esto evita acoplar el contrato HTTP al esquema interno de PostgreSQL.

---

# 55. Naming

La API utilizará nombres consistentes en inglés para sus recursos técnicos:

```text
users
companies
agreements
provinces
delegates
templates
variants
documents
```

La interfaz visible para el usuario permanecerá en español.

Esto permite mantener el código técnico consistente sin afectar la experiencia.

---

# 56. Versionado

El prefijo:

```text
/api/v1
```

permitirá evolucionar posteriormente la API sin modificar silenciosamente contratos existentes.

No será necesario crear una `v2` mientras no exista un cambio incompatible real.

---

# 57. Historial documental

## GET `/api/v1/documents/history`

### Acceso

ADMIN / DELEGADO. Acepta `page` (0 por defecto) y `size` (20 por defecto, máximo 100), ordenado por `createdAt` descendente.

ADMIN recibe todos los registros. DELEGADO recibe únicamente los creados por su usuario autenticado.

```json
{
  "content": [
    {
      "id": "uuid",
      "publicNumber": "PG-2026-000123",
      "documentType": "PERMISO_GREMIAL",
      "createdAt": "2026-09-10T10:00:00-03:00",
      "createdBy": "Juan Pérez",
      "companyName": "Empresa Ejemplo",
      "delegateName": "Ana Paz",
      "issueDate": "2026-08-18"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

## GET `/api/v1/documents/history/{id}/pdf`

### Acceso

ADMIN puede regenerar cualquier registro. DELEGADO solo puede regenerar registros creados por él; acceder a uno ajeno devuelve `403`.

La respuesta es `application/pdf` en memoria. No crea otro registro histórico y usa `Content-Disposition` junto con `X-Document-Id` y `X-Public-Number`.

## POST `/api/v1/documents/history/{id}/email`

### Acceso

ADMIN puede enviar cualquier registro. DELEGADO solo puede enviar registros creados por él; acceder a uno ajeno devuelve `403`.

### Request

```json
{
  "recipients": [
    "persona1@ejemplo.com",
    "persona2@ejemplo.com"
  ],
  "subject": "Permiso Gremial PG-2026-000001",
  "message": "Adjuntamos el Permiso Gremial correspondiente."
}
```

El backend regenera el PDF en memoria y lo envía como adjunto mediante la API HTTPS de Resend. No persiste el PDF ni crea historial de emails. El mensaje se envía como texto plano; el frontend no puede enviar HTML arbitrario.

### Response — 200

```json
{
  "message": "Correo enviado correctamente."
}
```

Si Resend no está configurado devuelve `503 MAIL_NOT_CONFIGURED`. Si el proveedor rechaza o no puede entregar el mensaje devuelve `502 MAIL_DELIVERY_FAILED`, sin exponer detalles técnicos.

## Generación de Permiso Gremial

`POST /api/v1/documents/permiso-gremial/generate` mantiene respuesta binaria `application/pdf`. Además de `Content-Disposition`, devuelve:

```http
X-Document-Id: uuid
X-Public-Number: PG-2026-000123
```

El filename se decide en backend: `pg-2026-000123_permiso-gremial_juan-perez.pdf`.

# 58. Endpoints fuera del MVP

No deberán implementarse todavía:

```text
/api/v1/storage/**
/api/v1/documents/{id}
/api/v1/documents/{id}/send
/api/v1/documents/{id}/upload
```

Tampoco:

```text
Google Drive API
historial de emails
```

---

# 58. Evolución futura

Cuando se incorpore historial, el flujo podría evolucionar a:

```text
POST /documents
GET /documents
GET /documents/{id}
GET /documents/{id}/file
POST /documents/{id}/send
```

Pero esos endpoints no deberán crearse preventivamente.

---

# 59. Principios del contrato

La API deberá seguir estas reglas:

1. Los endpoints deben representar recursos o acciones claras.
2. Los errores deben ser consistentes.
3. El frontend no debe conocer detalles internos del backend.
4. Las entidades JPA no deben ser el contrato HTTP.
5. Los permisos deben verificarse siempre en backend.
6. No se enviará información que el backend pueda determinar mediante la identidad autenticada.
7. Los archivos PDF no se almacenarán persistentemente en el MVP.
8. El frontend reutilizará el PDF generado para vista previa, descarga e impresión.
9. Las funcionalidades futuras no deberán contaminar el contrato actual.
10. El contrato deberá mantenerse pequeño, explícito y fácil de probar.

---

# 60. Flujo API crítico del MVP

```text
POST /auth/login
        ↓
GET /auth/me
        ↓
GET /templates
        ↓
GET /templates/{id}/variants
        ↓
GET /companies
        ↓
GET /provinces
        ↓
GET /delegates
        ↓
GET /agreements
        ↓
POST /documents/permiso-gremial/generate
        ↓
application/pdf
```

Este será el flujo técnico más importante del MVP y deberá recibir prioridad durante implementación y testing.
