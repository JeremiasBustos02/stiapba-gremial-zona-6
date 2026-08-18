# Flujos de Usuario

## 1. Propósito

Este documento define los principales flujos de interacción de los usuarios dentro del MVP del Sistema de Gestión Documental.

Los flujos describen:

* Punto de inicio.
* Acciones del usuario.
* Respuestas del sistema.
* Caminos alternativos.
* Situaciones de error.
* Resultado esperado.

Este documento complementa:

* `01_CONTEXT.md`
* `02_REQUIREMENTS.md`

---

# 2. Roles

Los flujos contemplan dos roles:

### ADMIN

Puede utilizar el sistema normalmente y además administrar:

* Usuarios.
* Empresas.
* Convenios.
* Consultar plantillas.
* Consultar variantes.

### DELEGADO

Puede:

* Iniciar sesión.
* Gestionar su contraseña.
* Generar documentos.
* Visualizar documentos.
* Descargar documentos.
* Imprimir documentos.

---

# 3. Flujo general del Delegado

El flujo principal del MVP será:

```text
Login
  ↓
Home
  ↓
Nuevo documento
  ↓
Seleccionar tipo de documento
  ↓
Seleccionar variante
  ↓
Completar formulario
  ↓
Generar vista previa
  ↓
Revisar PDF
  ↓
Confirmar
  ↓
Descargar / Imprimir
```

Este flujo deberá ser especialmente sencillo desde dispositivos móviles.

---

# 4. UF-01 — Inicio de sesión exitoso

## Actor

ADMIN / DELEGADO

## Precondiciones

* El usuario existe.
* El usuario se encuentra activo.
* No se trata de su primer ingreso.
* Posee una contraseña válida.

## Flujo principal

1. El usuario accede a la aplicación.
2. El sistema muestra la pantalla de inicio de sesión.
3. El usuario ingresa:

   * DNI.
   * Contraseña.
4. El usuario selecciona **Iniciar sesión**.
5. El frontend valida que los campos requeridos estén completos.
6. Las credenciales son enviadas al backend.
7. El backend valida:

   * Existencia del usuario.
   * Estado del usuario.
   * Contraseña.
8. La autenticación resulta exitosa.
9. Se establece la sesión correspondiente.
10. El sistema redirige al usuario al Home.

## Resultado

El usuario queda autenticado y puede utilizar las funcionalidades correspondientes a su rol.

---

# 5. UF-02 — Credenciales incorrectas

## Actor

ADMIN / DELEGADO

## Flujo

1. El usuario ingresa DNI y contraseña.
2. Selecciona **Iniciar sesión**.
3. El backend no puede validar las credenciales.
4. El sistema rechaza la autenticación.
5. Se muestra un mensaje comprensible.

Ejemplo:

> No pudimos iniciar sesión. Verificá tus datos e intentá nuevamente.

## Reglas

El sistema no deberá indicar innecesariamente si:

* El DNI existe.
* La contraseña específica es incorrecta.

Esto evita revelar información sobre cuentas registradas.

---

# 6. UF-03 — Usuario desactivado

## Actor

ADMIN / DELEGADO

## Precondición

Existe una cuenta registrada pero se encuentra desactivada.

## Flujo

1. El usuario intenta iniciar sesión.
2. El backend detecta que la cuenta no está habilitada.
3. La autenticación es rechazada.
4. No se crea una sesión válida.
5. El sistema informa que no es posible acceder.

La implementación deberá evitar revelar información sensible innecesaria.

---

# 7. UF-04 — Primer inicio de sesión

## Actor

ADMIN / DELEGADO

## Precondiciones

* El usuario fue creado por un administrador.
* Posee una contraseña temporal.
* `firstLogin = true`.

## Flujo principal

```text
Login
  ↓
Credenciales válidas
  ↓
Sistema detecta firstLogin
  ↓
Cambio obligatorio de contraseña
  ↓
Nueva contraseña válida
  ↓
Contraseña actualizada
  ↓
Home
```

## Detalle

1. El usuario ingresa su DNI.
2. Ingresa la contraseña temporal.
3. Selecciona **Iniciar sesión**.
4. El backend valida las credenciales.
5. Detecta que `firstLogin = true`.
6. El usuario es dirigido a **Cambiar contraseña**.
7. Ingresa:

   * Nueva contraseña.
   * Confirmación de contraseña.
8. El sistema valida ambas.
9. El backend almacena de forma segura la nueva contraseña.
10. `firstLogin` pasa a `false`.
11. El usuario es dirigido al Home.

## Restricción

