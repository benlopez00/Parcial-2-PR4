# Informe de Auditoría y Guía para el Desarrollador — T06

## 1. Resumen para el Desarrollador

Este ticket construyó el **backend de la cuenta corriente**: el estado de cuenta de un cliente, el registro de pagos con recibo numerado y la consulta del recibo para reimprimirlo. Son tres rutas REST: `GET /api/clientes/[id]/cuenta`, `POST /api/clientes/[id]/pagos` y `GET /api/pagos/[id]`.

1. **Cómo se arma el estado de cuenta (lectura):**
   - La ruta ([`cuenta/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/%5Bid%5D/cuenta/route.ts#L5)) pasa el id y los filtros a `obtenerCuentaCorrienteCliente()` ([`servicio-pagos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L57-L87)) y no decide nada.
   - Los filtros `desde`/`hasta` son días de calendario argentinos y se convierten a instantes UTC con `convertirRangoDiasAInstantesUtc()`, **la misma función que usa Ben en `servicio-stock.ts`**. Así un día significa lo mismo en todo el sistema.
   - Si hay `desde`, lo acumulado antes de esa fecha se devuelve aparte en `saldoAnterior`, y los renglones arrancan desde ahí. El saldo de cada renglón se acumula en el servidor; ningún componente suma importes.

