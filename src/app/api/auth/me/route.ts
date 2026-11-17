import { obtenerPerfilActual } from "@/servicios/servicio-autenticacion";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-U2: devuelve los datos actuales del usuario autenticado consultado en BD.
export const GET = envoltorioRuta(async ({ usuarioActual }) => {
  return obtenerPerfilActual(usuarioActual, {});
});
