# Ticket T03 — Backend de Categorías, Productos y Movimientos de Stock (`moverStock`)

- **Responsable:** Integrante 1 (`rama: integrante-1`)
- **Hito:** Hito 1 — Base y Productos
- **Dependencias:** `T01`, `T02`

---

## 1. Objetivo

Implementar los esquemas Zod, verificadores de error, servicios y las 10 rutas de API REST correspondientes a **Categorías**, **Productos** y **Movimientos de Stock**, incluyendo la función central `moverStock()` que garantiza atómicamente que la existencia nunca quede en negativo y que cada cambio de stock deje su movimiento registrado en la misma transacción.

---

## 2. Requerimientos y Reglas Incluidas

- **RF-P1 Catálogo:** `GET /api/productos` (filtros `q`, `categoriaId`, `bajoMinimo`, `activo`, paginación; calcula `bajoMinimo: existencia < stockMinimo`) y `GET /api/productos/[id]`.
- **RF-P2 Alta y edición:** `POST /api/productos` (si recibe `stockInicial > 0`, llama a `moverStock()` con motivo `"Stock inicial"` dentro de la misma transacción) y `PATCH /api/productos/[id]` (rechaza el campo `existencia` con `422 VALIDACION` gracias a `.strict()`).
- **RF-P3 Baja lógica:** En `PATCH /api/productos/[id]` enviando `activo: false`.
- **RF-P4 y RF-P5 Ingresos y egresos manuales:** `POST /api/productos/[id]/movimientos` (solo admin). Valida motivos permitidos según tipo (`ingreso`: *Reposición*, *Stock inicial*, *Devolución de cliente*; `egreso`: *Rotura*, *Vencimiento*, *Ajuste de inventario*, *Uso interno*). Si el egreso deja existencia negativa, devuelve `409 STOCK_INSUFICIENTE`.
- **RF-P6 Historial de movimientos:** `GET /api/productos/[id]/movimientos` y `GET /api/movimientos-stock` (filtros `productoId`, `tipo`, `desde`, `hasta`, paginados, ordenados del más nuevo al más viejo).
- **RF-P7 Categorías:** `GET /api/categorias` (activas, sin paginar), `POST /api/categorias` (`409 NOMBRE_DUPLICADO`), `PATCH /api/categorias/[id]` (`409 CATEGORIA_EN_USO` si se intenta desactivar teniendo productos activos).
- **Reglas 1 y 2:** La existencia solo se modifica dentro de `moverStock()` con actualización condicional `WHERE id = ? AND existencia + ? >= 0`.

---

## 3. Archivos a Crear / Modificar

- **Validaciones (`src/validaciones/`):**
  - `src/validaciones/validacion-categorias.ts`: Esquemas de alta y edición con `.strict()`.
  - `src/validaciones/validacion-productos.ts`: Esquemas de filtros, alta (con `stockInicial` opcional), edición (con `.strict()`, sin `existencia`) y movimiento manual de stock.
- **Verificadores de Error (`src/errores/verificadores-negocio.ts`):**
  - `asegurarNombreCategoriaUnico`, `asegurarCategoriaSinProductosActivos`, `asegurarCodigoProductoUnico`, `asegurarStockSuficiente`.
- **Servicios (`src/servicios/`):**
  - `src/servicios/servicio-categorias.ts`: `listarCategorias`, `crearCategoria`, `actualizarCategoria`.
  - `src/servicios/servicio-stock.ts`: `moverStock(tx, datosMovimiento)`, `registrarMovimientoManual`, `listarMovimientosProducto`, `listarMovimientosStockGeneral`.
  - `src/servicios/servicio-productos.ts`: `listarProductos`, `obtenerProductoPorId`, `crearProducto`, `actualizarProducto`.
- **Rutas API REST (10 endpoints en `src/app/api/`):**
  - `GET /api/categorias`, `POST /api/categorias`, `PATCH /api/categorias/[id]`
  - `GET /api/productos`, `POST /api/productos`, `GET /api/productos/[id]`, `PATCH /api/productos/[id]`
  - `GET /api/productos/[id]/movimientos`, `POST /api/productos/[id]/movimientos`
  - `GET /api/movimientos-stock`
- **Testing Separado (`src/pruebas/`):**
  - `src/pruebas/productos-y-stock.prueba.ts`: Pruebas de alta con stock inicial, código duplicado (`409`), rechazo de edición de `existencia` (`422`), egreso que supera stock (`409 STOCK_INSUFICIENTE`), categoría en uso (`409 CATEGORIA_EN_USO`) y coincidencia entre suma de movimientos y existencia.

---

## 4. Criterios de Aceptación

1. Ningún archivo fuera de `servicio-stock.ts` (`moverStock`) ejecuta un `UPDATE` sobre `productos.existencia`.
2. Si se crea un producto con `stockInicial: 15`, su existencia queda en `15` y existe un movimiento de tipo `'ingreso'` con motivo `'Stock inicial'` por `+15`.
3. Enviar `{"existencia": 100}` a `PATCH /api/productos/[id]` devuelve `422 VALIDACION`.
4. Un egreso mayor a la existencia actual devuelve `409 STOCK_INSUFICIENTE` y no registra ningún movimiento.
5. `pnpm test` pasa todas las pruebas de `productos-y-stock.prueba.ts`.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P1.6 (parte stock):** ¿La existencia de un producto se guarda o se calcula?
- **P2.1:** ¿Dónde se expone la API REST para agregar un producto?
- **P2.2:** ¿Qué responde la API si se carga un producto con un código que ya existe?
- **P3.1:** ¿Dónde se verifica que el stock no quede negativo?
- **P3.10:** ¿Dónde queda registrado cada movimiento de stock?
