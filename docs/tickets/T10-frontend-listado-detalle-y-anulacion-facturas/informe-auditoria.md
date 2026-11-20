# Informe de Auditoría y Guía para el Desarrollador — T10

Responsable: Pablo · Rama: `ramaPablo` · Estado: **Completado** · 18/11/2026.

## 1. Resumen para el Desarrollador
T10 completa el recorrido de ventas: el 404 posterior a emitir desaparece. `/ventas` permite buscar por número o cliente, filtrar por fechas, cliente, vendedor, medio y estado, y paginar conservando todo en la URL. El resumen usa `totalEmitido` del servicio, sin sumar en la interfaz ni incluir anuladas.

`/ventas/[id]` consulta el contrato completo de T08 y presenta datos históricos, renglones, pago, total y saldo al emitir cuando corresponde. Imprimir oculta navegación, acciones y diálogos; conserva la anulación y admite varias páginas.

El administrador puede anular una emitida con motivo obligatorio. El modal usa el mismo Zod que el servidor, bloquea el doble envío y llama a una Server Action protegida. La acción delega en `anularFactura`, actualiza las vistas afectadas y devuelve el comprobante anulado. La autorización, reposición de stock y crédito siguen en la transacción de T08.

## 2. Mapa de Archivos del Ticket
| Archivo | Responsabilidad | Función / Elemento Clave |
| :--- | :--- | :--- |
| `src/app/(sistema)/ventas/page.tsx` | Sesión, filtros y consultas | `PaginaFacturas` |
| `src/app/(sistema)/ventas/[id]/page.tsx` | Factura existente para ambos roles | `PaginaComprobanteFactura` |
| `src/app/(sistema)/ventas/[id]/not-found.tsx` | Identificador inválido/inexistente | `FacturaNoEncontrada` |
| `src/app/(sistema)/ventas/acciones.ts` | Anulación protegida y revalidaciones | `accionAnularFactura` |
| `src/app/(sistema)/ventas/loading.tsx`, `error.tsx` | Carga y error recuperable | Componentes de estado existentes |
| `src/componentes/dominio/ventas/pantalla-listado-facturas.tsx` | Resumen, navegación URL y Nueva venta | `PantallaListadoFacturas` |
| `src/componentes/dominio/ventas/filtros-listado-facturas.tsx` | Siete filtros; despliegue móvil | `FiltrosListadoFacturas` |
| `src/componentes/dominio/ventas/tabla-listado-facturas.tsx` | Columnas, enlaces, estados y paginación | `TablaListadoFacturas` |
| `src/componentes/dominio/ventas/vista-comprobante-factura.tsx` | Presentación histórica, pagos e impresión | `VistaComprobanteFactura` |
| `src/componentes/dominio/ventas/modal-anular-factura.tsx` | Motivo, confirmación y errores | `ModalAnularFactura` |
| `src/utilidades/consultas-facturas.ts` | Validar URL y reiniciar página al filtrar | `leerConsultaFacturas`, `construirUrlFacturas` |
| `src/servicios/servicio-facturas.ts` | Opciones históricas, solo id/nombre | `obtenerOpcionesListadoFacturas` |
| `src/app/globals.css` | Impresión acotada al comprobante y sus portales | `@media print` |
| `src/pruebas/listado-facturas.prueba.ts` | URL, fechas, límites, opciones y privacidad | 23 casos |
| `src/pruebas/acciones-facturas.prueba.ts` | Sesión, rol, motivo, reversión y doble anulación | 5 casos integrados |
| Ticket, plan, `README.md`, `respuestas-defensa.md` | Estado, trazabilidad y defensa | RF-V7, RF-V8, RF-V9 |

## 3. Resultado de la Auditoría y Correcciones Aplicadas
- **266 pruebas Vitest aprobadas**, en 14 archivos: 238 anteriores y 28 nuevas. Las acciones se prueban con sesión firmada y servicios reales contra SQLite en memoria.
- **Tipos y build de producción aprobados**; las rutas `/ventas` y `/ventas/[id]` aparecen en la compilación. Sin dependencias ni migraciones nuevas; contrato REST intacto.
- **49 comprobaciones en navegador real** con una base temporal separada: 43 del recorrido general y 6 de historial/impresión. Incluyen las tres formas de pago, T09 → T10, siete filtros y recarga, paginación, vacíos, error de fechas, id inválido, ambos roles, 403 por API, motivo vacío, cancelar, sesión vencida, doble envío, stock y cuenta, importe tachado y sumatoria sin anuladas.
- **Historial:** cambiar nombre del cliente y precio/descripción del producto no altera el comprobante ya emitido. Una venta posterior tampoco cambia su saldo histórico.
- **Impresión:** botón `window.print`, navegación y acciones ocultas, datos de anulación conservados, tabla sin columnas recortadas y 35 renglones exportados a **tres páginas PDF**. Se comprobó también Ctrl+P con el modal abierto.
- **Adaptación:** listado y comprobante a 1440, 768, 390 y 360 px, sin desborde horizontal de página; las tablas conservan desplazamiento interno. Se revisaron las capturas y los filtros móviles abiertos/cerrados. La inspección de ambas pantallas terminó con **0 FAIL** y una advertencia de paleta en cada una. Se preserva el diseño del proyecto, sin rediseñar navegación ni cambiar paleta/tipografía. Monoespaciado reservado a números de factura y códigos; se acepta la advertencia de fondo crema por ser la paleta existente.

**Corrección de auditoría:** la primera versión ocultaba las acciones de la página, pero dejaba el portal del diálogo en la impresión. Se reprodujo Ctrl+P con Anular abierto, se ocultaron sus elementos en `@media print` únicamente cuando existe `.comprobante-factura`, y la misma comprobación pasó después. También se dio más ancho a la descripción impresa y se colocó la insignia de estado junto al título.

**Límites de la verificación:** SQLite local y navegador Chromium; no se probó Turso/Vercel, una impresora física ni carga masiva. Las bases y credenciales de prueba quedaron fuera de Git. El checklist personal sigue fuera del repositorio. Tablero y semilla/despliegue corresponden a T11/T12.

## 4. Guía Rápida para Defender este Ticket en el Examen
1. **¿Qué se revierte al anular?** Abrir `ModalAnularFactura` → `accionAnularFactura` → `anularFactura`. El componente explica la consecuencia; el servicio revierte stock y cuenta atómicamente. Después `VistaComprobanteFactura` muestra quién, cuándo y por qué.
2. **¿Ocultar Anular alcanza?** No. Mostrar la condición visual y después `envoltorioAccion`/`obtenerUsuarioActual` y `asegurarRolAdmin` en el servicio. Las pruebas cambian el rol o desactivan al usuario conservando su cookie; el permiso se pierde inmediatamente.
3. **¿Dónde agregar una columna?** En `TablaListadoFacturas`. Si el dato no está, ampliar `ResumenFactura` y la proyección de `listarFacturas`. Los filtros y `totalEmitido` continúan resueltos por el servicio; no duplicar esas reglas en la tabla.

## Auditoría conjunta T09–T12 — 19/11/2026

Se revisaron nuevamente los cuatro tickets integrados. Aprobaron 301 pruebas, tipos, build y 68 comprobaciones de navegador, más una venta simultánea de la última unidad desde dos procesos. No se encontraron defectos funcionales nuevos; se corrigieron referencias documentales antiguas al 404 y a las regresiones de paginación. La compilación actual quedó disponible en `http://localhost:3000`, preservando la base personal. Evidencia, alcance y límites en el [informe conjunto](../../auditoria-t09-t12.md).
