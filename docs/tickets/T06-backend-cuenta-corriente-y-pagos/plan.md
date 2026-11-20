# Plan técnico — T06: Backend de cuenta corriente y pagos con recibo

Estado: planificado. Base: `ramaAlvaro`, sobre `T05` ya auditado.

## 1. Resumen del flujo

El módulo agrega tres rutas REST: el estado de cuenta corriente de un cliente, el registro de un pago a cuenta y la consulta de un recibo para reimprimirlo.
El estado de cuenta lee `movimientos_cuenta` en orden cronológico y **calcula el saldo acumulado renglón por renglón en el servidor**; si se filtra con `desde`, lo que quedó antes de esa fecha se devuelve aparte en `saldoAnterior` y la acumulación arranca desde ahí.
Registrar un pago es una operación compuesta y por lo tanto va en **una sola transacción**: asigna el próximo número de recibo, inserta la fila en `pagos` e inserta el movimiento de tipo `credito` en `movimientos_cuenta` apuntando a ese pago. O se graban las tres cosas o no se graba ninguna.
Antes de grabar se verifican dos reglas: el cliente tiene que tener la cuenta corriente habilitada, y el importe no puede superar la deuda (Regla 8: no se admiten saldos a favor).
El saldo **no se recalcula con una fórmula nueva**: se reutiliza `calcularSaldoCliente()` del T05, que sigue siendo la única fuente de verdad.

## 2. Archivos a crear o modificar

**Validaciones Zod (`src/validaciones/`)**
- `validacion-pagos.ts` *(nuevo)*: esquema de registro de pago con `.strict()` y esquema de filtros de fecha de la cuenta corriente.

**Control de errores (`src/errores/`)**
- `verificadores-negocio.ts` *(modificar: agregar al final, sin reordenar)*:
  - `asegurarCuentaCorrienteHabilitada(cliente)` — firma tomada de `AGENTS.md` §4.2.
  - `asegurarPagoNoSuperaDeuda(importe, saldoActual)` — firma tomada de `AGENTS.md` §4.2.
  - `asegurarClienteActivo(cliente)` — el `ticket.md` pide verificar que el cliente **esté activo** y hoy no existe ningún verificador que lo haga.

**Utilidades (`src/utilidades/`)**
- `formatos.ts` *(modificar)*: agregar la constante `PUNTO_VENTA_ACTUAL = 1`, hoy implícita en el `default(1)` del esquema. `respuestas-defensa.md` ya la promete para el cambio pequeño 6 («cambiar el punto de venta a `0002`»), y T06 es el primer ticket que numera comprobantes. T08 la reutiliza para las facturas.
- **Se reutilizan sin tocar:** `convertirRangoDiasAInstantesUtc()` de `fechas-consulta.ts` para los filtros `desde`/`hasta` (es la misma función que usa Ben en `servicio-stock.ts`, así que las fechas se interpretan igual en todo el sistema) y `formatearNumeroRecibo()` de `formatos.ts` para el `R 0001-00000341`.

**Servicios (`src/servicios/`)**
- `servicio-pagos.ts` *(nuevo)*: las tres funciones de la sección 3.

**Adaptadores API (`src/app/api/`)**
- `clientes/[id]/cuenta/route.ts` *(nuevo)*: `GET`.
- `clientes/[id]/pagos/route.ts` *(nuevo)*: `POST`.
- `pagos/[id]/route.ts` *(nuevo)*: `GET`.

**Pruebas (`src/pruebas/`)**
- `cuenta-corriente-y-pagos.prueba.ts` *(nuevo)*: una prueba por criterio de aceptación.

No se toca `esquema.ts`: las tablas `pagos` y `movimientos_cuenta` ya vienen del T01, con su índice único `pagos_numeracion_unica` sobre `(puntoVenta, numeroRecibo)`. **No hay migración en este ticket.**

## 3. Firmas de funciones principales y contratos

