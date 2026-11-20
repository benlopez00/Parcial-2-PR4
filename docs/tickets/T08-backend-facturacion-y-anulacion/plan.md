# Plan técnico — T08: Backend de facturación, transacción atómica, concurrencia y anulación

Estado: planificado. Base: `ramaAlvaro`, sobre `T05` y `T06` ya auditados.

> **Nota de orden:** este ticket se desarrolla **antes que el T07**. No rompe ninguna dependencia: el `ticket.md` del T08 depende de `T01`, `T02`, `T03`, `T05` y `T06`, todos terminados, y **no de `T07`**, que es frontend. Hay que avisarle a Ben para que no se sorprenda con el orden de los commits.

## 1. Resumen del flujo

Este ticket implementa el corazón del sistema: emitir una factura es **una sola llamada que el servidor resuelve en una única transacción**, y o se graba todo o no se graba nada.
El cliente manda solo quién compra, qué productos y en qué cantidad, y cómo paga. **Nunca manda precios ni totales**: el servidor los lee del catálogo en el momento y los copia congelados en los renglones, de modo que cambiar el precio mañana no altera una factura de hoy (Regla 3).
Dentro de la transacción se verifica el stock, se calcula el total, se controla el medio de pago, se asigna el número correlativo, se graba la factura con sus renglones, se descuenta la existencia llamando a `moverStock()` —la única función que toca existencias— y, si la venta fue a cuenta corriente, se graba el débito del cliente.
El descuento de stock usa la condición atómica de `moverStock()`, así que si dos vendedores venden la última unidad al mismo tiempo **solo una factura se confirma** y la otra recibe `409 STOCK_INSUFICIENTE`.
Anular es la operación inversa y también atómica: marca la factura, reingresa el stock de cada renglón y, si fue a cuenta, acredita el total.

## 2. Archivos a crear o modificar

**Validaciones Zod (`src/validaciones/`)**
- `validacion-facturas.ts` *(nuevo)*: emisión, anulación y filtros de consulta, todos con `.strict()`.

**Control de errores (`src/errores/`)**
- `verificadores-negocio.ts` *(modificar: agregar al final, sin reordenar)*:
  - `asegurarProductosActivosYConStock(productos, items)`
  - `asegurarCuentaCorrientePermitida(cliente)`
  - `asegurarLimiteCreditoNoExcedido(saldoActual, total, limite)`
  - `asegurarMontoRecibidoSuficiente(montoRecibido, total)`
  - `asegurarFacturaNoAnulada(estado)`

**Servicios (`src/servicios/`)**
- `servicio-facturas.ts` *(nuevo)*: las cinco funciones de la sección 3.

**Adaptadores API (`src/app/api/facturas/`)**
- `route.ts` *(nuevo)*: `GET` (listado) y `POST` (emisión).
- `proximo-numero/route.ts` *(nuevo)*: `GET`. Next.js resuelve el segmento fijo antes que el dinámico `[id]`, así que `/api/facturas/proximo-numero` no cae en la ruta de la factura (Sección 11.9). No hay que hacer nada especial, pero conviene saber por qué funciona.
- `[id]/route.ts` *(nuevo)*: `GET`.
- `[id]/anulacion/route.ts` *(nuevo)*: `POST` (solo admin).

**Pruebas (`src/pruebas/`)**
- `facturacion-y-concurrencia.prueba.ts` *(nuevo)*: los ocho escenarios que enumera el ticket.

**Se reutiliza sin tocar:** `moverStock()` de `servicio-stock.ts` (descuento y reingreso de existencias), `calcularSaldoCliente()` de `servicio-clientes.ts` (saldo para el límite de crédito), `PUNTO_VENTA_ACTUAL` y `formatearNumeroFactura()` de `formatos.ts`, `convertirRangoDiasAInstantesUtc()` de `fechas-consulta.ts` y `ejecutarTransaccionEscritura()`.

No se toca `esquema.ts`: `facturas`, `factura_items` y `movimientos_stock` vienen del T01. **No hay migración en este ticket.**

## 3. Firmas de funciones principales y contratos

