# Permiso Gremial / Bruna - Inspeccion tecnica

## Archivo analizado

| Propiedad | Valor |
| --- | --- |
| Archivo | `Permiso-Gremial-Bruna.pdf` |
| SHA-256 | `752bafd6d0998659362b74907b9fc8fb91e84e9f98b9a42e5356da5fc4252e61` |
| Productor | `intsig.com pdf producer` (CamScanner) |
| Version PDF | 1.7 |
| Paginas | 1 |
| Tamano de pagina | A4, 595 x 842 pt |
| Rotacion | 0 grados |
| Media/Crop/Bleed/Trim/Art box | `0 0 595 842` |

La pagina contiene una imagen XObject y no contiene anotaciones. El texto no puede extraerse mediante `pdftotext`. Junto con el productor CamScanner, esto indica que la plantilla esta aplanada como imagen escaneada, no como un formulario editable.

## AcroForm y campos

No contiene AcroForm.

Por lo tanto:

- No existen campos, nombres de campo, tipos, valores actuales, widgets ni paginas asociadas que listar.
- No hay campos editables ni `NeedAppearances` aplicable.
- No es posible confirmar que variantes futuras reutilicen una estructura de formulario, porque esta variante no tiene estructura AcroForm.
- M8 no debe intentar completar esta plantilla con `PDField` ni suponer nombres de campos.

## Integridad y restricciones

| Comprobacion | Resultado |
| --- | --- |
| Carga con PDFBox 3.0.6 | Correcta |
| Guardado a `ByteArrayOutputStream` | Correcto; el PDF resultante vuelve a abrirse y conserva 1 pagina |
| Archivo fuente tras carga/guardado | Sin cambios; se verifico igualdad de bytes antes y despues |
| Cifrado/proteccion con clave | No |
| Permiso de modificacion | Permitido |
| Permiso de completar formularios | Permitido, aunque no hay formulario |
| Firmas digitales | No se encontraron diccionarios de firma |
| Corrupcion detectada | No detectada por PDFBox ni `pdfinfo` |

El guardado en memoria crea una nueva serializacion (345218 bytes frente a 345410 bytes del original). Esto es esperado y no modifica el archivo fuente. Cualquier generacion futura debe cargar los bytes de `TemplateFileStorage`, trabajar sobre esa instancia en memoria y devolver los bytes resultantes, sin escribir sobre el `fileKey` de la variante.

## Estructura visual y geometria

Las coordenadas siguientes son aproximadas y se expresan en puntos PDF, con origen en la esquina inferior izquierda. Se obtuvieron de una renderizacion de la pagina A4 a 144 DPI y sirven solo para analizar una futura estrategia; no son una implementacion de escritura.

| Zona visual | Pagina | Area aproximada (x, y, ancho, alto) | Observacion |
| --- | ---: | --- | --- |
| Lugar y fecha de cabecera | 1 | `205, 625, 365, 30` | `Mar del Plata,` permanece fijo. El primer espacio recibe Provincia; el segundo, día de `issueDate`; el tercero, mes en letras; y tras `20`, los últimos dos dígitos del año. |
| Empresa bajo `Sr. Gerente de:` | 1 | `48, 540, 120, 25` | Línea para la razón social o nombre de `Company` seleccionado. |
| Día de permiso gremial | 1 | centro `490, 387`, ancho máximo `105`, fuente 10-7 pt | Espacio después de `el día` y antes de `del corriente mes`. Recibe únicamente el número `permitDay`. |
| Delegado y documento | 1 | `48, 395, 220, 25` | Línea en `el compañero ____________, delegado obrero`. Recibe nombre, apellido y DNI del `User` seleccionado por `delegateId`. |
| Convenio colectivo | 1 | centro `449, 340`, ancho máximo `54`, fuente 10-7 pt | Línea después de `Convención Colectiva de Trabajo`; recibe únicamente `Agreement.codigo` resuelto mediante `agreementId`. |

La firma de Diego Bruna, membrete, logos, textos fijos y `Mar del Plata` ya forman parte de la imagen de la plantilla.

## Mapeo funcional posible

