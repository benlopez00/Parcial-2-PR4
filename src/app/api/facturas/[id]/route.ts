import { obtenerFacturaPorId } from "@/servicios/servicio-facturas";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-V7: comprobante completo, con renglones, pago y anulación si corresponde.
export const GET = envoltorioRuta(async ({ usuarioActual, parametros }) => obtenerFacturaPorId(usuarioActual, { id: parametros.id }));
