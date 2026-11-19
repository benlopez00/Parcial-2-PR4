import { notFound as noEncontrado, redirect as redirigir } from "next/navigation";
import { VistaComprobanteFactura } from "@/componentes/dominio/ventas/vista-comprobante-factura";
import { ErrorApi } from "@/errores/error-api";
import { obtenerFacturaPorId } from "@/servicios/servicio-facturas";
import { obtenerUsuarioActual } from "@/utilidades/sesion";
import { esquemaObtenerFactura } from "@/validaciones/validacion-facturas";

export const dynamic = "force-dynamic";

export default async function PaginaComprobanteFactura({ params }: { params: Promise<{ id: string }> }) {
  const entrada = esquemaObtenerFactura.safeParse(await params);
  if (!entrada.success) noEncontrado();
  try {
    const usuario = await obtenerUsuarioActual();
    const factura = await obtenerFacturaPorId(usuario, entrada.data);
    return <VistaComprobanteFactura factura={factura} esAdministrador={usuario.rol === "admin"} />;
  } catch (error) {
    if (error instanceof ErrorApi && error.estadoHttp === 401) redirigir("/login");
    if (error instanceof ErrorApi && error.estadoHttp === 404) noEncontrado();
    throw error;
  }
}
