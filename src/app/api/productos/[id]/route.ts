import { actualizarProducto, obtenerProductoPorId } from "@/servicios/servicio-productos";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P1: consulta individual de producto.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros }) => obtenerProductoPorId(usuarioActual, { id: parametros.id }));
// Implementa RF-P2 y RF-P3: edición y baja lógica sin modificar existencia.
export const PATCH = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  actualizarProducto(usuarioActual, { id: parametros.id, cambios: cuerpo }), { leeCuerpo: true });
