# Plan Técnico — T11

Responsable: Pablo · Rama: `ramaPablo` · RF-T1, RF-T2 y RF-T3.

## 1. Resumen del flujo
1. Capturar una sola fecha de referencia por consulta. Día, mes y los últimos 30 días se calculan en Argentina, con límites UTC consistentes con los filtros existentes.
2. Agrupar facturas emitidas por día argentino y medio. De esos grupos acotados salen hoy, mes, promedio, serie y distribución; ninguna anulada interviene. Sumar y redondear con enteros exactos.
3. Consultar el top cinco del mes por unidades, con desempate por id. Importes de los renglones congelados; código y descripción del producto actual. Incluir productos que luego se desactivaron.
4. Reutilizar `listarClientes` con deuda positiva y todos los estados para deuda/cantidad, y `obtenerResumenNavegacion` para el conteo de stock activo bajo mínimo. No compensar deudores con saldos a favor.
5. Página y API usan el mismo servicio protegido. El contrato tiene exactamente siete claves. Reposición se obtiene aparte con `listarProductos`, cinco filas y enlace al catálogo completo.
6. Pantalla con saludo, fecha, Nueva venta, cuatro indicadores, barras, dona con leyenda/importes/porcentajes/total, ranking y reposición. Mantener el sistema visual existente; gráficos con datos reales y alternativas legibles, sin valores ficticios para rellenar vacíos.
7. Inicio dinámico y botón Actualizar. Invalidar inicio tras pagos; productos y anulación ya invalidan el layout. Comprobar retorno desde ventas sin datos viejos.

## 2. Archivos a crear o modificar
- `src/servicios/servicio-tablero.ts`: contrato y agregaciones.
- `src/utilidades/fechas-tablero.ts`, `src/errores/errores-tablero.ts`: períodos y rango numérico separados del flujo.
- `src/app/api/tablero/route.ts`; `src/app/(sistema)/page.tsx`, `loading.tsx`, `error.tsx`.
- `src/componentes/dominio/tablero/`: pantalla, indicadores, dos gráficos, ranking y reposición.
- `src/utilidades/formatos.ts`: fecha larga, mes, día/mes y etiquetas de ejes/porcentajes centralizados.
- `src/app/(sistema)/clientes/acciones.ts`: revalidación de inicio tras pagos.
- `src/pruebas/tablero.prueba.ts`, `api-tablero.prueba.ts`: lógica, límites, permisos y contrato.
- `package.json`, `pnpm-lock.yaml`: solo Chart.js y react-chartjs-2 exigidos por el parcial.
- Ticket, este plan, auditoría, README y defensa. Checklist personal fuera de Git.

## 3. Firmas de funciones principales y contratos
- `obtenerDatosTablero(usuarioActual, datosSinValidar, baseDatos?): Promise<DatosTablero>`: valida sin parámetros y exige sesión vigente.
- `DatosTablero`: `hoy`, `mes`, `cuentasCorrientes`, `bajoMinimo`, `ventasDiarias`, `porFormaDePago`, `masVendidos`, exactamente según 11.7.
- `calcularPeriodosTablero(referencia: Date)`: fecha local, límites del mes, inicio de consulta y 30 fechas ordenadas.
- `convertirEnteroTablero(valor: bigint): number`: rechaza desbordes antes de convertir a JSON.
- Página obtiene usuario, fecha, tablero y reposición del servidor; los Client Components solo dibujan, formatean y actualizan.

## 4. Reglas de negocio y errores controlados
Solo emitidas, intervalos de inicio inclusivo/fin exclusivo, treinta días incluidos hoy, mes calendario argentino, tres medios presentes aun con cero, promedio cero sin facturas y redondeo exacto en centavos. Sesión/validación usan los adaptadores existentes. No se modifica stock, saldo ni esquema de base.

Pruebas: base vacía, medianoche y cambio de mes/año/bisiesto, exclusión de anuladas en todas las agregaciones, top cinco/desempate, precios congelados, deudas positivas sin compensación, inactivos/mínimo estricto, límites numéricos, API y roles. Navegador: gráficos reales, tablas alternativas, ambos roles, actualización por operaciones y 1440/768/390/360 px. Suite completa, tipos y build.

## 5. Preguntas de defensa cubiertas
P5.1: tablero dentro del layout común. P5.2: formatos de importes, fechas y ejes centralizados. P5.5: carga, ceros, vacíos y error recuperable. P6.4: documentar correcciones reales de pruebas/auditoría. Añadir explicación del contrato, huso horario y exclusión de anuladas.

## 6. Resultado de ejecución
Completado el 19/11/2026 en `ramaPablo`, sin migraciones. Se agregaron únicamente `chart.js@4.6.1` y `react-chartjs-2@5.3.1`. Aprobaron las 288 pruebas, tipos, build de producción y 58 comprobaciones de navegador. La simulación de fallo detectó que `reset()` solo no renovaba los datos del servidor: Reintentar ahora ejecuta también `router.refresh()` dentro de una transición; la misma prueba pasó después. Detalle y límites en [informe-auditoria.md](./informe-auditoria.md).
