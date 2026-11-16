# Ticket T08 — Backend de Facturación, Transacción Atómica, Concurrencia y Anulación

- **Responsable:** Integrante 2 (`rama: integrante-2`)
- **Hito:** Hito 3 — Ventas
- **Dependencias:** `T01`, `T02`, `T03`, `T05`, `T06`

---

## 1. Objetivo

Implementar el corazón transaccional del sistema: esquemas Zod, verificadores de error, servicio de facturación (`confirmarFactura`, `anularFactura`, `listarFacturas`, `obtenerFacturaPorId`, `obtenerProximoNumeroFactura`) y las 5 rutas de API REST bajo `/api/facturas`.

---

## 2. Requerimientos y Reglas Incluidas

- **RF-V1 a RF-V6 Emisión de factura (`POST /api/facturas`):**
  - El cliente envía únicamente `clienteId` (`null` para consumidor final), `items: [{ productoId, cantidad }]` (sin productos repetidos) y `pago` (`contado`, `tarjeta` o `cuenta_corriente`).
  - **No acepta precios ni totales desde el cliente** (`.strict()`).
  - **Con tarjeta:** exige `tarjeta: { tipo: 'debito' | 'credito', marca: string, ultimos4: /^\d{4}$/ }` con `.strict()` (si llega un número completo de tarjeta, rechaza con `422 VALIDACION`).
  - **Pasos obligatorios en orden dentro de `bd.transaction(...)` (Sección 11.6):**
    1. Validar cuerpo y que todos los productos existan y estén activos (`422 PRODUCTO_INACTIVO` si alguno está dado de baja).
    2. Si hay `clienteId`, verificar que exista y esté activo; si `pago.forma === 'cuenta_corriente'`, verificar que `clienteId !== null` y que tenga `cuentaCorriente === true` (`422 CUENTA_CORRIENTE_NO_HABILITADA`).
    3. Leer existencias de todos los productos y comprobar que alcancen (`409 STOCK_INSUFICIENTE` listando en `details` todos los productos con `{ productoId, solicitado, disponible }`).
    4. Tomar el precio y descripción actuales del catálogo y calcular subtotales y `total` en el servidor.
    5. Si es `contado` y viene `montoRecibido`, verificar `montoRecibido >= total` (`422 MONTO_INSUFICIENTE`) y calcular `vuelto`. Si es `cuenta_corriente`, verificar que `saldoActual + total <= limiteCredito` cuando tiene límite (`422 LIMITE_CREDITO_EXCEDIDO` con `details: { saldoActual, limite, excedente }`).
    6. Asignar el próximo número correlativo (`puntoVenta = 1`, `MAX(numero) + 1`).
    7. Insertar la factura en `facturas` y sus renglones en `factura_items` con precio y descripción congelados.
    8. Descontar la existencia de cada producto llamando a `moverStock()` (con condición atómica `WHERE id = ? AND existencia >= ?` para resolver concurrencia de última unidad) y grabando un movimiento `'venta'` por cada renglón con referencia a la factura.
    9. Si es `cuenta_corriente`, insertar el movimiento `'debito'` en `movimientos_cuenta`.
- **RF-V7, RF-V8 y Próximo Número (`GET /api/facturas`, `GET /api/facturas/[id]`, `GET /api/facturas/proximo-numero`):**
  - `GET /api/facturas`: filtros `q` (número o nombre de cliente), `desde`, `hasta` (en hora de Argentina), `clienteId`, `vendedorId`, `forma`, `estado`, paginación; devuelve además `totalEmitido` (suma de las facturas en estado `'emitida'` que cumplen el filtro).
  - `GET /api/facturas/[id]`: factura completa con sus renglones, pago y (si está anulada) objeto `anulacion` con fecha, usuario y motivo.
  - `GET /api/facturas/proximo-numero`: informativo `{ numeroFormateado: "0001-00001234" }`.
