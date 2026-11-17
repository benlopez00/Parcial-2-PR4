# Sistema de Gestión Comercial — Segundo Parcial (Programación IV)

Sistema web full-stack para comercio minorista con **facturación de mostrador**, **control de existencias y movimientos de stock**, **cuenta corriente de clientes con emisión de recibos**, **gestión de usuarios por roles** y **tablero de indicadores comerciales**.

---

## 1. Integrantes del Grupo y Asignación de Tickets

El desarrollo se divide en **3 bloques consecutivos de 4 tickets cada uno (12 tickets en total)**. Cada integrante es responsable de su bloque de principio a fin y trabaja en su propia rama, facilitando que los otros dos integrantes asistan si surge algún bloqueo.

| Integrante | Legajo | Rama de trabajo | Tickets asignados | Bloque funcional |
| :--- | :--- | :--- | :--- | :--- |
| **Ben** | *Completar* | `ramaBen` | `T01` a `T04` | **Hito 1 completo:** Base de datos, Errores, Autenticación, Layout, Usuarios y Módulo Productos/Stock (Backend + Frontend). |
| **Álvaro** | *Completar* | `ramaAlvaro` | `T05` a `T08` | **Hito 2 completo + Backend Hito 3:** Módulo Clientes, Cuenta Corriente y Pagos (Backend + Frontend) + Backend de Facturación y Anulación. |
| **Pablo** | *Completar* | `ramaPablo` | `T09` a `T12` | **Frontend Hito 3 + Hito 4 completo:** Pantallas de Nueva Venta y Facturas, Tablero con Gráficos, Semilla de datos y Despliegue en Vercel/Turso. |

---

## 2. Mapa de Tickets

| Ticket | Responsable | Hito | Descripción | Estado |
| :--- | :--- | :--- | :--- | :--- |
| [T01](./docs/tickets/T01-base-datos-errores-y-formatos/ticket.md) | Integrante 1 | Hito 1 | Base de datos (Drizzle + SQLite/Turso), las 9 tablas en `esquema.ts`, migraciones, formatos y arquitectura de errores. | Completado |
| [T02](./docs/tickets/T02-autenticacion-layout-y-usuarios/ticket.md) | Integrante 1 | Hito 1 | Sesión en cookie `httpOnly`, permisos por rol, Layout general, componentes base y módulo completo de Acceso y Usuarios. | Completado |
| [T03](./docs/tickets/T03-backend-categorias-productos-y-stock/ticket.md) | Integrante 1 | Hito 1 | Servicios, validaciones Zod, verificadores de error, pruebas y API REST de Categorías, Productos y `moverStock()`. | Completado |
| [T04](./docs/tickets/T04-frontend-productos-categorias-y-existencias/ticket.md) | Integrante 1 | Hito 1 | Pantallas de Catálogo, Existencias/Movimientos, Ficha de producto, Categorías y modales de stock. | Completado |
| [T05](./docs/tickets/T05-backend-clientes/ticket.md) | Integrante 2 | Hito 2 | Servicios, validaciones Zod, verificadores de error, pruebas y API REST de Clientes (alta, edición, baja lógica y saldos). | Completado |
| [T06](./docs/tickets/T06-backend-cuenta-corriente-y-pagos/ticket.md) | Integrante 2 | Hito 2 | Servicios, validaciones Zod, pruebas y API REST de Cuenta Corriente y Pagos con recibo numerado en transacción. | Completado |
| [T07](./docs/tickets/T07-frontend-clientes-cuenta-y-pagos/ticket.md) | Integrante 2 | Hito 2 | Pantallas de Clientes, Ficha, Cuenta Corriente, Saldos, modal de Pago y vista imprimible de Recibo. | Pendiente |
| [T08](./docs/tickets/T08-backend-facturacion-y-anulacion/ticket.md) | Integrante 2 | Hito 3 | Servicios, validaciones Zod, pruebas y API REST de Facturación (`confirmarFactura` atómica y `anularFactura`). | Completado |
| [T09](./docs/tickets/T09-frontend-nueva-venta/ticket.md) | Integrante 3 | Hito 3 | Pantalla de Nueva Venta (`/ventas/nueva`) operable con teclado, alta rápida de cliente en modal y las 3 formas de pago. | Pendiente |
| [T10](./docs/tickets/T10-frontend-listado-detalle-y-anulacion-facturas/ticket.md) | Integrante 3 | Hito 3 | Pantallas de Listado de Facturas (`/ventas`), Comprobante imprimible (`/ventas/[id]`) y modal de Anulación. | Pendiente |
| [T11](./docs/tickets/T11-tablero-inicio-y-graficos/ticket.md) | Integrante 3 | Hito 4 | Servicio, API (`GET /api/tablero`) y Pantalla del Tablero de Inicio (`/`) con indicadores y gráficos Chart.js. | Pendiente |
| [T12](./docs/tickets/T12-semilla-pruebas-y-despliegue/ticket.md) | Integrante 3 | Hito 4 | Script de datos de prueba (`semilla.ts`), pruebas integrales y despliegue en Vercel + Turso. | Pendiente |

---

## 3. Flujo de Trabajo con IA (Ciclo de 3 Prompts por Ticket)

Todo el proyecto está diseñado para que **cualquier integrante pueda leer, explicar y modificar cualquier archivo en menos de un minuto durante la defensa individual**.

Para resolver cada ticket se siguen **3 pasos estrictos** usando las plantillas de la carpeta [`docs/prompts/`](./docs/prompts/):

