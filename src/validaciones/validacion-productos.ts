import { z as esquema } from "zod";

const enteroNoNegativo = esquema.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const identificadorCuerpo = esquema.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const identificadorConsulta = esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const textoObligatorio = esquema.string().trim().min(1, "Este campo es obligatorio.");
const paginacion = {
  page: esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1),
  pageSize: esquema.coerce.number().int().min(1).max(100).default(20),
};
const camposProducto = {
  codigo: textoObligatorio,
  descripcion: textoObligatorio,
  categoriaId: identificadorCuerpo,
  precio: enteroNoNegativo,
  stockMinimo: enteroNoNegativo,
};

export const esquemaListadoProductos = esquema.object({
  q: esquema.string().trim().default(""),
  categoriaId: identificadorConsulta.optional(),
  bajoMinimo: esquema.enum(["true", "false"]).default("false"),
  activo: esquema.enum(["true", "false", "todos"]).default("true"),
  ...paginacion,
}).strict();
export const esquemaObtenerProducto = esquema.object({ id: identificadorConsulta }).strict();
export const esquemaCrearProducto = esquema.object({
  ...camposProducto,
  stockInicial: enteroNoNegativo.default(0),
}).strict();
export const esquemaEditarProducto = esquema.object({
  ...camposProducto,
  activo: esquema.boolean(),
}).partial().strict().refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indicá al menos un cambio.");
export const esquemaActualizarProducto = esquema.object({
  id: identificadorConsulta,
  cambios: esquemaEditarProducto,
}).strict();

const camposMovimiento = {
  cantidad: esquema.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  observacion: esquema.string().trim().optional(),
};
const motivosIngreso = esquema.enum(["Reposición", "Stock inicial", "Devolución de cliente"]);
const motivosEgreso = esquema.enum(["Rotura", "Vencimiento", "Ajuste de inventario", "Uso interno"]);

export const esquemaMovimientoManual = esquema.discriminatedUnion("tipo", [
  esquema.object({ ...camposMovimiento, tipo: esquema.literal("ingreso"), motivo: motivosIngreso }).strict(),
  esquema.object({ ...camposMovimiento, tipo: esquema.literal("egreso"), motivo: motivosEgreso }).strict(),
]);
export const esquemaRegistrarMovimientoManual = esquema.object({
  productoId: identificadorConsulta,
  movimiento: esquemaMovimientoManual,
}).strict();

export const esquemaMoverStock = esquema.discriminatedUnion("tipo", [
  esquema.object({ ...camposMovimiento, productoId: identificadorCuerpo, tipo: esquema.literal("ingreso"), motivo: motivosIngreso }).strict(),
  esquema.object({ ...camposMovimiento, productoId: identificadorCuerpo, tipo: esquema.literal("egreso"), motivo: motivosEgreso }).strict(),
  esquema.object({ ...camposMovimiento, productoId: identificadorCuerpo, tipo: esquema.literal("venta"), motivo: textoObligatorio, facturaId: identificadorCuerpo }).strict(),
  esquema.object({ ...camposMovimiento, productoId: identificadorCuerpo, tipo: esquema.literal("anulacion"), motivo: textoObligatorio, facturaId: identificadorCuerpo }).strict(),
]);

const diaCalendario = esquema.iso.date();
export const esquemaListadoMovimientosProducto = esquema.object({
  productoId: identificadorConsulta,
  ...paginacion,
}).strict();
export const esquemaListadoMovimientosStockGeneral = esquema.object({
  productoId: identificadorConsulta.optional(),
  tipo: esquema.enum(["ingreso", "egreso", "venta", "anulacion"]).optional(),
  desde: diaCalendario.optional(),
  hasta: diaCalendario.optional(),
  ...paginacion,
}).strict().refine((datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta, {
  path: ["hasta"], message: "La fecha hasta no puede ser anterior a desde.",
});
