# Ticket T11 — Tablero de Inicio (`/`), Servicio, API REST y Gráficos con Chart.js

- **Responsable:** Pablo (`ramaPablo`)
- **Estado:** Completado (19/11/2026)
- **Hito:** Hito 4 — Cierre
- **Dependencias:** `T01` a `T10`

---

## 1. Objetivo

Implementar el servicio `obtenerDatosTablero()`, el endpoint `GET /api/tablero` y la pantalla principal del **Tablero de Inicio (`/`)** con sus 4 tarjetas de indicadores, los 2 gráficos de **Chart.js (`react-chartjs-2`)**, el ranking de los 5 productos más vendidos del mes y el listado de productos bajo stock mínimo para reponer.

---

## 2. Requerimientos y Reglas Incluidas

- **RF-T1 Indicadores:**
  - `hoy`: cantidad de facturas emitidas hoy e importe total en centavos (calculado en hora de Argentina).
  - `mes`: cantidad de facturas emitidas en el mes en curso, importe total y `ticketPromedio` (`Math.round(importe / cantidad)` o `0` si no hay ventas).
  - `cuentasCorrientes`: `totalAdeudado` y cantidad de `clientesConSaldo > 0`.
  - `bajoMinimo`: cantidad de productos activos con `existencia < stockMinimo`.
- **RF-T2 Gráficos (Chart.js obligatorio):**
  - `ventasDiarias`: arreglo de **exactamente 30 elementos** (desde hace 29 días hasta hoy, ordenados del más viejo a hoy) con `{ fecha: "AAAA-MM-DD", importe }`, completando con `0` los días sin ventas para que el gráfico de barras de Chart.js no tenga huecos.
  - `porFormaDePago`: ventas del mes en curso agrupadas en `contado`, `tarjeta` y `cuenta_corriente` (solo facturas en estado `'emitida'`).
- **RF-T3 Más vendidos y Reposición:**
  - `masVendidos`: los 5 productos con más unidades vendidas en el mes en curso (`productoId`, `codigo`, `descripcion`, `unidades`, `importe`).
  - Cuadro `Para reponer`: lista de productos activos bajo el stock mínimo con enlace a `/productos?bajoMinimo=true`.

---

## 3. Especificaciones de Frontend y Pantallas de Referencia

> **Revisar obligatoriamente antes de maquetar:**
> - [`docs/pantallas/Inicio/inicio.jpg`](../../pantallas/Inicio/inicio.jpg) (`/` — Tablero completo en escritorio)
> - [`docs/pantallas/Telefono/movil-inicio.jpg`](../../pantallas/Telefono/movil-inicio.jpg) (`/` — Vista adaptable en `390 px` de ancho)

### Detalles obligatorios de Interfaz:
1. **Encabezado (`Inicio/inicio.jpg`):**
   - Saludo personalizado (`Hola, [Nombre]`), fecha actual formateada en español y botón `+ Nueva venta`.
2. **Fila de 4 Indicadores Superiores (`RF-T1`):**
   - `Ventas de hoy`: importe formateado y cantidad de facturas.
   - `Ventas del mes`: importe formateado, cantidad de facturas y `ticket promedio`.
   - `Deuda en cuentas corrientes`: importe total adeudado y cantidad de clientes con saldo (con enlace a `/clientes/saldos`).
   - `Bajo stock mínimo`: cantidad de productos para reponer con ícono de advertencia.
3. **Fila Central de Gráficos con `react-chartjs-2` (`RF-T2`):**
   - **Izquierda (2/3 de ancho):** Gráfico de barras `Ventas diarias · Últimos 30 días` (30 barras continuas sin huecos).
   - **Derecha (1/3 de ancho):** Gráfico de dona (`Doughnut`) `Por forma de pago` del mes actual, mostrando porcentaje e importe de `Contado`, `Tarjeta` y `Cuenta corriente` y el total en el centro.
4. **Fila Inferior (`RF-T3`):**
   - **Izquierda:** Tabla `Más vendidos del mes · Por unidades` (`#`, `Producto` con código, `Unidades`, `Importe`).
   - **Derecha:** Lista `Para reponer · Productos bajo el stock mínimo` mostrando cada producto, insignia `X · bajo mínimo` y su mínimo configurado, con enlace `Ver todos →` hacia `/productos?bajoMinimo=true`.

---

## 4. Archivos a Crear / Modificar

- **Servicio (`src/servicios/servicio-tablero.ts`):**
  - `obtenerDatosTablero(usuarioActual)` (solo contabiliza facturas en estado `'emitida'`, excluyendo anuladas).
- **Ruta API REST (`src/app/api/tablero/route.ts`):**
  - `GET /api/tablero`
- **Componentes de Dominio (`src/componentes/dominio/tablero/`):**
  - `tarjetas-indicadores.tsx`
  - `grafico-ventas-diarias.tsx` (Client Component con `Bar` de `react-chartjs-2`)
  - `grafico-formas-pago.tsx` (Client Component con `Doughnut` de `react-chartjs-2`)
  - `tabla-mas-vendidos.tsx`
  - `lista-reposicion-stock.tsx`
- **Página (`src/app/(sistema)/page.tsx`):**
  - Tablero principal en `/`.
- **Testing Separado (`src/pruebas/tablero.prueba.ts`):**
  - Verifica que `ventasDiarias` devuelva siempre 30 días con `0` en días sin ventas, que las facturas anuladas no sumen en los indicadores y que `masVendidos` ordene por unidades descendentes.

---

## 5. Criterios de Aceptación

1. `GET /api/tablero` devuelve exactamente la estructura JSON especificada en la Sección 11.7 de Requerimientos.
2. Una factura anulada no suma ni en `hoy`, ni en `mes`, ni en `ventasDiarias`, ni en `porFormaDePago`, ni en `masVendidos`.
3. `ventasDiarias` tiene siempre longitud `30`.
4. El tablero se adapta correctamente a `390 px` de ancho (`Telefono/movil-inicio.jpg`).

## 6. Checklist de ejecución

- [x] Revisar contrato 11.7, referencias, servicios y componentes existentes; completar plan.
- [x] Implementar períodos argentinos, indicadores, serie de 30 días y ranking estable.
- [x] Exponer `GET /api/tablero` con sesión y contrato exacto.
- [x] Incorporar las dos dependencias obligatorias y los gráficos accesibles.
- [x] Completar inicio, ranking, reposición y estados de carga/vacío/error.
- [x] Verificar actualización tras ventas, anulación, pagos y stock.
- [x] Ejecutar pruebas, tipos, build y navegador; cerrar auditoría, defensa y README.

**Cierre:** 288 pruebas automatizadas, verificación de tipos y compilación de producción aprobadas; 58 comprobaciones de navegador con ambos roles y anchos de 1440/768/390/360 px. Se corrigió y volvió a probar la recuperación con Reintentar. Ver [informe de auditoría](./informe-auditoria.md). No cambia el esquema de datos. Semilla y despliegue siguen en T12.

**Inspección posterior (19/11/2026):** se corrigió el desborde móvil de códigos largos permitidos en Para reponer. La regresión falló antes y pasó después; 29 comprobaciones adicionales de navegador, 288 pruebas, tipos y nuevo build aprobados. Detalle en la sección 5 del informe.
