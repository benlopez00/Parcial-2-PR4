import { redirect as redirigir } from "next/navigation";
import { PerfilUsuario } from "@/componentes/dominio/usuarios/perfil-usuario";
import { ErrorApi } from "@/errores/error-api";
import { obtenerPerfilActual } from "@/servicios/servicio-autenticacion";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaPerfil() {
  let usuarioActual;
  try {
    usuarioActual = await obtenerUsuarioActual();
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) {
      redirigir("/login");
    }
    throw error;
  }

  const perfil = await obtenerPerfilActual(usuarioActual, {});

  return <PerfilUsuario usuario={perfil} />;
}
