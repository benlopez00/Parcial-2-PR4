import { redirect as redirigir } from "next/navigation";
import { PantallaAcceso } from "@/componentes/dominio/autenticacion/pantalla-acceso";
import { ErrorApi } from "@/errores/error-api";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaAcceso() {
  try {
    await obtenerUsuarioActual();
    redirigir("/");
  } catch (error) {
    if (!(error instanceof ErrorApi && error.estadoHttp === 401)) {
      throw error;
    }
  }

  return <PantallaAcceso />;
}
