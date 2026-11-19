# Gestión comercial — Segundo parcial de Programación IV

Aplicación para una ferretería de un solo local: ventas de mostrador, stock y movimientos, clientes y cuenta corriente, pagos con recibo, usuarios por rol y tablero comercial. Los comprobantes son internos, sin validez fiscal.

**Estado al 19/11/2026:** T01–T11 implementados. T12 tiene semilla, integración e instalación local verificadas. **La publicación en Vercel/Turso sigue pendiente de acceso a las cuentas/proyectos de entrega; no hay URL pública verificada.**

## Equipo

| Integrante | Legajo | Rama | Tickets |
| --- | --- | --- | --- |
| Ben | Pendiente de informar | `ramaBen` | T01–T04 |
| Álvaro | Pendiente de informar | `ramaAlvaro` | T05–T08 |
| Pablo | Pendiente de informar | `ramaPablo` | T09–T12 |

Repositorio: [benlopez00/Parcial-2-PR4](https://github.com/benlopez00/Parcial-2-PR4). Las ramas personales se integran a `desarrollo` y después a `main` según lo acordado con el equipo. T12 no realiza esa integración ni un push automáticamente.

## Instalación local

Requisitos: Node **22.x** y pnpm **11.8.0**, fijados en `package.json`. Desde la carpeta del proyecto, en PowerShell:

```powershell
corepack pnpm@11.8.0 install --frozen-lockfile
Copy-Item .env.example .env
corepack pnpm@11.8.0 run db:migrate
corepack pnpm@11.8.0 run db:seed
corepack pnpm@11.8.0 run dev
```

Abrir [localhost:3000](http://localhost:3000). Copiar `.env` solo durante la instalación inicial; conservar el archivo si ya existe. En Linux/macOS, el equivalente de la copia es `cp .env.example .env`.

No hace falta cargar usuarios a mano: `db:seed` crea la demo y genera una clave de sesión local aleatoria si `SESSION_SECRET` está vacío. Si ya hay una clave configurada, la conserva. Las migraciones se ejecutan antes de la semilla; no se modifica el esquema al iniciar la web.

Para ejecutar la compilación de producción local:

```powershell
corepack pnpm@11.8.0 run build
corepack pnpm@11.8.0 run start
```

Los scripts usan Webpack, verificado en esta PC. El pnpm global de otra versión no reemplaza la versión indicada por Corepack.

## Usuarios y datos de demostración

| Rol | Email |
| --- | --- |
| Administradora | `laura@ferreteria.test` |
| Vendedor | `pablo@ferreteria.test` |
| Vendedora | `ana@ferreteria.test` |

Contraseña pública de demo para los tres: **`DemoFerreteria123!`**. Se puede elegir otra mediante `SEMILLA_PASSWORD` antes de cargar una base vacía. Estas cuentas se usan solo con datos ficticios; no corresponden a un comercio real.

La carga inicial contiene 5 categorías, 30 productos, 10 clientes, **51 facturas en los últimos 30 días**, 3 anulaciones y 6 pagos parciales. Quedan 4 productos bajo mínimo y ventas de los tres medios para los gráficos. Stock inicial, ventas, anulaciones y pagos pasan por los servicios de negocio. Solo se ajustan sus fechas para construir el historial de demostración.

La semilla completa se confirma en una transacción. Si falla una operación, no queda una carga parcial. **Repetir `db:seed` no duplica ni reinicia datos, fechas o contraseñas.** Rechaza una base ajena. Para otra demo inicial con fechas renovadas, usar una base vacía diferente; el script no incluye borrado destructivo.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | `file:./local.db` en local; URL de Turso en el despliegue. |
| `DATABASE_AUTH_TOKEN` | Vacío para SQLite; token privado para Turso. |
| `SESSION_SECRET` | Firma de sesión. La semilla genera la clave local si falta; configurar otra privada en Vercel. |
| `SEMILLA_PASSWORD` | Opcional y solo durante la primera carga: contraseña de las cuentas de demo. |

Las variables reales viven en `.env` o en el proveedor. `.env*`, bases locales, dependencias y `.vercel/` están excluidos de Git; `.env.example` no contiene secretos reales. En Vercel se rechaza el fallback a SQLite si falta una URL remota o su token.

## Verificación y defensa

```powershell
corepack pnpm@11.8.0 test
corepack pnpm@11.8.0 run verificar:tipos
corepack pnpm@11.8.0 run build
```

T12 aprobó **299 pruebas en 19 archivos**, tipos y build, también una instalación nueva desde lockfile con migración y semilla dos veces. Pasaron **35 comprobaciones en navegador** sobre la compilación de esa instalación: los tres usuarios, permisos por API, contado por teclado, cliente nuevo con cuenta corriente, pago parcial, anulación, impresión, tablero y listado a 1440/768/390/360 px.

Las pruebas integrales verifican existencia contra movimientos, saldo contra débitos menos créditos, numeración sin huecos, fechas y saldo histórico de recibos. También prueban repetición sin cambios, rechazo de una base ajena y reversión de toda la semilla ante un fallo tras varias ventas. Las pruebas previas de transacciones, permisos y venta simultánea de la última unidad siguen en la suite.

Se corrigieron en este cierre las dos incidencias de paginación detectadas en T10: al filtrar se bloquea la paginación pendiente, y al anular la última fila de una página se vuelve a una página válida sin perder filtros. Las regresiones fallaron antes y pasaron después.

Guía de código: [AGENTS.md](./AGENTS.md). Preguntas: [respuestas-defensa.md](./respuestas-defensa.md). Alcance y evidencia: [ticket de T12](./docs/tickets/T12-semilla-pruebas-y-despliegue/ticket.md), [plan](./docs/tickets/T12-semilla-pruebas-y-despliegue/plan.md) e [informe](./docs/tickets/T12-semilla-pruebas-y-despliegue/informe-auditoria.md). El checklist personal está fuera del repositorio.

## Publicación

Seguir [docs/despliegue.md](./docs/despliegue.md): crear/seleccionar la base exclusiva de demo, migrar y cargar una vez, configurar las tres variables privadas en Vercel y comprobar el recorrido sobre HTTPS y contra Turso. No ejecutar migraciones ni semilla como parte del build o de una visita.

Pendientes para cerrar T12: acceso/proyectos de Vercel y Turso, URL pública verificada y legajos del equipo. Los pasos remotos están documentados, pero todavía no se ejecutaron. No se afirma persistencia remota hasta comprobar un registro desde la URL pública en la base Turso.

## Tickets

| Ticket | Responsable | Hito | Descripción | Estado |
| --- | --- | --- | --- | --- |
| [T01](./docs/tickets/T01-base-datos-errores-y-formatos/ticket.md) | Ben | Hito 1 | Base de datos (Drizzle + SQLite/Turso), las 9 tablas en `esquema.ts`, migraciones, formatos y arquitectura de errores. | Completado |
| [T02](./docs/tickets/T02-autenticacion-layout-y-usuarios/ticket.md) | Ben | Hito 1 | Sesión en cookie `httpOnly`, permisos por rol, Layout general, componentes base y módulo completo de Acceso y Usuarios. | Completado |
| [T03](./docs/tickets/T03-backend-categorias-productos-y-stock/ticket.md) | Ben | Hito 1 | Servicios, validaciones Zod, verificadores de error, pruebas y API REST de Categorías, Productos y `moverStock()`. | Completado |
| [T04](./docs/tickets/T04-frontend-productos-categorias-y-existencias/ticket.md) | Ben | Hito 1 | Pantallas de Catálogo, Existencias/Movimientos, Ficha de producto, Categorías y modales de stock. | Completado |
| [T05](./docs/tickets/T05-backend-clientes/ticket.md) | Álvaro | Hito 2 | Servicios, validaciones Zod, verificadores de error, pruebas y API REST de Clientes (alta, edición, baja lógica y saldos). | Completado |
| [T06](./docs/tickets/T06-backend-cuenta-corriente-y-pagos/ticket.md) | Álvaro | Hito 2 | Servicios, validaciones Zod, pruebas y API REST de Cuenta Corriente y Pagos con recibo numerado en transacción. | Completado |
| [T07](./docs/tickets/T07-frontend-clientes-cuenta-y-pagos/ticket.md) | Álvaro | Hito 2 | Pantallas de Clientes, Ficha, Cuenta Corriente, Saldos, modal de Pago y vista imprimible de Recibo. | Completado |
| [T08](./docs/tickets/T08-backend-facturacion-y-anulacion/ticket.md) | Álvaro | Hito 3 | Servicios, validaciones Zod, pruebas y API REST de Facturación (`confirmarFactura` atómica y `anularFactura`). | Completado |
| [T09](./docs/tickets/T09-frontend-nueva-venta/ticket.md) | Pablo | Hito 3 | Pantalla de Nueva Venta (`/ventas/nueva`) operable con teclado, alta rápida de cliente en modal y las 3 formas de pago. | Completado |
| [T10](./docs/tickets/T10-frontend-listado-detalle-y-anulacion-facturas/ticket.md) | Pablo | Hito 3 | Pantallas de Listado de Facturas (`/ventas`), Comprobante imprimible (`/ventas/[id]`) y modal de Anulación. | Completado |
| [T11](./docs/tickets/T11-tablero-inicio-y-graficos/ticket.md) | Pablo | Hito 4 | Servicio, API (`GET /api/tablero`) y Pantalla del Tablero de Inicio (`/`) con indicadores y gráficos Chart.js. | Completado |
| [T12](./docs/tickets/T12-semilla-pruebas-y-despliegue/ticket.md) | Pablo | Hito 4 | Script de datos de prueba (`semilla.ts`), pruebas integrales y despliegue en Vercel + Turso. | Local verificado; publicación pendiente |
