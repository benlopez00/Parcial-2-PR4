import { z as esquema } from "zod";

const enteroNoNegativo = esquema.number({ error: "Ingresá un número entero no negativo." }).int("Ingresá un número entero.").min(0, "No puede ser negativo.").max(Number.MAX_SAFE_INTEGER);
const identificadorCuerpo = esquema.number({ error: "Elegí una opción válida." }).int().positive("Elegí una opción.").max(Number.MAX_SAFE_INTEGER);
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
  cantidad: esquema.number({ error: "Ingresá una cantidad." }).int("Ingresá unidades enteras.").positive("La cantidad debe ser mayor que cero.").max(Number.MAX_SAFE_INTEGER),
  observacion: esquema.string().trim().optional(),
};
export const opcionesMotivosIngreso = ["Reposición", "Stock inicial", "Devolución de cliente"] as const;
export const opcionesMotivosEgreso = ["Rotura", "Vencimiento", "Ajuste de inventario", "Uso interno"] as const;
const motivosIngreso = esquema.enum(opcionesMotivosIngreso, { error: "Elegí un motivo de ingreso." });
const motivosEgreso = esquema.enum(opcionesMotivosEgreso, { error: "Elegí un motivo de egreso." });

export const esquemaOpcionesProductos = esquema.object({
  q: esquema.string().trim().default(""),
  uso: esquema.enum(["movimiento", "historial"]),
  ...paginacion,
}).strict();

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
