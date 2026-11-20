import { z as esquema } from "zod";
import { esquemaListadoMovimientosStockGeneral, esquemaListadoProductos } from "./validacion-productos";

export const esquemaPantallaProductos = esquema.object({
  pestana: esquema.enum(["catalogo", "movimientos"]).default("catalogo"),
  ...esquemaListadoProductos.shape,
  productoId: esquemaListadoMovimientosStockGeneral.shape.productoId,
  tipo: esquemaListadoMovimientosStockGeneral.shape.tipo,
  desde: esquemaListadoMovimientosStockGeneral.shape.desde,
  hasta: esquemaListadoMovimientosStockGeneral.shape.hasta,
  paginaMovimientos: esquemaListadoMovimientosStockGeneral.shape.page,
  tamanoPaginaMovimientos: esquemaListadoMovimientosStockGeneral.shape.pageSize,
}).strict().refine((datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta, {
  path: ["hasta"], message: "La fecha hasta no puede ser anterior a desde.",
});

export interface ConsultaPantallaProductos {
  pestana: "catalogo" | "movimientos";
  catalogo: esquema.output<typeof esquemaListadoProductos>;
  movimientos: esquema.output<typeof esquemaListadoMovimientosStockGeneral>;
}

export type ParametrosUrlProductos = Record<string, string | string[] | undefined>;
export type CambiosConsultaProductos = Record<string, string | number | undefined | null>;
