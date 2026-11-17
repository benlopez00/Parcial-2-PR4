import { crearUsuario, listarUsuarios } from "@/servicios/servicio-usuarios";
import { envoltorioRuta } from "@/utilidades/envoltorio-ruta";

// Implementa RF-U4: lista usuarios paginados con filtros de búsqueda y estado.
export const GET = envoltorioRuta(async ({ usuarioActual, consulta }) => {
  return listarUsuarios(usuarioActual, consulta);
});

// Implementa RF-U4: crea un usuario nuevo con contraseña temporal hasheada.
export const POST = envoltorioRuta(
  async ({ usuarioActual, cuerpo }) => {
    return crearUsuario(usuarioActual, cuerpo);
  },
  { leeCuerpo: true, estadoExito: 201 },
);
