# Reglas de Interfaz y Experiencia de Usuario

## 1. Propósito

Este documento define las reglas de UX/UI del MVP del Sistema de Gestión Documental.

Su objetivo es establecer:

* Navegación.
* Jerarquía visual.
* Comportamiento responsive.
* Estructura de pantallas.
* Patrones de formularios.
* Estados de carga, error y vacío.
* Reglas específicas para mobile.
* Comportamiento del panel de administración.
* Restricciones visuales para la implementación.

Este documento debe utilizarse junto con los wireframes aprobados.

Los wireframes constituyen la referencia visual principal. Este documento explica cómo deben comportarse las pantallas y qué decisiones no deben reinterpretarse durante el desarrollo.

---

# 2. Principios generales

La aplicación deberá seguir estos principios:

1. Mobile First.
2. Una acción principal por pantalla.
3. Pocos pasos para completar tareas frecuentes.
4. Botones cómodos para uso táctil.
5. Formularios claros.
6. Reutilización de información existente.
7. Feedback inmediato.
8. Navegación consistente.
9. Diseño sobrio y profesional.
10. Evitar sobrecargar la interfaz.

---

# 3. Dispositivo principal

La aplicación será utilizada principalmente desde teléfonos celulares.

El diseño de referencia inicial será:

```text
390 px
```

Luego deberá adaptarse a:

```text
768 px
1440 px
```

La versión mobile no debe ser una versión reducida de desktop.

Debe diseñarse específicamente para uso táctil.

---

# 4. Navegación mobile

En mobile podrá utilizarse una barra de navegación inferior si así aparece en los wireframes.

Opciones recomendadas:

```text
Inicio
Nuevo
Perfil
```

Para usuarios ADMIN podrá agregarse:

```text
Administración
```

siempre que no sobrecargue la navegación principal.

La acción más importante es:

```text
Nuevo documento
```

Debe ser fácil de encontrar.

---

# 5. Navegación desktop

En escritorio podrá utilizarse:

* Sidebar.
* Header.
* Navegación lateral.

La estructura deberá conservar la misma jerarquía funcional que mobile.

No deberá agregarse complejidad innecesaria por disponer de más espacio.

---

# 6. Pantalla de Login

## Objetivo

Permitir acceso rápido y claro al sistema.

## Elementos

* Logo o identidad visual.
* Campo DNI.
* Campo contraseña.
* Botón Ingresar.
* Estado de carga.
* Mensaje de error.

## Reglas

* DNI deberá utilizar teclado numérico cuando el navegador lo permita.
* Contraseña deberá permitir mostrar/ocultar valor.
* El botón deberá indicar estado de carga.
* No se mostrarán mensajes técnicos.

Ejemplo:

```text
No pudimos iniciar sesión.
Verificá tus datos e intentá nuevamente.
```

---

# 7. Primer ingreso

Cuando el usuario tenga `firstLogin = true`:

* No deberá ingresar al Home.
* Se mostrará directamente el cambio de contraseña.
* La pantalla deberá explicar brevemente por qué debe hacerlo.

Ejemplo:

> Por seguridad, antes de continuar necesitás crear una nueva contraseña.

Campos:

* Nueva contraseña.
* Repetir contraseña.

Acción principal:

```text
Guardar contraseña
```

---

# 8. Home

El Home deberá ser simple.

No deberá utilizar:

* Gráficos.
* Métricas complejas.
* Dashboards innecesarios.
* Tablas.

## Delegado

Acciones principales:

```text
Nuevo documento
Mi perfil
```

Podrán incluirse accesos secundarios según el diseño aprobado.

## Administrador

Además:

```text
Administración
```

---

# 9. Tarjetas del Home

Las tarjetas deberán:

* Ser grandes.
* Tener buena separación.
* Utilizar títulos claros.
* Poder tocarse fácilmente.
* Evitar texto excesivo.

Ejemplo:

```text
Nuevo documento
Generar un nuevo PDF.
```

---

# 10. Selección de documento

