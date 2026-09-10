# Arquitectura de Plantillas PDF

## Modelo

- `Template` representa un tipo de documento, por ejemplo `Permiso Gremial`.
- `TemplateVariant` representa una variante concreta y conserva el `fileKey` del PDF base.
- `FieldDefinition` es una definicion logica reutilizable: clave, etiqueta, tipo, origen, obligatoriedad y estado.
- `TemplateField` vincula una definicion logica con una variante y define como se escribe en ese PDF.

Una misma `FieldDefinition` puede reutilizarse en varias variantes. ADMIN puede crear definiciones y configurar los campos de cada variante.

## Modos de campo

### ACROFORM

Usa un campo de formulario PDF existente. Se persiste el nombre tecnico `acroFieldName`, se valida contra el PDF real y PDFBox escribe el valor en ese campo.

### POSITIONED

Escribe texto sobre una coordenada del PDF. Se persisten pagina, `x`, `y`, ancho, alto, tamaño preferido, minimo, maximo, alineacion y multilinea. El editor visual permite seleccionar la definicion logica, mover y dimensionar el rectangulo, y guardar la configuracion.

### Modo hibrido

Una variante puede combinar campos `ACROFORM` y `POSITIONED`. Cada campo se procesa segun su modo; los campos AcroForm se completan primero y los posicionados se dibujan despues. Esto permite conservar campos interactivos existentes y agregar campos sobre PDFs que no los tienen.

`legacyPositioned` identifica variantes heredadas de la configuracion posicionada anterior. No es un tercer modo de campo y no cambia por si solo la generacion.

## Coordenadas y apariencia

- La API y el editor guardan coordenadas en puntos PDF con origen abajo a la izquierda, como `MediaBox` de PDFBox.
- La previsualizacion y el editor visual trabajan con una referencia visual CSS de origen arriba a la izquierda.
- La conversion entre ambas referencias se realiza al traducir la posicion visual a la posicion PDF.
- La alineacion disponible es `LEFT`, `CENTER` o `RIGHT`.
- `multiline` permite saltos de linea en campos AcroForm y conserva el calculo de altura para reducir el tamaño de fuente.
- El renderer aplica shrink-to-fit respetando `minFontSize` y `maxFontSize`. Si el texto no entra por debajo del minimo, la generacion falla con un error controlado.

## Reemplazo de PDF

Al reemplazar el archivo de una variante:

1. Se valida y sube el PDF nuevo.
2. Se actualiza la referencia en PostgreSQL dentro de una transaccion.
3. Se eliminan los `TemplateField` existentes de la variante dentro de esa misma operacion.
4. Si hay rollback, se intenta borrar el archivo nuevo.
5. Si hay commit, se intenta borrar el archivo anterior mediante `AFTER_COMMIT`.

El reemplazo no intenta inferir mappings del PDF nuevo. Los campos deben configurarse nuevamente cuando corresponda. El PDF fuente nunca se modifica durante una generacion.

## Generacion

El backend carga una copia del PDF desde `TemplateFileStorage`, completa los campos con PDFBox y devuelve los bytes en memoria. No se persiste una entidad `Document` ni el PDF generado.

Cuando existe AcroForm, se actualizan apariencias, se desactiva `NeedAppearances` y se ejecuta `flatten` antes de devolver el PDF. El resultado deja de depender de campos editables del visor.

## Limitacion de fuentes

El renderer utiliza fuentes Standard 14 / WinAnsi. Soportan los caracteres habituales del dominio, incluido el español utilizado actualmente, pero Unicode arbitrario como `✓`, `→` o alfabetos no latinos puede fallar.

La solucion futura prevista es incorporar una fuente Unicode embebida para texto dinamico. No forma parte de la implementacion actual.
