import type { ReactNode as NodoReact } from "react";
import { redirect as redirigir } from "next/navigation";
import { BarraSuperior } from "@/componentes/navegacion/barra-superior";
import { PanelLateral } from "@/componentes/navegacion/panel-lateral";
import { ErrorApi } from "@/errores/error-api";
import { obtenerResumenNavegacion } from "@/servicios/servicio-navegacion";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function DisposicionSistema({
  children: contenido,
}: Readonly<{ children: NodoReact }>) {
  let usuarioActual;
  try {
    usuarioActual = await obtenerUsuarioActual();
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) {
      redirigir("/login");
    }
    throw error;
  }

  const { cantidadProductosBajoMinimo } = await obtenerResumenNavegacion(usuarioActual, {});

  return (
    <div className="flex min-h-dvh bg-background">
      <PanelLateral
        usuario={usuarioActual}
        cantidadProductosBajoMinimo={cantidadProductosBajoMinimo}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          usuario={usuarioActual}
          cantidadProductosBajoMinimo={cantidadProductosBajoMinimo}
        />
        <main className="flex-1">{contenido}</main>
      </div>
    </div>
  );
}
