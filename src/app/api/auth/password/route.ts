import { cambiarContrasenaPropia } from "@/servicios/servicio-autenticacion";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-U5: actualiza la contraseña propia verificando previamente la actual.
export const PUT = envoltorioRuta(
  async ({ usuarioActual, cuerpo }) => {
    await cambiarContrasenaPropia(usuarioActual, cuerpo);
    return null;
  },
  { leeCuerpo: true, estadoExito: 204 },
);
