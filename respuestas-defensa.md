# Guía de Respuestas para la Defensa Oral (`docs/README.md`)

Este archivo reúne **todas las preguntas y ejercicios de modificación en vivo** de [`docs/README.md`](./docs/README.md).
- Al cerrar cada ticket con el **Prompt 3 (`docs/prompts/03-auditoria-y-defensa.md`)**, se completan aquí las rutas exactas de archivos, nombres de funciones y líneas del código implementado.

---

## 1. Base de Datos

### P1.1 — ¿Dónde se definen las tablas de la base de datos?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/base-de-datos/esquema.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts#L23-L188) → constantes exportadas `usuarios` (L23), `categorias` (L36), `productos` (L43), `clientes` (L61), `facturas` (L81), `facturaItems` (L117), `movimientosStock` (L134), `pagos` (L153) y `movimientosCuenta` (L173).
- **Respuesta para la defensa:** Las 9 tablas se definen en un único archivo centralizado (`src/base-de-datos/esquema.ts`) usando `sqliteTable` (`tablaSqlite`) de Drizzle ORM. Cada tabla incluye `id` autoincremental, `fecha_creacion` en ISO UTC, claves foráneas, índices de búsqueda/unicidad y restricciones `CHECK` en SQLite (como `importeValido()` en la línea 19) además de los tipos TypeScript inferidos en las líneas 190–208.

### P1.2 — ¿Dónde se conecta la aplicación con la base de datos? ¿Cómo sabe si usar la base local o la de Turso?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/base-de-datos/conexion.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/conexion.ts#L6-L20) → función `crearConexionBaseDatos()` (L6) e instancia exportada `bd` (L19).
- **Respuesta para la defensa:** La conexión se crea en `src/base-de-datos/conexion.ts` mediante `@libsql/client` y `drizzle()`. En las líneas 14–17 evalúa `process.env.DATABASE_URL`: si no está definida o apunta a `file:./local.db`, abre el archivo SQLite local para desarrollo; en producción (Vercel) recibe la URL `libsql://...` de Turso junto con `process.env.DATABASE_AUTH_TOKEN`, sin cambiar una sola línea de código en los servicios.

### P1.3 — ¿Cómo se crea una tabla nueva o se agrega un campo? ¿Qué es una migración y dónde están?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/base-de-datos/esquema.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts), [`drizzle.config.ts`](file:///c:/Proyectos/Parcial-2-PR4/drizzle.config.ts#L4-L12) y carpeta [`src/base-de-datos/migraciones/0000_inicial.sql`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/migraciones/0000_inicial.sql).
- **Respuesta para la defensa:** Primero se declara la tabla o columna en `src/base-de-datos/esquema.ts`. Luego se ejecuta `pnpm run db:generate` para que `drizzle-kit` (configurado en `drizzle.config.ts`) genere el archivo SQL versionado dentro de `src/base-de-datos/migraciones/`, y finalmente se aplica con `pnpm run db:migrate`. Una migración es un script SQL versionado que permite evolucionar y reproducir exactamente la estructura de tablas, índices y restricciones tanto en una base local limpia como en Turso o en los tests en memoria (`crearBaseDatosPrueba()` en `src/pruebas/ayudantes-prueba.ts`).

### P1.4 — ¿Dónde se cargan los datos de prueba?
- **Ticket asociado:** `T12`
- **Archivo y función/línea:** `src/base-de-datos/semilla.ts` *(pendiente de auditar en T12)*
- **Respuesta para la defensa:** Se cargan en `src/base-de-datos/semilla.ts` mediante el comando `pnpm run db:seed`. El script invoca a los **mismos servicios** de la aplicación (`crearProducto`, `moverStock`, `confirmarFactura`, `registrarPago`) para garantizar que existencias, saldos y numeración cumplan todas las reglas de negocio.

