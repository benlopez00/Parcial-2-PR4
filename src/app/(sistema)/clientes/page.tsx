import Enlace from "next/link";
import { redirect as redirigir } from "next/navigation";
import { PantallaClientes } from "@/componentes/dominio/clientes/pantalla-clientes";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { Boton } from "@/componentes/interfaz/boton";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarClientes } from "@/servicios/servicio-clientes";
import { leerConsultaClientes } from "@/utilidades/consultas-clientes";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import type { ParametrosUrlClientes } from "@/validaciones/validacion-pantalla-clientes";

export const dynamic = "force-dynamic";

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<ParametrosUrlClientes> }) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const consulta = leerConsultaClientes(await searchParams);
    // El subtítulo muestra el total adeudado de todo el comercio, no el del filtro actual:
    // por eso va una consulta aparte con conDeuda, que es la que devuelve totalAdeudado.
    const [listado, deuda] = await Promise.all([
      listarClientes(usuarioActual, consulta),
      listarClientes(usuarioActual, { conDeuda: "true", pageSize: 1 }),
    ]);
    return <PantallaClientes consulta={consulta} listado={listado} totalAdeudado={deuda.totalAdeudado ?? 0} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina>
      <EncabezadoPagina titulo="Clientes" />
      <EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/clientes">Limpiar filtros y volver a intentar</Enlace></Boton>
    </ContenedorPagina>;
  }
}