```ts
// src/servicios/servicio-facturas.ts

interface ItemFacturaPublico {
  productoId: number; codigo: string; descripcion: string;
  cantidad: number; precioUnitario: number; subtotal: number;
}
interface FacturaPublica {
  id: number; puntoVenta: number; numero: number; numeroFormateado: string;
  fecha: string; estado: "emitida" | "anulada";
  cliente: { id: number; nombre: string; tipoDoc: string; nroDoc: string; domicilio: string | null } | null;
  vendedor: { id: number; nombre: string };
  items: ItemFacturaPublico[]; total: number;
  pago: { forma: "contado"; montoRecibido: number; vuelto: number }
      | { forma: "tarjeta"; tarjeta: { tipo: "debito" | "credito"; marca: string; ultimos4: string } }
      | { forma: "cuenta_corriente" };
  saldoCliente?: number;                                   // solo en ventas a cuenta corriente
  anulacion?: { fecha: string; motivo: string; usuario: { id: number; nombre: string } };
}

confirmarFactura(usuarioActual, datosSinValidar, baseDatos?): Promise<FacturaPublica>
// 1. valida con esquemaEmitirFactura (.strict(), ítems sin repetir, tarjeta de 4 dígitos)
// 2. asegurarUsuarioAutenticado (ambos roles: el vendedor factura)
// 3. dentro de ejecutarTransaccionEscritura, en el orden de la Sección 11.6:
//      a. lee los productos de los ítems → asegurarProductosActivosYConStock()
//         (primero 422 PRODUCTO_INACTIVO, después 409 STOCK_INSUFICIENTE con TODOS los faltantes)
//      b. si hay clienteId: existe y activo; si la forma es cuenta_corriente,
//         asegurarCuentaCorrientePermitida(cliente)   // null = consumidor final → 422
//      c. calcula subtotales y total con BigInt sobre el precio actual del catálogo
//      d. contado  → si no vino montoRecibido se toma el total (Sección 11.6), así el vuelto da 0;
//                    asegurarMontoRecibidoSuficiente(); vuelto = montoRecibido - total
//         cuenta   → saldo = calcularSaldoCliente(transaccion, clienteId)
//                    asegurarLimiteCreditoNoExcedido(saldo, total, cliente.limiteCredito)
//                    limiteCredito en null significa sin tope: no se verifica nada
//      e. numero = MAX(numero) + 1 del PUNTO_VENTA_ACTUAL, leído en la transacción
//      f. inserta la factura, congelando también los datos del cliente (nombre, doc, domicilio)
//      g. inserta los renglones con codigo, descripcion, precioUnitario y subtotal congelados
//      h. por cada renglón:
//         moverStock(usuarioActual, { productoId, tipo: 'venta', cantidad,
//                                     motivo: `Venta ${numeroFormateado}`, facturaId }, transaccion)
//         Ojo: esquemaMoverStock es .strict() y para 'venta' exige motivo (texto libre) y facturaId.
//      i. si es cuenta_corriente: inserta el 'debito' en movimientos_cuenta
// 4. devuelve la factura completa

anularFactura(usuarioActual, datosSinValidar, baseDatos?): Promise<FacturaPublica>
// 1. valida { id, motivo } con esquemaAnularFactura (.strict(), motivo no vacío)
// 2. asegurarRolAdmin(usuarioActual)                      // 403 al vendedor
// 3. dentro de la transacción: lee la factura → asegurarRecursoExiste + asegurarFacturaNoAnulada
//      marca estado 'anulada' con fecha, motivo y usuarioAnulacionId
//      por cada renglón: moverStock(usuarioActual, { productoId, tipo: 'anulacion', cantidad,
//                                     motivo: `Anulación ${numeroFormateado}`, facturaId }, transaccion)
//      si fue cuenta_corriente: inserta el 'credito' por el total en movimientos_cuenta
// 4. devuelve la factura con su objeto `anulacion`

listarFacturas(usuarioActual, datosSinValidar, baseDatos?): Promise<ListadoFacturas>
// Filtros q, desde/hasta (días argentinos), clienteId, vendedorId, forma, estado y paginación.
// De la más nueva a la más vieja, SIN renglones. Agrega totalEmitido: suma de las 'emitida' del filtro.
// q busca por número o por nombre de cliente. Para el número se compara contra el comprobante
// YA FORMATEADO, armado en SQL con printf('%04d-%08d', punto_venta, numero), de modo que
// "123", "00000123" y "0001-00000123" encuentran la misma factura sin tres casos distintos.

obtenerFacturaPorId(usuarioActual, datosSinValidar, baseDatos?): Promise<FacturaPublica>
obtenerProximoNumeroFactura(usuarioActual, datosSinValidar, baseDatos?): Promise<{ numeroFormateado: string }>
// Valida con esquemaSinDatos (el que ya usa Ben para servicios sin parámetros).
// Informativo: el número real se asigna recién al confirmar.
```

