# Informe de Auditoría y Guía para el Desarrollador — T08

## 1. Resumen para el Desarrollador

Este ticket construyó el **corazón transaccional del sistema**: emitir una factura, consultarla, listarla y anularla. Son cinco rutas REST bajo `/api/facturas`.

1. **Qué manda el cliente y qué calcula el servidor (Regla 3):**
   - El cuerpo de `POST /api/facturas` lleva **solo** `clienteId` (o `null` para consumidor final), `items: [{ productoId, cantidad }]` y `pago`. **No existe ningún campo de precio ni de total en `esquemaEmitirFactura`** ([`validacion-facturas.ts` L37](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-facturas.ts#L37-L45)). Esa ausencia, más el `.strict()`, es toda la implementación: un precio enviado desde el navegador muere con `422 VALIDACION` sin una línea de código dedicada.
   - El servidor lee el precio y la descripción vigentes del catálogo y los **copia** en `factura_items`. La factura guarda además nombre, documento y domicilio del comprador. Nada se vuelve a leer de `productos` ni de `clientes` para reconstruir un comprobante.

2. **Los nueve pasos, todos dentro de una sola transacción ([`servicio-facturas.ts` L154–L243](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-facturas.ts#L154-L243)):**
   están numerados como comentarios en el código, en el mismo orden de la Sección 11.6: productos (L161), comprador (L171), total con `BigInt` (L181), reglas del pago (L196), número correlativo (L206), inserción de la factura (L213), renglones, descuento de stock (L225) y débito en cuenta corriente (L233).
   **Si cualquiera falla, no queda nada**: ni factura, ni renglones, ni stock descontado, ni número consumido.

3. **Por qué el stock no puede quedar negativo (Regla 1):**
   se controla **dos veces, y son distintas**. Primero un chequeo previo que junta *todos* los productos faltantes para dar un error útil (`asegurarProductosActivosYConStock`). Después el descuento real de `moverStock()`, que actualiza con `WHERE existencia + variacion >= 0` y aborta si no modificó ninguna fila. **El primero es comodidad para el vendedor; el segundo es el que garantiza la regla** cuando dos ventas compiten por la última unidad.

4. **Anular es la operación inversa y también atómica ([L245–L283](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-facturas.ts#L245-L283)):** marca la factura, reingresa el stock de cada renglón **por el mismo camino** (`moverStock` con tipo `'anulacion'`) y acredita el total si fue a cuenta. La factura nunca se borra ni se edita.

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| [`src/validaciones/validacion-facturas.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-facturas.ts#L15-L66) | Esquemas Zod; lo que *no* tienen implementa las Reglas 3 y 9 | `esquemaTarjeta` (L23), `esquemaPagoFactura` (L30), `esquemaEmitirFactura` (L37), `esquemaAnularFactura` (L47), `esquemaListadoFacturas` (L53) |
| [`src/errores/verificadores-negocio.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L237-L302) | Reglas de rechazo, fuera del flujo normal | `asegurarProductosActivosYConStock()` (L237), `asegurarCuentaCorrientePermitida()` (L263), `asegurarLimiteCreditoNoExcedido()` (L271), `asegurarMontoRecibidoSuficiente()` (L282), `asegurarFacturaNoAnulada()` (L289), `asegurarImporteFacturaDentroDeRango()` (L296) |
| [`src/servicios/servicio-facturas.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-facturas.ts#L52-L343) | Flujo normal y reglas del módulo | `confirmarFactura()` (L154), `anularFactura()` (L245), `listarFacturas()` (L285), `obtenerFacturaPorId()` (L338), `obtenerProximoNumeroFactura()` (L141), `leerFactura()` (L88), `interpretarNumeroComprobante()` (L52) |
| [`src/app/api/facturas/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/facturas/route.ts#L5-L7) | Adaptador REST de listado y emisión | `GET` (L5), `POST` (L7) |
| [`src/app/api/facturas/proximo-numero/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/facturas/proximo-numero/route.ts#L5) | Número informativo | `GET` (L5) |
| [`src/app/api/facturas/[id]/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/facturas/%5Bid%5D/route.ts#L5) | Comprobante completo | `GET` (L5) |
| [`src/app/api/facturas/[id]/anulacion/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/facturas/%5Bid%5D/anulacion/route.ts#L5) | Anulación, solo admin | `POST` (L5) |
| [`src/pruebas/facturacion-y-concurrencia.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/facturacion-y-concurrencia.prueba.ts#L54-L272) | 13 pruebas, una por escenario del ticket | Concurrencia (L175), atomicidad (L139), precio congelado (L194), anulación (L204), numeración (L245) |

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas:** `pnpm test` → **207 pruebas en 11 archivos, todas en verde** (eran 194 antes del ticket). `pnpm run verificar:tipos` y `pnpm run build` sin errores; las cuatro rutas nuevas aparecen en la salida del build.
- **Verificación de extremo a extremo por HTTP:** se levantó el servidor real contra una base aparte y se recorrió **la demo de 10 minutos que pide el enunciado** — venta de contado a consumidor final, alta de cliente y venta en cuenta corriente, pago, anulación — verificando stock y saldo después de cada paso. **32 comprobaciones, todas correctas.**
- **Reglas de `AGENTS.md`:** ningún `UPDATE` de existencia fuera de `moverStock()`; ninguna segunda fórmula de saldo (se usa `calcularSaldoCliente()` del T05); ninguna lógica ni formateo en las rutas; las cinco funciones exportadas con su comentario citando requerimiento y regla.
- **Reutilización:** `moverStock()` del T03, `calcularSaldoCliente()` del T05, `PUNTO_VENTA_ACTUAL` y `formatearNumeroFactura()` del T06, `convertirRangoDiasAInstantesUtc()` del T03. **Este ticket no reimplementó nada que ya existiera.**
- **No se tocó `esquema.ts`.** **No hay migración en este ticket.**

**Errores detectados y corregidos:**

1. **La búsqueda por número traía facturas de más (`servicio-facturas.ts`, L52–L61).** El plan indicaba comparar contra el comprobante ya formateado con `LIKE '%q%'`, armándolo en SQL con `printf('%04d-%08d', ...)`. Parecía elegante porque resolvía con un solo caso las tres formas de escribir el número. **Pero buscar `"1"` devolvía también la factura 2**, porque `0001-00000002` contiene un `1` en el punto de venta — y con más facturas el ruido sería peor. Lo detectó la prueba del listado, no la revisión del plan. Se reemplazó por `interpretarNumeroComprobante()`, que entiende `1`, `00000001` y `0001-00000001` (se queda con lo que va después del guion) y compara **por igualdad**. El nombre del cliente sigue buscándose por subcadena, que ahí sí es lo que se espera.
2. **Tipo demasiado estrecho en el ayudante de búsqueda.** `minusculasSql()` estaba tipado contra la columna `clientes.nombre` y acá se usa sobre `facturas.clienteNombre`, que es el nombre **congelado** en el comprobante. Se amplió el tipo y se dejó anotado que en consumidor final ese campo es `NULL`, de modo que esas facturas no aparecen al buscar por nombre.

**Decisiones declaradas (no son errores, pero hay que conocerlas):**

- **Anular una factura ya pagada en parte deja saldo a favor del cliente.** Si debía $37.500, pagó $17.500 y se anula la factura, el crédito por el total lo deja en **−$17.500**. Es lo que manda la Sección 11.6 (la anulación acredita el total) y roza la Regla 8, que prohíbe los saldos a favor — pero esa regla aplica a los pagos, no a las anulaciones. El sistema se comporta bien igual: ese cliente **no** aparece en el listado de deudores, **no** suma al `totalAdeudado`, **no** admite otro pago y **no** se puede dar de baja hasta volver a cero. Verificado en la prueba de extremo a extremo.
- **La búsqueda por nombre usa el nombre congelado en la factura**, no el actual del cliente. Si el cliente cambia de nombre, sus facturas viejas se siguen encontrando por el nombre que tenían impreso. Es coherente con la Regla 3.
- **Se agregó un sexto verificador, `asegurarImporteFacturaDentroDeRango()`**, que el `ticket.md` no pedía. Reutilizar el de Ben (`asegurarValorStockDentroDeRango`) habría dado un mensaje equivocado, hablando del valor del stock en vez del total de la factura.
- **El `saldoCliente` de la factura se congela**, igual que en el recibo del T06: se calcula hasta el propio movimiento de débito, no con el saldo de hoy.

## 4. Guía de Defensa Rápida del Ticket

| Pregunta probable | Dónde hacer clic |
| :--- | :--- |
| **¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?** | Una sola factura se confirma. Mostrar el `UPDATE` condicional dentro de [`moverStock()`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-stock.ts#L92-L100) y después la prueba que lo ejecuta ([L175](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/facturacion-y-concurrencia.prueba.ts#L175-L193)): dos ventas simultáneas, una confirmada, la otra con `409`, existencia final `0`. |
| **¿Por qué el cliente no envía el precio?** | Abrir `esquemaEmitirFactura` ([L37](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-facturas.ts#L37)) y señalar que **el campo no existe**, y que `.strict()` rechaza cualquier campo de más. El precio se lee del catálogo en el paso 3 y 4 ([L181](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-facturas.ts#L181)). |
| **¿Dónde se asegura que se grabe todo o nada?** | El `ejecutarTransaccionEscritura()` que envuelve los nueve pasos ([L160](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-facturas.ts#L160)). La prueba de atomicidad ([L139](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/facturacion-y-concurrencia.prueba.ts#L139)) pide dos renglones donde el segundo no tiene stock y comprueba que el primero **no** se descontó y que no quedó ninguna factura. |