```ts
// src/servicios/servicio-pagos.ts

interface MovimientoCuentaPublico {
  fecha: string; tipo: "debito" | "credito"; importe: number; descripcion: string;
  facturaId: number | null; pagoId: number | null; saldo: number;   // saldo acumulado hasta este renglón
}
interface CuentaCorrienteCliente {
  cliente: { id: number; nombre: string };
  saldoAnterior: number; movimientos: MovimientoCuentaPublico[]; saldo: number;
}
interface ReciboPago {
  id: number; numeroRecibo: string; fecha: string;
  cliente: { id: number; nombre: string }; importe: number;
  medio: "efectivo" | "transferencia" | "tarjeta_debito"; observacion: string | null;
  usuario: { id: number; nombre: string }; saldoCliente: number;
}

obtenerCuentaCorrienteCliente(usuarioActual, datosSinValidar, baseDatos?): Promise<CuentaCorrienteCliente>
// 1. valida { id, desde?, hasta? } con esquemaCuentaCorriente
// 2. asegurarUsuarioAutenticado (ambos roles)
// 3. verifica que el cliente exista; convierte desde/hasta a instantes UTC con
//    convertirRangoDiasAInstantesUtc(); suma los movimientos anteriores a "desde" en saldoAnterior;
//    trae los del rango ordenados por (fecha, id) y acumula el saldo renglón por renglón
// 4. devuelve { cliente, saldoAnterior, movimientos, saldo }

registrarPagoCuentaCorriente(usuarioActual, datosSinValidar, baseDatos?): Promise<ReciboPago>
// 1. valida { clienteId, importe, medio, observacion? } con esquemaRegistrarPago (.strict())
// 2. asegurarUsuarioAutenticado (ambos roles: el vendedor cobra en el mostrador)
// 3. dentro de ejecutarTransaccionEscritura:
//      a. lee el cliente → asegurarRecursoExiste() + asegurarClienteActivo()
//      b. asegurarCuentaCorrienteHabilitada(cliente)
//      c. saldo = calcularSaldoCliente(transaccion, clienteId)   // reutiliza T05
//      d. asegurarPagoNoSuperaDeuda(importe, saldo)
//      e. numeroRecibo = max(numeroRecibo) + 1 de PUNTO_VENTA_ACTUAL, leído en la transacción
//      f. inserta en pagos
//      g. inserta el movimiento 'credito' en movimientos_cuenta con pagoId y
//         descripción formatearNumeroRecibo(PUNTO_VENTA_ACTUAL, numeroRecibo)
// 4. devuelve el recibo con saldoCliente = saldo - importe

obtenerReciboPagoPorId(usuarioActual, datosSinValidar, baseDatos?): Promise<ReciboPago>
// Mismo objeto que la emisión, para reimprimir. 404 NO_ENCONTRADO si no existe.
```

**Esquemas Zod** (`validacion-pagos.ts`):

| Esquema | Campos |
| :--- | :--- |
| `esquemaCuentaCorriente` | `id`, `desde?`, `hasta?` (`AAAA-MM-DD`), con `desde <= hasta` |
| `esquemaRegistrarPago` | `clienteId`, `importe` (entero > 0), `medio` (enum de 3), `observacion?` |
| `esquemaObtenerRecibo` | `id` |

`saldo` y `numeroRecibo` **no se aceptan como entrada**: los calcula y asigna el servidor.

## 4. Reglas de negocio y errores controlados

| Situación | Dónde vive | Error |
| :--- | :--- | :--- |
| Cliente sin cuenta corriente habilitada | `asegurarCuentaCorrienteHabilitada()` | `422 CUENTA_CORRIENTE_NO_HABILITADA` |
| Pago mayor que la deuda, o deuda en cero (Regla 8) | `asegurarPagoNoSuperaDeuda()` | `422 PAGO_SUPERA_DEUDA` |
| Cliente dado de baja | `asegurarClienteActivo()` | `422 VALIDACION` |
| Cliente o recibo inexistente | `asegurarRecursoExiste()` *(ya existe)* | `404 NO_ENCONTRADO` |
| Importe no entero, negativo o medio inválido | `.strict()` de Zod | `422 VALIDACION` |
| Dos pagos simultáneos tomando el mismo número | ver nota de concurrencia abajo | — |

> **Nota de concurrencia, con precisión.** `ejecutarTransaccionEscritura()` reintenta **solo** ante contención de escritura de SQLite (`SQLITE_BUSY`), no ante una colisión del índice único. En la práctica, dos pagos simultáneos chocan primero por el bloqueo de escritura: el segundo recibe `SQLITE_BUSY`, se reintenta la operación completa y vuelve a leer el máximo, por lo que toma el número siguiente. El índice único `pagos_numeracion_unica` queda como última barrera: si aun así colisionaran, la transacción aborta y **no se graba un recibo con número repetido**. La prueba de concurrencia real de numeración corresponde al T08, que es el ticket que la tiene como criterio de aceptación.

**Regla 4 (numeración sin huecos):** el número de recibo se asigna **dentro de la transacción**, leyendo el máximo vigente. Si la transacción aborta, no se consume ningún número.
**Regla 8:** vive en un único lugar, `asegurarPagoNoSuperaDeuda()`.
**Regla 7:** el saldo se sigue derivando de `movimientos_cuenta`; este ticket **no agrega una segunda forma de calcularlo**, reutiliza `calcularSaldoCliente()` del T05.

**Permisos:** las tres funciones usan `asegurarUsuarioAutenticado()`, no `asegurarRolAdmin()`. La tabla de la Sección 3 del enunciado habilita al vendedor a registrar pagos en cuenta corriente.

## 5. Preguntas de defensa cubiertas

- **P3.8 — ¿Dónde se impide registrar un pago mayor que la deuda?** En `asegurarPagoNoSuperaDeuda()` de `src/errores/verificadores-negocio.ts`, llamada desde `registrarPagoCuentaCorriente()` **dentro de la transacción**, después de leer el saldo con `calcularSaldoCliente()`.
- **Aporta a P1.6** — el saldo del cliente se calcula, nunca se guarda: este ticket escribe movimientos, no saldos.
- **Aporta a P1.7 y P3.3** — qué tablas se tocan en una operación compuesta y cómo se garantiza que se grabe todo o nada.
- **Cambio pequeño 2 (agregar «Mercado Pago»):** un solo renglón, el `enum` de `medio` en `validacion-pagos.ts`, más su etiqueta legible. Queda validado en cliente y servidor a la vez.
