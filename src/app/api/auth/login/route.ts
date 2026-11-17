import { iniciarSesion } from "@/servicios/servicio-autenticacion";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";
import { establecerCookieSesion } from "@/utilidades/sesion";

// Implementa RF-U1: autentica credenciales, emite cookie httpOnly y devuelve el usuario público.
export const POST = envoltorioRuta(
  async ({ cuerpo }) => {
    const usuario = await iniciarSesion(cuerpo);
    await establecerCookieSesion(usuario.id);
    return usuario;
  },
  { requiereSesion: false, leeCuerpo: true, estadoExito: 200 },
);
