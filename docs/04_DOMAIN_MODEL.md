# Modelo de Dominio

## 1. Propósito

Este documento define las entidades principales del Sistema de Gestión Documental, sus responsabilidades, atributos conceptuales y relaciones.

El objetivo es representar el dominio de negocio del MVP sin mezclarlo todavía con detalles concretos de persistencia o implementación.

Este documento complementa:

* `01_CONTEXT.md`
* `02_REQUIREMENTS.md`
* `03_USER_FLOWS.md`

---

# 2. Entidades principales del MVP

El MVP estará compuesto inicialmente por las siguientes entidades:

* Usuario
* Empresa
* Convenio
* Provincia
* Plantilla
* TemplateVariant

El proceso de generación de PDF utilizará estas entidades, pero **no persistirá todavía un historial de documentos generados**.

Por este motivo, en el MVP inicial no es necesario que exista una entidad `Documento` persistente.

---

# 3. Usuario

## 3.1. Descripción

Representa a una persona autorizada para utilizar el sistema.

Puede tener rol:

* `ADMIN`
* `DELEGADO`

Cada usuario posee credenciales individuales.

---

## 3.2. Responsabilidades

Un usuario puede:

* Iniciar sesión.
* Cambiar su contraseña.
* Generar documentos.
* Consultar datos disponibles para completar formularios.

Si posee rol `ADMIN`, además puede:

* Administrar usuarios.
* Administrar empresas.
* Administrar convenios.
* Consultar plantillas.
* Consultar variantes.

---

## 3.3. Atributos conceptuales

```text
Usuario
- id
- nombre
- apellido
- dni
- passwordHash
- rol
- activo
- primerLogin
- createdAt
- updatedAt
```

---

## 3.4. Reglas

* El DNI debe ser único.
* La contraseña nunca se almacena en texto plano.
* Un usuario inactivo no puede iniciar sesión.
* Un usuario con `primerLogin = true` debe cambiar su contraseña antes de utilizar normalmente el sistema.
* El rol debe ser uno de los definidos por el sistema.

---

# 4. Empresa

## 4.1. Descripción

Representa una empresa disponible para ser utilizada al completar documentos.

---

## 4.2. Responsabilidades

La entidad Empresa funciona como dato reutilizable dentro de los formularios.

Su objetivo es evitar que el usuario tenga que escribir manualmente el nombre de una empresa cada vez.

---

## 4.3. Atributos conceptuales

```text
Empresa
- id
- nombre
- activo
- createdAt
- updatedAt
```

---

## 4.4. Reglas

* Solo las empresas activas deberán estar disponibles para nuevos documentos.
* Una empresa desactivada no debe eliminarse físicamente por defecto.
* El administrador podrá crear, editar, activar y desactivar empresas.

---

# 5. Convenio

## 5.1. Descripción

Representa un convenio disponible para completar documentos.

---

## 5.2. Responsabilidades

La entidad Convenio permite reutilizar información previamente registrada y reducir errores durante la carga.

---

## 5.3. Atributos conceptuales

```text
Convenio
- id
- descripcion
- codigo
- activo
- createdAt
- updatedAt
```

---

## 5.4. Reglas

* Solo los convenios activos deberán estar disponibles para nuevos documentos.
* `codigo` podrá ser opcional si algún convenio no dispone de uno.
* Un convenio desactivado no deberá eliminarse físicamente por defecto.

---

# 6. Provincia

## 6.1. Descripción

Representa una provincia argentina disponible para completar Permiso Gremial. `Mar del Plata` no es una Provincia: es texto fijo de la plantilla.

## 6.2. Atributos conceptuales

```text
Provincia
- id
- name
- active
- createdAt
- updatedAt
```

## 6.3. Reglas

* Solo las provincias activas están disponibles para nuevos documentos.
* El catálogo inicial de provincias argentinas se provisiona de forma controlada mediante Flyway.
* No se implementa un CRUD administrativo de provincias en este MVP.

---

# 7. Plantilla

## 7.1. Descripción

Representa conceptualmente un **tipo de documento** que el sistema puede generar.

Ejemplos futuros:

* Permiso Gremial.
* Acta.
* Notificación.
* Solicitud.

