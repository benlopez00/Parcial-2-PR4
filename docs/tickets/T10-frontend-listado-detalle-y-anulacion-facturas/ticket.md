# Ticket T10 — Frontend de Listado de Facturas (`/ventas`), Comprobante Imprimible y Anulación

- **Responsable:** Pablo (`ramaPablo`)
- **Estado:** Completado y verificado el 18/11/2026
- **Hito:** Hito 3 — Ventas
- **Dependencias:** `T01` a `T09`

---

## 1. Objetivo

Construir la pantalla de **Listado de Facturas (`/ventas`)** con todos sus filtros sincronizados en la URL y sumatoria de emitidas, la vista de **Detalle y Comprobante Imprimible (`/ventas/[id]`)** y el flujo modal de **Anulación de Factura** con motivo obligatorio exclusivo para el rol Administrador.

---

## 2. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Ventas/facturas.jpg`](../../pantallas/Ventas/facturas.jpg) (`/ventas` — Listado y filtros de facturas)
> - [`docs/pantallas/Ventas/comprobante.jpg`](../../pantallas/Ventas/comprobante.jpg) (`/ventas/[id]` — Comprobante de factura emitida)
> - [`docs/pantallas/Ventas/anular.jpg`](../../pantallas/Ventas/anular.jpg) (Modal de confirmación para anular factura con motivo obligatorio)
> - [`docs/pantallas/Ventas/anulada.jpg`](../../pantallas/Ventas/anulada.jpg) (`/ventas/[id]` — Vista de una factura en estado Anulada)
> - [`docs/pantallas/Vendedor/vendedor-factura.jpg`](../../pantallas/Vendedor/vendedor-factura.jpg) (`/ventas/[id]` visto por un Vendedor: sin botón `Anular`)

### Detalles obligatorios de Interfaz:
1. **Pantalla `/ventas` — Listado de Facturas (`Ventas/facturas.jpg`, `RF-V8`):**
   - Encabezado con título `Facturas`, subtítulo dinámico (`X comprobantes · $ X.XXX,XX emitidos con estos filtros` tomando `totalEmitido` del servicio) y botón `+ Nueva venta`.
   - Barra de filtros en URL:
     - Buscador `Número o cliente` (`q`)
     - Rango de fechas `Desde` y `Hasta` (`dd/mm/aaaa`)
     - Selector `Todos los clientes` (`clienteId`)
     - Selector `Todas las formas de pago` (`Contado`, `Tarjeta`, `Cuenta corriente`)
     - Selector `Todos los vendedores` (`vendedorId`)
     - Selector `Todos los estados` (`Emitida`, `Anulada`)
   - Tabla paginada con columnas: `Número` (`0001-00000071`, enlace a `/ventas/[id]`), `Fecha` (`dd/mm/aaaa HH:mm`), `Cliente` (`Consumidor final` o nombre del cliente), `Vendedor`, `Forma de pago` (insignia con color según medio), `Total` (tachado si está anulada) y `Estado` (insignia verde `Emitida` o roja `Anulada`).
2. **Pantalla `/ventas/[id]` — Comprobante Imprimible (`Ventas/comprobante.jpg`, `Ventas/anulada.jpg`, `Vendedor/vendedor-factura.jpg`, `RF-V7`):**
   - Enlace `← Facturas`, título `Factura 0001-00000067` e insignia de estado (`Emitida` / `Anulada`).
   - Botón `Imprimir` (`window.print()`) y, **solo si el usuario es `admin` y la factura está `emitida`**, botón `Anular` (como se compara entre `Ventas/comprobante.jpg` y `Vendedor/vendedor-factura.jpg`).
   - Si la factura está `anulada` (`Ventas/anulada.jpg`), mostrar banner/alerta superior con la fecha/hora de anulación, el administrador que la anuló y el motivo registrado.
   - Tarjeta central de comprobante lista para imprimir (`print:shadow-none`):
     - Datos del comercio (`Ferretería del Centro S.R.L.`, domicilio, CUIT, teléfono), etiqueta `FACTURA`, `N° 0001-00000067` y fecha/hora.
     - Datos del `Cliente` (nombre, documento y domicilio, o `Consumidor final`) y del `Vendedor`.
     - Tabla de renglones: `Código`, `Descripción`, `Cant.`, `P. unit.` y `Subtotal`.
     - Pie del comprobante: `Forma de pago` (si es contado: monto recibido y vuelto; si es tarjeta: tipo, marca y últimos 4 dígitos; si es cuenta corriente: saldo resultante de la cuenta) y `Total` destacado.
     - Leyenda inferior: `Comprobante interno sin validez fiscal · Precios finales con impuestos incluidos`.
3. **Modal `Anular factura` (`Ventas/anular.jpg`, `RF-V9`):**
   - Explica las consecuencias irreversibles de la anulación (reingreso de stock de cada producto y crédito en cuenta corriente si corresponde).
   - Campo obligatorio `Motivo de anulación` (validado con Zod en cliente y servidor).
   - Al confirmar, invoca la acción/API de anulación y actualiza la vista mostrando el estado `Anulada`.

---

## 3. Archivos a Crear / Modificar

- **Server Actions (`src/app/(sistema)/ventas/acciones.ts`):**
  - Acción `accionAnularFactura` envuelta con `envoltorioAccion`.
- **Componentes de Dominio (`src/componentes/dominio/ventas/`):**
  - `filtros-listado-facturas.tsx`
  - `tabla-listado-facturas.tsx`
  - `vista-comprobante-factura.tsx`
  - `modal-anular-factura.tsx`
- **Páginas (`src/app/(sistema)/ventas/`):**
  - `src/app/(sistema)/ventas/page.tsx`
  - `src/app/(sistema)/ventas/[id]/page.tsx`

---

## 4. Criterios de Aceptación

1. Los filtros de `/ventas` viven en la URL (query params) de modo que al recargar o compartir el enlace se conserva el listado filtrado y su `totalEmitido`.
2. Las facturas anuladas muestran el importe tachado en el listado y no suman en `totalEmitido`.
3. Un usuario con rol `vendedor` no ve el botón `Anular` en `/ventas/[id]` (y si llama a la API recibe `403`).
4. Al imprimir `/ventas/[id]`, se oculta la navegación del sistema y solo se imprime el comprobante.

### Checklist de ejecución

- [x] Leer T08/T09, referencias y contratos; completar `plan.md`.
- [x] Implementar listado, filtros URL, sumatoria y paginación.
- [x] Implementar comprobante histórico para tres formas de pago e impresión.
- [x] Implementar modal y Server Action de anulación con permiso de administrador.
- [x] Probar permisos, validación, stock, cuenta y flujo T09 → T10.
- [x] Verificar móvil, impresión, tipos y build; completar auditoría y defensa.

Validación: **266 pruebas Vitest**, tipos y build aprobados; **49 comprobaciones de navegador** en SQLite aislado. Se corrigió la impresión del modal abierto. Detalle en [`informe-auditoria.md`](./informe-auditoria.md).

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P3.9 (parte visual):** ¿Qué hace el sistema cuando se anula una factura?
- **P4.3:** ¿Dónde se verifica el rol del usuario? ¿Alcanza con ocultar el botón?
- **Ejercicio de cambio pequeño 5:** Agregar una columna al listado de facturas.