Cuando el usuario elija **Nuevo documento**, deberá acceder a una pantalla de selección.

Los tipos disponibles podrán mostrarse mediante tarjetas.

Ejemplo:

```text
Permiso Gremial
```

Aunque inicialmente exista uno solo, la interfaz deberá permitir agregar nuevos tipos en el futuro.

No debe diseñarse como si Permiso Gremial fuera permanentemente el único documento.

---

# 11. Selección de variante

Después de seleccionar una plantilla, el usuario elegirá la variante.

Ejemplo:

```text
Firma A
Firma B
Firma C
```

La interfaz deberá explicar claramente que se está eligiendo una versión del documento.

No deberá presentar el concepto técnico `TemplateVariant`.

En UI deberá utilizarse una etiqueta comprensible.

Ejemplo:

```text
Versión del documento
```

o

```text
Firma
```

según los wireframes.

---

# 12. Formulario Permiso Gremial

El formulario deberá mostrar:

* Provincia.
* Fecha de emisión.
* Día de permiso gremial.
* Empresa.
* Delegado.
* Convenio.
* Variante seleccionada.

---

# 13. Datos automáticos

El delegado deberá seleccionarse entre usuarios activos con rol `DELEGADO`. Su DNI deberá obtenerse automáticamente desde ese usuario y no será editable.

El usuario autenticado genera el documento y puede ser distinto del delegado seleccionado.

Si no pueden modificarse, no deberán parecer inputs editables.

Se recomienda mostrarlos como:

* Campos de solo lectura.
* Información resumida.
* Texto dentro de una card.

El usuario debe entender que esos datos se completan automáticamente.

---

# 14. Empresa

Empresa deberá utilizar:

* Select.
* Combobox.
* Búsqueda.

La elección dependerá de la cantidad de registros.

Si existen muchas empresas, deberá ser posible buscarlas escribiendo parte del nombre.

---

# 15. Convenio

Convenio deberá seguir un patrón similar.

Debe poder mostrar:

* Código.
* Descripción.

Ejemplo:

```text
CCT-001 — Convenio ejemplo
```

---

# 16. Fecha de emisión

La fecha de emisión deberá utilizar un control Date Picker apropiado.

En mobile se podrá aprovechar el selector nativo cuando ofrezca mejor experiencia.

No se requiere un calendario personalizado si no aporta valor.

El día de permiso gremial es distinto de la fecha de emisión y se selecciona como un único número (`permitDay`).

---

# 17. Provincia

Provincia deberá utilizar el catálogo de provincias activas; no se permite texto libre. `Mar del Plata` es texto fijo de la plantilla y no es el valor de Provincia.

---

# 18. Acción principal del formulario

La acción principal será:

```text
Generar vista previa
```

o una etiqueta equivalente aprobada.

No deberá haber múltiples botones principales compitiendo entre sí.

Acciones secundarias deberán verse claramente como secundarias.

---

# 19. Validación del formulario

Los errores deberán aparecer cerca del campo correspondiente.

Ejemplo:

```text
Seleccioná una empresa.
```

No se utilizarán mensajes genéricos cuando sea posible identificar el error.

El formulario deberá conservar los valores válidos.

---

# 20. Estado de generación

Al solicitar el PDF:

* El botón deberá deshabilitarse temporalmente.
* Se mostrará un indicador de progreso.
* No deberán permitirse envíos duplicados accidentales.

Ejemplo:

```text
Generando documento...
```

---

# 21. Vista previa del PDF

La vista previa deberá mostrar el PDF generado con el mayor tamaño razonable disponible.

En mobile:

* El usuario deberá poder desplazarse.
* La visualización deberá permitir revisar correctamente el contenido.
* No deberá sacrificarse legibilidad solo para mostrar toda la página simultáneamente.

---

# 22. Acciones de vista previa

Desde la vista previa deberán estar disponibles:

```text
Volver y editar
Descargar PDF
Imprimir
```

La acción de mayor prioridad dependerá del flujo aprobado.

