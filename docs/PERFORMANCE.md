# Performance Medida

## Frontend: bundle inicial

La carga inicial se redujo mediante lazy loading de `DocumentFlow` y `PositionedFieldEditor`, evitando incluir estaticamente `react-pdf`/PDF.js en el chunk inicial.

| Medicion | Antes | Despues |
| --- | ---: | ---: |
| Chunk inicial raw | 864.28 kB | 334.87 kB |
| Chunk inicial gzip | 255.04 kB | 101.09 kB |

La mejora aproximada es 61.25% en raw y 60.36% en gzip. Esto describe una reduccion del bundle inicial, no una reduccion equivalente del tiempo total de respuesta de la aplicacion.

## Backend: listado de empresas

El caso medido fue `CompanyService.list()`, que accede al `agreement` lazy durante el mapping. Hibernate Statistics conto statements JDBC preparados:

| Cantidad de Companies | Antes | Despues |
| ---: | ---: | ---: |
| 1 | 2 | 1 |
| 5 | 6 | 1 |
| 10 | 11 | 1 |

El patron anterior era `1 + N`. La correccion usa `@EntityGraph(attributePaths = "agreement")` solo en la consulta de listado correspondiente. La regresion esta en `CompanyListQueryStatisticsTest`.