Mientras `firstLogin = true`, el usuario no deberá poder utilizar normalmente el resto de funcionalidades protegidas.

---

# 8. UF-05 — Error durante el cambio de contraseña

## Casos posibles

* Campos incompletos.
* Las contraseñas no coinciden.
* La contraseña no cumple las reglas establecidas.
* Sesión inválida.
* Error inesperado del servidor.

## Comportamiento esperado

El sistema deberá:

1. Informar claramente el problema.
2. Mantener al usuario en la pantalla correspondiente cuando sea posible.
3. No cambiar la contraseña hasta que la operación sea válida.
4. No mostrar información técnica interna.

---

# 9. UF-06 — Cerrar sesión

## Actor

ADMIN / DELEGADO

## Flujo

1. El usuario selecciona **Cerrar sesión**.
2. El sistema invalida o elimina la sesión correspondiente.
3. El usuario vuelve a la pantalla de Login.
4. Las rutas protegidas dejan de estar disponibles.

---

# 10. UF-07 — Acceder al Home

## Actor

ADMIN / DELEGADO

## Precondición

Usuario autenticado correctamente.

## Delegado

El Home deberá priorizar:

**Nuevo documento**

También podrá disponer de acceso a:

* Perfil.
* Cambio de contraseña.

## Administrador

Además de las funcionalidades habituales, tendrá acceso a:

* Usuarios.
* Empresas.
* Convenios.
* Plantillas.
* Variantes.

La interfaz podrá adaptar la navegación según el dispositivo y el rol.

---

# 11. UF-08 — Iniciar nuevo documento

## Actor

ADMIN / DELEGADO

## Flujo

1. Desde Home, el usuario selecciona **Nuevo documento**.
2. El sistema consulta los tipos de documentos disponibles.
3. Se muestran únicamente aquellos que puedan utilizarse.
4. El usuario selecciona un tipo.

Inicialmente:

> Permiso Gremial

5. El sistema continúa al flujo correspondiente.

---

# 12. UF-09 — Seleccionar variante

## Actor

ADMIN / DELEGADO

## Precondición

Se seleccionó un tipo de documento.

## Flujo

1. El sistema obtiene las variantes activas pertenecientes a la plantilla seleccionada.
2. Muestra las opciones disponibles.
3. El usuario selecciona una variante.
4. El sistema utiliza esa selección para determinar qué archivo PDF base deberá utilizarse posteriormente.

Ejemplo:

```text
Permiso Gremial
    │
    ├── Firma A
    ├── Firma B
    └── Firma C
```

## Caso alternativo

Si no existen variantes disponibles, el sistema deberá impedir continuar y mostrar un mensaje apropiado.

---

# 13. UF-10 — Completar Permiso Gremial

## Actor

ADMIN / DELEGADO

## Datos requeridos

* Provincia.
* Fecha de emisión.
* Día de permiso gremial.
* Empresa.
* Delegado.
* Convenio.
* Variante.

## Flujo

1. El usuario accede al formulario.
2. El sistema precarga la información que ya conoce.
3. El usuario selecciona Provincia entre las provincias activas y la fecha de emisión mediante Date Picker.
4. El usuario indica el número del único día de ausencia gremial.
5. Empresa se selecciona entre las empresas activas.
6. Delegado se selecciona entre usuarios activos con rol `DELEGADO`; el sistema muestra su DNI sin permitir edición manual.
7. Convenio se selecciona entre los convenios activos.
8. Variante corresponde a la seleccionada para el documento.
9. El usuario revisa los datos.
10. Selecciona la acción para generar la vista previa.

---

# 14. UF-11 — Autocompletado de datos del delegado

Al seleccionar un delegado, el sistema deberá obtener automáticamente:

* Nombre del delegado.
* DNI.

Estos datos procederán del usuario activo con rol `DELEGADO` seleccionado. El usuario autenticado es quien genera el documento y puede ser distinto.

El objetivo es evitar que el usuario vuelva a introducir información que el sistema ya posee.

Si el usuario no tiene permisos para modificar esos datos dentro del documento, deberán mostrarse como información no editable.

---

# 15. UF-12 — Selección de empresa

## Flujo

1. El sistema obtiene las empresas activas.
2. El usuario puede seleccionar la empresa correspondiente.
3. Si existen muchas opciones, la interfaz deberá facilitar su búsqueda.
4. La empresa seleccionada queda asociada a los datos utilizados para generar el documento.

Las empresas inactivas no deberán utilizarse normalmente para nuevos documentos.

---

# 16. UF-13 — Selección de convenio

## Flujo

