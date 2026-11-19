# Informe de Auditoría y Guía para el Desarrollador — T11

Pablo · `ramaPablo` · 19/11/2026 · Completado.

## 1. Resumen para el Desarrollador

El inicio dejó de ser una pantalla vacía. Página y API comparten `obtenerDatosTablero`: captura una fecha de referencia, calcula el calendario argentino y consulta las facturas emitidas. Las sumas por día/medio alimentan ventas de hoy, mes, promedio, treinta días y distribución. Otra consulta obtiene los cinco productos con más unidades del mes. Se reutilizan las consultas existentes para deuda positiva y stock activo bajo mínimo; reposición se pide aparte con `listarProductos`, sin alterar el contrato público de siete claves.

Todos los importes siguen en centavos. Las agregaciones SQL se leen como texto y se suman con `BigInt`; el promedio redondea exactamente al centavo y se verifica el rango seguro antes de producir números JSON. Las facturas anuladas se excluyen de cada consulta de ventas. El ranking usa importes congelados de renglones, datos actuales del producto y desempata por id. La deuda no compensa clientes deudores con saldos a favor.

La pantalla conserva el layout y la paleta del sistema: saludo, fecha, Nueva venta, cuatro indicadores, gráficos Chart.js, ranking y reposición. Las barras tienen tabla alternativa de treinta días; la dona tiene leyenda con importes y porcentajes. Sin ventas se muestran ceros y mensajes reales. Actualizar mantiene los datos con `aria-busy`; Reintentar recupera un fallo del servidor. Los pagos invalidan también el inicio; ventas, anulaciones y stock se verificaron al regresar desde sus pantallas.

## 2. Mapa de Archivos del Ticket

| Archivo | Responsabilidad / elemento clave |
| --- | --- |
| `src/servicios/servicio-tablero.ts` | `obtenerDatosTablero`, contrato `DatosTablero`, agregaciones y exclusión de anuladas. |
| `src/utilidades/fechas-tablero.ts` | `calcularPeriodosTablero`: mes argentino y treinta fechas continuas. |
| `src/errores/errores-tablero.ts` | `convertirEnteroTablero`: error 422 antes de perder precisión. |
| `src/app/api/tablero/route.ts` | GET dinámico mediante `envoltorioRuta`, sesión y validación estricta. |
| `src/app/(sistema)/page.tsx` | `PaginaInicio`: carga del tablero y cinco productos para reponer, manejo de errores. |
| `src/app/(sistema)/loading.tsx` | `CargandoInicio`: `EstadoCarga` durante la carga de ruta. |
| `src/app/(sistema)/error.tsx` | `ErrorInicio`: `EstadoError`, refresco del servidor y reinicio del límite de error. |
| `src/componentes/dominio/tablero/pantalla-tablero.tsx` | `PantallaTablero`: composición, saludo, acciones y transición al actualizar. |
| `src/componentes/dominio/tablero/tarjetas-indicadores.tsx` | `TarjetasIndicadores`: valores y enlaces a ventas, saldos y productos. |
| `src/componentes/dominio/tablero/grafico-ventas-diarias.tsx` | `GraficoVentasDiarias`: barras y tabla alternativa con treinta fechas/importes. |
| `src/componentes/dominio/tablero/grafico-formas-pago.tsx` | `GraficoFormasPago`: dona, total, leyenda y porcentajes del mes. |
| `src/componentes/dominio/tablero/tabla-mas-vendidos.tsx` | `TablaMasVendidos`: hasta cinco productos y vacío útil. |
| `src/componentes/dominio/tablero/lista-reposicion-stock.tsx` | `ListaReposicionStock`: cinco productos, aviso si hay más y catálogo filtrado. |
| `src/utilidades/formatos.ts` | Fecha larga, mes, día/mes, eje monetario abreviado y porcentajes centralizados. |
| `src/app/(sistema)/clientes/acciones.ts` | `registrarPagoAccion` invalida `/` después de un pago correcto. |
| `src/pruebas/tablero.prueba.ts` | Servicio, calendario, redondeo, límites y reglas de agregación con base real aislada. |
| `src/pruebas/api-tablero.prueba.ts` | Ruta, sesión firmada, ambos roles, contrato exacto y baja inmediata. |
| `package.json`, `pnpm-lock.yaml` | Chart.js 4.6.1 y react-chartjs-2 5.3.1, compatibles con React 19; una dependencia transitiva de color. |
| `docs/tickets/T11-tablero-inicio-y-graficos/ticket.md`, `plan.md`, este informe | Alcance, ejecución y evidencia del cierre. |
| `README.md`, `respuestas-defensa.md` | Estado de T11 y explicación de las decisiones/corrección. |

