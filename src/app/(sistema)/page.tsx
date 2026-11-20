import { redirect as redirigir } from "next/navigation";
import { PantallaTablero } from "@/componentes/dominio/tablero/pantalla-tablero";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { obtenerDatosTablero } from "@/servicios/servicio-tablero";
import { listarProductos } from "@/servicios/servicio-productos";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  try {
    const usuario = await obtenerUsuarioActual();
    const [datos, reposicion] = await Promise.all([
      obtenerDatosTablero(usuario, {}), listarProductos(usuario, { bajoMinimo: "true", pageSize: 5 }),
    ]);
    return <PantallaTablero nombre={usuario.nombre} datos={datos} reposicion={reposicion} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina><EstadoError mensaje={resultado.error.message} /></ContenedorPagina>;
  }
}
