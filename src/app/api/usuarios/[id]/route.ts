import { actualizarUsuario } from "@/servicios/servicio-usuarios";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-U4: edita datos, rol o estado activo/inactivo de un usuario.
export const PATCH = envoltorioRuta(
  async ({ usuarioActual, parametros, cuerpo }) => {
    return actualizarUsuario(usuarioActual, {
      id: parametros.id,
      cambios: cuerpo,
    });
  },
  { leeCuerpo: true, estadoExito: 200 },
);
