# Decisiones Tecnicas Actuales

## Generacion y almacenamiento de PDFs

- Los PDFs generados se crean en memoria y se devuelven como `application/pdf`.
- El frontend reutiliza el mismo Blob para preview, descarga e impresion.
- No existe entidad persistente `Document` ni historial de PDFs generados.
- Las plantillas administradas se abstraen mediante `TemplateFileStorage`: local en desarrollo y S3-compatible en produccion.
- El reemplazo de una plantilla sube primero el objeto nuevo, actualiza la referencia dentro de la transaccion y hace cleanup best-effort: el nuevo ante rollback y el anterior despues de `AFTER_COMMIT`. Se prioriza una posible huella huerfana temporal en storage antes que una referencia DB a un objeto eliminado.

## Autenticacion y sesiones

- La autenticacion usa JWT en cookie `HttpOnly`; no se guarda el JWT en `localStorage`.
- CSRF usa double-submit: cookie `XSRF-TOKEN` y header `X-XSRF-TOKEN` en mutaciones.
- El JWT incluye `sessionVersion`, comparado con el valor persistido del usuario.
- Se permiten multiples sesiones simultaneas.
- Logout limpia las cookies del navegador actual y no invalida otros JWT.
- Cambio o reset de contraseña incrementa `sessionVersion`, rotando las sesiones anteriores.
- La desactivacion de un usuario impide que sus tokens sigan autenticando por la validacion de estado activo.

## Plantillas y campos

- `FieldDefinition` contiene el significado logico y puede reutilizarse.
- `TemplateField` configura como se ubica ese significado en una variante.
- Se soportan `ACROFORM`, `POSITIONED` y variantes hibridas.
- La configuracion de campos es administrable y dispone de editor visual. Los detalles estan en [PDF_TEMPLATES.md](PDF_TEMPLATES.md).

## Draft local

- El formulario puede recuperarse desde `localStorage` usando `stiapba.document-draft.v1`.
- Solo se guardan `templateId` y los valores necesarios del formulario.
- No se guardan JWT, CSRF, contraseñas ni Blob PDF.
- Tras un refresh no se conserva el preview: el usuario vuelve al formulario y debe regenerar el PDF.
- El draft se limpia al cerrar sesion o finalizar el flujo.

## Frontend y deployment

- En produccion el frontend usa `VITE_API_URL=/api/v1` y nunca una URL directa de Render.
- Vercel reescribe `/api/v1/:path*` hacia Render; el navegador ve un origen same-origin.
- Las cookies de produccion son `Secure`, `HttpOnly`, sin `Domain` y con un `SameSite` compatible con el proxy same-origin. El default actual es `None`; `Lax` tambien es compatible y puede preferirse al configurar el entorno.

## Performance medida

- El chunk inicial del frontend paso de 864.28 kB a 334.87 kB; gzip paso de 255.04 kB a 101.09 kB. La reduccion aproximada es 61.25% raw y 60.36% gzip.
- La causa fue cargar `react-pdf`/PDF.js mediante imports estaticos. `DocumentFlow` y `PositionedFieldEditor` ahora se cargan bajo demanda.
- El listado de empresas tenia N+1 al mapear `Company.agreement`: con N=1, 5 y 10 se observaron 2, 6 y 11 statements. `@EntityGraph(attributePaths = "agreement")` lo redujo a 1, 1 y 1 solo en ese listado.
- Estas mediciones describen bundle inicial y queries del caso medido; no implican que toda la aplicacion sea 61% mas rapida.