En el MVP inicial existirá:

* Permiso Gremial.

---

## 7.2. Importante

`PermisoGremial`, `Acta`, `Licencia`, etc. **no serán entidades ni subclases diferentes de Plantilla**.

Se representarán como registros de la misma entidad `Plantilla`.

Por lo tanto, no se utilizará una jerarquía como:

```text
Plantilla
   ↑
   ├── PermisoGremial
   ├── Acta
   └── Licencia
```

La estructura correcta es:

```text
Plantilla
   │
   ├── "Permiso Gremial"
   ├── "Acta"
   └── "Licencia"
```

Esto permite incorporar nuevos tipos de documentos sin crear una entidad nueva por cada uno.

---

## 7.3. Atributos conceptuales

```text
Plantilla
- id
- nombre
- descripcion
- activo
- createdAt
- updatedAt
```

---

## 7.4. Numeración futura

La numeración oficial queda fuera del MVP. `prefijo` y `ultimoNumero` no forman parte del modelo persistente actual y podrán evaluarse en una evolución futura.

---

# 8. TemplateVariant

## 8.1. Descripción

Representa una variante concreta de una Plantilla.

Cada variante corresponde a un **archivo PDF diferente**.

Ejemplo:

```text
Plantilla:
Permiso Gremial

Variantes:
- Firma A
- Firma B
- Firma C
```

Cada una puede utilizar un PDF base diferente.

---

## 8.2. Importante: la firma no es una entidad

La firma ya está incorporada dentro del archivo PDF.

Por lo tanto:

```text
NO:
Plantilla + Firma = PDF
```

El modelo correcto es:

```text
Plantilla
   ↓
TemplateVariant
   ↓
Archivo PDF con firma incluida
```

No existirá una entidad `Firma` en el MVP.

---

## 8.3. Atributos conceptuales

```text
TemplateVariant
- id
- plantilla
- nombre
- fileKey
- activo
- createdAt
- updatedAt
```

---

## 8.4. Reglas

* Toda variante pertenece obligatoriamente a una Plantilla.
* Una Plantilla puede tener múltiples variantes.
* Una variante pertenece a una única Plantilla.
* Solo variantes activas pueden utilizarse para generar nuevos documentos.
* `fileKey` identifica el archivo correspondiente mediante `TemplateFileStorage`.
* El archivo PDF debe ser compatible con el sistema de generación utilizado.
* Los bytes del PDF no se almacenan en PostgreSQL.

---

# 9. Relaciones principales

## 9.1. Plantilla → TemplateVariant

Cardinalidad:

```text
Plantilla 1 ─────── N TemplateVariant
```

Significado:

* Una Plantilla puede tener múltiples variantes.
* Cada TemplateVariant pertenece a una única Plantilla.

Ejemplo:

```text
Permiso Gremial
    │
    ├── Firma A
    ├── Firma B
    └── Firma C
```

---

# 10. Relaciones con datos del formulario

En el MVP, Empresa, Convenio y Provincia son datos reutilizables utilizados durante la generación de documentos.

No existe todavía una entidad `Documento` persistida, por lo tanto no habrá una relación permanente como:

```text
Empresa → Documento
Convenio → Documento
```

durante esta primera versión.

Las relaciones se producen en tiempo de ejecución:

```text
Usuario autenticado (generador)
      │
      ▼
Formulario
      │
       ├── Empresa seleccionada
       ├── Provincia seleccionada
       ├── Delegado seleccionado
       ├── Convenio seleccionado
      ├── Plantilla seleccionada
      └── TemplateVariant seleccionada
              │
              ▼
           PDF generado
```

El PDF se devuelve al usuario, pero no se registra todavía como entidad persistente.

---

# 11. Documento generado en el MVP

Es importante distinguir entre:

## Documento como concepto funcional

Representa el resultado de completar una plantilla con determinados datos.

y

## Documento como entidad persistente

Una entidad guardada en la base de datos con:

* número,
* usuario,
* empresa,
* convenio,
* archivo,
* fecha,
* estado,
* etc.

En el MVP inicial se utilizará únicamente el **concepto funcional**.

No se almacenará todavía el documento generado como entidad persistente.

---

# 12. Flujo del dominio para generar PDF