No deberá generarse nuevamente el documento para descargar si ya se dispone del PDF generado.

---

# 23. Volver y editar

Si el usuario vuelve desde la vista previa:

* Los datos del formulario deberán mantenerse.
* La selección de plantilla deberá mantenerse.
* La variante deberá mantenerse.
* No deberá comenzar el proceso desde cero.

Al generar nuevamente, la vista previa anterior será reemplazada por la nueva.

---

# 24. Descarga

La descarga deberá:

* Utilizar el PDF ya generado.
* Tener un nombre de archivo comprensible.

Ejemplo:

```text
permiso-gremial.pdf
```

El nombre actual incorpora la numeración pública:

```text
pg-2026-000123_permiso-gremial_juan-perez.pdf
```

---

# 25. Impresión

La acción Imprimir podrá utilizar la funcionalidad estándar del navegador o dispositivo.

No se deberá crear una interfaz propia de configuración de impresoras.

---

# 26. Perfil

La pantalla de perfil deberá mostrar como mínimo:

* Nombre.
* Apellido.
* DNI.
* Rol.

Acciones:

```text
Cambiar contraseña
Cerrar sesión
```

---

# 27. Administración

El acceso a administración estará disponible únicamente para ADMIN.

Los módulos iniciales serán:

* Usuarios.
* Empresas.
* Convenios.
* Plantillas.
* Variantes.

DELEGADO solo verá plantillas y variantes activas. ADMIN dispondrá de las acciones administrativas correspondientes.

---

# 28. UX de Administración en mobile

En pantallas pequeñas deberán preferirse:

* Cards.
* Listas.
* Menús de acciones.

Ejemplo:

```text
Juan Pérez
DNI 40.123.456
DELEGADO
Activo

[ Acciones ]
```

No deberán forzarse tablas grandes horizontales en un teléfono.

Para ADMIN, las pantallas de Plantillas y Variantes deberán permitir crear, editar, activar y desactivar registros. La pantalla de creación de variantes deberá permitir seleccionar un PDF y la edición deberá permitir reemplazarlo.

---

# 29. UX de Administración en desktop

En escritorio podrán utilizarse tablas cuando permitan consultar información más rápidamente.

Ejemplo:

```text
Nombre | DNI | Rol | Estado | Acciones
```

El comportamiento funcional deberá mantenerse consistente con mobile.

---

# 30. Listados administrativos

Todo listado deberá contemplar:

* Loading.
* Error.
* Empty state.
* Datos cargados.

Cuando resulte útil:

* Búsqueda.
* Filtros.
* Paginación.

No deberán añadirse filtros innecesarios solo por estar disponibles técnicamente.

---

# 31. Crear usuario

Formulario:

* Nombre.
* Apellido.
* DNI.
* Rol.

Acción:

```text
Crear usuario
```

Después de crearlo correctamente, podrá mostrarse la contraseña temporal.

---

# 32. Contraseña temporal

Si se decide mostrar la contraseña temporal al ADMIN:

* Deberá aparecer claramente como información sensible.
* Se deberá explicar que se muestra una única vez.
* Deberá existir una acción para copiarla.

Ejemplo:

```text
Usuario creado correctamente

Contraseña temporal:
ABCD-1234

Esta contraseña se muestra una única vez.
```

El admin podrá compartirla manualmente con el usuario.

---

# 33. Confirmaciones administrativas

Para acciones sensibles, utilizar Dialog de confirmación.

Ejemplos:

* Desactivar usuario.
* Desactivar empresa.
* Desactivar convenio.
* Reemplazar PDF de variante.

Los uploads deberán informar errores comprensibles cuando el archivo no sea un PDF válido o supere el límite configurado.

No se deberá solicitar confirmación para acciones fácilmente reversibles o de bajo impacto sin necesidad.

---

# 34. Feedback de éxito

Las operaciones exitosas deberán comunicar resultado.

Ejemplos:

