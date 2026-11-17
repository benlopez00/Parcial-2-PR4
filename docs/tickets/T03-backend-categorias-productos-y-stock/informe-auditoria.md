# Informe de Auditoría y Guía para el Desarrollador — T03

## 1. Resumen para el Desarrollador

En este ticket se construyó el backend completo de **Categorías**, **Productos** y **Movimientos de Stock** (`RF-P1` a `RF-P7` y `Reglas 1, 2, 10, 11 y 12`), junto con las **10 rutas de API REST** correspondientes:

1. **Cómo viajan los datos en un pedido HTTP (`src/app/api/.../route.ts` → `src/servicios/...`):**
   - Cada Route Handler está envuelto con `envoltorioRuta()` (`src/utilidades/envoltorio-ruta.ts`), que verifica primero la cookie `httpOnly` contra la tabla `usuarios` (`obtenerUsuarioActual()`), lee parámetros de URL, query string o cuerpo JSON y delega en el servicio sin lógica de negocio en la ruta.
   - Todo servicio sigue los **4 pasos fijos de `AGENTS.md`**:
     1. **Validar entrada** con el esquema Zod estricto (`src/validaciones/validacion-categorias.ts` o `src/validaciones/validacion-productos.ts`).
     2. **Verificar permisos** llamando a `asegurarRolAdmin`, `asegurarUsuarioAutenticado`, `asegurarFiltroEstadoProductosPermitido` o `asegurarPermisoMovimientoStock` en `src/errores/verificadores-negocio.ts`.
     3. **Ejecutar reglas y escrituras en transacción** mediante `ejecutarTransaccionEscritura()` (`src/utilidades/transacciones.ts`).
     4. **Devolver la proyección pública exacta** (`CategoriaPublica`, `ProductoPublico`, `MovimientoStockPublico`), calculando `bajoMinimo: existencia < stockMinimo` en el servidor y formateando la referencia de comprobante con `formatearNumeroComprobante()`.

2. **Cómo se garantiza el invariante de stock (`moverStock()` en `src/servicios/servicio-stock.ts`):**
   - **Ningún archivo fuera de `moverStock()` ejecuta `UPDATE` sobre `productos.existencia`**, y `PATCH /api/productos/[id]` rechaza el campo `existencia` con `422 VALIDACION` gracias a `.strict()`.
   - Cuando se da de alta un producto con `stockInicial > 0` (`crearProducto`) o se registra un ajuste manual (`registrarMovimientoManual`), se abre una transacción y se invoca a `moverStock(usuarioActual, datos, transaccion)`.
   - `moverStock()` deriva el signo (`+` en `ingreso`/`anulacion`, `-` en `egreso`/`venta`), ejecuta la actualización atómica condicional `UPDATE productos SET existencia = existencia + ? WHERE id = ? AND existencia + ? >= 0 AND existencia + ? <= MAX_SAFE_INTEGER RETURNING existencia`, verifica con `asegurarStockSuficiente()` que se haya afectado la fila (lanzando `409 STOCK_INSUFICIENTE` y haciendo rollback si no alcanza) e inserta el registro en `movimientos_stock` con la `existenciaResultante` dentro de la misma transacción.

