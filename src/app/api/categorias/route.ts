import { crearCategoria, listarCategorias } from "@/servicios/servicio-categorias";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P7: consulta de categorías activas.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => listarCategorias(usuarioActual, consulta));
// Implementa RF-P7: alta de categoría administrativa.
export const POST = envoltorioRuta(async ({ usuarioActual, cuerpo }) => crearCategoria(usuarioActual, cuerpo), { leeCuerpo: true, estadoExito: 201 });
