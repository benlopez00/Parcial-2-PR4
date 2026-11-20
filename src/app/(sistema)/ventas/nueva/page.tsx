import { PanelNuevaVenta } from "@/componentes/dominio/ventas/panel-nueva-venta";
import { obtenerUsuarioActual } from "@/utilidades/sesion";

export const dynamic = "force-dynamic";

export default async function PaginaNuevaVenta() {
  const usuarioActual = await obtenerUsuarioActual();
  return <PanelNuevaVenta vendedor={usuarioActual.nombre} />;
}
