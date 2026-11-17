import { obtenerReciboPagoPorId } from "@/servicios/servicio-pagos";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-C5: consulta del recibo para reimprimirlo.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros }) => obtenerReciboPagoPorId(usuarioActual, { id: parametros.id }));