1. El sistema obtiene los convenios activos.
2. El usuario selecciona el convenio correspondiente.
3. El valor seleccionado se utiliza posteriormente para completar el PDF.

Si la cantidad de convenios lo justifica, la interfaz deberá permitir buscar rápidamente entre ellos.

---

# 17. UF-14 — Formulario incompleto o inválido

## Flujo alternativo

1. El usuario intenta continuar.
2. Existen campos obligatorios inválidos o incompletos.
3. El frontend impide la operación.
4. Se identifican claramente los campos que requieren atención.
5. El usuario corrige los datos.
6. Puede volver a intentar la generación.

El backend deberá realizar nuevamente las validaciones necesarias al recibir la solicitud.

---

# 18. UF-15 — Generar vista previa

## Actor

ADMIN / DELEGADO

## Precondiciones

* Formulario válido.
* Tipo de documento válido.
* Variante válida.
* Usuario autenticado.

## Flujo

1. El usuario solicita visualizar el documento.
2. El frontend muestra un estado de carga.
3. Los datos necesarios son enviados al backend.
4. El backend valida la solicitud.
5. Localiza la plantilla correspondiente.
6. Obtiene el PDF base de la variante.
7. Completa los campos necesarios.
8. Genera un nuevo PDF.
9. Devuelve el resultado.
10. El frontend presenta el documento en la pantalla de vista previa.

## Resultado

El usuario puede revisar visualmente el documento antes de descargarlo o imprimirlo.

---

# 19. UF-16 — Error al generar PDF

## Posibles causas

* Plantilla inexistente.
* Archivo de variante no disponible.
* Campos requeridos inexistentes o incompatibles.
* Datos inválidos.
* Error interno durante el procesamiento.

## Flujo

1. Se produce un error.
2. El backend responde de manera controlada.
3. El frontend deja de mostrar el estado de carga.
4. Se informa al usuario.

Ejemplo:

> No pudimos generar el documento. Intentá nuevamente.

5. Los datos del formulario deberán conservarse cuando sea posible.
6. El usuario podrá volver a intentarlo.

Los detalles técnicos deberán quedar disponibles únicamente para diagnóstico interno.

---

# 20. UF-17 — Revisar vista previa

## Actor

ADMIN / DELEGADO

## Flujo

1. El usuario visualiza el PDF generado.
2. Revisa:

   * Provincia.
    * Fecha de emisión.
     * Día de permiso gremial.
   * Empresa.
   * Delegado.
   * DNI.
   * Convenio.
   * Variante.
3. Decide si el documento es correcto.

Desde esta pantalla deberá poder:

* Volver y modificar.
* Continuar con el documento.

---

# 21. UF-18 — Corregir documento

## Flujo

```text
Vista previa
     ↓
Detecta un error
     ↓
Volver al formulario
     ↓
Datos anteriores conservados
     ↓
Modificar información
     ↓
Generar nueva vista previa
```

La aplicación no deberá obligar al usuario a completar nuevamente todo el formulario.

La vista previa anterior deja de considerarse el resultado actual después de modificar los datos.

---

# 22. UF-19 — Descargar PDF

## Actor

ADMIN / DELEGADO

## Precondición

Existe un PDF generado correctamente.

## Flujo

1. El usuario selecciona **Descargar PDF**.
2. El navegador inicia la descarga.
3. El archivo descargado debe corresponder al documento visualizado.
4. El PDF debe poder abrirse normalmente.

La descarga no implica, dentro del MVP, que el archivo quede almacenado permanentemente en el servidor.

---

# 23. UF-20 — Imprimir PDF

## Actor

ADMIN / DELEGADO

## Flujo

1. El usuario dispone del PDF generado.
2. Selecciona **Imprimir**.
3. Se utilizan las capacidades de impresión disponibles en el navegador o dispositivo.
4. El usuario selecciona impresora y opciones correspondientes.

El sistema no implementará infraestructura propia de impresión.

---

# 24. UF-21 — Consultar perfil

## Actor

ADMIN / DELEGADO

## Flujo

1. El usuario accede a su perfil.
2. Puede consultar su información básica.
3. Puede acceder a la opción de modificar contraseña.

La modificación de otros datos dependerá de los permisos definidos para el sistema.

---

# 25. UF-22 — Administración de usuarios

## Actor

ADMIN

## Flujo general

```text
Administración
      ↓
Usuarios
      ↓
Listado
  ┌───┴───────────┐
  ↓               ↓
Crear           Editar
                  │
            ┌─────┴─────┐
            ↓           ↓
        Desactivar    Resetear
                     contraseña
```

---

