import { crearCliente, listarClientes } from "@/servicios/servicio-clientes";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-C1 y RF-C6: listado de clientes con saldo, filtros y paginación.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => listarClientes(usuarioActual, consulta));
// Implementa RF-C2 y RF-V2: alta de cliente, también desde el modal de Nueva venta.
export const POST = envoltorioRuta(async ({ usuarioActual, cuerpo }) => crearCliente(usuarioActual, cuerpo), { leeCuerpo: true, estadoExito: 201 });