```text
Usuario creado correctamente.
Empresa actualizada.
Contraseña restablecida.
```

Podrá utilizarse Toast cuando sea apropiado.

---

# 35. Errores generales

Se deberá evitar:

```text
Error 500
NullPointerException
Request failed
```

Se deberán utilizar mensajes orientados al usuario.

Ejemplo:

```text
No pudimos guardar los cambios.
Intentá nuevamente.
```

---

# 36. Empty states

Ejemplo para empresas:

```text
Todavía no hay empresas registradas.

[ Agregar empresa ]
```

Para un delegado:

```text
No hay empresas disponibles.
Contactá a un administrador.
```

El empty state deberá adaptarse a lo que el usuario puede hacer.

---

# 37. Loading states

Para operaciones rápidas:

* Spinner pequeño.
* Botón en estado loading.

Para listados o contenido más grande:

* Skeleton.

No deberán utilizarse skeletons indiscriminadamente.

---

# 38. Navegación hacia atrás

En flujos multipaso deberá existir un comportamiento predecible.

Ejemplo:

```text
Nuevo documento
    ↓
Permiso Gremial
    ↓
Variante
    ↓
Formulario
```

Volver atrás no deberá borrar decisiones anteriores salvo que el usuario cambie un dato que invalide los siguientes.

---

# 39. Jerarquía de acciones

Se utilizarán:

## Acción primaria

Una por pantalla.

Ejemplo:

```text
Generar vista previa
```

## Acción secundaria

Ejemplo:

```text
Volver
Cancelar
```

## Acción destructiva

Ejemplo:

```text
Desactivar usuario
```

La acción destructiva deberá diferenciarse visualmente.

---

# 40. Botones

Los botones deberán:

* Tener un área táctil cómoda.
* Utilizar textos claros.
* Evitar etiquetas ambiguas como `OK`.
* Mostrar loading cuando corresponda.

Ejemplos correctos:

```text
Crear usuario
Generar vista previa
Descargar PDF
Guardar cambios
```

---

# 41. Inputs

Todos los campos deberán tener:

* Label visible.
* Estado de error.
* Estado disabled cuando corresponda.
* Placeholder solo como ayuda, no como sustituto del label.

---

# 42. Diseño visual

La aplicación deberá utilizar una estética:

* Moderna.
* Corporativa.
* Sobria.
* Limpia.
* Profesional.

No deberá parecer una landing page comercial.

Es una herramienta de trabajo.

---

# 43. Paleta

Se recomienda:

* Fondos claros.
* Grises neutros.
* Un color primario institucional.
* Colores semánticos para éxito, advertencia y error.

Los valores definitivos podrán tomarse de los wireframes aprobados.

Codex no deberá inventar una paleta completamente distinta si ya existe una referencia visual.

---

# 44. Tipografía

Deberá utilizarse una tipografía sans-serif altamente legible.

La jerarquía será clara:

```text
Título de página
Subtítulo
Título de sección
Texto
Label
Texto auxiliar
```

No deberán existir demasiados tamaños diferentes.

---

# 45. Espaciado

Se deberá utilizar un sistema consistente de espaciado.

Se recomienda seguir una escala basada en múltiplos de 4 u 8.

No deberán existir márgenes arbitrarios diferentes para elementos equivalentes.

---

# 46. Bordes y sombras

Se utilizarán:

* Bordes suaves.
* Radios consistentes.
* Sombras discretas.

No se utilizarán efectos visuales intensos que reduzcan la claridad de la interfaz.

---

# 47. Iconografía

Los iconos deberán:

* Ser consistentes.
* Tener significado claro.
* Acompañar texto cuando la acción pueda ser ambigua.

No utilizar iconos decorativos innecesariamente.

---

# 48. Responsive

## Mobile

```text
~390px
```

Prioridad máxima.

## Tablet

```text
~768px
```

Podrán ampliarse layouts sin cambiar el flujo.

## Desktop

```text
~1440px
```

Podrán utilizarse:

* Sidebar.
* Tablas.
* Layouts de dos columnas.

