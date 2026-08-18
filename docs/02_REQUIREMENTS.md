# Requisitos del Sistema

Los wireframes son referencia visual. Si representan historial, borradores, envío por correo, numeración u otra funcionalidad fuera del MVP, prevalecen `01_CONTEXT.md` y este documento.

## 1. Propósito

Este documento define los requisitos funcionales y no funcionales del MVP del Sistema de Gestión Documental.

Su objetivo es establecer de forma precisa **qué debe hacer el sistema**, qué comportamientos se esperan de cada funcionalidad y cuáles son las restricciones generales que deberán respetarse durante el desarrollo.

Este documento complementa `01_CONTEXT.md`.

En caso de incorporar nuevas funcionalidades en versiones futuras, deberán documentarse antes de ser consideradas parte del alcance actual.

---

# 2. Roles

El sistema contará inicialmente con dos roles:

* `ADMIN`
* `DELEGADO`

Los permisos deberán ser controlados tanto desde la interfaz como desde el backend.

Ocultar una funcionalidad en el frontend no será suficiente para restringir su acceso.

---

# 3. Autenticación

## RF-01 — Inicio de sesión

El sistema deberá permitir iniciar sesión utilizando:

* DNI.
* Contraseña.

### Reglas

* El DNI debe corresponder a un usuario existente.
* La contraseña debe ser válida.
* El usuario debe encontrarse activo.
* Ante credenciales incorrectas, el sistema deberá informar que no fue posible iniciar sesión sin revelar innecesariamente cuál de los dos datos es incorrecto.
* Una autenticación exitosa deberá establecer una sesión válida para el usuario.

---

## RF-02 — Primer inicio de sesión

Cuando un usuario ingrese por primera vez utilizando una contraseña temporal:

1. El sistema deberá detectar que se trata del primer acceso.
2. El usuario deberá ser dirigido a la pantalla de cambio de contraseña.
3. No podrá utilizar normalmente las funcionalidades protegidas hasta establecer una nueva contraseña.
4. Una vez modificada correctamente, dejará de considerarse un primer ingreso.

---

## RF-03 — Cambio de contraseña

El usuario deberá poder establecer una nueva contraseña.

La contraseña deberá cumplir las reglas de seguridad que se definan para el sistema.

El backend deberá validar dichas reglas independientemente de las validaciones existentes en el frontend.

---

## RF-04 — Cierre de sesión

El usuario deberá poder cerrar su sesión.

Una vez cerrada, no deberá poder acceder a contenido protegido utilizando la sesión anterior.

---

## RF-05 — Usuario desactivado

Un usuario marcado como inactivo no deberá poder iniciar sesión.

---

# 4. Administración de usuarios

Las funcionalidades de esta sección estarán disponibles únicamente para `ADMIN`.

## RF-06 — Listar usuarios

El administrador deberá poder consultar los usuarios registrados.

Como mínimo deberá poder visualizar:

* Nombre.
* Apellido.
* DNI.
* Rol.
* Estado.

---

## RF-07 — Crear usuario

El administrador deberá poder crear un usuario indicando como mínimo:

* Nombre.
* Apellido.
* DNI.
* Rol.

El DNI deberá ser único dentro del sistema.

El sistema deberá establecer una contraseña temporal para el primer acceso.

El usuario creado deberá quedar marcado para realizar el cambio obligatorio de contraseña.

No existirá registro público.

---

## RF-08 — Editar usuario

El administrador deberá poder modificar la información editable de un usuario.

No deberá permitirse modificar información de forma que se violen restricciones de integridad, como duplicar un DNI.

---

## RF-09 — Activar o desactivar usuario

El administrador deberá poder cambiar el estado de un usuario.

La desactivación deberá conservar el registro.

No deberá eliminarse físicamente un usuario únicamente por dejar de utilizar el sistema.

---

## RF-10 — Restablecer contraseña

El administrador deberá disponer de un mecanismo para restablecer el acceso de un usuario.

El restablecimiento deberá generar o establecer una nueva contraseña temporal y marcar nuevamente el acceso como primer ingreso.

El administrador no deberá conocer ni poder consultar la contraseña definitiva del usuario.

---

# 5. Empresas

## RF-11 — Consultar empresas

Los usuarios autenticados deberán poder consultar las empresas activas necesarias para completar documentos.

---

## RF-12 — Administrar empresas

Un `ADMIN` deberá poder:

* Crear empresas.
* Editar empresas.
* Activarlas.
* Desactivarlas.
* Consultarlas.

Una empresa desactivada no deberá aparecer como opción normal al generar nuevos documentos.

---

# 6. Convenios