**Esquemas Zod** (`validacion-facturas.ts`):

| Esquema | Campos |
| :--- | :--- |
| `esquemaEmitirFactura` | `clienteId` (entero o `null`), `items` (≥1, sin `productoId` repetido, `cantidad` entera > 0), `pago` |
| `esquemaPago` | Unión discriminada por `forma`: `contado` (`montoRecibido?`), `tarjeta` (`tarjeta: { tipo, marca, ultimos4 }`), `cuenta_corriente` |
| `esquemaAnularFactura` | `id`, `motivo` (texto obligatorio) |
| `esquemaListadoFacturas` | `q`, `desde`, `hasta`, `clienteId`, `vendedorId`, `forma`, `estado`, `page`, `pageSize` |
| `esquemaObtenerFactura` | `id` |

**`precio`, `subtotal` y `total` no existen en ningún esquema de entrada.** Esa ausencia *es* la implementación de la Regla 3 y de la respuesta P2.6.
**`tarjeta` lleva su propio `.strict()`**: un `numeroTarjeta` completo muere con `422 VALIDACION` sin código extra (Regla 9 y pregunta P4.1).
**Productos repetidos: dos barreras.** Zod rechaza un `productoId` repetido en `items`, y por debajo el índice único `factura_items_producto_unico` sobre `(facturaId, productoId)` impediría grabarlos igual. La validación da el mensaje claro; el índice es la garantía.

## 4. Reglas de negocio y errores controlados

| Situación | Dónde vive | Error |
| :--- | :--- | :--- |
| Producto dado de baja en la venta | `asegurarProductosActivosYConStock()` | `422 PRODUCTO_INACTIVO` |
| Falta existencia (chequeo previo, con todos los faltantes) | `asegurarProductosActivosYConStock()` | `409 STOCK_INSUFICIENTE` + `details` |
| Falta existencia (carrera real al descontar) | `asegurarStockSuficiente()` *(ya existe, dentro de `moverStock`)* | `409 STOCK_INSUFICIENTE` |
| Cuenta corriente sin cliente o no habilitado (Regla 6) | `asegurarCuentaCorrientePermitida()` | `422 CUENTA_CORRIENTE_NO_HABILITADA` |
| La venta supera el límite de crédito (Regla 7) | `asegurarLimiteCreditoNoExcedido()` | `422 LIMITE_CREDITO_EXCEDIDO` + `details` |
| El monto recibido no cubre el total | `asegurarMontoRecibidoSuficiente()` | `422 MONTO_INSUFICIENTE` |
| Anular una factura ya anulada (Regla 5) | `asegurarFacturaNoAnulada()` | `409 FACTURA_ANULADA` |
| Anulación pedida por un vendedor | `asegurarRolAdmin()` *(ya existe)* | `403 SIN_PERMISO` |
| Número de tarjeta completo, precio o total enviados | `.strict()` de Zod | `422 VALIDACION` |

**Regla 1 (la existencia nunca es negativa) y concurrencia:** se controla **dos veces**. Primero un chequeo previo que junta *todos* los productos faltantes para dar un error útil (paso a). Después, el descuento real de `moverStock()`, que actualiza con `WHERE existencia + variacion >= 0` y aborta si no modificó ninguna fila. **El primero es por comodidad del usuario; el segundo es el que garantiza la regla.**

**Regla 2 (todo cambio de stock deja movimiento):** se cumple sola, porque el único camino es `moverStock()`, que actualiza e inserta el movimiento en la misma transacción.

