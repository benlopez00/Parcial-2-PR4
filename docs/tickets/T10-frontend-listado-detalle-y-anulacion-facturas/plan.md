# Plan Técnico — T10

Responsable: Pablo · Rama: `ramaPablo` · Requisitos: RF-V7, RF-V8 y RF-V9.

## 1. Resumen del flujo
1. `/ventas` autentica, valida filtros URL con el esquema existente y consulta `listarFacturas`. La sumatoria viene del servicio, abarca todas las páginas y excluye anuladas.
2. Los selectores muestran clientes y vendedores con facturas, incluidos inactivos, exponiendo solo id y nombre. No requieren el listado de usuarios reservado al administrador.
3. Aplicar filtros reinicia página; paginar conserva búsqueda, fechas, cliente, vendedor, forma y estado. Se omiten vacíos y «todos».
4. `/ventas/[id]` usa `obtenerFacturaPorId`: datos históricos, renglones, pago y saldo resultante. No recalcula importes ni lee precios actuales.
5. `window.print()` oculta navegación y acciones; el comprobante conserva su estado y motivo de anulación.
6. Solo el administrador ve Anular en una emitida. Modal y servicio comparten `esquemaAnularFactura`; `accionAnularFactura` usa `envoltorioAccion`. El permiso y la transacción siguen en T08.
7. La acción revalida ventas, cliente/cuenta, productos/stock y navegación. El resultado actualiza el comprobante. Los errores conservan el motivo y permiten actualizar el estado.

## 2. Archivos a crear o modificar
- `src/app/(sistema)/ventas/`: listado, acción, carga/error; `[id]/page.tsx` y `[id]/not-found.tsx`.
- `src/componentes/dominio/ventas/`: pantalla, filtros y tabla de facturas, comprobante y modal.
- `src/utilidades/consultas-facturas.ts`: lectura validada, URL y tipos del esquema existente.
- `src/servicios/servicio-facturas.ts`: opciones mínimas de filtros para ambos roles.
- `src/app/globals.css`: impresión limitada al comprobante.
- `src/pruebas/listado-facturas.prueba.ts` y `acciones-facturas.prueba.ts`.
- Ticket, plan, informe, README y defensa; checklist personal fuera de Git.

## 3. Firmas de funciones principales y contratos
- `leerConsultaFacturas(parametros): ConsultaListadoFacturas` reutiliza `esquemaListadoFacturas`.
- `construirUrlFacturas(actual, cambios): string` conserva filtros y reinicia `page` al cambiarlos.
- `obtenerOpcionesListadoFacturas(usuarioActual, datosSinValidar, baseDatos?): Promise<OpcionesListadoFacturas>`.
- `accionAnularFactura(datosSinValidar): Promise<ResultadoAccion<FacturaPublica>>`.

## 4. Reglas de negocio y errores controlados
Sin dependencias, migraciones ni cambios REST. La factura no se borra ni se recalcula. El servidor controla sesión, rol, motivo y doble anulación. Se conservan las reglas de stock y cuenta de T08. Errores inesperados no exponen detalles internos.

Diseño: mantener paleta, tipografía y componentes del sistema. Referencias revisadas: `facturas.jpg`, `comprobante.jpg`, `anular.jpg`, `anulada.jpg`, `vendedor-factura.jpg`. Listado: resumen, Nueva venta, filtros y tabla. Móvil: filtros secundarios desplegables y tabla con desplazamiento interno. Comprobante: número/estado, datos históricos, renglones, pago y total; la anulación también se imprime.

Validar con Vitest, tipos, build y navegador real: T09 → detalle sin 404, tres pagos, filtros/recarga/paginación, roles y rechazo API, motivo vacío/cancelación/doble envío, stock y cuenta tras anular, impresión. Capturas a 1440, 768, 390 y 360 px e inspección visual.

## 5. Preguntas de defensa cubiertas
- P3.9: reversión visible y persistida al anular.
- P4.3: ocultar el botón no reemplaza la autorización del servidor.
- Cambio pequeño 5: agregar una columna en la tabla de dominio.

## 6. Cierre

Completado: 266 pruebas, tipos, build de producción y 49 comprobaciones en navegador. Se verificaron ambos roles, datos históricos, filtros, móvil, anulación y PDF multipágina. La revisión detectó que Ctrl+P imprimía el modal abierto: se ocultaron sus portales únicamente al imprimir un comprobante y se comprobó la corrección.