## 3. Resultado de la Auditoría y Correcciones Aplicadas

- **Suite completa:** 16 archivos, **288 pruebas aprobadas**. T11 agrega 22 casos sobre las 266 existentes.
- **Tipos:** `next typegen` y `tsc --noEmit --incremental false` aprobados; el build final volvió a verificar TypeScript.
- **Producción local:** `next build --webpack` aprobado; incluye `/api/tablero` y `/` dinámicos.
- **Servicio/API:** contrato de siete claves, sesión obligatoria, admin/vendedor, usuario desactivado conservando cookie, rechazo de parámetros ajenos, treinta días con ceros, los tres medios aun vacíos, exclusión de anuladas, promedio cero y redondeo de medio centavo. Límites de medianoche, mes, año, bisiesto y mes de 31 días. Ranking numérico estable, precio congelado y producto luego inactivo. Deuda positiva sin compensar saldos a favor, stock activo estrictamente bajo mínimo, venta de importe cero y rechazo de desborde numérico.
- **Navegador Chromium sobre build de producción y SQLite temporal:** **58 comprobaciones aprobadas**. Inicio vacío, venta por teclado, contado/tarjeta/cuenta corriente, pago parcial desde su modal, anulación, ingreso de stock hasta el mínimo, enlaces y cincuenta ventas con fechas históricas. Comparación de indicadores con API y valores esperados, ambos roles, tabla alternativa y dibujo real de barras/sectores de Chart.js. Actualizar con respuesta retenida conserva datos y bloquea doble clic.
- **Adaptación e inspección:** capturas revisadas a 1440, 768, 390 y 360 px. Sin desborde horizontal de página; el ranking conserva desplazamiento interno en pantallas estrechas. Los dos gráficos permanecen visibles. Inspección automática: **0 FAIL**, una advertencia de fondo crema, aceptada porque es la paleta existente del sistema. No se rediseñó la navegación.
- **Fallo y recuperación:** se renombró temporalmente `facturas` exclusivamente en la base aislada. La API devolvió 500 `ERROR_INTERNO` sin SQL y la pantalla ofreció Reintentar. Tras restaurar la tabla, la misma prueba comprobó recuperación y claves foráneas intactas.

**Corrección real para P6.4:** la primera versión de `ErrorInicio` ejecutaba únicamente `reset()`. Después de restaurar la base, el botón seguía mostrando el error: no pedía una nueva respuesta al servidor. Se reprodujo en navegador, se agregó `router.refresh()` junto al reinicio dentro de una transición y se repitió todo el recorrido; la recuperación pasó. La copia de los estados compartidos se dejó genérica porque el límite también puede atender rutas hijas sin límite propio.

**Límites:** calendario UTC−3 fijo, igual que las consultas existentes, con comentario para migrar a zona IANA si Argentina cambia su horario. Verificado en SQLite local y Chromium; no se probó Turso/Vercel ni carga masiva. Las dos incidencias de paginación de T10 detectadas en su revisión posterior siguen fuera del alcance de T11: paginar mientras cambia un filtro y quedar en una página vacía al anular su última factura. Semilla y despliegue corresponden a T12. Bases, credenciales, scripts/capturas de comprobación y checklist personal permanecen fuera de Git.

## 4. Guía Rápida para Defender este Ticket en el Examen

1. **¿Por qué hay treinta días aunque no existan ventas?** Abrir `calcularPeriodosTablero` y después el `map` de `ventasDiarias` en `obtenerDatosTablero`: primero se genera el calendario y luego se completa cada importe faltante con cero. El día local comienza a las 03:00 UTC.
2. **¿Dónde se excluyen anuladas y se calcula el promedio?** Mostrar ambas consultas con `estado = emitida` y el redondeo con `BigInt` en el servicio. La interfaz recibe resultados y los formatea; no recalcula facturación ni saldos. Explicar por qué los saldos negativos de otros clientes no reducen la deuda positiva.
3. **¿Cómo se ve el dato sin distinguir colores y cómo se recupera un fallo?** Abrir los dos componentes de gráficos: nombres accesibles, tabla diaria y leyenda con texto/importes. Mostrar `ErrorInicio`, el refresco del servidor y la corrección reproducida descrita en P6.4. `PantallaTablero` permite Actualizar sin borrar los datos visibles.