# 26. UF-23 — Crear usuario

## Actor

ADMIN

## Flujo

1. El administrador accede a Usuarios.
2. Selecciona **Nuevo usuario**.
3. Completa:

   * Nombre.
   * Apellido.
   * DNI.
   * Rol.
4. El sistema valida la información.
5. Comprueba que el DNI no esté registrado.
6. Se crea el usuario.
7. Se establece una contraseña temporal.
8. El usuario queda marcado con `firstLogin = true`.
9. El sistema informa que la creación fue exitosa.
10. El usuario al entrar por primera vez tendra que cambiar su contraseña por una nueva.

El mecanismo exacto mediante el cual la contraseña temporal será comunicada al usuario será definido posteriormente dentro de las decisiones de UX/arquitectura del MVP.

---

# 27. UF-24 — DNI duplicado al crear usuario

## Flujo alternativo

1. El administrador intenta crear un usuario.
2. El DNI ya pertenece a otra cuenta.
3. El backend rechaza la operación.
4. El sistema informa el problema.

Ejemplo:

> Ya existe un usuario registrado con ese DNI.

5. Los demás datos del formulario deberán conservarse.

---

# 28. UF-25 — Desactivar usuario

## Actor

ADMIN

## Flujo

1. El administrador selecciona un usuario activo.
2. Selecciona **Desactivar**.
3. El sistema solicita confirmación.
4. El administrador confirma.
5. El usuario pasa a estado inactivo.
6. El registro permanece almacenado.
7. El usuario ya no podrá iniciar nuevas sesiones.

La política concreta para sesiones ya existentes se definirá en la documentación de arquitectura y seguridad.

---

# 29. UF-26 — Restablecer contraseña

## Actor

ADMIN

## Flujo

1. El administrador selecciona un usuario.
2. Selecciona **Restablecer contraseña**.
3. Confirma la acción.
4. El sistema establece una nueva contraseña temporal.
5. `firstLogin` vuelve a `true`.
6. El sistema informa que la operación fue exitosa.
7. En el siguiente acceso, el usuario deberá establecer una contraseña nueva.

---

# 30. UF-27 — Administración de empresas

## Actor

ADMIN

El administrador podrá:

* Consultar empresas.
* Crear empresa.
* Editar empresa.
* Activar empresa.
* Desactivar empresa.

## Flujo de creación

```text
Administración
    ↓
Empresas
    ↓
Nueva empresa
    ↓
Completar datos
    ↓
Validar
    ↓
Guardar
```

Después de crearse correctamente, una empresa activa podrá utilizarse en los formularios correspondientes.

---

# 31. UF-28 — Administración de convenios

## Actor

ADMIN

El administrador podrá:

* Consultar convenios.
* Crear convenio.
* Editar convenio.
* Activar convenio.
* Desactivar convenio.

Los convenios activos quedarán disponibles para la generación de documentos.

---

# 32. UF-29 — Administración de plantillas

## Actor

ADMIN / DELEGADO

Los usuarios autenticados podrán consultar tipos de documentos disponibles. ADMIN también podrá crear, editar, activar y desactivar plantillas. Crear una plantilla no genera automáticamente un formulario ni un generador nuevo.

Una plantilla representa conceptualmente un tipo de documento.

Ejemplo:

> Permiso Gremial

---

# 33. UF-30 — Administración de variantes

## Actor

ADMIN / DELEGADO

## Flujo conceptual

```text
Plantillas
    ↓
Permiso Gremial
    ↓
Variantes
    ↓
┌─────────────────────┐
│ Firma A              │
│ Firma B              │
│ Firma C              │
└─────────────────────┘
```

Los usuarios autenticados podrán consultar las variantes activas asociadas a una plantilla. ADMIN podrá crear, editar, activar y desactivar variantes. Al crear o reemplazar una variante, ADMIN podrá subir un PDF. Inicialmente existe una única variante: `Permiso Gremial / Bruna`.

Cada variante deberá referenciar el PDF correspondiente mediante `fileKey`. El upload debe validar PDF, tamaño y rutas seguras.

DELEGADO solo puede consultar variantes activas desde la aplicación.

---

# 34. UF-31 — Acceso no autorizado

## Ejemplo

Un usuario `DELEGADO` intenta acceder directamente a:

> Administración de usuarios.

## Comportamiento

1. El frontend no deberá ofrecer normalmente esa opción.
2. Si intenta acceder manualmente a la ruta, la interfaz deberá impedirlo.
3. Si intenta llamar directamente al endpoint, el backend deberá rechazar la solicitud.

