import { actualizarCategoria } from "@/servicios/servicio-categorias";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P7: edición y baja lógica de categoría.
export const PATCH = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  actualizarCategoria(usuarioActual, { id: parametros.id, cambios: cuerpo }), { leeCuerpo: true });
