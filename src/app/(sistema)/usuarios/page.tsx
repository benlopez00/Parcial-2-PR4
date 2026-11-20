import { redirect as redirigir } from "next/navigation";
import type { FiltroEstadoUsuario } from "@/componentes/dominio/usuarios/filtros-usuarios";
import { ListadoUsuarios } from "@/componentes/dominio/usuarios/listado-usuarios";
import { EstadoError } from "@/componentes/estados/estado-error";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { ErrorApi } from "@/errores/error-api";
import { listarUsuarios } from "@/servicios/servicio-usuarios";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

interface PropiedadesPaginaUsuarios {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function leerParametroUnico(valor: string | string[] | undefined): string | undefined {
  if (typeof valor === "string") {
    return valor;
  }
  if (Array.isArray(valor) && valor.length > 0) {
    return valor[0];
  }
  return undefined;
}

export default async function PaginaUsuarios({ searchParams }: PropiedadesPaginaUsuarios) {
  let usuarioActual;
  try {
    usuarioActual = await obtenerUsuarioActual();
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) {
      redirigir("/login");
    }
    throw error;
  }

  const consultaCruda = await searchParams;
  const q = leerParametroUnico(consultaCruda.q);
  const activo = leerParametroUnico(consultaCruda.activo);
  const page = leerParametroUnico(consultaCruda.page);
  const pageSize = leerParametroUnico(consultaCruda.pageSize);

  const parametrosConsulta: Record<string, string> = {};
  if (q !== undefined) parametrosConsulta.q = q;
  if (activo !== undefined) parametrosConsulta.activo = activo;
  if (page !== undefined) parametrosConsulta.page = page;
  if (pageSize !== undefined) parametrosConsulta.pageSize = pageSize;

  try {
    const listado = await listarUsuarios(usuarioActual, parametrosConsulta);
    const estadoInicial: FiltroEstadoUsuario =
      activo === "true" || activo === "false" ? activo : "todos";

    return (
      <ListadoUsuarios
        listadoInicial={listado}
        usuarioActualId={usuarioActual.id}
        busquedaInicial={q ?? ""}
        estadoInicial={estadoInicial}
      />
    );
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 403) {
      return (
        <ContenedorPagina>
          <EstadoError titulo="Sin permiso" mensaje={error.mensaje} />
        </ContenedorPagina>
      );
    }
    if (error instanceof ErrorApi && error.estadoHttp === 422) {
      const listadoPorDefecto = await listarUsuarios(usuarioActual, {});
      return (
        <ListadoUsuarios
          listadoInicial={listadoPorDefecto}
          usuarioActualId={usuarioActual.id}
          busquedaInicial=""
          estadoInicial="todos"
        />
      );
    }
    throw error;
  }
}