- **RF-V9 Anulación (`POST /api/facturas/[id]/anulacion` — solo Admin):**
  - Exige rol `admin` (`403 SIN_PERMISO`) y `motivo` obligatorio no vacío (`422 VALIDACION`).
  - Si ya estaba anulada, responde `409 FACTURA_ANULADA`.
  - En una única transacción: marca la factura como `'anulada'`, reingresa la existencia de cada renglón llamando a `moverStock()` con tipo `'anulacion'` y, si fue en `'cuenta_corriente'`, registra un `'credito'` por el total en `movimientos_cuenta`.

---

## 3. Archivos a Crear / Modificar

- **Validaciones (`src/validaciones/`):**
  - `src/validaciones/validacion-facturas.ts`: Esquemas Zod de emisión de factura (con `.strict()`, sin productos repetidos, tarjeta solo 4 dígitos), de anulación y de filtros de consulta.
- **Verificadores de Error (`src/errores/verificadores-negocio.ts`):**
  - `asegurarProductosActivosYConStock`, `asegurarCuentaCorrientePermitida`, `asegurarLimiteCreditoNoExcedido`, `asegurarMontoRecibidoSuficiente`, `asegurarFacturaNoAnulada`.
- **Servicios (`src/servicios/`):**
  - `src/servicios/servicio-facturas.ts`:
    - `confirmarFactura(usuarioActual, datosSinValidar)`
    - `anularFactura(usuarioActual, facturaId, datosSinValidar)`
    - `listarFacturas(usuarioActual, filtros)`
    - `obtenerFacturaPorId(usuarioActual, facturaId)`
    - `obtenerProximoNumeroFactura(usuarioActual)`
- **Rutas API REST (5 endpoints en `src/app/api/facturas/`):**
  - `GET /api/facturas` y `POST /api/facturas` (`src/app/api/facturas/route.ts`)
  - `GET /api/facturas/proximo-numero` (`src/app/api/facturas/proximo-numero/route.ts`)
  - `GET /api/facturas/[id]` (`src/app/api/facturas/[id]/route.ts`)
  - `POST /api/facturas/[id]/anulacion` (`src/app/api/facturas/[id]/anulacion/route.ts`)
- **Testing Separado (`src/pruebas/`):**
  - `src/pruebas/facturacion-y-concurrencia.prueba.ts`:
    - Emisión en contado, tarjeta y cuenta corriente verificando las 5 tablas modificadas.
    - Rechazo de tarjeta con más de 4 dígitos (`422`).
    - Rechazo de consumidor final en cuenta corriente (`422 CUENTA_CORRIENTE_NO_HABILITADA`).
    - Rechazo por límite de crédito excedido (`422 LIMITE_CREDITO_EXCEDIDO` con `details`).
    - Atomicidad: si el segundo ítem no tiene stock, el primer ítem no se descuenta y no se crea factura.
    - Concurrencia: dos ventas simultáneas de la última unidad disponible confirman solo una factura y la otra recibe `409 STOCK_INSUFICIENTE`.
    - Congelamiento de precio: cambiar el precio de un producto no modifica facturas ya emitidas.
    - Anulación por admin: devuelve stock y revierte deuda en cuenta corriente; un vendedor recibe `403`.

---

## 4. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P1.7:** ¿Qué tablas se modifican cuando se confirma una factura?
- **P2.6:** ¿Por qué el cliente no envía el precio ni el total al crear una factura?
- **P3.2:** ¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?
- **P3.3:** ¿Dónde se asegura que una factura se grabe completa o no se grabe nada?
- **P3.4:** ¿Dónde se asigna el número de factura? ¿Cómo se evita que queden números salteados?
- **P3.5:** Si se cambia el precio de un producto, ¿qué pasa con las facturas ya emitidas? ¿Por qué?
- **P3.6:** ¿Dónde se impide vender en cuenta corriente a un consumidor final?
- **P3.7:** ¿Dónde se controla el límite de crédito de un cliente?
- **P3.9:** ¿Qué hace el sistema cuando se anula una factura?
- **P4.1:** ¿En qué parte se ingresa el número de tarjeta de crédito?
- **Ejercicios de cambio pequeño 3 y 6:** Impedir más de 50 unidades por producto / Cambiar punto de venta a `0002`.
