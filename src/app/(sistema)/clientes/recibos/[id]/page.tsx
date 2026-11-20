import Enlace from "next/link";
import { notFound as noEncontrado, redirect as redirigir } from "next/navigation";
import { VistaReciboImprimible } from "@/componentes/dominio/clientes/vista-recibo-imprimible";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { obtenerReciboPagoPorId } from "@/servicios/servicio-pagos";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaRecibo({ params }: { params: Promise<{ id: string }> }) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const { id } = await params;
    const recibo = await obtenerReciboPagoPorId(usuarioActual, { id });
    return <VistaReciboImprimible recibo={recibo} />;
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
