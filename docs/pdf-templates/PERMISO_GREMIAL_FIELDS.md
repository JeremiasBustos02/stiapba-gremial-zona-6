# Permiso Gremial / Bruna - Inspeccion tecnica

## Permiso-Gremial-Bruna-ACROFORM.pdf

### Resultado de inspeccion

| Propiedad | Valor |
| --- | --- |
| AcroForm | Si, valido y legible con PDFBox 3.0.6 |
| Paginas | 1 |
| `NeedAppearances` | `false` |
| DA global | `/Helv 0 Tf 0 g` |
| Recursos de fuente | `Helv`: Helvetica Type1 con `WinAnsiEncoding` |

Los nueve campos son `PDTextField`; son visibles, imprimibles, editables, no requeridos, no multiline, no son password/file-select/comb/rich-text, y usan alineacion izquierda (`Q=0`). No hay checkboxes ni campos combo/select. Sus widgets estan en la pagina 1, no son hidden, invisible ni `noView`.

| Campo AcroForm real | Rectangulo PDF `(x1, y1, x2, y2)` | DA local | Mapeo logico |
| --- | --- | --- | --- |
| `Provincia` | `(286.81, 633.72, 363.65, 646.20)` | `/Helvetica 12 Tf 0 g` | `province` |
| `Dia fecha` | `(368.50, 633.84, 406.31, 646.41)` | `/Helvetica 12 Tf 0 g` | `issueDay` |
| `Mes` | `(428.13, 633.86, 507.09, 647.03)` | `/Helvetica 12 Tf 0 g` | `issueMonth` |
| `Año` | `(540.83, 633.84, 558.96, 645.81)` | `/Helvetica 12 Tf 0 g` | `issueYear` |
| `Empresa` | `(50.09, 553.41, 155.04, 568.90)` | `/Helvetica 12 Tf 0 g` | `company` |
| `Direccion` | `(48.89, 508.63, 241.13, 524.78)` | `/Helvetica 12 Tf 0 g` | Sin mapeo: esta sobre la linea `S / D` |
| `Nombre delegado y dni` | `(49.50, 409.05, 252.48, 422.21)` | `/Helvetica 12 Tf 0 g` | `delegate` con nombre y DNI combinados |
| `Dia de permiso` | `(435.29, 384.01, 538.09, 399.56)` | `/Helvetica 12 Tf 0 g` | `permitDay` |
| `Convenio` | `(426.34, 338.69, 477.27, 352.45)` | `/Helvetica 12 Tf 0 g` | `agreement` |

### Problemas del PDF

- El campo `Nombre delegado y dni` es el unico widget para los dos datos y recibe el valor combinado `nombre apellido DNI <dni>`. `delegateDni` se conserva como valor logico, pero no tiene un `TemplateField` propio. `Direccion` no se mapea porque corresponde a la linea `S / D`.
- Los campos nombran la fuente `/Helvetica`, pero los recursos del AcroForm solo declaran `/Helv`. Esta inconsistencia es del PDF y puede impedir la regeneracion de appearances. El renderer corrige la DA solo en la copia generada con `/Helv` y un tamano entre 7 y 12 pt; nunca modifica el PDF fuente.

### Tamano de fuente y caracteres espanoles

La DA global usa fuente Helvetica y tamano `0`, que solicita autosize. La prueba visual con PDFBox demostro que la empresa larga se reduce a un tamano ilegible. Por eso el renderer calcula un tamano explicito por campo entre 7 y 12 pt, respetando el rectangulo del widget. Si no entra a 7 pt, devuelve `PDF_TEXT_TOO_LONG`; no trunca ni genera texto ilegible. Helvetica con `WinAnsiEncoding` admite `ñ`, `á`, `é`, `í`, `ó` y `ú`.

Se genera `permiso-gremial-acroform-short.pdf` en `backend/target/acroform-validation/` al ejecutar las pruebas. El caso largo se valida como rechazo controlado porque la empresa no entra al minimo de 7 pt. Para admitirla, el PDF debe ampliar el campo `Empresa`, habilitar multiline o definir una politica de longitud explicita.

### Diferencia con Permiso-Gremial-Bruna.pdf

La variante anterior no tiene AcroForm y se sigue completando con el renderer `POSITIONED`. La nueva se completa mediante `FieldDefinition.key -> TemplateField.acroFieldName`, sin coordenadas hardcodeadas. `POSITIONED` sigue previsto en `TemplateFieldMode`, pero sus coordenadas no se almacenan en este modelo.

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
