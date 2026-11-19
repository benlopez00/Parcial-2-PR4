import Enlace from "next/link";
import { redirect as redirigir } from "next/navigation";
import { PantallaListadoFacturas } from "@/componentes/dominio/ventas/pantalla-listado-facturas";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarFacturas, obtenerOpcionesListadoFacturas } from "@/servicios/servicio-facturas";
import { construirUrlFacturas, leerConsultaFacturas, type ParametrosUrlFacturas } from "@/utilidades/consultas-facturas";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaFacturas({ searchParams }: { searchParams: Promise<ParametrosUrlFacturas> }) {
  let rutaCorregida = "";
  try {
    const usuario = await obtenerUsuarioActual();
    const consulta = leerConsultaFacturas(await searchParams);
    const [listado, opciones] = await Promise.all([
      listarFacturas(usuario, consulta), obtenerOpcionesListadoFacturas(usuario, {}),
    ]);
    const ultimaPagina = Math.max(1, Math.ceil(listado.total / listado.pageSize));
    if (consulta.page <= ultimaPagina) return <PantallaListadoFacturas consulta={consulta} listado={listado} opciones={opciones} />;
    rutaCorregida = construirUrlFacturas(new URLSearchParams(), { ...consulta, page: ultimaPagina === 1 ? null : ultimaPagina });
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina>
      <EncabezadoPagina titulo="Facturas" />
      <EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/ventas">Limpiar filtros y volver a intentar</Enlace></Boton>
    </ContenedorPagina>;
  }
  redirigir(rutaCorregida);
}
