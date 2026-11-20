import { confirmarFactura, listarFacturas } from "@/servicios/servicio-facturas";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-V8: listado de facturas filtrado y paginado.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => listarFacturas(usuarioActual, consulta));
// Implementa RF-V1 a RF-V6: emisión de la factura en una única transacción.
export const POST = envoltorioRuta(async ({ usuarioActual, cuerpo }) => confirmarFactura(usuarioActual, cuerpo), { leeCuerpo: true, estadoExito: 201 });
