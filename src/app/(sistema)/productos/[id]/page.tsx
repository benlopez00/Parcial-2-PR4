import Enlace from "next/link";
import { notFound as noEncontrado, redirect as redirigir } from "next/navigation";
import { FichaProducto } from "@/componentes/dominio/productos/ficha-producto";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarCategoriasAdministracion } from "@/servicios/servicio-categorias";
import { obtenerFichaProducto } from "@/servicios/servicio-productos";
import { listarMovimientosStockParaPantalla } from "@/servicios/servicio-stock";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import type { ParametrosUrlProductos } from "@/validaciones/validacion-pantalla-productos";

export const dynamic = "force-dynamic";

export default async function PaginaFichaProducto({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<ParametrosUrlProductos>;
}) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const { id } = await params;
    const parametros = await searchParams;
    const [ficha, movimientos, categorias] = await Promise.all([
      obtenerFichaProducto(usuarioActual, { id }),
      listarMovimientosStockParaPantalla(usuarioActual, { productoId: id, page: parametros.page, pageSize: parametros.pageSize }),
      usuarioActual.rol === "admin" ? listarCategoriasAdministracion(usuarioActual, {}) : [],
    ]);
    return <FichaProducto ficha={ficha} movimientos={movimientos} usuarioActual={usuarioActual} categorias={categorias} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    if (error instanceof ErrorApi && error.estadoHttp === 404) noEncontrado();
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina><EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/productos">← Productos</Enlace></Boton>
    </ContenedorPagina>;
  }
}
