import { actualizarCliente, obtenerClientePorId } from "@/servicios/servicio-clientes";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-C3: ficha del cliente con saldo, disponible y últimas facturas.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros }) => obtenerClientePorId(usuarioActual, { id: parametros.id }));
// Implementa RF-C2 y RF-C7: edición y baja lógica, bloqueadas si el cliente tiene saldo.
export const PATCH = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  actualizarCliente(usuarioActual, { id: parametros.id, cambios: cuerpo }), { leeCuerpo: true });
