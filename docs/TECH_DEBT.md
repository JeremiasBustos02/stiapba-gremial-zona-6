# Deuda Tecnica

## Unicode arbitrario en PDFs

- Estado: pendiente, no prioritario para el dominio actual.
- Problema: el renderer usa fuentes Standard 14 / WinAnsi; Unicode arbitrario puede no representarse.
- Solucion futura: embebir una fuente Unicode para texto dinamico.

## E2E de navegador

- Estado: pendiente.
- Problema: no existe una suite completa que ejecute el flujo real en un navegador.
- Situacion actual: Vitest cubre comportamiento del frontend y Spring/JUnit cubre backend e integracion.
- Siguiente decision: evaluar Playwright o Cypress cuando el valor de cubrir el flujo desplegado justifique incorporar la dependencia.

## Render Free y cold start

- Estado: limitacion operativa.
- Problema: Render Free puede suspender el Web Service tras un periodo sin trafico y el primer acceso puede tardar mas.
- Mitigacion actual: monitor externo opcional contra `GET /api/v1/health` cada aproximadamente 13-14 minutos.

## Versionado de plantillas para historial

- Estado: limitacion conocida.
- Problema: `DocumentRecord` reproduce los datos renderizados, pero una regeneracion usa el archivo y la configuracion de campos vigentes de la variante identificada. Si una plantilla se reemplaza o sus campos se editan, el layout puede diferir del original.
- Solucion futura: versionar de forma inmutable el archivo y la configuracion de cada variante antes de prometer reproducibilidad visual exacta.

No se registran como deuda el N+1 de `Company`, la consistencia DB/storage, la carga diferida de PDF.js, la impresion PDF ni otros problemas ya corregidos.