Conceptualmente:

```text
Usuario
   │
   ▼
Selecciona Plantilla
   │
   ▼
Selecciona TemplateVariant
   │
   ▼
Selecciona Empresa
    │
    ▼
Selecciona Provincia y Delegado
    │
    ▼
Indica día de permiso gremial
    │
    ▼
Selecciona Convenio
   │
   ▼
Completa datos restantes
   │
   ▼
Document Generation Service
   │
   ▼
PDF generado
```

---

# 13. Datos del Permiso Gremial

Para la primera plantilla, el proceso de generación utiliza:

```text
PermisoGremialData
- provinceId
- issueDate
- companyId
- delegateId
- permitDay
- agreementId
- variantId
```

`PermisoGremialData` representa conceptualmente los datos necesarios para generar ese documento.

`issueDate` representa la fecha de emisión. `permitDay` representa el único día de ausencia gremial y no se persiste como entidad.

No necesariamente será una entidad JPA.

Podrá implementarse como:

* DTO.
* Command.
* Request.
* Objeto de dominio.

La decisión concreta corresponde a la arquitectura.

---

# 14. Usuario autenticado y delegado seleccionado

En el Permiso Gremial:

```text
Delegado
DNI
```

se resuelven desde el `User` activo seleccionado mediante `delegateId`, cuyo rol debe ser `DELEGADO`.

Conceptualmente:

```text
Delegado seleccionado (User con rol DELEGADO)
- nombre
- apellido
- dni
```

se transforma en:

```text
Nombre del delegado
DNI del delegado
```

durante la generación.

El usuario autenticado es quien genera el documento y puede ser diferente del delegado seleccionado. Esto evita duplicar datos sin crear una entidad `Delegate` redundante.

---

# 15. Enumeración Role

El dominio deberá contemplar:

```text
Role
- ADMIN
- DELEGADO
```

No será necesario crear una entidad persistente de roles para el MVP.

---

# 16. Estado activo/inactivo

Las siguientes entidades tendrán estado lógico:

```text
Usuario
Empresa
Convenio
Provincia
Plantilla
TemplateVariant
```

El objetivo es permitir desactivarlas sin eliminarlas físicamente.

Esto facilita:

* Mantener integridad.
* Evitar pérdidas accidentales.
* Rehabilitar registros posteriormente.

---

# 17. Eliminación lógica

El comportamiento por defecto será:

```text
Eliminar funcionalmente
        ↓
activo = false
```

en lugar de:

```text
DELETE físico
```

para entidades administrativas relevantes.

En la V1 no será necesario implementar un sistema complejo de soft-delete con campos como `deletedAt` salvo que exista una necesidad concreta.

El campo `activo` será suficiente.

---

# 18. Modelo conceptual resumido

```text
┌──────────────────┐
│     Usuario      │
├──────────────────┤
│ id               │
│ nombre           │
│ apellido         │
│ dni              │
│ passwordHash     │
│ role             │
│ activo           │
│ primerLogin      │
└──────────────────┘


┌──────────────────┐
│     Empresa      │
├──────────────────┤
│ id               │
│ nombre           │
│ activo           │
└──────────────────┘


┌──────────────────┐
│    Provincia     │
├──────────────────┤
│ id               │
│ name             │
│ active           │
└──────────────────┘


┌──────────────────┐
│     Convenio     │
├──────────────────┤
│ id               │
│ descripcion      │
│ codigo           │
│ activo           │
└──────────────────┘


┌──────────────────┐
│    Plantilla     │
├──────────────────┤
│ id               │
│ nombre           │
│ descripcion      │
│ activo           │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│ TemplateVariant  │
├──────────────────┤
│ id               │
│ plantilla        │
│ nombre           │
│ fileKey          │
│ activo           │
└──────────────────┘
```

---

# 19. Entidades excluidas del MVP

Las siguientes entidades fueron consideradas durante el análisis, pero quedan fuera del modelo persistente inicial.

## Documento

Se incorporará cuando sea necesario mantener historial de documentos generados.

Posibles datos futuros:

```text
Documento
- id
- numero
- usuario
- empresa
- convenio
- templateVariant
- fecha
- storageUrl
- estado
- createdAt
```

---