Sin modificar la funcionalidad principal.

---

# 49. Accesibilidad

Como mínimo:

* Contraste legible.
* Navegación con teclado.
* Focus visible.
* Labels.
* Semántica HTML.
* Componentes accesibles.
* Mensajes de error asociados.
* Botones correctamente identificados.

---

# 50. Componentes de interfaz

Se utilizaran componentes React y estilos Tailwind cuando resulten apropiados. Se priorizaran componentes semanticos y reutilizables antes que incorporar otra libreria de UI.

Patrones habituales:

```text
Card
Input
Select
Dialog
Sheet
Badge
DropdownMenu
Table
Form
Toast/Sonner
```

La eleccion dependera del patron de UX y de la accesibilidad requerida.

---

# 51. Componentes reutilizables

Deberán reutilizarse patrones repetidos.

Ejemplos:

```text
PageHeader
EmptyState
LoadingState
ErrorState
ConfirmDialog
StatusBadge
FormField
AdminListItem
```

No deberán crearse componentes excesivamente genéricos antes de detectar repetición real.

---

# 52. Estados de una pantalla

Toda pantalla que consuma backend deberá contemplar como mínimo cuando corresponda:

```text
loading
success
empty
error
```

No se implementará únicamente el estado ideal.

---

# 53. Diseño basado en wireframes

Los wireframes serán tratados como referencia visual primaria.

Durante implementación:

1. Revisar wireframe correspondiente.
2. Implementar estructura.
3. Comparar resultado renderizado.
4. Corregir diferencias importantes.
5. Verificar mobile y desktop.

No deberán realizarse rediseños grandes sin aprobación.

---

# 54. Historial documental

La ruta `/historial` deberá ofrecer:

* Tabla en desktop.
* Cards en mobile.
* Paginación.
* Descarga mediante regeneración en memoria.
* Acción `Enviar por mail` desde cada registro.

El diálogo de email deberá permitir ingresar un destinatario, mostrar estados de carga y error, y confirmar el envío sin presentar una auditoría inexistente.

---

# 56. Lo que Codex NO debe hacer

Durante la implementación visual no deberá:

* Cambiar el flujo aprobado.
* Agregar dashboards.
* Agregar estadísticas.
* Inventar funcionalidades.
* Incorporar Google Drive.
* Incorporar historial de emails.
* Incorporar funcionalidades fuera del alcance aprobado.
* Añadir animaciones complejas.
* Cambiar la identidad visual sin motivo.
* Reemplazar mobile navigation por otra solución sin justificarlo.
* Introducir librerías de UI adicionales sin necesidad.

---

# 57. Flujo visual prioritario

El flujo que deberá recibir mayor atención será:

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
Vista previa
  ↓
Descargar / Imprimir
```

Este flujo deberá ser cómodo desde un teléfono y requerir la menor cantidad razonable de interacción.

---

# 56. Criterios de aceptación UX

El frontend podrá considerarse satisfactorio cuando:

1. El flujo crítico sea claro desde mobile.
2. No existan acciones principales ambiguas.
3. Los formularios puedan completarse fácilmente.
4. La información reutilizable no requiera escritura innecesaria.
5. Los estados de carga y error sean visibles.
6. Volver desde preview conserve los datos.
7. ADMIN y DELEGADO vean opciones apropiadas.
8. No haya overflow horizontal accidental en mobile.
9. La interfaz sea consistente con los wireframes.
10. Las acciones táctiles sean cómodas.
11. La aplicación se adapte correctamente a desktop.
12. La UI no incorpore funcionalidades fuera del MVP.

---

# 57. Fuente de verdad visual

Ante una diferencia entre interpretación técnica y diseño:

1. Los requisitos funcionales determinan qué debe hacer el sistema.
2. Los wireframes determinan la estructura visual aprobada.
3. Este documento define el comportamiento UX.
4. La implementación deberá buscar la solución más cercana a estas tres fuentes sin inventar nuevos flujos.
