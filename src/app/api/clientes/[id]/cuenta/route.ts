import { obtenerCuentaCorrienteCliente } from "@/servicios/servicio-pagos";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-C4: estado de cuenta con saldo acumulado y filtros desde/hasta.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros, consulta }) =>
  obtenerCuentaCorrienteCliente(usuarioActual, { ...consulta, id: parametros.id }));