**Regla 4 (numeración sin huecos):** el número se lee y se asigna **dentro** de la transacción, igual que el recibo del T06. Si la transacción aborta, el número no se consume.

**Regla 3 (precio congelado):** `factura_items` guarda `codigo`, `descripcion`, `precioUnitario` y `subtotal` copiados del catálogo; la tabla `facturas` congela además nombre, documento y domicilio del cliente. Ninguna consulta posterior vuelve a mirar `productos` para reconstruir un total.

**Regla 10 (importes exactos):** subtotales y total se calculan con `BigInt` y se verifica que entren en el entero seguro antes de grabar, igual que hace Ben en `obtenerFichaProducto()`.

**Permisos:** emitir y consultar, **ambos roles**. Anular, **solo admin**. Coincide con `asegurarPermisoMovimientoStock()`, que ya exige admin para el tipo `'anulacion'` y admite al vendedor en `'venta'`.

## 5. Preguntas de defensa cubiertas

Este ticket es el que más preguntas resuelve de los cuatro:

- **P1.7 — ¿Qué tablas se modifican al confirmar una factura?** Cinco: `facturas`, `factura_items`, `productos` (la existencia), `movimientos_stock` y, solo en cuenta corriente, `movimientos_cuenta`.
- **P2.6 — ¿Por qué el cliente no envía el precio ni el total?** Porque el precio lo fija el comercio, no el navegador: si el cliente lo mandara, podría comprar a cualquier precio. Se demuestra en el esquema Zod, que directamente no tiene ese campo.
- **P3.2 — ¿Dos vendedores venden la última unidad al mismo tiempo?** Una sola factura se confirma; la otra recibe `409 STOCK_INSUFICIENTE`. Lo garantiza la condición atómica de `moverStock()`.
- **P3.3 — ¿Dónde se asegura que se grabe todo o nada?** En el `ejecutarTransaccionEscritura()` que envuelve los nueve pasos.
- **P3.4 — ¿Dónde se asigna el número y cómo se evitan huecos?** Dentro de la transacción, leyendo el máximo vigente.
- **P3.5 — ¿Si cambia el precio, qué pasa con las facturas emitidas?** Nada: el precio está copiado en `factura_items`.
- **P3.6 — ¿Dónde se impide vender a cuenta a un consumidor final?** En `asegurarCuentaCorrientePermitida()`, que rechaza `clienteId: null`.
- **P3.7 — ¿Dónde se controla el límite de crédito?** En `asegurarLimiteCreditoNoExcedido()`, con el saldo leído por `calcularSaldoCliente()` dentro de la transacción.
- **P3.9 — ¿Qué hace el sistema al anular?** Marca la factura, reingresa el stock de cada renglón y acredita el total si fue a cuenta. Nunca borra.
- **P4.1 — ¿Dónde se ingresa el número de tarjeta?** En ningún lado: solo se guardan tipo, marca y últimos 4 dígitos.
- **Cambio pequeño 3 (máximo 50 unidades):** un `.max(50)` en `cantidad` dentro de `validacion-facturas.ts`.
- **Cambio pequeño 6 (punto de venta `0002`):** cambiar `PUNTO_VENTA_ACTUAL` en `formatos.ts`, que ya quedó centralizado en el T06.

## 6. Riesgos y decisiones a confirmar

1. **Nombre del verificador de stock.** El `ticket.md` pide `asegurarProductosActivosYConStock`, pero el `AGENTS.md` (§4.2) nombra `asegurarExistenciaDisponible(items)`. **Sigo el `ticket.md`**, que es más específico, y la función hace las dos comprobaciones en orden: primero inactivos, después faltantes.
2. **Cómo se prueba la concurrencia.** Dos transacciones realmente paralelas no son reproducibles sobre una SQLite en memoria de un solo proceso. La prueba lanza las dos ventas con `Promise.allSettled()` y verifica **lo que la regla exige y es observable**: exactamente una factura confirmada, la otra con `409 STOCK_INSUFICIENTE`, la existencia final en `0` y nunca negativa.
3. **El `saldoCliente` de la respuesta** aparece solo en ventas a cuenta corriente, como indica la Sección 11.6.
