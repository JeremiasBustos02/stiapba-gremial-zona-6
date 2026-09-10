# Contexto y Alcance del Producto

## 1. Descripción general

El proyecto consiste en el desarrollo de una **aplicación web responsive para la generación de documentos PDF a partir de plantillas predefinidas**.

La aplicación estará orientada principalmente al uso desde dispositivos móviles, aunque deberá funcionar correctamente en computadoras y tablets.

El sistema permitirá que usuarios autorizados ingresen mediante sus credenciales, seleccionen el tipo de documento que desean generar, completen la información necesaria y obtengan automáticamente el PDF correspondiente listo para visualizar, descargar o imprimir.

El primer documento implementado será **Permiso Gremial**.

Sin embargo, el sistema deberá diseñarse de forma modular para permitir incorporar nuevos tipos de documentos y funcionalidades en versiones futuras sin necesidad de rehacer la aplicación.

---

## 2. Problema a resolver

Actualmente, la generación de estos documentos requiere completar información de forma manual sobre documentos o plantillas existentes.

Parte de la información utilizada es repetitiva, como:

* Datos del delegado.
* DNI.
* Empresas.
* Convenios.
* Provincia.
* Variantes de una misma plantilla.

Esto genera trabajo administrativo repetitivo y aumenta la posibilidad de cometer errores durante la carga de información.

La aplicación busca digitalizar y simplificar este proceso.

---

## 3. Objetivo principal

El objetivo del sistema es permitir que los usuarios puedan **generar documentos oficiales de forma rápida, sencilla y estandarizada**, reduciendo el tiempo dedicado a tareas administrativas y minimizando errores derivados de la carga manual de información.

La plataforma deberá centralizar los datos necesarios para generar los documentos y reutilizar información previamente registrada siempre que sea posible.

---

## 4. Objetivos específicos

El sistema deberá permitir:

* Gestionar usuarios autorizados.
* Autenticar usuarios mediante DNI y contraseña.
* Diferenciar permisos según el rol del usuario.
* Administrar información reutilizable.
* Gestionar empresas.
* Gestionar convenios.
* Consultar tipos de documentos.
* Consultar variantes de una misma plantilla.
* Completar documentos mediante formularios digitales.
* Generar archivos PDF utilizando plantillas existentes.
* Visualizar el documento antes de finalizar el proceso.
* Descargar los documentos generados.
* Imprimir los documentos generados.
* Utilizar cómodamente la aplicación desde dispositivos móviles.

---

# 5. Usuarios del sistema

El sistema contará inicialmente con dos roles.

## 5.1. Delegado

Representa al usuario habitual de la aplicación.

Sus principales funciones serán:

* Iniciar sesión.
* Modificar su contraseña cuando corresponda.
* Consultar los datos necesarios para generar documentos.
* Seleccionar un tipo de documento.
* Seleccionar una variante disponible.
* Completar el formulario correspondiente.
* Visualizar el documento generado.
* Descargar el PDF.
* Imprimir el PDF.

El delegado no tendrá permisos para administrar información general del sistema.

---

## 5.2. Administrador

El administrador tendrá acceso a las funcionalidades habituales de generación de documentos y, adicionalmente, podrá administrar la información utilizada por la plataforma.

Podrá:

* Crear usuarios.
* Consultar usuarios.
* Modificar información permitida de usuarios.
* Activar o desactivar usuarios.
* Restablecer credenciales cuando corresponda.
* Administrar empresas.
* Administrar convenios.
* Administrar tipos de documentos.
* Administrar variantes de las plantillas y sus archivos PDF.

No existirá registro público de usuarios.

Las cuentas serán creadas por un administrador.

---

# 6. Autenticación

El acceso al sistema se realizará mediante:

* DNI.
* Contraseña.

Cada persona deberá disponer de una cuenta individual.

Cuando un administrador cree un nuevo usuario, este recibirá una contraseña temporal.

En el primer inicio de sesión, el sistema deberá solicitar obligatoriamente la definición de una nueva contraseña antes de permitir continuar utilizando la aplicación.

Los usuarios desactivados no podrán iniciar sesión.

---

# 7. Funcionamiento general

El flujo principal será:

**Inicio de sesión**

→ **Home**

→ **Nuevo documento**

→ **Selección del tipo de documento**

→ **Selección de variante**

→ **Formulario**

→ **Vista previa**

→ **Generación del PDF**

→ **Descargar / Imprimir**

El objetivo es mantener este proceso corto y simple, especialmente considerando que la aplicación será utilizada principalmente desde teléfonos celulares.

---

# 8. Pantalla principal

Después de autenticarse, el usuario accederá al Home.

