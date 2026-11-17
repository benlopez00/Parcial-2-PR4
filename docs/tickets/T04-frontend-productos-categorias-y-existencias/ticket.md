# Ticket T04 — Frontend de Productos, Categorías, Existencias y Movimientos de Stock

- **Responsable:** Integrante 1 (`rama: integrante-1`)
- **Hito:** Hito 1 — Base y Productos
- **Dependencias:** `T01`, `T02`, `T03`

---

## 1. Objetivo

Construir todas las pantallas, pestañas y ventanas modales del módulo **Productos y Existencias**, respetando los campos, filtros, permisos visuales según el rol (`admin` vs `vendedor`) y flujos de las capturas de referencia.

---

## 2. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Productos/catalogo.jpg`](../../pantallas/Productos/catalogo.jpg) (`/productos` — Pestaña «Catálogo»)
> - [`docs/pantallas/Productos/nuevo-producto.jpg`](../../pantallas/Productos/nuevo-producto.jpg) (Modal «Nuevo producto»)
> - [`docs/pantallas/Productos/egreso.jpg`](../../pantallas/Productos/egreso.jpg) (Modal «Egreso de stock» / «Ingreso de stock»)
> - [`docs/pantallas/Productos/existencias.jpg`](../../pantallas/Productos/existencias.jpg) (`/productos` — Pestaña «Existencias y movimientos»)
> - [`docs/pantallas/Productos/ficha-producto.jpg`](../../pantallas/Productos/ficha-producto.jpg) (`/productos/[id]` — Ficha del producto e historial)
> - [`docs/pantallas/Productos/categorias.jpg`](../../pantallas/Productos/categorias.jpg) (`/productos/categorias` — Gestión de categorías)
> - [`docs/pantallas/Vendedor/vendedor-productos.jpg`](../../pantallas/Vendedor/vendedor-productos.jpg) (Vista del catálogo como Vendedor: sin botones `Categorías`, `Ingreso`, `Egreso` ni `+ Nuevo producto`)

### Detalles obligatorios de Interfaz:
1. **Pantalla `/productos` con dos pestañas (`Catálogo` y `Existencias y movimientos`):**
   - **Encabezado:** Título `Productos`, subtítulo con cantidad de productos activos y, **solo si el usuario es `admin`**, botones de acción: `Categorías` (enlace a `/productos/categorias`), `↓ Ingreso`, `↑ Egreso` y `+ Nuevo producto`.
   - **Pestaña «Catálogo» (`Productos/catalogo.jpg`):**
     - Barra de filtros (sincronizada con la URL): buscador `Código o descripción`, selector `Todas las categorías`, selector de estado (`Activos` / `Inactivos` / `Todos` para admin) e interruptor (`Switch`) `Solo bajo mínimo`.
     - Tabla paginada con columnas: `Código`, `Descripción` (enlace a `/productos/[id]`), `Categoría`, `Precio` (en formato `$ 12.500,00`), `Existencia` (si está bajo el mínimo, mostrar insignia destacada de alerta `X · bajo mínimo`) y `Mínimo`.
   - **Pestaña «Existencias y movimientos» (`Productos/existencias.jpg`):**
     - Filtros por producto, tipo de movimiento (`Todos`, `Ingreso`, `Egreso`, `Venta`, `Anulación`) y rango de fechas (`Desde`, `Hasta`).
     - Tabla paginada con columnas: `Fecha` (`dd/mm/aaaa HH:mm`), `Producto` (`código` + `descripción`), `Tipo` (insignia con color según tipo), `Cantidad` (con signo `+` o `-`), `Existencia` (resultante), `Motivo / referencia` (con link a la factura si tiene `referencia.facturaId`) y `Usuario`.
2. **Modales en Productos (solo `admin`):**
   - **Modal `Nuevo producto` / `Editar producto` (`Productos/nuevo-producto.jpg`):** Campos `Código`, `Categoría`, `Descripción`, `Precio de venta ($)`, `Stock mínimo` y (solo en el alta) `Stock inicial` con nota aclaratoria de que se registrará como un movimiento de ingreso. Validación en vivo con el mismo esquema Zod de `src/validaciones/validacion-productos.ts`.
   - **Modal `Ingreso de stock` y `Egreso de stock` (`Productos/egreso.jpg`):** Selector de producto (o preseleccionado si se abre desde la ficha), muestra existencia actual, campo `Cantidad`, selector de `Motivo` (con las opciones oficiales según sea ingreso o egreso) y campo opcional `Observación`.
3. **Pantalla `/productos/[id]` — Ficha del Producto (`Productos/ficha-producto.jpg`):**
   - Enlace `← Productos`, título con la descripción, código y categoría.
   - Si es `admin`, botones `↓ Ingreso`, `↑ Egreso`, `Editar` y `Dar de baja` (con diálogo de confirmación).
   - 4 tarjetas de resumen: `Existencia`, `Stock mínimo`, `Precio de venta` y `Valor del stock` (`existencia × precio`).
   - Tabla paginada de `Movimientos de stock` de ese producto (del más nuevo al más viejo).
4. **Pantalla `/productos/categorias` (`Productos/categorias.jpg`):**
   - Formulario o modal de alta rápida de categoría, listado de categorías con su estado (`Activa` / `Inactiva`) y acciones de renombrar y activar/desactivar (mostrando el error claro si devuelve `409 CATEGORIA_EN_USO`).

---

## 3. Archivos a Crear / Modificar

- **Server Actions / Adaptadores (`src/app/(sistema)/productos/acciones.ts`):**
  - Acciones envueltas con `envoltorioAccion` que llaman a `servicio-productos.ts`, `servicio-stock.ts` y `servicio-categorias.ts`, ejecutando `revalidatePath`.
- **Componentes de Dominio (`src/componentes/dominio/productos/`):**
  - `tabla-catalogo-productos.tsx`
  - `tabla-movimientos-stock.tsx`
  - `modal-formulario-producto.tsx`
  - `modal-movimiento-stock.tsx`
  - `gestor-categorias.tsx`
- **Páginas (`src/app/(sistema)/productos/`):**
  - `src/app/(sistema)/productos/page.tsx`
  - `src/app/(sistema)/productos/[id]/page.tsx`
  - `src/app/(sistema)/productos/categorias/page.tsx`

---

## 4. Criterios de Aceptación

1. Ninguna página de `/productos` contiene etiquetas HTML sueltas ni formatea moneda/fechas manualmente.
2. Al iniciar sesión como `vendedor`, el catálogo se puede consultar y filtrar, pero no aparecen los botones de alta, edición, baja ni movimientos manuales de stock (como en `Vendedor/vendedor-productos.jpg`).
3. Los productos con `existencia < stockMinimo` muestran claramente la insignia `bajo mínimo` y actualizan el contador del panel lateral.
4. Los formularios de producto y movimiento de stock validan en el cliente con el mismo esquema Zod del servidor y muestran errores junto a cada campo.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P5.3:** ¿Dónde se validan los datos de un formulario? ¿Se usan las mismas reglas en el servidor?
- **Ejercicio de cambio pequeño 1:** Agregar el campo «marca» a los productos y mostrarlo en el catálogo.
