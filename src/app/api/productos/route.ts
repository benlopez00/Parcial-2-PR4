import { crearProducto, listarProductos } from "@/servicios/servicio-productos";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-P1: consulta del catálogo filtrado y paginado.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => listarProductos(usuarioActual, consulta));
// Implementa RF-P2: alta de producto con stock inicial opcional.
export const POST = envoltorioRuta(async ({ usuarioActual, cuerpo }) => crearProducto(usuarioActual, cuerpo), { leeCuerpo: true, estadoExito: 201 });