1. **Planificación ([`docs/prompts/01-planificacion.md`](./docs/prompts/01-planificacion.md)):**
   - El agente lee [`AGENTS.md`](./AGENTS.md), el `ticket.md` y las capturas de referencia en [`docs/pantallas/`](./docs/pantallas/INDICE.md).
   - Guarda el plan técnico en `docs/tickets/TXX-.../plan.md` (con los archivos a crear/modificar, nombres en castellano y reglas de negocio involucradas) para que pueda ser leído por cualquier IA de cualquier proveedor.
2. **Desarrollo ([`docs/prompts/02-desarrollo.md`](./docs/prompts/02-desarrollo.md)):**
   - Pensado para ejecutarse en un **modelo más económico en tokens** (o en otro proveedor de IA), leyendo directamente `plan.md`.
   - Implementa el código respetando la separación estricta: flujo normal en `src/servicios/`, control de errores en `src/errores/`, esquemas Zod en `src/validaciones/` y tests en `src/pruebas/`.
3. **Auditoría y Defensa ([`docs/prompts/03-auditoria-y-defensa.md`](./docs/prompts/03-auditoria-y-defensa.md)):**
   - Audita el código contra [`AGENTS.md`](./AGENTS.md) y ejecuta las pruebas.
   - Genera el informe para el desarrollador en `docs/tickets/TXX-.../informe-auditoria.md`.
   - Completa las respuestas correspondientes en [`respuestas-defensa.md`](./respuestas-defensa.md) con rutas y funciones exactas.

### Flujo de Ramas en Git
- `main`: rama estable publicada en Vercel.
- `desarrollo`: rama donde se integran los bloques terminados (`T01-T04`, `T05-T08`, `T09-T12`).
- `ramaBen`, `ramaAlvaro`, `ramaPablo`: ramas de trabajo individual. Se hace commit al finalizar cada ticket auditado.

---

## 4. Puesta en Marcha Local

### Estado al terminar T01

La infraestructura de base de datos, errores y formatos está implementada. La ruta `/` es un arranque vacío; las pantallas y la autenticación corresponden a los próximos tickets.

Para verificar T01 (Node.js 26.1.0 y pnpm 11.8.0 usados en desarrollo):

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm run db:migrate
pnpm test
pnpm run verificar:tipos
pnpm run build
pnpm run dev
```

- Sin `DATABASE_URL` se usa `file:./local.db`. Para Turso, configurar `DATABASE_URL=libsql://...` y `DATABASE_AUTH_TOKEN` en `.env`.
- `SESSION_SECRET` queda vacío en el ejemplo: debe reemplazarse por un secreto aleatorio antes de habilitar sesiones en T02.
- `db:seed` queda reservado para `src/base-de-datos/semilla.ts`, que se implementará en T12 usando los servicios. Los usuarios de prueba de abajo todavía no están cargados.
- Para cambios del esquema: editar `src/base-de-datos/esquema.ts`, ejecutar `pnpm run db:generate -- --name=descripcion_del_cambio`, revisar y versionar el SQL y sus metadatos, y aplicar `pnpm run db:migrate`.
- Los scripts usan Webpack: en el entorno Windows/Node.js de desarrollo, Turbopack falló al iniciar el proceso de transformación de CSS. El build con Webpack fue verificado.
- shadcn/ui queda configurado en `components.json`; los componentes propios se nombrarán en castellano. `src/utilidades/clases.ts` ofrece `combinarEstilos` y el alias `cn` que espera su generador.
- Los formatos usan la zona `America/Argentina/Buenos_Aires`. `pesosACentavos` acepta números, texto decimal (`1234.50`) y texto argentino (`1.234,50`); rechaza más de dos decimales y valores fuera del entero seguro. En texto, `1.234` se interpreta como mil doscientos treinta y cuatro pesos.
- Las pruebas aplican las migraciones reales a bases SQLite en memoria independientes. La conexión remota requiere credenciales de Turso; en T01 se verificó SQLite local.

Referencias técnicas: [Drizzle y Turso](https://orm.drizzle.team/docs/get-started/turso-new), [Tailwind con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) y [configuración manual de shadcn/ui](https://ui.shadcn.com/docs/installation/manual).

### Puesta en marcha completa prevista para T12

El sistema levanta localmente con los siguientes comandos (sin pasos manuales adicionales):

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

### Variables de Entorno (`.env.example`)
```env
# Base de datos (en desarrollo usa archivo SQLite local; en producción usa URL y Token de Turso)
DATABASE_URL="file:./local.db"
DATABASE_AUTH_TOKEN=""

# Secreto para firmar la cookie httpOnly de sesión (mínimo 32 caracteres)
SESSION_SECRET="secreto-desarrollo-local-cambiar-en-produccion-32chars"
```

### Usuarios de Prueba (creados por `pnpm run db:seed`)
| Rol | Email | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `laura@ferreteria.test` | `admin1234` | Acceso total (incluye productos, stock manual, anulaciones y usuarios). |
| **Vendedor** | `pablo@ferreteria.test` | `vendedor1234` | Mostrador: ventas, consulta de catálogo, clientes y cobros de cuenta corriente. |

---

## 5. Documentación de Referencia
- [Enunciado y Preguntas de Defensa (`docs/README.md`)](./docs/README.md)
- [Especificación Completa y API REST (`docs/requerimientos.md`)](./docs/requerimientos.md)
- [Índice de Capturas de Referencia (`docs/pantallas/INDICE.md`)](./docs/pantallas/INDICE.md)
- [Manual Técnico para Humanos e IA (`AGENTS.md`)](./AGENTS.md)
- [Guía de Respuestas para la Defensa Oral (`respuestas-defensa.md`)](./respuestas-defensa.md)