La seguridad nunca deberá depender exclusivamente de ocultar elementos visuales.

---

# 35. UF-32 — Sesión expirada o inválida

## Flujo

1. El usuario está utilizando la aplicación.
2. Intenta realizar una operación protegida.
3. El backend determina que la sesión ya no es válida.
4. La operación es rechazada.
5. El frontend informa apropiadamente al usuario.
6. Se solicita volver a iniciar sesión.

La aplicación deberá evitar quedar en un estado inconsistente.

---

# 36. UF-33 — Error de conexión

Si una operación no puede completarse por problemas de conectividad:

1. La interfaz deberá dejar de mostrar el estado de carga cuando corresponda.
2. Se mostrará un mensaje comprensible.
3. Los datos introducidos por el usuario deberán conservarse cuando sea posible.
4. Se deberá permitir reintentar la operación.

Ejemplo:

> No pudimos conectarnos con el servidor. Revisá tu conexión e intentá nuevamente.

---

# 37. UF-34 — Datos administrativos inexistentes

Puede ocurrir que un administrador todavía no haya cargado datos necesarios.

Ejemplo:

```text
Nuevo documento
      ↓
Permiso Gremial
      ↓
No existen empresas activas
```

El sistema deberá mostrar un estado vacío comprensible.

Para un `ADMIN`, podrá ofrecer acceso a la administración correspondiente.

Para un `DELEGADO`, deberá indicar que la información necesaria todavía no está disponible.

No deberá permitirse generar un documento incompleto por esta causa.

---

# 38. Flujo principal resumido del MVP

```text
┌───────────────────────┐
│         LOGIN         │
└───────────┬───────────┘
            │
            ▼
      ¿Primer ingreso?
        /          \
      Sí            No
      │              │
      ▼              │
Cambiar contraseña   │
      │              │
      └──────┬───────┘
             ▼
┌───────────────────────┐
│         HOME          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    NUEVO DOCUMENTO    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│    PERMISO GREMIAL    │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  SELECCIONAR VARIANTE │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│      FORMULARIO       │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│     VISTA PREVIA      │
└───────────┬───────────┘
            │
       ¿Correcto?
       /        \
     No          Sí
     │            │
     ▼            ▼
 Formulario   Confirmar
     │            │
     └───► Preview│
                  ▼
        ┌─────────────────┐
        │ DESCARGAR       │
        │ IMPRIMIR        │
        └─────────────────┘
```

---

# 39. Flujo administrativo resumido

```text
                   ADMIN
                     │
                     ▼
               Administración
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
    Usuarios      Empresas      Convenios
       │
       │
       └───────────────┐
                       │
                       ▼
                  Plantillas
                       │
                       ▼
                   Variantes
```

Cada módulo administrativo deberá seguir patrones de interacción consistentes.

---

# 40. Flujos fuera del MVP

Los siguientes flujos quedan explícitamente reservados para versiones futuras:

### Envío por correo

```text
PDF
 ↓
Redactar correo
 ↓
Adjuntar PDF
 ↓
SMTP
```

### Google Drive

```text
PDF
 ↓
Subir a la nube
 ↓
Google Drive
 ↓
Guardar referencia
```

### Historial documental

```text
Documento generado
       ↓
Registro persistente
       ↓
Historial
       ↓
Buscar / filtrar / consultar
```

Estos flujos sirven únicamente como referencia de evolución.

**No deberán implementarse como parte del MVP actual.**

---

# 41. Principios de navegación

Todos los flujos deberán respetar los siguientes principios:

1. El usuario debe saber en qué etapa se encuentra.
2. Las acciones principales deben ser fáciles de identificar.
3. Volver atrás no deberá eliminar innecesariamente información introducida.
4. Los errores recuperables no deberán obligar a reiniciar todo el flujo.
5. Los datos conocidos por el sistema no deberán solicitarse nuevamente sin necesidad.
6. La interfaz deberá priorizar el uso desde teléfonos celulares.
7. Las acciones administrativas deberán estar claramente separadas de las tareas habituales.
8. La aplicación deberá evitar pasos que no aporten valor al usuario.

---

# 42. Flujo crítico

El flujo de mayor prioridad para el MVP será:

> **Login → Nuevo Documento → Permiso Gremial → Formulario → Vista Previa → Descargar / Imprimir**

Cualquier decisión de UX o implementación deberá priorizar que este flujo sea:

* Simple.
* Rápido.
* Confiable.
* Fácil de entender.
* Cómodo desde un celular.

Este flujo deberá recibir la mayor prioridad durante desarrollo, pruebas y validación del MVP.