### P1.5 — ¿Cómo se guardan los importes? ¿Por qué no se usan números con coma flotante?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/base-de-datos/esquema.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/esquema.ts#L19-L21) → función `importeValido()` (L19) y columnas `entero(...)`; [`src/utilidades/formatos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/formatos.ts#L10-L49) → funciones `formatearMoneda()` (L10) y `pesosACentavos()` (L24).
- **Respuesta para la defensa:** Se guardan siempre como **números enteros en centavos** (`integer` en SQLite, validado además por el `CHECK` `typeof(columna) = 'integer'` de `importeValido()`). Por ejemplo, `$ 12.500,00` se almacena y transmite como `1250000`. No se usa coma flotante (`REAL`/`FLOAT`) porque la representación binaria IEEE 754 produce errores de redondeo (como `0.1 + 0.2 = 0.30000000000000004`), lo que haría descuadrar los totales de facturas y los saldos de cuenta corriente. La conversión en `pesosACentavos()` y `formatearMoneda()` opera con `BigInt` sobre la parte entera y decimal para evitar cualquier imprecisión.

### P1.6 — ¿La existencia de un producto se guarda o se calcula? ¿Y el saldo de un cliente?
- **Ticket asociado:** `T03` (existencia) y `T05`/`T06` (saldo de cliente)
- **Archivo y función/línea:** `src/servicios/servicio-stock.ts` y `src/servicios/servicio-clientes.ts` *(pendiente de auditar en T03/T06)*
- **Respuesta para la defensa:**
  - La **existencia del producto** se guarda en la columna `productos.existencia` pero **solo se actualiza dentro de `moverStock()`** en la misma transacción que inserta la fila en `movimientos_stock`, por lo que siempre coincide con la suma de sus movimientos.
  - El **saldo del cliente** se calcula como la suma de sus movimientos de cuenta corriente (`débitos − créditos` en `movimientos_cuenta`) y la API siempre lo devuelve derivado de esa fuente de verdad.

### P1.7 — ¿Qué tablas se modifican cuando se confirma una factura?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/servicios/servicio-facturas.ts` → `confirmarFactura()` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Dentro de una única transacción se modifican hasta **5 tablas**:
  1. `facturas` (se inserta el encabezado con su número correlativo).
  2. `factura_items` (se insertan los renglones con precio y descripción congelados).
  3. `productos` (se descuenta `existencia` de cada producto vendido mediante `moverStock()`).
  4. `movimientos_stock` (se inserta un movimiento de tipo `'venta'` con cantidad negativa por cada renglón).
  5. `movimientos_cuenta` (solo si la forma de pago es `'cuenta_corriente'`, se inserta un movimiento de tipo `'debito'`).

---

## 2. API REST

### P2.1 — ¿Dónde se expone la API REST para agregar un producto?
- **Ticket asociado:** `T03`
- **Archivo y función/línea:** `src/app/api/productos/route.ts` → función `POST` *(pendiente de auditar en T03)*
- **Respuesta para la defensa:** En el Route Handler `POST` de `src/app/api/productos/route.ts`, que usa `envoltorioRuta` para exigir sesión y delega toda la lógica a `crearProducto()` en `src/servicios/servicio-productos.ts`.

### P2.2 — ¿Qué responde la API si se carga un producto con un código que ya existe?
- **Ticket asociado:** `T03`
- **Archivo y función/línea:** `src/servicios/servicio-productos.ts` y `src/errores/verificadores-negocio.ts` *(pendiente de auditar en T03)*
- **Respuesta para la defensa:** Responde estado HTTP `409 Conflict` con el código `"CODIGO_DUPLICADO"` en el formato estándar `{ "error": { "code": "CODIGO_DUPLICADO", "message": "..." } }`.

### P2.3 — ¿Dónde se verifica que el usuario haya iniciado sesión antes de atender un pedido?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/middleware.ts`, `src/utilidades/sesion.ts` y `src/utilidades/envoltorio-ruta.ts` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** En tres barreras:
  1. El middleware/proxy redirige a `/login` en navegación si falta la cookie.
  2. El envoltorio `envoltorioRuta` (en cada Route Handler) y el layout protegido llaman a `obtenerUsuarioActual()`, que verifica la firma de la cookie `httpOnly` y comprueba en la tabla `usuarios` que exista y esté `activo`. Si no hay sesión válida, responde `401 NO_AUTENTICADO`.
  3. Cada servicio recibe el usuario autenticado y verifica su rol.

