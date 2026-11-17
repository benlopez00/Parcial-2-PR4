import { obtenerProximoNumeroFactura } from "@/servicios/servicio-facturas";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-V1: número informativo para la pantalla; el real se asigna al confirmar.
export const GET = envoltorioRuta(async ({ usuarioActual }) => obtenerProximoNumeroFactura(usuarioActual, {}));