2. **Cómo se registra un pago (escritura):**
   - `registrarPagoCuentaCorriente()` ([L89–L120](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L89-L120)) sigue el orden de cuatro pasos y abre **una única transacción** con `ejecutarTransaccionEscritura()`. Adentro, en este orden: lee el cliente, verifica que exista, esté activo y tenga la cuenta habilitada; lee el saldo; comprueba que el pago no lo supere; asigna el próximo número de recibo; inserta el pago; e inserta el movimiento de crédito vinculado a ese pago.
   - **Si algo falla en el medio, no queda nada**: ni un recibo huérfano, ni un número consumido. Está probado con un *trigger* que hace fallar el crédito a propósito ([`cuenta-corriente-y-pagos.prueba.ts` L114](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/cuenta-corriente-y-pagos.prueba.ts#L114-L124)).
   - El número de recibo se lee y se asigna **dentro** de la transacción ([L102](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L102)), que es lo que cumple la Regla 4 de numeración sin huecos.

3. **De dónde sale el saldo:**
   - De `calcularSaldoCliente()` ([`servicio-clientes.ts` L79](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L79-L97)), el del T05. **Este ticket no escribió una segunda forma de calcularlo**, solo le agregó dos cortes opcionales: `antesDe` para el `saldoAnterior` y `hastaMovimiento` para congelar el saldo de un recibo.
   - Por eso el saldo nunca puede desincronizarse del historial: hay una sola fórmula en todo el sistema.

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| [`src/validaciones/validacion-pagos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-pagos.ts#L7-L28) | Esquemas Zod compartidos con el modal de pago del T07 | `esquemaCuentaCorriente` (L7), `esquemaCuerpoPago` (L16), `esquemaRegistrarPago` (L23), `esquemaObtenerRecibo` (L28) |
| [`src/errores/verificadores-negocio.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L213-L231) | Reglas de rechazo, fuera del flujo normal | `asegurarClienteActivo()` (L213), `asegurarCuentaCorrienteHabilitada()` (L220), `asegurarPagoNoSuperaDeuda()` (L227) |
| [`src/servicios/servicio-pagos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L34-L126) | Flujo normal y reglas del módulo | `leerRecibo()` (L34), `obtenerCuentaCorrienteCliente()` (L57), `registrarPagoCuentaCorriente()` (L89), `obtenerReciboPagoPorId()` (L122) |
| [`src/servicios/servicio-clientes.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-clientes.ts#L79-L97) | *(modificado)* Única fuente de verdad del saldo | `calcularSaldoCliente()` (L79), ahora con el parámetro `corte` |
| [`src/utilidades/formatos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/formatos.ts#L104) | *(modificado)* Punto de venta único del comercio | `PUNTO_VENTA_ACTUAL` (L104), que T08 reutiliza para las facturas |
| [`src/app/api/clientes/[id]/cuenta/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/%5Bid%5D/cuenta/route.ts#L5) | Adaptador REST del estado de cuenta | `GET` (L5) |
| [`src/app/api/clientes/[id]/pagos/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/clientes/%5Bid%5D/pagos/route.ts#L5) | Adaptador REST del registro de pago | `POST` (L5) |
| [`src/app/api/pagos/[id]/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/pagos/%5Bid%5D/route.ts#L5) | Adaptador REST de la reimpresión | `GET` (L5) |
| [`src/pruebas/cuenta-corriente-y-pagos.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/cuenta-corriente-y-pagos.prueba.ts#L44-L182) | Pruebas de los 4 criterios de aceptación y sus bordes | 10 pruebas (L44–L182) |

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas:** `pnpm test` → **194 pruebas en 10 archivos, todas en verde** (eran 184 antes del ticket). `pnpm run verificar:tipos` y `pnpm run build` sin errores; las tres rutas nuevas aparecen en la salida del build.
- **Verificación de extremo a extremo por HTTP:** además de las pruebas unitarias, se levantó el servidor real contra una base aparte y se recorrieron las rutas con `fetch`: **20 comprobaciones, todas correctas** — rechazo sin sesión, alta de cliente, documento duplicado, estado de cuenta, pago con recibo, reimpresión, exceso de pago, ficha con `disponible`, baja bloqueada por deuda, campo no previsto y baja permitida tras saldar.
- **Criterios de aceptación del `ticket.md`:** los cuatro verificados con prueba propia.
- **Reglas de `AGENTS.md`:** las cuatro funciones de servicio llevan su comentario citando requerimiento y regla; los cuatro esquemas usan `.strict()`; las tres rutas no contienen lógica de negocio ni formateo manual; las pruebas viven separadas.
- **No se tocó `esquema.ts`:** las tablas `pagos` y `movimientos_cuenta` ya venían del T01. **Este ticket no genera migración.**

**Errores detectados y corregidos:**

1. **El recibo reimpreso mostraba el saldo de hoy, no el que tenía impreso (`servicio-pagos.ts`, L34–L56).** `leerRecibo()` calculaba `saldoCliente` con el saldo vigente del cliente. Como la misma función arma la respuesta de la emisión y la de la reimpresión, un recibo de $5.000 que dejó el saldo en $4.600 iba a mostrar **$0** si el cliente cancelaba el resto al día siguiente: el papel original y la reimpresión no coincidían. Se corrigió calculando el saldo **hasta su propio movimiento de crédito**, con el mismo orden `(fecha, id)` del estado de cuenta, reutilizando `calcularSaldoCliente()` con un corte en vez de escribir otra suma. Es la misma idea de la Regla 3, que congela el precio en la factura: un comprobante es un documento histórico.
2. **Un código de error no coincidía con el ticket (`verificadores-negocio.ts`, L213).** Para un cliente dado de baja, `asegurarClienteActivo()` lanzaba `422 VALIDACION`, mientras que el `ticket.md` pide `422 CUENTA_CORRIENTE_NO_HABILITADA` para las tres condiciones que verifica. Se alineó al ticket, que además encaja con el catálogo del enunciado: ese código significa «venta o pago a cuenta no permitido», y a un cliente de baja no se le permite.
3. **Una prueba mal planteada, no un error del código (`cuenta-corriente-y-pagos.prueba.ts`, L168).** La primera versión de la prueba del saldo congelado le ponía al débito posterior una fecha **anterior** a la de los pagos. Con el orden `(fecha, id)` ese débito queda antes del recibo en el historial, así que corresponde que lo cuente, y la prueba fallaba con razón. Se corrigió la prueba usando una fecha posterior, que es lo que ocurre en la realidad: los movimientos se graban en el momento en que suceden, nunca con fecha hacia atrás.

**Decisiones declaradas (no son errores, pero conviene conocerlas):**

- **Con deuda en cero, cualquier pago se rechaza.** Es la Regla 8 literal: no se admiten saldos a favor, así que el sistema no registra adelantos. En el T07, el botón de registrar pago debe aparecer deshabilitado cuando el cliente no debe nada.
- **El `saldo` del estado de cuenta es el acumulado al final del rango consultado**, no el saldo total del cliente. Con un filtro `hasta`, ese número es histórico. El T07 no debe usarlo para decidir si habilita el pago: para eso está el `saldo` de la ficha del cliente.
- **El cuerpo del pago llega anidado** (`{ clienteId, pago: {...} }`), igual que `registrarMovimientoManual()` en productos. Efecto visible: los errores de validación nombran el campo como `pago.importe`. Es el mismo comportamiento que `cambios.saldo` en el T05.
- **`PUNTO_VENTA_ACTUAL` se agregó a `formatos.ts`**, que es un archivo compartido. Es una línea al final, sin reordenar nada.

## 4. Guía de Defensa Rápida del Ticket

| Pregunta probable | Dónde hacer clic |
| :--- | :--- |
| **¿Dónde se impide registrar un pago mayor que la deuda?** | En `asegurarPagoNoSuperaDeuda()` ([verificadores-negocio.ts L227](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L227)), llamada desde `registrarPagoCuentaCorriente()` **dentro de la transacción** ([L95](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L95)), después de leer el saldo. Si la deuda es cero, cualquier importe la supera: no hay saldos a favor. |
| **¿Dónde se asigna el número de recibo? ¿Cómo evitan que queden salteados?** | En [L102–L105](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-pagos.ts#L102-L105), leyendo el máximo vigente **dentro de la transacción**. Si la transacción aborta, el número no se consume y lo toma el pago siguiente. Probado en [L114](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/cuenta-corriente-y-pagos.prueba.ts#L114-L124). |
| **¿Cómo garantizan que el pago y el movimiento se graben juntos?** | Las dos inserciones ocurren dentro del mismo `ejecutarTransaccionEscritura()`. Para demostrarlo, la prueba instala un *trigger* en SQLite que hace fallar el crédito y comprueba que el pago anterior se deshizo: la tabla `pagos` queda vacía. |
