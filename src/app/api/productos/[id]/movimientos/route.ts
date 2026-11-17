import { listarMovimientosProducto, registrarMovimientoManual } from "@/servicios/servicio-stock";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P6: historial paginado del producto indicado por la URL.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros, consulta }) =>
  listarMovimientosProducto(usuarioActual, { ...consulta, productoId: parametros.id }));
// Implementa RF-P4 y RF-P5: ingreso o egreso manual del producto indicado por la URL.
export const POST = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  registrarMovimientoManual(usuarioActual, { productoId: parametros.id, movimiento: cuerpo }), { leeCuerpo: true, estadoExito: 201 });