### P2.4 — ¿Qué pasa si un vendedor llama directamente a una ruta de administrador? Muéstrenlo.
- **Ticket asociado:** `T02` y `T03`
- **Archivo y función/línea:** `src/errores/verificadores-negocio.ts` → `asegurarRolAdmin()` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Aunque el vendedor llame directamente con `fetch` o `curl` a `POST /api/productos` o `POST /api/facturas/[id]/anulacion`, el servicio ejecuta `asegurarRolAdmin(usuarioActual)` y lanza `ErrorApi(403, 'SIN_PERMISO', ...)`, devolviendo HTTP `403 Forbidden`.

### P2.5 — ¿Dónde se arma la respuesta de error que devuelve la API?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/errores/manejador-errores.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/manejador-errores.ts#L21-L62) → funciones `normalizarError()` (L21), `convertirErrorARespuestaHttp()` (L55) y `convertirErrorAResultadoAccion()` (L60), apoyadas en [`src/errores/error-api.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/error-api.ts#L6-L16) (`ErrorApi`) y [`src/errores/codigos-error.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/codigos-error.ts#L1-L26) (`CODIGOS_ERROR`).
- **Respuesta para la defensa:** En un único lugar centralizado: `src/errores/manejador-errores.ts`. La función `normalizarError()` atrapa instancias de `ErrorApi` (respetando su `estadoHttp`, `codigo`, `mensaje` y `detalles`), errores de validación `ZodError` (transformándolos en `422 VALIDACION` con `details: [{ campo, mensaje }]`, incluyendo campos rechazados por `.strict()`), errores de parseo JSON (`SyntaxError` → `400 JSON_INVALIDO`) y cualquier fallo inesperado (`500 ERROR_INTERNO`, registrando el error real en `console.error` sin exponer detalles internos al cliente).

### P2.6 — ¿Por qué el cliente no envía el precio ni el total al crear una factura?
- **Ticket asociado:** `T08` y `T09`
- **Archivo y función/línea:** `src/validaciones/validacion-facturas.ts` y `src/servicios/servicio-facturas.ts` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Por seguridad e integridad de negocio: nunca se confía en importes enviados desde el navegador porque un usuario podría adulterar el JSON del request y comprar a `$ 0` o `$ 1`. El cliente solo envía `productoId` y `cantidad`; el servidor consulta el precio vigente en la tabla `productos` dentro de la transacción y calcula subtotales y total.

---

## 3. Reglas de Negocio

### P3.1 — ¿Dónde se verifica que el stock no quede negativo?
- **Ticket asociado:** `T03` y `T08`
- **Archivo y función/línea:** `src/servicios/servicio-stock.ts` → `moverStock()` *(pendiente de auditar en T03)*
- **Respuesta para la defensa:** En `moverStock()` dentro de `src/servicios/servicio-stock.ts`. Todas las operaciones de stock (ventas, egresos manuales, ingresos y anulaciones) pasan obligatoriamente por esa función, que valida la existencia y ejecuta el `UPDATE` con la condición `WHERE id = ? AND existencia + ? >= 0`.

### P3.2 — ¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?
- **Ticket asociado:** `T03` y `T08`
- **Archivo y función/línea:** `src/servicios/servicio-stock.ts` y `src/servicios/servicio-facturas.ts` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Como la actualización en `moverStock()` se hace dentro de una transacción con una sentencia atómica condicional (`UPDATE productos SET existencia = existencia - ? WHERE id = ? AND existencia >= ?`), SQLite serializa la escritura: la primera transacción modifica 1 fila y se confirma; la segunda afecta 0 filas, detecta que no alcanzó el stock, aborta toda la transacción (`ROLLBACK`) y responde `409 STOCK_INSUFICIENTE`.

