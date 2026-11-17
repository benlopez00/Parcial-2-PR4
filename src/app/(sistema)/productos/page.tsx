import Enlace from "next/link";
import { redirect as redirigir } from "next/navigation";
import { PantallaProductos } from "@/componentes/dominio/productos/pantalla-productos";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarCategorias, listarCategoriasAdministracion } from "@/servicios/servicio-categorias";
import { listarProductos, obtenerProductoPorId, obtenerResumenProductos } from "@/servicios/servicio-productos";
import { listarMovimientosStockParaPantalla } from "@/servicios/servicio-stock";
import { leerConsultaProductos } from "@/utilidades/consultas-productos";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import type { ParametrosUrlProductos } from "@/validaciones/validacion-pantalla-productos";

export const dynamic = "force-dynamic";

export default async function PaginaProductos({ searchParams }: { searchParams: Promise<ParametrosUrlProductos> }) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const consulta = leerConsultaProductos(await searchParams);
    const [resumen, categorias, listado, movimientos, productoSeleccionado] = await Promise.all([
      obtenerResumenProductos(usuarioActual, {}),
      usuarioActual.rol === "admin" ? listarCategoriasAdministracion(usuarioActual, {}) : listarCategorias(usuarioActual, {}),
      consulta.pestana === "catalogo" ? listarProductos(usuarioActual, consulta.catalogo) : null,
      consulta.pestana === "movimientos" ? listarMovimientosStockParaPantalla(usuarioActual, consulta.movimientos) : null,
      consulta.movimientos.productoId ? obtenerProductoPorId(usuarioActual, { id: consulta.movimientos.productoId }) : null,
    ]);
    return <PantallaProductos usuarioActual={usuarioActual} resumen={resumen} categorias={categorias} consulta={consulta}
      listado={listado} movimientos={movimientos} productoSeleccionado={productoSeleccionado} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina><EncabezadoPagina titulo="Productos" /><EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/productos">Limpiar filtros y volver a intentar</Enlace></Boton>
    </ContenedorPagina>;
  }
}
