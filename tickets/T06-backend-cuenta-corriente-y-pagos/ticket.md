# Ticket T06 — Backend de Cuenta Corriente y Registro de Pagos con Recibo

- **Responsable:** Integrante 2 (`rama: integrante-2`)
- **Hito:** Hito 2 — Clientes
- **Dependencias:** `T01`, `T02`, `T05`

---

## 1. Objetivo

Implementar los esquemas Zod, verificadores de error, servicios y las 3 rutas de API REST correspondientes al **estado de cuenta corriente** de un cliente (`GET /api/clientes/[id]/cuenta`), el **registro de pagos a cuenta** en una transacción atómica que emite un recibo numerado (`POST /api/clientes/[id]/pagos`) y la **consulta de recibo** para reimpresión (`GET /api/pagos/[id]`).

---

## 2. Requerimientos y Reglas Incluidas

- **RF-C4 Cuenta corriente (`GET /api/clientes/[id]/cuenta`):**
  - Devuelve los movimientos del cliente en **orden cronológico** (del más viejo al más nuevo) con el `saldo` acumulado renglón por renglón.
  - Acepta filtros opcionales `desde` y `hasta` (`AAAA-MM-DD` en hora de Argentina). Si `desde` corta el historial, calcula y devuelve en `saldoAnterior` lo acumulado antes de esa fecha, y cada renglón parte de ese `saldoAnterior`.
- **RF-C5 Registrar pago (`POST /api/clientes/[id]/pagos` y `GET /api/pagos/[id]`):**
  - Recibe `importe` (entero positivo en centavos), `medio` (`efectivo`, `transferencia` o `tarjeta_debito`) y `observacion` opcional.
  - Verifica que el cliente exista, esté activo y tenga `cuentaCorriente === true` (si no, lanza `422 CUENTA_CORRIENTE_NO_HABILITADA`).
  - Verifica que `importe <= saldoActual` (Regla 8: un pago nunca supera la deuda; si es mayor o el saldo es 0, lanza `422 PAGO_SUPERA_DEUDA`).
  - En una **única transacción**:
    1. Asigna el próximo número correlativo de recibo (`R 0001-00000341`).
    2. Inserta el pago en la tabla `pagos` con usuario y fecha/hora.
    3. Inserta el movimiento de tipo `'credito'` en `movimientos_cuenta` vinculado al `pagoId` con descripción `"Recibo R 0001-..."`.
  - Devuelve `201` con los datos del recibo y `saldoCliente` actualizado.

---

## 3. Archivos a Crear / Modificar

- **Validaciones (`src/validaciones/`):**
  - `src/validaciones/validacion-pagos.ts`: Esquema de registro de pago (`.strict()`) y esquema de filtros de fecha para cuenta corriente.
- **Verificadores de Error (`src/errores/verificadores-negocio.ts`):**
  - `asegurarCuentaCorrienteHabilitada` (`422 CUENTA_CORRIENTE_NO_HABILITADA`).
  - `asegurarPagoNoSuperaDeuda` (`422 PAGO_SUPERA_DEUDA`).
- **Servicios (`src/servicios/`):**
  - `src/servicios/servicio-pagos.ts`:
    - `obtenerCuentaCorrienteCliente(usuarioActual, clienteId, filtros)`
    - `registrarPagoCuentaCorriente(usuarioActual, clienteId, datosSinValidar)`
    - `obtenerReciboPagoPorId(usuarioActual, pagoId)`
- **Rutas API REST (3 endpoints en `src/app/api/`):**
  - `GET /api/clientes/[id]/cuenta` (`src/app/api/clientes/[id]/cuenta/route.ts`)
  - `POST /api/clientes/[id]/pagos` (`src/app/api/clientes/[id]/pagos/route.ts`)
  - `GET /api/pagos/[id]` (`src/app/api/pagos/[id]/route.ts`)
- **Testing Separado (`src/pruebas/`):**
  - `src/pruebas/cuenta-corriente-y-pagos.prueba.ts`: Pruebas de evolución de saldo acumulado renglón por renglón, cálculo de `saldoAnterior` al filtrar con `desde`, pago parcial exitoso con generación de recibo correlativo, rechazo `422 PAGO_SUPERA_DEUDA` y rechazo `422 CUENTA_CORRIENTE_NO_HABILITADA`.

---

## 4. Criterios de Aceptación

1. Si un cliente tiene un débito de `960000` y luego un pago (crédito) de `500000`, `GET /api/clientes/[id]/cuenta` muestra en el primer renglón `saldo: 960000`, en el segundo `saldo: 460000` y el saldo final `460000`.
2. Intentar pagar `500001` cuando la deuda es `460000` devuelve `422 PAGO_SUPERA_DEUDA` y no crea recibo ni movimiento.
3. El pago y el movimiento de crédito se graban en la misma transacción.
4. `pnpm test` ejecuta y aprueba todas las pruebas de `cuenta-corriente-y-pagos.prueba.ts`.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P3.8:** ¿Dónde se impide registrar un pago mayor que la deuda?
- **Ejercicio de cambio pequeño 2:** Agregar «Mercado Pago» como medio de pago de la cuenta corriente.