---

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| [`src/base-de-datos/conexion.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/base-de-datos/conexion.ts#L12-L13) | Tipado estricto de transacciones Drizzle sin usar `any` | `TransaccionBaseDatos` |
| [`src/utilidades/fechas-consulta.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/fechas-consulta.ts#L1-L9) | Conversión de fechas calendario (`AAAA-MM-DD`, hora Argentina `UTC-3`) a límites UTC | `convertirRangoDiasAInstantesUtc()` |
| [`src/utilidades/transacciones.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/utilidades/transacciones.ts#L6-L18) | Ejecución de transacciones de escritura con reintento acotado ante `SQLITE_BUSY` | `ejecutarTransaccionEscritura()` |
| [`src/validaciones/validacion-categorias.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-categorias.ts#L6-L15) | Esquemas Zod estrictos de listado, alta y edición/baja lógica de categorías | `esquemaCrearCategoria`, `esquemaEditarCategoria`, `esquemaActualizarCategoria` |
| [`src/validaciones/validacion-productos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-productos.ts#L19-L76) | Esquemas Zod estrictos de catálogo, alta con `stockInicial`, edición sin `existencia` y movimientos | `esquemaListadoProductos`, `esquemaCrearProducto`, `esquemaEditarProducto`, `esquemaMoverStock` |
| [`src/errores/verificadores-negocio.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L98-L183) | Verificadores de unicidad, categoría en uso, stock suficiente, permisos por filtro/tipo y colisiones SQL | `asegurarNombreCategoriaUnico()`, `asegurarCategoriaSinProductosActivos()`, `asegurarCodigoProductoUnico()`, `asegurarStockSuficiente()` |
| [`src/servicios/servicio-categorias.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-categorias.ts#L15-L58) | Listado de activas, alta y edición/desactivación verificando productos activos | `listarCategorias()`, `crearCategoria()`, `actualizarCategoria()` |
| [`src/servicios/servicio-productos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-productos.ts#L32-L106) | Catálogo filtrado/paginado, ficha por id, alta con stock inicial y edición/baja lógica | `listarProductos()`, `obtenerProductoPorId()`, `crearProducto()`, `actualizarProducto()` |
| [`src/servicios/servicio-stock.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-stock.ts#L45-L108) | Función atómica `moverStock()`, ajustes manuales e historial por producto y general | `moverStock()`, `registrarMovimientoManual()`, `listarMovimientosProducto()`, `listarMovimientosStockGeneral()` |
| [`src/app/api/categorias/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/categorias/route.ts#L1-L7) | Endpoints `GET /api/categorias` y `POST /api/categorias` | `GET`, `POST` |
| [`src/app/api/categorias/[id]/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/categorias/%5Bid%5D/route.ts#L1-L6) | Endpoint `PATCH /api/categorias/[id]` | `PATCH` |
| [`src/app/api/productos/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/productos/route.ts#L1-L7) | Endpoints `GET /api/productos` y `POST /api/productos` | `GET`, `POST` |
| [`src/app/api/productos/[id]/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/productos/%5Bid%5D/route.ts#L1-L8) | Endpoints `GET /api/productos/[id]` y `PATCH /api/productos/[id]` | `GET`, `PATCH` |
| [`src/app/api/productos/[id]/movimientos/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/productos/%5Bid%5D/movimientos/route.ts#L1-L9) | Endpoints `GET /api/productos/[id]/movimientos` y `POST /api/productos/[id]/movimientos` | `GET`, `POST` |
| [`src/app/api/movimientos-stock/route.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/app/api/movimientos-stock/route.ts#L1-L5) | Endpoint `GET /api/movimientos-stock` | `GET` |
| [`src/pruebas/productos-y-stock.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/productos-y-stock.prueba.ts#L14-L272) | Pruebas de servicios, atomicidad, rollback, concurrencia en dos conexiones e invariante `SUM(cantidad) === existencia` | 42 tests de servicios y concurrencia |
| [`src/pruebas/api-productos-y-stock.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/api-productos-y-stock.prueba.ts#L29-L205) | Pruebas de contrato HTTP de las 10 rutas, sesión, roles (`403`), `.strict()` (`422`) y conflictos (`409`) | 28 tests de integración HTTP |

---

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Estado de pruebas y verificación de tipos (ejecutados tras las correcciones de auditoría):**
  - `pnpm test`: **5 archivos, 152 tests pasando** (`42` en `productos-y-stock.prueba.ts`, `28` en `api-productos-y-stock.prueba.ts`, `65` en `base-errores-formatos.prueba.ts`, `12` en `autenticacion-y-usuarios.prueba.ts` y `5` en `sesion-y-adaptadores.prueba.ts`).
  - `pnpm run verificar:tipos`: **`next typegen && tsc --noEmit` sin errores**.
- **Cumplimiento de criterios de aceptación y `AGENTS.md`:**
  - Único `UPDATE` de `productos.existencia` concentrado exclusivamente en `moverStock()` (`src/servicios/servicio-stock.ts`, líneas 57–61).
  - Alta con `stockInicial: 15` persiste `existencia: 15` y movimiento `'ingreso'` por `+15` con motivo `'Stock inicial'` en la misma transacción; `stockInicial: 0` u omitido no genera movimientos ficticios.
  - `PATCH /api/productos/[id]` con `{"existencia": 100}` o `{"stockInicial": 1}` devuelve `422 VALIDACION` gracias a `.strict()`.
  - Egreso superior a la existencia devuelve `409 STOCK_INSUFICIENTE` con `details: { productoId, codigo, solicitado, disponible }` y no inserta ningún movimiento.
- **Errores detectados y corregidos durante la auditoría (para pregunta de defensa P6.4):**
  1. **Búsqueda `LIKE` en SQLite incompatible con mayúsculas acentuadas y `Ñ` (`src/servicios/servicio-productos.ts`, líneas 27–41):** En `listarProductos()`, el agente convertía `consulta.q` a minúsculas con `.toLowerCase()` de JavaScript (que transforma `Á → á`, `Ñ → ñ`), pero en SQLite comparaba con `lower(productos.descripcion) LIKE patron`. Como la función nativa `lower()` de SQLite solo convierte caracteres ASCII (`A-Z`) y deja `Á, É, Í, Ó, Ú, Ü, Ñ` en mayúscula, cualquier producto cuya descripción o código tuviera una mayúscula con tilde o `Ñ` (por ejemplo `"Ácido y Caño"`) **no era encontrado nunca**, ni siquiera buscando `"Ácido"` o `"CAÑO"`. Lo corregimos agregando `minusculasSql()` en `src/servicios/servicio-productos.ts` y sumamos las aserciones de prueba en `src/pruebas/productos-y-stock.prueba.ts` (líneas 162–167).
  2. **Lectura de existencia vigente al fallar el `UPDATE` condicional y transacción en `crearCategoria` (`src/servicios/servicio-stock.ts`, líneas 62–70 y `src/servicios/servicio-categorias.ts`, líneas 26–33):** En `moverStock()`, si el `UPDATE` atómico afectaba `0` filas porque otra operación modificó el stock antes del bloqueo de escritura, se informaba en `details.disponible` la existencia leída antes del `UPDATE`. Se agregó la relectura de `existencia` dentro de la rama `!actualizado` antes de disparar `asegurarExistenciaDentroDeRango` y `asegurarStockSuficiente`, y se envolvió `crearCategoria()` en `ejecutarTransaccionEscritura()` para unificar el manejo transaccional con el resto de las escrituras.

---

## 4. Guía Rápida para Defender este Ticket en el Examen

1. **«¿Dónde se verifica que el stock nunca quede en negativo y qué pasa si dos operaciones descuentan la última unidad a la vez?»**
   - Abrir [`src/servicios/servicio-stock.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-stock.ts#L45-L78) y señalar `moverStock()`, específicamente el `transaccion.update(productos)` de las líneas 57–61 con la condición SQL `existencia + variacion >= 0`.Si no afecta filas, `asegurarStockSuficiente()` ([`src/errores/verificadores-negocio.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/errores/verificadores-negocio.ts#L144-L150)) lanza `409 STOCK_INSUFICIENTE` y revierte la transacción. Mostrar la prueba de dos conexiones simultáneas en [`src/pruebas/productos-y-stock.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/productos-y-stock.prueba.ts#L234-L271).
2. **«¿Por qué un `PATCH /api/productos/[id]` no permite cambiar la `existencia` directamente?»**
   - Abrir [`src/validaciones/validacion-productos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/validaciones/validacion-productos.ts#L31-L34) y mostrar `esquemaEditarProducto`: solo declara `codigo`, `descripcion`, `categoriaId`, `precio`, `stockMinimo` y `activo`, y aplica `.strict()`. Cuando `actualizarProducto()` ([`src/servicios/servicio-productos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-productos.ts#L85-L86)) ejecuta `esquemaActualizarProducto.parse()`, Zod rechaza `existencia` y `manejador-errores.ts` responde `422 VALIDACION`.
3. **«¿Cómo se asegura que el alta de un producto con stock inicial grabe el producto y su movimiento o no grabe nada?»**
   - Abrir [`src/servicios/servicio-productos.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/servicios/servicio-productos.ts#L63-L82) (`crearProducto`): dentro de `ejecutarTransaccionEscritura()` inserta el producto con `existencia: 0` y, si `stockInicial > 0`, llama a `moverStock(usuarioActual, { productoId: creado.id, tipo: "ingreso", cantidad: stockInicial, motivo: "Stock inicial" }, transaccion)` pasándole **la misma transacción**. Mostrar el test con `TRIGGER` de fallo en [`src/pruebas/productos-y-stock.prueba.ts`](file:///c:/Proyectos/Parcial-2-PR4/src/pruebas/productos-y-stock.prueba.ts#L127-L135).
