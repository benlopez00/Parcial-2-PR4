import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";
import { eliminarCookieSesion } from "@/utilidades/sesion";

// Implementa RF-U1: cierra la sesión activa expirando la cookie httpOnly.
export const POST = envoltorioRuta(
  async () => {
    await eliminarCookieSesion();
    return null;
  },
  { estadoExito: 204 },
);