Desde allí podrá acceder rápidamente a las principales funcionalidades disponibles según su rol.

Para un delegado, la acción principal será:

**Nuevo documento**

También podrá acceder a su información personal y otras funciones habilitadas para su rol.

Los administradores tendrán además acceso a las funciones administrativas.

La interfaz deberá priorizar las acciones frecuentes y evitar elementos innecesarios.

---

# 9. Sistema de documentos

La aplicación no deberá estar diseñada exclusivamente alrededor de Permiso Gremial.

El concepto principal será el de **tipo de documento o plantilla**.

Por ejemplo, en el futuro podrían existir:

* Permiso Gremial.
* Actas.
* Notificaciones.
* Solicitudes.
* Otros documentos administrativos.

Cada tipo de documento podrá requerir información diferente.

La arquitectura permite configurar campos logicos reutilizables por variante mediante `FieldDefinition` y `TemplateField`, con modos `ACROFORM`, `POSITIONED` e hibrido. Un tipo de documento nuevo puede seguir requiriendo soporte de desarrollo para su formulario y generador especificos.

---

# 10. Variantes de plantillas

Un mismo tipo de documento podrá disponer de distintas variantes.

Por ejemplo:

**Permiso Gremial**

* Variante con firma A.
* Variante con firma B.
* Variante con firma C.

Cada variante corresponde a un **archivo PDF diferente**.

La firma ya se encuentra incorporada dentro del archivo PDF correspondiente.

Por lo tanto, la firma **no será tratada como una entidad independiente del sistema**.

El usuario simplemente seleccionará la variante que desea utilizar.

---

# 11. Primer documento: Permiso Gremial

La primera versión del sistema implementará la generación del documento **Permiso Gremial**.

Los datos necesarios serán:

* Provincia.
* Fecha de emisión.
* Día o días de permiso gremial, pendiente de confirmación funcional sobre si puede abarcar uno o varios días.
* Empresa.
* Nombre del delegado.
* DNI del delegado.
* Convenio.
* Variante del documento.

Siempre que sea posible, el sistema deberá reutilizar información existente.

Por ejemplo:

* El delegado y su DNI se obtendrán del usuario `DELEGADO` activo seleccionado.
* El usuario autenticado es quien genera el documento y puede ser distinto del delegado seleccionado.
* Las provincias estarán disponibles mediante un catálogo controlado por backend.
* Las empresas estarán previamente registradas.
* Los convenios estarán previamente registrados.
* Las variantes disponibles pertenecerán al tipo de documento seleccionado.

Esto permitirá reducir la escritura manual de información.

---

# 12. Generación del PDF

El sistema utilizará archivos PDF existentes como plantillas.

Cuando el usuario complete el formulario, la aplicación deberá utilizar los datos ingresados o seleccionados para completar los campos correspondientes del PDF.

El archivo original deberá mantenerse sin modificaciones.

Cada generación deberá producir un nuevo documento.

El usuario podrá revisar el resultado antes de finalizar el proceso.

---

# 13. Vista previa

Antes de descargar o imprimir el documento, el usuario deberá poder visualizar el PDF generado.

La vista previa permitirá comprobar que:

* Los datos sean correctos.
* Se haya seleccionado la empresa correcta.
* El convenio sea correcto.
* La variante sea la deseada.
* El contenido generado sea el esperado.

Si existe un error, el usuario deberá poder regresar al formulario, modificar la información y volver a generar la vista previa.

---

# 14. Alcance del MVP

La primera versión funcional incluirá:

### Autenticación

* Login mediante DNI y contraseña.
* Usuarios individuales.
* Roles ADMIN y DELEGADO.
* Cambio obligatorio de contraseña en el primer ingreso.
* Activación y desactivación de usuarios.

### Administración

* Gestión de usuarios.
* Gestión de empresas.
* Gestión de convenios.
* Gestión de plantillas.
* Gestión de variantes.

### Documentos

* Selección del tipo de documento.
* Selección de variante.
* Formulario de Permiso Gremial.
* Generación automática del PDF.
* Vista previa.
* Descarga.
* Impresión.

### Interfaz

* Diseño Mobile First.
* Uso desde celular, tablet y computadora.
* Navegación adaptada según el dispositivo.
* Formularios optimizados para reducir la carga manual.

---

# 15. Fuera del alcance del MVP

Las siguientes funcionalidades **no forman parte de la primera versión**:

* Envío automático de documentos por correo electrónico.
* Integración SMTP.
* Integración con Google Drive.
* Almacenamiento de PDFs en la nube.
* Historial persistente de documentos generados.
* Borradores persistentes en el backend o historial de documentos. El formulario actual solo tiene recuperacion local limitada; ver `DECISIONS.md`.
* Envío mediante WhatsApp.
* Notificaciones.
* Estadísticas.
* Firma digital.
* Aplicación móvil nativa para Android o iOS.

