import Enlace from "next/link";
import { redirect as redirigir } from "next/navigation";
import { ResumenSaldos } from "@/componentes/dominio/clientes/resumen-saldos";
import { TablaSaldos } from "@/componentes/dominio/clientes/tabla-saldos";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";
import { ErrorApi } from "@/errores/error-api";
import { convertirErrorAResultadoAccion } from "@/errores/manejador-errores";
import { listarClientes } from "@/servicios/servicio-clientes";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import type { ParametrosUrlClientes } from "@/validaciones/validacion-pantalla-clientes";

export const dynamic = "force-dynamic";

export default async function PaginaSaldos({ searchParams }: { searchParams: Promise<ParametrosUrlClientes> }) {
  try {
    const usuarioActual = await obtenerUsuarioActual();
    const { page } = await searchParams;
    // RF-C6: solo los que deben, de mayor a menor. El totalAdeudado lo calcula el servicio.
    const listado = await listarClientes(usuarioActual, { conDeuda: "true", orden: "saldo", page });

    return <ContenedorPagina ancho="completo">
      <Boton comoHijo variant="link" className="mb-4 px-0"><Enlace href="/clientes">← Clientes</Enlace></Boton>
      <EncabezadoPagina titulo="Saldos" descripcion="Clientes con deuda en cuenta corriente, de mayor a menor." />
      <ResumenSaldos totalAdeudado={listado.totalAdeudado ?? 0} clientesConDeuda={listado.total} />
      <Tarjeta className="overflow-hidden"><TablaSaldos listado={listado} /></Tarjeta>
    </ContenedorPagina>;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    const resultado = convertirErrorAResultadoAccion(error);
    if (resultado.error.code === "ERROR_INTERNO") throw error;
    return <ContenedorPagina>
      <EncabezadoPagina titulo="Saldos" />
      <EstadoError mensaje={resultado.error.message} />
      <Boton comoHijo variant="outline" className="mt-4"><Enlace href="/clientes">← Clientes</Enlace></Boton>
    </ContenedorPagina>;
  }
}
