# Ticket T09 — Frontend de Nueva Venta (`/ventas/nueva`) Operable con Teclado

- **Responsable:** Integrante 3 (`rama: integrante-3`)
- **Hito:** Hito 3 — Ventas
- **Dependencias:** `T01` a `T08`

---

## 1. Objetivo

Construir la pantalla interactiva de mostrador **Nueva Venta (`/ventas/nueva`)**, completamente operable con teclado (`F2`, `F4`, `F8`, `F9`, `↑/↓`, `Enter`), con búsqueda en vivo de productos y clientes, alta rápida de cliente en modal sin perder la venta en curso y las 3 formas de pago (`Contado`, `Tarjeta` y `Cuenta corriente`).

---

## 2. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Ventas/venta-vacia.jpg`](../../docs/pantallas/Ventas/venta-vacia.jpg) (`/ventas/nueva` — Estado inicial)
> - [`docs/pantallas/Ventas/venta-busqueda.jpg`](../../docs/pantallas/Ventas/venta-busqueda.jpg) (Buscador de productos con sugerencias y navegación por teclado)
> - [`docs/pantallas/Ventas/venta-cuenta.jpg`](../../docs/pantallas/Ventas/venta-cuenta.jpg) (Venta con ítems cargados y cliente en cuenta corriente)
> - [`docs/pantallas/Ventas/venta-alta-cliente.jpg`](../../docs/pantallas/Ventas/venta-alta-cliente.jpg) (Modal de alta rápida de cliente sin perder los ítems cargados)
> - [`docs/pantallas/Telefono/movil-venta.jpg`](../../docs/pantallas/Telefono/movil-venta.jpg) (Vista adaptable de Nueva Venta en `390 px` de ancho)

### Detalles obligatorios de Interfaz:
1. **Encabezado y Atajos de Teclado (`Ventas/venta-cuenta.jpg`):**
   - Título `Nueva venta` y subtítulo visible con la guía de atajos: `El número se asigna al confirmar. Operable con teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar.`
   - Manejador de teclado (`keydown`) en el componente que enfoca la sección correspondiente al presionar `F2`, `F4`, `F8` o dispara la confirmación con `F9`.
2. **Columna Izquierda — Sección «Ítems» (`RF-V1`, `RF-V3`, `RF-V4`):**
   - Selector de cantidad inicial (por defecto `1`) + campo buscador `Código o descripción` (`F2`).
   - Al escribir, consulta `GET /api/productos?q=...&activo=true` y despliega lista de coincidencias mostrando código, descripción, precio y **existencia disponible**.
   - Las teclas `↑` y `↓` cambian el producto resaltado y `Enter` lo agrega a la tabla de renglones.
   - Si el producto ya estaba en la tabla, **suma la cantidad al renglón existente** (validando no superar su `existencia` disponible).
   - Cada renglón muestra: `Descripción` (`código · Disponible: X`), controles `- / input / +` de `Cantidad` (bloqueando superar la existencia), `Precio unit.`, `Subtotal` y botón de quitar renglón.
3. **Columna Derecha Superior — Sección «Comprador» (`RF-V2`):**
   - Selector de modo: `Consumidor final` (por defecto, no pide datos) o `Cliente registrado` (`F4`).
   - Al elegir `Cliente registrado`, permite buscar por nombre, DNI o CUIT (`GET /api/clientes?q=...`) o abrir el botón `+ Nuevo cliente` (`Ventas/venta-alta-cliente.jpg`), que reutiliza el modal de `T07`, crea el cliente con `POST /api/clientes` y lo deja seleccionado automáticamente sin perder los ítems de la venta.
   - Una vez seleccionado el cliente, muestra su nombre, documento, insignia `Cta. cte.` (si está habilitada) y su `Saldo` actual.
4. **Columna Derecha Media — Sección «Forma de pago» (`RF-V5`):**
   - Tres pestañas/botones (`F8`): `Contado`, `Tarjeta` y `Cta. cte.`:
     - **Contado:** campo `Monto recibido ($)` (por defecto el total) y cálculo en vivo del `Vuelto`.
     - **Tarjeta:** selector `Tipo` (`Débito` o `Crédito`), selector/campo `Marca` (`Visa`, `Mastercard`, `Cabal`, `Naranja`, etc.) y campo `Últimos 4 dígitos` (exactamente 4 números; **nunca pedir el número completo**).
     - **Cta. cte.:** deshabilitada si el comprador es *Consumidor final* o si el cliente no tiene cuenta corriente habilitada. Muestra el desglose: `Saldo actual`, `+ Esta factura`, `Saldo resultante` y `Límite de crédito` (alertando en pantalla si el saldo resultante supera el límite).
5. **Columna Derecha Inferior — Resumen y Confirmación (`RF-V6`):**
   - Muestra `Unidades` totales, `Vendedor` conectado, `Número` informativo (`GET /api/facturas/proximo-numero` con aclaración `(al confirmar)`), `Total` destacado en grande, botón `Confirmar factura (F9)` y botón `Descartar venta`.
   - Al confirmar, envía `POST /api/facturas` (solo `clienteId`, `items: [{ productoId, cantidad }]` y `pago`) y redirige al comprobante emitido (`/ventas/[id]`).

---

## 3. Archivos a Crear / Modificar

- **Componentes de Dominio (`src/componentes/dominio/ventas/`):**
  - `buscador-items-venta.tsx`
  - `tabla-renglones-venta.tsx`
  - `selector-comprador-venta.tsx`
  - `selector-forma-pago.tsx`
  - `panel-nueva-venta.tsx`
- **Página (`src/app/(sistema)/ventas/nueva/`):**
  - `src/app/(sistema)/ventas/nueva/page.tsx`

---

## 4. Criterios de Aceptación

1. Se puede buscar y agregar productos usando únicamente el teclado (`F2`, escribir, `↑`/`↓`, `Enter`).
2. Agregar dos veces el mismo producto incrementa la cantidad en el mismo renglón y no permite superar el stock disponible.
3. Se puede dar de alta un cliente desde el modal en medio de una venta y queda seleccionado sin perder los productos ya cargados.
4. En pago con tarjeta solo se piden tipo, marca y últimos 4 dígitos.
5. En cuenta corriente se bloquea la confirmación si es Consumidor Final o si supera el límite de crédito del cliente.

---

## 5. Preguntas de Defensa que Resuelve este Ticket (`respuestas-defensa.md`)

- **P2.6:** ¿Por qué el cliente no envía el precio ni el total al crear una factura?
- **P4.1:** ¿En qué parte se ingresa el número de tarjeta de crédito?
- **P5.4:** ¿Cómo se agrega un producto a la venta usando solo el teclado?
