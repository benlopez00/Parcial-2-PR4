import { anularFactura } from "@/servicios/servicio-facturas";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-V9: anulación con motivo obligatorio, solo para administradores.
export const POST = envoltorioRuta(async ({ usuarioActual, parametros, cuerpo }) =>
  anularFactura(usuarioActual, { id: parametros.id, ...(cuerpo as Record<string, unknown>) }), { leeCuerpo: true });