## RF-13 — Consultar convenios

Los usuarios autenticados deberán poder consultar los convenios activos disponibles.

---

## RF-14 — Administrar convenios

Un `ADMIN` deberá poder:

* Crear convenios.
* Editar convenios.
* Activarlos.
* Desactivarlos.
* Consultarlos.

Cada convenio deberá disponer como mínimo de:

* Descripción.
* Código, cuando corresponda.
* Estado.

---

# 7. Plantillas

## RF-15 — Consultar tipos de documentos

Los usuarios autenticados deberán poder consultar los tipos de documentos activos disponibles para generar.

Inicialmente deberá existir:

* Permiso Gremial.

La interfaz no deberá asumir que este será siempre el único tipo disponible.

---

## RF-16 — Administrar plantillas

Los usuarios autenticados podrán consultar los tipos de documentos activos. Un `ADMIN` podrá crear, consultar, editar, activar y desactivar plantillas. Los registros iniciales podrán provisionarse mediante seed, migración o configuración del backend.

Crear una plantilla no habilita automáticamente la generación de un nuevo tipo de documento: los formularios y generadores de tipos nuevos requieren soporte de desarrollo mientras no exista un sistema de campos dinámicos.

---

# 8. Variantes de plantilla

## RF-17 — Consultar variantes

Al seleccionar un tipo de documento, el usuario deberá poder consultar sus variantes activas.

Ejemplo:

**Permiso Gremial**

* Firma A.
* Firma B.
* Firma C.

Cada variante estará asociada a un archivo PDF determinado.

---

## RF-18 — Administrar variantes

Los usuarios autenticados podrán consultar las variantes activas pertenecientes a una plantilla. Un `ADMIN` podrá crear, consultar, editar, activar y desactivar variantes. Inicialmente existe una única variante: `Permiso Gremial / Bruna`.

Cada variante deberá pertenecer a una plantilla.

Al crear una variante, ADMIN deberá poder subir el PDF asociado. También podrá reemplazar posteriormente ese archivo.

Los PDFs no se almacenarán en PostgreSQL. La variante conservará una referencia `fileKey`, gestionada mediante `TemplateFileStorage`.

Los uploads deberán validar que el archivo sea un PDF válido, aplicar un límite de tamaño y generar nombres y rutas seguras.

La firma incluida en una variante forma parte del PDF y no constituye una entidad independiente.

---

# 9. Generación de documentos

## RF-19 — Iniciar nuevo documento

Un usuario autenticado deberá poder iniciar el proceso de generación desde la pantalla principal.

---

## RF-20 — Seleccionar tipo de documento

El usuario deberá seleccionar el documento que desea generar.

El sistema deberá mostrar únicamente tipos de documentos disponibles para su utilización.

---

## RF-21 — Seleccionar variante

Cuando el documento disponga de variantes, el usuario deberá seleccionar cuál desea utilizar.

El sistema deberá mostrar únicamente variantes pertenecientes al tipo de documento seleccionado y que se encuentren activas.

---

# 10. Permiso Gremial

## RF-22 — Formulario

Para generar un Permiso Gremial deberán estar disponibles los siguientes datos:

* Provincia.
* Fecha.
* Empresa.
* Delegado.
* DNI.
* Convenio.
* Variante.

`Provincia` queda pendiente de confirmación funcional: el PDF parece utilizar una localidad o lugar. No se fija todavía una interpretación distinta.

---

## RF-23 — Reutilización de datos

El sistema deberá evitar solicitar manualmente información que ya posee.

Cuando corresponda:

* El delegado deberá obtenerse del usuario autenticado.
* El DNI deberá obtenerse del usuario autenticado.
* Empresa deberá seleccionarse entre empresas registradas.
* Convenio deberá seleccionarse entre convenios registrados.
* Variante deberá seleccionarse entre las variantes correspondientes a Permiso Gremial.

---

## RF-24 — Validación del formulario

Antes de generar el documento, el sistema deberá comprobar que los datos obligatorios sean válidos.

No deberá solicitarse la generación al backend cuando el formulario contenga errores conocidos por el frontend.

El backend deberá realizar sus propias validaciones independientemente de las realizadas en el frontend.

---

# 11. Generación del PDF

## RF-25 — Completar plantilla

El sistema deberá utilizar el archivo PDF correspondiente a la variante seleccionada.

Los campos correspondientes deberán completarse utilizando la información del formulario.

El PDF base no deberá modificarse permanentemente.

Cada solicitud deberá producir un nuevo documento.

---

## RF-26 — Integridad de la plantilla

La generación deberá conservar:

* Diseño original.
* Textos existentes.
* Firma incluida.
* Proporciones.
* Formato del documento.

