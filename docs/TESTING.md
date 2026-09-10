# Testing

## Frontend

El frontend usa Vitest con entorno `jsdom`. La suite actual tiene **53 tests** y cubre principalmente:

- autenticacion, sesion y CSRF;
- routing y guards para `ADMIN`/`DELEGADO`;
- primer ingreso;
- recuperacion de draft local;
- generacion PDF mediante API, preview e impresion;
- templates, variants y editor visual de campos.

Comandos desde `frontend/`:

```bash
npm run lint
npm test
npm run build
```

## Backend

El backend usa JUnit, Spring Boot Test, Mockito y PostgreSQL local para las integraciones. La suite actual tiene **96 tests**, entre pruebas unitarias e integracion.

Incluye cobertura de autenticacion, autorizacion, catalogos, plantillas, generacion PDF, consistencia DB/storage y una regresion de performance para el listado de empresas.

Comando de la suite completa desde `backend/`:

```bash
mvn test -Dapp.template.seed-enabled=true -Dapp.template.seed-file="../docs/pdf-templates/Permiso Gremial Bruna.pdf"
```

El test de consistencia de `TemplateVariant` verifica cleanup best-effort del archivo nuevo ante rollback y borrado del archivo anterior despues del commit. `CompanyListQueryStatisticsTest` habilita Hibernate Statistics, mide statements JDBC preparados y evita que el listado vuelva a introducir N+1 al cargar `Company.agreement`.

En Windows, si Maven no esta en `PATH`, usar el `mvn.cmd` de una instalacion local de Maven sin documentar rutas especificas de una maquina.

## Alcance de la suite

No existe actualmente una suite E2E completa de navegador con Playwright o Cypress. La confianza actual proviene de los tests de comportamiento del frontend y de las pruebas unitarias e integracion del backend.