### P3.3 — ¿Dónde se asegura que una factura se grabe completa o no se grabe nada?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/servicios/servicio-facturas.ts` → `confirmarFactura()` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** En `confirmarFactura()` mediante `bd.transaction(async (tx) => { ... })`. Si falla cualquier paso (stock insuficiente de un segundo ítem, límite de crédito excedido o error de base de datos), la transacción hace rollback automático y no queda ningún registro huérfano.

### P3.4 — ¿Dónde se asigna el número de factura? ¿Cómo se evita que queden números salteados?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/servicios/servicio-facturas.ts` → `confirmarFactura()` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Se asigna recién **al confirmar la factura dentro de la transacción**, consultando `MAX(numero) + 1` para el punto de venta `1` antes de insertar. Como se calcula dentro de la transacción y solo cuando todas las validaciones previas pasaron (o se revierte si la transacción aborta), nunca se consumen ni se saltean números por ventas descartadas o fallidas.

### P3.5 — Si se cambia el precio de un producto, ¿qué pasa con las facturas ya emitidas? ¿Por qué?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/base-de-datos/esquema.ts` (`factura_items`) y `src/servicios/servicio-facturas.ts` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Las facturas ya emitidas **no cambian en absoluto**. Porque al emitir la factura, `confirmarFactura()` copia el `precioUnitario`, el `subtotal` y la `descripcion` vigentes en ese instante dentro de la tabla `factura_items` (Regla 3: el precio se congela).

### P3.6 — ¿Dónde se impide vender en cuenta corriente a un consumidor final?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/errores/verificadores-negocio.ts` y `src/servicios/servicio-facturas.ts` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** En el verificador `asegurarCuentaCorrientePermitida()` invocado por `confirmarFactura()`. Si `pago.forma === 'cuenta_corriente'` y `clienteId === null` (consumidor final) o el cliente tiene `cuentaCorriente === false`, lanza `422 CUENTA_CORRIENTE_NO_HABILITADA`.

### P3.7 — ¿Dónde se controla el límite de crédito de un cliente?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/errores/verificadores-negocio.ts` → `asegurarLimiteCredito()` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Dentro de la transacción de `confirmarFactura()`, se calcula el saldo actual del cliente y se llama a `asegurarLimiteCredito(saldoActual, totalFactura, cliente.limiteCredito)`. Si `limiteCredito !== null` y `saldoActual + totalFactura > limiteCredito`, lanza `422 LIMITE_CREDITO_EXCEDIDO` con `details: { saldoActual, limite, excedente }`.

### P3.8 — ¿Dónde se impide registrar un pago mayor que la deuda?
- **Ticket asociado:** `T06`
- **Archivo y función/línea:** `src/errores/verificadores-negocio.ts` → `asegurarPagoNoSuperaDeuda()` y `src/servicios/servicio-pagos.ts` *(pendiente de auditar en T06)*
- **Respuesta para la defensa:** En `registrarPago()` dentro de `src/servicios/servicio-pagos.ts`, que llama a `asegurarPagoNoSuperaDeuda(importe, saldoActual)`. Si el importe enviado supera el saldo adeudado del cliente, lanza `422 PAGO_SUPERA_DEUDA`.

### P3.9 — ¿Qué hace el sistema cuando se anula una factura?
- **Ticket asociado:** `T08`
- **Archivo y función/línea:** `src/servicios/servicio-facturas.ts` → `anularFactura()` *(pendiente de auditar en T08)*
- **Respuesta para la defensa:** Solo un administrador puede hacerlo e indicando un motivo obligatorio. En una única transacción:
  1. Verifica que la factura exista y esté en estado `'emitida'` (si ya estaba anulada, devuelve `409 FACTURA_ANULADA`).
  2. Cambia el estado de la factura a `'anulada'` guardando fecha, usuario y motivo de anulación.
  3. Recorre sus renglones y llama a `moverStock()` con tipo `'anulacion'` y cantidad positiva para devolver las unidades al stock.
  4. Si la factura había sido en `'cuenta_corriente'`, inserta un movimiento de tipo `'credito'` en `movimientos_cuenta` para descontar la deuda del cliente.