Solo deberán modificarse los campos destinados a recibir información dinámica.

---

## RF-27 — Errores de generación

Si no es posible generar el PDF:

* El usuario deberá recibir un mensaje comprensible.
* La aplicación no deberá mostrar errores técnicos internos.
* Los datos ingresados en el formulario deberán conservarse siempre que sea razonablemente posible.
* El usuario deberá poder volver a intentar la operación.

---

# 12. Vista previa

## RF-28 — Previsualizar PDF

Antes de finalizar el flujo, el usuario deberá poder visualizar el resultado generado.

La vista previa deberá corresponder al archivo que posteriormente podrá descargarse o imprimirse.

---

## RF-29 — Corregir información

Desde la vista previa, el usuario deberá poder regresar al formulario.

Los datos previamente cargados deberán conservarse.

Después de realizar modificaciones podrá generarse nuevamente la vista previa.

---

# 13. Descarga e impresión

## RF-30 — Descargar PDF

El usuario deberá poder descargar el archivo generado en formato PDF.

El archivo deberá ser válido y abrirse correctamente en lectores de PDF habituales.

---

## RF-31 — Imprimir PDF

El usuario deberá poder utilizar el documento generado para imprimirlo mediante las capacidades disponibles en el dispositivo o navegador.

No será necesario desarrollar un sistema de impresión propio.

---

# 14. Home

## RF-32 — Pantalla principal

Después de autenticarse correctamente, el usuario deberá acceder a una pantalla principal.

La acción de mayor importancia deberá ser:

**Nuevo documento**

Las opciones disponibles deberán adaptarse al rol del usuario.

---

## RF-33 — Acceso administrativo

Los usuarios `ADMIN` deberán disponer de acceso a las funcionalidades administrativas.

Los usuarios `DELEGADO` no deberán poder utilizar dichas funcionalidades.

---

# 15. Perfil

## RF-34 — Información del usuario

El usuario deberá poder consultar como mínimo su información básica.

---

## RF-35 — Seguridad de cuenta

El usuario deberá disponer desde su perfil o configuración de un mecanismo para modificar su contraseña.

---

# 16. Navegación y estado

## RF-36 — Rutas protegidas

Las pantallas que requieran autenticación no deberán estar disponibles para usuarios sin una sesión válida.

---

## RF-37 — Control de permisos

Las funcionalidades exclusivas de `ADMIN` deberán estar protegidas independientemente de que un usuario intente acceder mediante la interfaz o directamente mediante la API.

---

## RF-38 — Sesión inválida o expirada

Cuando una sesión deje de ser válida:

* El usuario deberá ser informado de forma apropiada.
* No deberán seguir ejecutándose operaciones protegidas.
* El sistema deberá permitir volver a autenticarse.

---

# 17. Estados de interfaz

## RF-39 — Estado de carga

Las operaciones que requieran espera deberán comunicar visualmente que se encuentran en progreso.

Se evitará permitir múltiples envíos accidentales de la misma operación.

---

## RF-40 — Errores

Los errores deberán comunicarse utilizando mensajes comprensibles para una persona no técnica.

No deberán exponerse:

* Stack traces.
* Consultas SQL.
* Excepciones internas.
* Información sensible.
* Detalles innecesarios de infraestructura.

---

## RF-41 — Estados vacíos

Las pantallas de listados deberán contemplar correctamente situaciones en las que todavía no existan registros.

Ejemplo:

> Todavía no hay empresas registradas.

Cuando corresponda, deberá indicarse cuál es la acción disponible para continuar.

---

## RF-42 — Confirmaciones

Las operaciones que puedan afectar el acceso o disponibilidad de información deberán solicitar confirmación cuando sea apropiado.

Por ejemplo:

* Desactivar un usuario.
* Desactivar una empresa.

---

# 18. Requisitos no funcionales

## RNF-01 — Mobile First

La aplicación deberá diseñarse principalmente para teléfonos celulares.

Como referencia inicial, la interfaz deberá funcionar correctamente en anchos cercanos a **390 px**.

También deberá adaptarse correctamente a tablet y escritorio.

---

## RNF-02 — Responsive Design

La interfaz no deberá depender de un tamaño de pantalla específico.

Deberá adaptarse sin pérdida de funcionalidad a:

* Celulares.
* Tablets.
* Notebooks.
* Monitores de escritorio.

---

## RNF-03 — Usabilidad

Las acciones frecuentes deberán requerir la menor cantidad razonable de pasos.

Se deberá priorizar:

* Controles táctiles cómodos.
* Textos legibles.
* Formularios claros.
* Navegación consistente.
* Acciones principales fácilmente identificables.

