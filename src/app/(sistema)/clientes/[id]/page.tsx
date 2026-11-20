import Enlace from "next/link";
import { notFound as noEncontrado, redirect as redirigir } from "next/navigation";
import { FichaCliente } from "@/componentes/dominio/clientes/ficha-cliente";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { obtenerClientePorId } from "@/servicios/servicio-clientes";
import { obtenerCuentaCorrienteCliente } from "@/servicios/servicio-pagos";
import { leerConsultaFichaCliente } from "@/utilidades/consultas-clientes";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import type { ParametrosUrlClientes } from "@/validaciones/validacion-pantalla-clientes";

export const dynamic = "force-dynamic";

export default async function PaginaFichaCliente({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<ParametrosUrlClientes>;
}) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const { id } = await params;
    const consulta = leerConsultaFichaCliente(await searchParams);
    const [ficha, cuenta] = await Promise.all([
      obtenerClientePorId(usuarioActual, { id }),
      obtenerCuentaCorrienteCliente(usuarioActual, { id, desde: consulta.desde, hasta: consulta.hasta }),
    ]);
    return <FichaCliente ficha={ficha} cuenta={cuenta} consulta={consulta} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    if (error instanceof ErrorApi && error.estadoHttp === 404) noEncontrado();
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina>
      <EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/clientes">← Clientes</Enlace></Boton>
    </ContenedorPagina>;
  }
}