## Destinatario

Se incorporará cuando exista envío de correo y se decida guardar destinatarios frecuentes.

---

## EmailLog

Podrá incorporarse si se necesita registrar:

* envíos,
* errores SMTP,
* destinatarios,
* fecha de envío.

---

## StorageFile

Podrá utilizarse si en el futuro un documento puede tener múltiples archivos asociados.

---

## Firma

No se prevé incorporarla porque las firmas forman parte de los PDFs de `TemplateVariant`.

---

# 20. Evolución futura: Documento persistente

Cuando se implemente historial, la estructura podrá evolucionar a:

```text
Usuario
   │
   │ 1:N
   ▼
Documento
   ▲
   │
   ├──── Empresa
   │
   ├──── Convenio
   │
   └──── TemplateVariant
              │
              ▼
          Plantilla
```

Esto permitirá posteriormente consultar:

* quién generó un documento,
* qué empresa utilizó,
* qué convenio,
* qué variante,
* cuándo fue generado,
* dónde está almacenado.

Esta estructura no deberá implementarse anticipadamente en el MVP.

---

# 21. Evolución futura: campos dinámicos

En una versión futura podría ser necesario que cada Plantilla defina sus propios campos de manera configurable.

Ejemplo:

```text
Permiso Gremial
- Provincia
- Empresa
- Convenio

Acta
- Lugar
- Fecha
- Participantes
```

Esto podría introducir entidades como:

```text
TemplateField
DocumentFieldValue
```

Sin embargo, el MVP **no implementará formularios dinámicos**.

La primera plantilla tendrá un formulario específico y tipado para Permiso Gremial.

Esto evita sobreingeniería prematura.

---

# 22. Principios del modelo

El modelo deberá seguir estos principios:

## 21.1. No duplicar datos innecesariamente

Si el sistema ya conoce el DNI del usuario, no debe almacenarlo nuevamente como dato maestro independiente sin necesidad.

---

## 21.2. Modelar conceptos reales

No crear entidades únicamente porque existe un elemento visual en la interfaz.

Ejemplo:

`Historial` es una pantalla o consulta futura, no necesariamente una entidad.

---

## 21.3. Evitar herencia innecesaria

Los distintos tipos de documentos no deberán modelarse como subclases de `Plantilla` salvo que en el futuro exista una razón técnica muy fuerte.

---

## 21.4. Favorecer composición y configuración

Los nuevos tipos de documentos deberán incorporarse principalmente mediante:

* Plantillas.
* Variantes.
* Servicios específicos de generación cuando sea necesario.

---

## 21.5. No implementar anticipadamente funcionalidades futuras

La arquitectura debe permitir crecimiento, pero el modelo del MVP debe mantenerse pequeño y comprensible.

---

# 23. Decisiones de dominio confirmadas

Quedan establecidas las siguientes decisiones:

1. Cada usuario tiene una cuenta individual.
2. El login utiliza DNI y contraseña.
3. Existen roles ADMIN y DELEGADO.
4. Permiso Gremial es una Plantilla, no una entidad independiente.
5. Las distintas firmas se representan mediante `TemplateVariant`.
6. No existe entidad Firma.
7. Empresa, Convenio y Provincia son datos reutilizables.
8. El MVP no persiste documentos generados.
9. El MVP no tiene Historial persistente.
10. El MVP no tiene SMTP.
11. El MVP no tiene Google Drive.
12. El formulario Permiso Gremial será específico en la V1.
13. La arquitectura deberá permitir agregar otros tipos de documentos más adelante.
14. La numeración oficial queda fuera del MVP.
15. Un delegado seleccionable se representa mediante `User` con rol `DELEGADO`; puede ser distinto del usuario autenticado.
16. Las provincias se provisionan como catálogo controlado y no tienen CRUD administrativo en el MVP.

---

# 23. Fuente de verdad

Ante contradicciones durante la implementación:

* `01_CONTEXT.md` define el alcance.
* `02_REQUIREMENTS.md` define el comportamiento esperado.
* `03_USER_FLOWS.md` define la interacción.
* Este documento define los conceptos y relaciones del dominio.

No deberán incorporarse entidades adicionales sin que exista una necesidad funcional o técnica justificable.
