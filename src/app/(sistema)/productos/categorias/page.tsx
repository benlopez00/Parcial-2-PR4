import { redirect as redirigir } from "next/navigation";
import { GestorCategorias } from "@/componentes/dominio/productos/gestor-categorias";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarCategoriasAdministracion } from "@/servicios/servicio-categorias";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaCategorias() {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const categorias = await listarCategoriasAdministracion(usuarioActual, {});
    return <GestorCategorias categorias={categorias} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina><EstadoError titulo="No pudimos abrir categorías" mensaje={resultado.error.message} /></ContenedorPagina>;
  }
}