---

## RNF-04 — Accesibilidad

La interfaz deberá contemplar como mínimo:

* Contraste suficiente.
* Labels asociados correctamente a los campos.
* Navegación mediante teclado cuando corresponda.
* Estados de foco visibles.
* Mensajes de error asociados al campo correspondiente.
* Elementos interactivos con semántica apropiada.

---

## RNF-05 — Seguridad

El sistema deberá aplicar buenas prácticas de seguridad para:

* Contraseñas.
* Autenticación.
* Autorización.
* Validación de entrada.
* Gestión de sesiones.
* Configuración de secretos.
* Acceso a recursos protegidos.

La seguridad no deberá depender exclusivamente del frontend.

---

## RNF-06 — Contraseñas

Las contraseñas nunca deberán almacenarse ni registrarse en texto plano.

Tampoco deberán aparecer en logs.

---

## RNF-07 — Persistencia

Los datos persistentes del sistema deberán almacenarse de manera consistente.

Las modificaciones del esquema deberán ser reproducibles entre entornos.

---

## RNF-08 — Integridad de datos

El sistema deberá impedir estados inválidos conocidos, incluyendo como mínimo:

* Usuarios con DNI duplicado.
* Variantes sin plantilla asociada.
* Acceso a registros inexistentes.
* Uso normal de registros desactivados cuando no corresponda.

---

## RNF-09 — Mantenibilidad

La aplicación deberá estructurarse de forma modular.

La incorporación futura de nuevos documentos no deberá requerir duplicar o reescribir innecesariamente el flujo completo existente.

---

## RNF-10 — Observabilidad básica

Los errores relevantes del backend deberán poder diagnosticarse mediante logs apropiados.

Los logs no deberán contener contraseñas, credenciales ni otra información sensible innecesaria.

---

## RNF-11 — Compatibilidad

La aplicación deberá funcionar correctamente en versiones modernas de los principales navegadores utilizados en dispositivos móviles y de escritorio.

Se priorizarán:

* Chrome.
* Edge.
* Safari.
* Firefox.

---

## RNF-12 — Rendimiento percibido

Las operaciones habituales deberán ofrecer feedback inmediato al usuario.

Cuando una operación tarde más tiempo —por ejemplo, la generación de un PDF— deberá mostrarse un estado de carga.

---

# 19. Datos iniciales

Para poder utilizar el sistema por primera vez deberá existir un mecanismo controlado para disponer de al menos un usuario `ADMIN`.

Este mecanismo no deberá implicar habilitar registro público.

La estrategia técnica concreta para crear el administrador inicial será definida en `06_ARCHITECTURE.md`.

---

# 20. Funcionalidades explícitamente excluidas

No deberán implementarse como parte del MVP:

* SMTP.
* Envío automático de correos.
* Google Drive.
* Almacenamiento cloud de documentos.
* Historial persistente de PDFs.
* Borradores persistentes.
* WhatsApp.
* Estadísticas.
* Notificaciones.
* Firma digital.
* Aplicaciones móviles nativas.
* Registro público.
* Recuperación automática de contraseña mediante correo electrónico.
* Numeración oficial.

Estas funcionalidades requieren una ampliación explícita del alcance antes de desarrollarse.

---

# 21. Reglas para futuras ampliaciones

La existencia de una posible funcionalidad futura **no implica que deba implementarse anticipadamente**.

El MVP deberá mantener puntos de extensión razonables cuando resulte útil, pero se evitarán:

* Abstracciones sin uso actual.
* Infraestructura innecesaria.
* Dependencias destinadas exclusivamente a funcionalidades futuras.
* Implementaciones parciales de funcionalidades fuera del alcance.

---

# 22. Criterios de aceptación generales

Una funcionalidad podrá considerarse terminada cuando:

1. Cumpla los requisitos correspondientes de este documento.
2. Respete los permisos definidos.
3. Valide correctamente sus entradas.
4. Maneje los errores esperables.
5. Funcione correctamente en dispositivos móviles.
6. No introduzca regresiones conocidas.
7. Su comportamiento principal pueda verificarse mediante pruebas apropiadas.
8. No exponga información sensible.
9. Sea consistente con `01_CONTEXT.md`.
10. No incorpore funcionalidades fuera del alcance sin aprobación previa.

---

# 23. Prioridad del MVP

Ante una decisión entre agregar complejidad o simplificar el flujo principal, deberá priorizarse el correcto funcionamiento de:

**Login → Nuevo documento → Formulario → Vista previa → PDF → Descargar / Imprimir**

Este flujo constituye la funcionalidad central de la primera versión.