### P3.10 — ¿Dónde queda registrado cada movimiento de stock?
- **Ticket asociado:** `T03`
- **Archivo y función/línea:** Tabla `movimientos_stock` en `src/base-de-datos/esquema.ts` e inserción en `src/servicios/servicio-stock.ts` *(pendiente de auditar en T03)*
- **Respuesta para la defensa:** En la tabla `movimientos_stock`, que guarda `productoId`, `tipo` (`venta`, `anulacion`, `ingreso`, `egreso`), `cantidad` (con signo positivo o negativo), `existenciaResultante`, `motivo`, `facturaId` (si corresponde), `usuarioId` y `fecha`.

---

## 4. Seguridad y Permisos

### P4.1 — ¿En qué parte se ingresa el número de tarjeta de crédito?
- **Ticket asociado:** `T08` y `T09`
- **Archivo y función/línea:** `src/validaciones/validacion-facturas.ts` y pantalla `/ventas/nueva` *(pendiente de auditar en T08/T09)*
- **Respuesta para la defensa:** **En ninguna parte.** Por seguridad (Regla 9 y `RF-V5`), nunca se pide ni se guarda el número completo de la tarjeta: el formulario solo solicita `tipo` (`debito` o `credito`), `marca` y los **últimos 4 dígitos** (`ultimos4`). Además, el esquema Zod usa `.strict()` y valida `/^\d{4}$/`, rechazando con `422` cualquier intento de enviar un número completo.

### P4.2 — ¿Cómo se guardan las contraseñas?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/servicios/servicio-autenticacion.ts` y `src/servicios/servicio-usuarios.ts` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Nunca se guarda la contraseña en texto plano; se almacena únicamente su hash criptográfico con sal (`bcrypt` / `argon2`) en la columna `passwordHash` de la tabla `usuarios`, y las respuestas de la API jamás incluyen ese campo.

### P4.3 — ¿Dónde se verifica el rol del usuario? ¿Alcanza con ocultar el botón?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/errores/verificadores-negocio.ts` → `asegurarRolAdmin()` llamado al inicio de cada servicio restringido *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** No alcanza con ocultar el botón en la interfaz porque cualquier usuario puede enviar peticiones HTTP directas a `/api/...`. Por eso el rol se verifica siempre en el servidor dentro de la capa de servicios mediante `asegurarRolAdmin(usuarioActual)`, que responde `403 SIN_PERMISO`.

### P4.4 — ¿Dónde está el secreto que firma la sesión? ¿Por qué no está en el repositorio?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** Variable `SESSION_SECRET` leída en `src/utilidades/sesion.ts` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Se lee desde la variable de entorno `process.env.SESSION_SECRET` (definida en `.env` local y en el panel de Vercel en producción). No se sube al repositorio (`.env` está en `.gitignore`) porque quien conozca el secreto podría falsificar cookies de sesión de cualquier administrador.

### P4.5 — Si se desactiva a un usuario que tiene la sesión abierta, ¿qué pasa?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/utilidades/sesion.ts` → `obtenerUsuarioActual()` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Pierde el acceso **en el acto** en su próximo pedido, aunque su cookie aún no haya vencido. Porque `obtenerUsuarioActual()` busca al usuario por `id` en la tabla `usuarios` en cada request y comprueba `usuario.activo === true`; si está inactivo, invalida la sesión y responde `401 NO_AUTENTICADO`.

---

## 5. Interfaz

### P5.1 — ¿Dónde se define el panel lateral que comparten todas las pantallas?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/componentes/navegacion/panel-lateral.tsx` e integrado en `src/app/(sistema)/layout.tsx` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** En el componente `PanelLateral` dentro de `src/componentes/navegacion/panel-lateral.tsx`, que es renderizado por el layout compartido `src/app/(sistema)/layout.tsx` (dejando afuera únicamente a `/login`).

