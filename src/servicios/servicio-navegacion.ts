import { and as yLogico, count as contar, eq as igual, lt as menorQue } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { productos, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { asegurarUsuarioAutenticado } from "@/errores/verificadores-negocio";
import { esquemaSinDatos } from "@/validaciones/validacion-autenticacion";

// Implementa RF-U2 y la navegación común: cuenta productos activos por debajo del stock mínimo.
export async function obtenerResumenNavegacion(
  usuarioActual: UsuarioAutenticado,
  datosSinValidar: unknown,
  baseDatos: BaseDatos = bd,
): Promise<{ cantidadProductosBajoMinimo: number }> {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const [resultado] = await baseDatos
    .select({ total: contar() })
    .from(productos)
    .where(yLogico(igual(productos.activo, true), menorQue(productos.existencia, productos.stockMinimo)));

  return {
    cantidadProductosBajoMinimo: resultado?.total ?? 0,
  };
}