Estas funcionalidades podrán evaluarse para versiones posteriores.

Su exclusión del MVP tiene como objetivo mantener la primera versión simple, estable y enfocada en resolver correctamente el proceso principal de generación de documentos.

---

# 16. Consideraciones de experiencia de usuario

La aplicación será utilizada principalmente desde teléfonos celulares.

Por este motivo deberá seguir un enfoque **Mobile First**.

La experiencia deberá priorizar:

* Pocos pasos.
* Botones y controles cómodos para pantallas táctiles.
* Formularios simples.
* Buena legibilidad.
* Navegación clara.
* Información reutilizable.
* Feedback visual después de cada acción importante.
* Mensajes de error comprensibles.
* Estados de carga visibles.
* Confirmación de acciones relevantes.

El usuario no debería tener que escribir información que el sistema ya conoce.

---

# 17. Consideraciones de seguridad

Al tratarse de un sistema con usuarios autenticados:

* Las contraseñas nunca deberán almacenarse en texto plano.
* Cada usuario deberá tener credenciales individuales.
* Los permisos deberán verificarse según el rol.
* Los endpoints protegidos no deberán depender únicamente de restricciones del frontend.
* Los usuarios desactivados no deberán poder acceder al sistema.
* Las credenciales y secretos de infraestructura nunca deberán almacenarse directamente en el código fuente.
* La información recibida desde el cliente deberá validarse en el backend.

Los detalles técnicos de implementación serán definidos en la documentación de arquitectura y seguridad correspondiente.

---

# 18. Escalabilidad

Aunque el MVP será pequeño, la estructura del sistema deberá permitir crecer progresivamente.

La incorporación de una nueva funcionalidad no debería requerir modificar innecesariamente funcionalidades existentes.

Especialmente, el sistema deberá estar preparado para incorporar:

### Nuevos documentos

Cada nuevo tipo de documento podrá definir:

* Su plantilla.
* Sus variantes.
* Los datos necesarios.
* Su lógica de generación.

### Historial documental

En una versión futura podrán almacenarse registros de cada documento generado para permitir búsqueda, consulta y seguimiento.

### Correo electrónico

Los PDFs podrán enviarse directamente desde la plataforma.

### Almacenamiento en la nube

Los documentos podrán almacenarse automáticamente mediante servicios como Google Drive u otro proveedor.

### Nuevas integraciones

La arquitectura podrá evolucionar para incorporar servicios externos sin modificar el funcionamiento básico de generación de documentos.

---

# 19. Visión futura

El proyecto comenzará como una herramienta enfocada en resolver correctamente una necesidad concreta: **generar documentos PDF de forma rápida a partir de información previamente registrada**.

Sin embargo, el diseño del sistema deberá evitar limitar el producto exclusivamente a esta función.

La evolución esperada puede transformar progresivamente la aplicación en una **plataforma de gestión documental**, incorporando almacenamiento, historial, correo electrónico, automatizaciones y nuevos tipos de documentos.

Estas posibilidades deberán contemplarse a nivel arquitectónico, pero **no deberán implementarse anticipadamente en el MVP si todavía no son necesarias**.

---

# 20. Criterios generales de éxito del MVP

El MVP podrá considerarse satisfactorio cuando:

1. Un administrador pueda crear y administrar usuarios.
2. Un usuario pueda iniciar sesión de forma segura.
3. Un usuario nuevo deba cambiar su contraseña en el primer acceso.
4. Un administrador pueda mantener empresas, convenios, plantillas y variantes.
5. Un delegado pueda seleccionar Permiso Gremial y una de sus variantes.
6. El formulario reutilice correctamente los datos disponibles en el sistema.
7. El sistema pueda completar correctamente la plantilla PDF.
8. El usuario pueda revisar el documento antes de finalizar.
9. El PDF pueda descargarse e imprimirse correctamente.
10. Todo el flujo principal pueda utilizarse cómodamente desde un teléfono celular.
11. Los permisos de ADMIN y DELEGADO se respeten correctamente.
12. La estructura permita incorporar nuevos tipos de documentos posteriormente sin rehacer el sistema existente.

---

# 21. Principio rector

El MVP debe resolver **muy bien una necesidad pequeña antes de intentar resolver muchas necesidades al mismo tiempo**.

Por este motivo, la prioridad inicial será:

> **Autenticarse → completar información → generar correctamente el documento → verificarlo → descargarlo o imprimirlo.**

Las funcionalidades adicionales se incorporarán posteriormente cuando exista una necesidad real que justifique su desarrollo.