### P5.2 — ¿Dónde se da formato a los importes y a las fechas?
- **Ticket asociado:** `T01`
- **Archivo y función/línea:** [`src/utilidades/formatos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/formatos.ts#L10-L88) → funciones `formatearMoneda()` (L10), `pesosACentavos()` (L24), `formatearFecha()` (L62), `formatearHora()` (L66), `formatearFechaHora()` (L70), `formatearNumeroComprobante()` (L74), `formatearNumeroFactura()` (L82) y `formatearNumeroRecibo()` (L86).
- **Respuesta para la defensa:** En el módulo único `src/utilidades/formatos.ts`. `formatearMoneda()` convierte centavos enteros a pesos con formato argentino (`$ 12.345,50`) usando `BigInt` e `Intl.NumberFormat("es-AR")`; `formatearFecha()`, `formatearHora()` y `formatearFechaHora()` convierten fechas ISO UTC a formato local (`dd/mm/aaaa` y `HH:mm`) fijando la zona horaria `America/Argentina/Buenos_Aires` (y preservando fechas calendario `AAAA-MM-DD` sin corrimiento por UTC-3); y `formatearNumeroFactura()` / `formatearNumeroRecibo()` aplican el relleno a `0001-00001233` y `R 0001-00000341`.

### P5.3 — ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?
- **Ticket asociado:** `T02`, `T04`, `T07`, `T09`
- **Archivo y función/línea:** `src/validaciones/*.ts` y hook `src/componentes/formularios/usar-formulario-accion.ts` *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Sí, exactamente las mismas reglas. Los esquemas de Zod viven en `src/validaciones/` y son importados tanto por los formularios del cliente (para dar feedback inmediato campo por campo) como por los servicios del servidor al inicio de cada operación.

### P5.4 — ¿Cómo se agrega un producto a la venta usando solo el teclado?
- **Ticket asociado:** `T09`
- **Archivo y función/línea:** Pantalla `src/app/(sistema)/ventas/nueva/page.tsx` y componente de búsqueda de ítems *(pendiente de auditar en T09)*
- **Respuesta para la defensa:** Con `F2` se enfoca el buscador de productos, se escribe código o descripción, con las flechas `↑` y `↓` se recorre la lista de sugerencias, con `Enter` se agrega el producto al listado de renglones, con `F4` se pasa al selector de cliente, con `F8` a la forma de pago y con `F9` se confirma la factura.

### P5.5 — ¿Qué muestra un listado mientras carga, cuando está vacío o cuando falla?
- **Ticket asociado:** `T02`
- **Archivo y función/línea:** `src/componentes/estados/` (`estado-carga.tsx`, `estado-vacio.tsx`, `estado-error.tsx`) *(pendiente de auditar en T02)*
- **Respuesta para la defensa:** Todos los listados usan los tres componentes reutilizables de `src/componentes/estados/`: esqueletos animados mientras carga (`EstadoCarga`), un recuadro informativo con acción sugerida cuando no hay resultados (`EstadoVacio`) y una alerta con botón de reintentar si ocurre un fallo (`EstadoError`).

---

## 6. Publicación e Inteligencia Artificial

### P6.1 — ¿Qué variables de entorno necesita el sistema en producción y dónde se cargan?
- **Ticket asociado:** `T12`
- **Archivo y función/línea:** `.env.example` y `src/base-de-datos/conexion.ts` / `src/utilidades/sesion.ts` *(pendiente de auditar en T12)*
- **Respuesta para la defensa:** Necesita `DATABASE_URL` (URL `libsql://` de la base en Turso), `DATABASE_AUTH_TOKEN` (token de acceso a Turso) y `SESSION_SECRET` (clave secreta para firmar la cookie de sesión). Se configuran en la sección *Environment Variables* del proyecto en Vercel.

### P6.2 — ¿Cómo se crearon las tablas en Turso?
- **Ticket asociado:** `T12`
- **Archivo y función/línea:** `drizzle.config.ts` y `src/base-de-datos/migraciones/` *(pendiente de auditar en T12)*
- **Respuesta para la defensa:** Ejecutando las migraciones de Drizzle (`pnpm run db:migrate`) apuntando `DATABASE_URL` y `DATABASE_AUTH_TOKEN` a la base remota de Turso, y luego corriendo `pnpm run db:seed` para poblar los datos iniciales.

### P6.3 — ¿Cómo se comprueba que el sitio publicado usa la base de Turso y no una local?
- **Ticket asociado:** `T12`
- **Respuesta para la defensa:** Primero, porque en Vercel el sistema de archivos es efímero/solo-lectura y `DATABASE_URL` apunta a `libsql://...turso.io`. Segundo, podemos emitir una factura o crear un producto en la URL pública de Vercel y consultar en vivo la tabla desde la consola de Turso (`turso db shell` o el panel web de Turso) viendo el registro recién insertado.

### P6.4 — ¿Qué agente usaron y para qué partes del sistema? Muestren algo que el agente hizo mal y cómo lo corrigieron.
- **Ticket asociado:** Todos (`T01` a `T12`)
- **Registro de errores detectados y corregidos en auditorías:**
  - **T01 (`src/base-de-datos/esquema.ts`, línea 186):** Al definir las restricciones `CHECK` de las 9 tablas, el agente aplicó `importeValido(tabla.importe)` (que permite `>= 0`) sobre `movimientos_cuenta.importe`, mientras que en `pagos.importe` sí había exigido `> 0`. Esto permitía insertar movimientos de cuenta corriente con importe `0` en la base de datos. Durante la auditoría de T01 lo detectamos y corregimos en `src/base-de-datos/esquema.ts` (`restriccion("movimientos_cuenta_importe_valido", expresionSql`(${importeValido(tabla.importe)}) AND ${tabla.importe} > 0`)`), actualizamos la migración inicial `0000_inicial.sql` y agregamos el test correspondiente en `src/pruebas/base-errores-formatos.prueba.ts` (línea 256).

---

## 7. Guía Rápida para los «Cambios Pequeños en Vivo» (`docs/README.md`)

| Cambio pedido en vivo | Archivos exactos que hay que tocar (en orden) |
| :--- | :--- |
| **1. Agregar el campo «marca» a los productos y mostrarlo en el catálogo** | 1) `src/base-de-datos/esquema.ts` (agregar columna `marca` en `productos` y correr `pnpm run db:migrate`)<br>2) `src/validaciones/validacion-productos.ts` (agregar `marca` al esquema Zod)<br>3) `src/servicios/servicio-productos.ts` (incluir `marca` en el `select`/`insert`/`update`)<br>4) `src/app/(sistema)/productos/...` (agregar columna en tabla y campo en modal). |
| **2. Agregar «Mercado Pago» como medio de pago de la cuenta corriente** | 1) `src/validaciones/validacion-pagos.ts` (agregar `'mercado_pago'` al `z.enum(['efectivo', 'transferencia', 'tarjeta_debito', 'mercado_pago'])`)<br>2) `src/utilidades/formatos.ts` (etiqueta legible `"Mercado Pago"`)<br>3) Modal de registrar pago en `src/componentes/dominio/clientes/` (opción en el selector). |
| **3. Impedir que una venta tenga más de 50 unidades de un mismo producto** | 1) `src/validaciones/validacion-facturas.ts` (en `cantidad: z.number().int().positive().max(50, 'No se permiten más de 50 unidades por producto')`)<br>2) Como el esquema es compartido entre cliente y servidor, queda validado en ambos lados en un solo cambio. |
| **4. Exigir que el teléfono de un cliente tenga al menos 8 dígitos (formulario y servidor)** | 1) `src/validaciones/validacion-clientes.ts` (agregar `.refine(...)` o `.regex(/^\D*(\d\D*){8,}$/, 'El teléfono debe tener al menos 8 dígitos')` al campo `telefono`). |
| **5. Agregar una columna al listado de facturas** | 1) `src/servicios/servicio-facturas.ts` (si el dato aún no viene en `listarFacturas`, incluirlo en la proyección)<br>2) Tabla de facturas en `src/app/(sistema)/ventas/page.tsx` (agregar encabezado y celda). |
| **6. Cambiar el punto de venta de la numeración a `0002`** | 1) Constante `PUNTO_VENTA_ACTUAL = 2` en `src/utilidades/formatos.ts` / `src/servicios/servicio-facturas.ts` (usada por `formatearNumeroFactura` y `confirmarFactura`). |
