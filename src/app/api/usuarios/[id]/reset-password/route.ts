import { restablecerContrasenaUsuario } from "@/servicios/servicio-usuarios";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-U5: restablece la contraseña de un usuario y devuelve la temporal una sola vez.
export const POST = envoltorioRuta(
  async ({ usuarioActual, parametros }) => {
    return restablecerContrasenaUsuario(usuarioActual, { id: parametros.id });
  },
  { estadoExito: 200 },
);