| Dato del formulario | Evidencia visual | Estado de mapeo |
| --- | --- | --- |
| Provincia | Primer espacio posterior a `Mar del Plata,`. | `provinceId` se resuelve a `Province.name`. `Mar del Plata` permanece fijo. |
| Fecha de emisión | Segundo, tercer y último espacio de la cabecera. | `issueDate` se selecciona con Date Picker: día, mes en letras y últimos dos dígitos del año. |
| Empresa | Línea bajo `Sr. Gerente de:`. | `companyId` se resuelve a la razón social o nombre de `Company`. |
| Delegado y documento | Línea dentro de `el compañero ____________, delegado obrero`. | `delegateId` se resuelve al `User` activo con rol `DELEGADO`, incluyendo nombre, apellido y DNI. CUIL no existe en el modelo actual de `User`. |
| Día de permiso gremial | Espacio de `el día __________ del corriente mes`. | `permitDay` es el número elegido por el usuario. No se persiste como entidad. |
| Convenio | Línea posterior a `Convención Colectiva de Trabajo`. | `agreementId` resuelve únicamente `Agreement.codigo`. |
| Variante | La firma `Diego Bruna` esta incorporada en el archivo. | No es un dato a escribir; determina el PDF base elegido. |

## Limitaciones y riesgos

- Al ser una imagen aplanada, no hay semantica de formulario ni posiciones verificables por campos. Toda escritura futura por coordenadas puede desalinearse respecto de la plantilla o de una variante distinta.
- No hay fuentes ni flujo de texto de la plantilla reutilizable. M8 debera elegir y embebir/configurar una fuente compatible, controlar longitud y evitar tapar lineas o texto preimpreso.
- Una variante de Permiso Gremial que comparta exactamente este layout puede reutilizar las coordenadas calibradas. Un layout o tipo de PDF nuevo requiere configuración o implementación específica y validación visual.
- El sistema no detecta automáticamente espacios punteados, campos ni posiciones de texto. No se aplica OCR, computer vision ni inferencia de layout.
- Las zonas punteadas están confirmadas funcionalmente, pero las coordenadas exactas para escribir texto aún deben determinarse y verificarse visualmente en M8.

## Estrategia recomendada para M8

1. Mantener la plantilla fuente intacta y cargar una copia en memoria desde `TemplateFileStorage`.
2. Implementar una estrategia especifica para `Permiso Gremial / Bruna` basada en coordenadas exactas verificadas visualmente, porque AcroForm no es una opcion para este archivo.
3. Resolver `provinceId`, `companyId`, `delegateId`, `agreementId` y `variantId` contra registros activos antes de escribir.
4. Descomponer `issueDate` en día, mes en letras y últimos dos dígitos del año para la cabecera.
5. Escribir `permitDay` como número en la zona de ausencia gremial y `Agreement.codigo` en la zona de convenio.
6. Probar el resultado renderizado a A4 con valores de longitud representativa y verificar que firma, membrete y texto fijo se preserven.
7. Inspeccionar cada variante futura antes de reutilizar o definir sus coordenadas.

No se implementa escritura por coordenadas en M7.

## Calibración M8

Las coordenadas usan puntos PDF sobre A4 (`595 x 842`), con origen en la esquina inferior izquierda. El overlay se agrega al final del contenido de la primera página con `AppendMode.APPEND` y contexto gráfico aislado.

| Campo | Centro x | Baseline y | Ancho máximo |
| --- | ---: | ---: | ---: |
| Provincia | 318 | 638 | 100 |
| Día de emisión | 389 | 638 | 28 |
| Mes de emisión | 477 | 638 | 92 |
| Año de emisión | 551 | 638 | 20 |
| Empresa | 105 | 555 | 115 |
| Delegado y DNI | 151 | 411 | 208 |
| Día de permiso | 490 | 387 | 105 |
| Convenio | 449 | 340 | 54 |

Se usa Helvetica-Bold, fuente estándar PDF reproducible, con 10.5 pt y reducción limitada hasta 7 pt. Si el texto aún excede su ancho máximo, la generación falla con un error controlado; no se trunca texto.

## Verificacion ejecutada

- `pdfinfo` verifico una pagina A4, PDF 1.7, sin cifrado y sin formulario.
- PDFBox 3.0.6 verifico AcroForm ausente, cero anotaciones, una imagen XObject, cero firmas, permisos de modificacion y carga/guardado en memoria correctos.
- Se renderizo la pagina para inspeccion visual de las zonas descritas.

La version local de Java disponible para la inspeccion fue Java 17. El proyecto requiere Java 21 para su build normal; esto no afecta los resultados de lectura de PDFBox 3.0.6, pero el build completo de Maven no pudo ejecutarse porque `mvn` y Maven Wrapper no estan disponibles en el entorno.
