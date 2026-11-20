import { registrarPagoCuentaCorriente } from "@/servicios/servicio-pagos";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-C5: registro de un pago a cuenta con recibo numerado.
export const POST = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  registrarPagoCuentaCorriente(usuarioActual, { clienteId: parametros.id, pago: cuerpo }), { leeCuerpo: true, estadoExito: 201 });
