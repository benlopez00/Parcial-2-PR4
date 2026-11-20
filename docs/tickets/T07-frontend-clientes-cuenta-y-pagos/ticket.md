# Ticket T07 — Frontend de Clientes, Cuenta Corriente, Pagos, Recibo y Saldos

- **Responsable:** Integrante 2 (`rama: integrante-2`)
- **Hito:** Hito 2 — Clientes
- **Dependencias:** `T01`, `T02`, `T05`, `T06`

---

## 1. Objetivo

Construir todas las pantallas, pestañas, modales y vista imprimible del módulo **Clientes y Cuenta Corriente**, respetando los datos, columnas, filtros y flujos de las capturas de referencia.

---

## 2. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Clientes/clientes.jpg`](../../pantallas/Clientes/clientes.jpg) (`/clientes` — Listado general)
> - [`docs/pantallas/Clientes/ficha-cliente.jpg`](../../pantallas/Clientes/ficha-cliente.jpg) (`/clientes/[id]` — Pestaña «Datos y facturas»)
> - [`docs/pantallas/Clientes/cuenta.jpg`](../../pantallas/Clientes/cuenta.jpg) (`/clientes/[id]` — Pestaña «Cuenta corriente»)
> - [`docs/pantallas/Clientes/pago.jpg`](../../pantallas/Clientes/pago.jpg) (Modal «Registrar pago»)
> - [`docs/pantallas/Clientes/recibo.jpg`](../../pantallas/Clientes/recibo.jpg) (`/clientes/recibos/[id]` — Comprobante de recibo imprimible)
> - [`docs/pantallas/Clientes/saldos.jpg`](../../pantallas/Clientes/saldos.jpg) (`/clientes/saldos` — Clientes con deuda)

### Detalles obligatorios de Interfaz:
1. **Pantalla `/clientes` (`Clientes/clientes.jpg`):**
   - Encabezado con título `Clientes`, subtítulo con el total adeudado en cuentas corrientes y botones `Saldos` (enlace a `/clientes/saldos`) y `+ Nuevo cliente`.
   - Filtros en URL: buscador `Nombre, DNI o CUIT`, selector de estado (`Activos` / `Inactivos`) e interruptor (`Switch`) `Solo con deuda`.
   - Tabla paginada con columnas: `Documento` (`DNI` / `CUIT` + número), `Nombre o razón social` (enlace a `/clientes/[id]`), `Teléfono`, `Cuenta` (insignia `Cta. cte.` si está habilitada) y `Saldo` (en rojo si es mayor a `$ 0,00`).
2. **Modal `Nuevo cliente` / `Editar cliente`:**
   - Reutilizable también desde Nueva Venta (`T09`).
   - Campos: `Tipo de documento` (`DNI` / `CUIT`), `Número de documento`, `Nombre o razón social`, `Domicilio`, `Teléfono`, `Email`, interruptor `Habilitar cuenta corriente` y campo condicional `Límite de crédito ($)` (opcional).
   - Valida en el cliente y en el servidor con `src/validaciones/validacion-clientes.ts`.
3. **Pantalla `/clientes/[id]` — Ficha del Cliente (`Clientes/ficha-cliente.jpg` y `Clientes/cuenta.jpg`):**
   - Enlace `← Clientes`, nombre del cliente, insignia `Cta. cte.`, documento y botones de acción: `Registrar pago` (abre modal si tiene deuda), `Editar` y `Dar de baja` (con diálogo de confirmación).
   - 3 tarjetas superiores de resumen: `Saldo actual`, `Límite de crédito` (o `"Sin límite"`) y `Disponible`.
   - **Pestaña 1: «Datos y facturas» (`Clientes/ficha-cliente.jpg`):**
     - A la izquierda: tarjeta con todos los datos del cliente.
     - A la derecha: tabla `Últimas facturas` (hasta 6) con enlace `Ver todas` (que lleva a `/ventas?clienteId=[id]`).
   - **Pestaña 2: «Cuenta corriente» (`Clientes/cuenta.jpg`):**
     - Filtros de fecha `Desde` y `Hasta`.
     - Si hay `saldoAnterior`, primer renglón informativo con el saldo arrastrado.
     - Tabla cronológica con columnas: `Fecha` (`dd/mm/aaaa HH:mm`), `Concepto` (con link a la factura `/ventas/[facturaId]` o al recibo `/clientes/recibos/[pagoId]`), `Débito`, `Crédito` y `Saldo` acumulado en cada renglón, cerrando abajo con `Saldo al cierre`.
4. **Modal `Registrar pago` (`Clientes/pago.jpg`):**
   - Muestra el `Saldo actual` del cliente y un botón rápido para completar con el saldo total.
   - Campos: `Importe ($)` (validando que sea mayor a 0 y no supere la deuda), `Medio de pago` (`Efectivo`, `Transferencia`, `Tarjeta de débito`) y `Observación`.
   - Al confirmar, redirige o abre el recibo emitido (`/clientes/recibos/[id]`).
5. **Pantalla `/clientes/recibos/[id]` — Recibo Imprimible (`Clientes/recibo.jpg`):**
   - Botón `Imprimir` (`window.print()`, ocultando el panel lateral y botones mediante clases `print:hidden`).
   - Tarjeta de comprobante con datos de la ferretería, etiqueta `RECIBO`, número `N° 0001-00000019`, fecha y hora, cliente (`Recibimos de`), usuario (`Atendió`), `Concepto`, `Medio`, `Observación`, `Importe recibido` destacado y `Saldo actual de la cuenta`.
6. **Pantalla `/clientes/saldos` (`Clientes/saldos.jpg`):**
   - Resumen destacado del `Total adeudado` y cantidad de clientes con deuda.
   - Tabla ordenada de mayor a menor deuda con acceso directo a `Registrar pago` o ver la cuenta de cada cliente.

---

## 3. Archivos a Crear / Modificar

- **Server Actions (`src/app/(sistema)/clientes/acciones.ts`):**
  - Acciones para crear/editar/dar de baja cliente y registrar pago.
- **Componentes de Dominio (`src/componentes/dominio/clientes/`):**
  - `tabla-clientes.tsx`
  - `modal-formulario-cliente.tsx` *(exportado para reutilizar en `T09`)*
  - `pestana-cuenta-corriente.tsx`
  - `modal-registrar-pago.tsx`
  - `vista-recibo-imprimible.tsx`
- **Páginas (`src/app/(sistema)/clientes/`):**
  - `src/app/(sistema)/clientes/page.tsx`
  - `src/app/(sistema)/clientes/[id]/page.tsx`
  - `src/app/(sistema)/clientes/saldos/page.tsx`
  - `src/app/(sistema)/clientes/recibos/[id]/page.tsx`

---

## 4. Criterios de Aceptación

1. Ninguna página de `/clientes` tiene etiquetas HTML sueltas ni formatea importes o fechas por su cuenta.
2. En la pestaña «Cuenta corriente», cada renglón muestra el saldo acumulado y permite navegar con un clic a la factura o al recibo que originó el movimiento.
3. Intentar registrar un pago mayor que la deuda muestra el error de validación antes de enviar (y el servidor también lo rechaza con `422 PAGO_SUPERA_DEUDA`).
4. El recibo (`/clientes/recibos/[id]`) tiene vista de impresión limpia (`@media print` / `print:hidden`).
