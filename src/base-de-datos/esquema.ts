import { sql as expresionSql } from "drizzle-orm";
import {
  sqliteTable as tablaSqlite,
  integer as entero,
  text as texto,
  check as restriccion,
  uniqueIndex as indiceUnico,
  index as indice,
  type AnySQLiteColumn as ColumnaSqlite,
} from "drizzle-orm/sqlite-core";

const fechaActual = expresionSql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

function fechaCreacion() {
  return texto("fecha_creacion").notNull().default(fechaActual);
}

// Regla 10: SQLite debe rechazar decimales y valores fuera del entero seguro de JS.
function importeValido(columna: ColumnaSqlite) {
  return expresionSql`typeof(${columna}) = 'integer' AND ${columna} BETWEEN 0 AND 9007199254740991`;
}

export const usuarios = tablaSqlite("usuarios", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  email: texto("email").notNull().unique(),
  nombre: texto("nombre").notNull(),
  contrasenaHash: texto("contrasena_hash").notNull(),
  rol: texto("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: entero("activo", { mode: "boolean" }).notNull().default(true),
}, (tabla) => [
  restriccion("usuarios_rol_valido", expresionSql`${tabla.rol} IN ('admin', 'vendedor')`),
  restriccion("usuarios_activo_valido", expresionSql`${tabla.activo} IN (0, 1)`),
]);

export const categorias = tablaSqlite("categorias", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  nombre: texto("nombre").notNull().unique(),
  activa: entero("activa", { mode: "boolean" }).notNull().default(true),
}, (tabla) => [restriccion("categorias_activa_valida", expresionSql`${tabla.activa} IN (0, 1)`)]);

export const productos = tablaSqlite("productos", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  codigo: texto("codigo").notNull().unique(),
  descripcion: texto("descripcion").notNull(),
  categoriaId: entero("categoria_id").notNull().references(() => categorias.id),
  precio: entero("precio").notNull(),
  existencia: entero("existencia").notNull().default(0),
  stockMinimo: entero("stock_minimo").notNull().default(0),
  activo: entero("activo", { mode: "boolean" }).notNull().default(true),
}, (tabla) => [
  indice("productos_categoria_indice").on(tabla.categoriaId),
  restriccion("productos_precio_valido", importeValido(tabla.precio)),
  restriccion("productos_existencia_valida", importeValido(tabla.existencia)),
  restriccion("productos_stock_minimo_valido", importeValido(tabla.stockMinimo)),
  restriccion("productos_activo_valido", expresionSql`${tabla.activo} IN (0, 1)`),
]);

export const clientes = tablaSqlite("clientes", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  tipoDoc: texto("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
  nroDoc: texto("nro_doc").notNull(),
  nombre: texto("nombre").notNull(),
  domicilio: texto("domicilio"),
  telefono: texto("telefono"),
  email: texto("email"),
  cuentaCorriente: entero("cuenta_corriente", { mode: "boolean" }).notNull().default(false),
  limiteCredito: entero("limite_credito"),
  activo: entero("activo", { mode: "boolean" }).notNull().default(true),
}, (tabla) => [
  indiceUnico("clientes_documento_unico").on(tabla.tipoDoc, tabla.nroDoc),
  restriccion("clientes_tipo_doc_valido", expresionSql`${tabla.tipoDoc} IN ('DNI', 'CUIT')`),
  restriccion("clientes_limite_valido", expresionSql`${tabla.limiteCredito} IS NULL OR (${importeValido(tabla.limiteCredito)})`),
  restriccion("clientes_cuenta_corriente_valida", expresionSql`${tabla.cuentaCorriente} IN (0, 1)`),
  restriccion("clientes_activo_valido", expresionSql`${tabla.activo} IN (0, 1)`),
]);

export const facturas = tablaSqlite("facturas", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  puntoVenta: entero("punto_venta").notNull().default(1),
  numero: entero("numero").notNull(),
  fecha: texto("fecha").notNull().default(fechaActual),
  clienteId: entero("cliente_id").references(() => clientes.id),
  usuarioId: entero("usuario_id").notNull().references(() => usuarios.id),
  // Regla 3: datos históricos independientes de posteriores cambios del catálogo/cliente.
  clienteNombre: texto("cliente_nombre"),
  clienteTipoDoc: texto("cliente_tipo_doc"),
  clienteNroDoc: texto("cliente_nro_doc"),
  clienteDomicilio: texto("cliente_domicilio"),
  total: entero("total").notNull(),
  formaPago: texto("forma_pago", { enum: ["contado", "tarjeta", "cuenta_corriente"] }).notNull(),
  montoRecibido: entero("monto_recibido"),
  tarjetaTipo: texto("tarjeta_tipo", { enum: ["debito", "credito"] }),
  tarjetaMarca: texto("tarjeta_marca"),
  tarjetaUltimos4: texto("tarjeta_ultimos4"),
  estado: texto("estado", { enum: ["emitida", "anulada"] }).notNull().default("emitida"),
  motivoAnulacion: texto("motivo_anulacion"),
  fechaAnulacion: texto("fecha_anulacion"),
  usuarioAnulacionId: entero("usuario_anulacion_id").references(() => usuarios.id),
}, (tabla) => [
  indiceUnico("facturas_numeracion_unica").on(tabla.puntoVenta, tabla.numero),
  indice("facturas_cliente_fecha_indice").on(tabla.clienteId, tabla.fecha),
  restriccion("facturas_punto_venta_valido", expresionSql`typeof(${tabla.puntoVenta}) = 'integer' AND ${tabla.puntoVenta} BETWEEN 1 AND 9999`),
  restriccion("facturas_numero_valido", expresionSql`typeof(${tabla.numero}) = 'integer' AND ${tabla.numero} BETWEEN 1 AND 99999999`),
  restriccion("facturas_total_valido", importeValido(tabla.total)),
  restriccion("facturas_monto_recibido_valido", expresionSql`${tabla.montoRecibido} IS NULL OR (${importeValido(tabla.montoRecibido)})`),
  restriccion("facturas_forma_pago_valida", expresionSql`${tabla.formaPago} IN ('contado', 'tarjeta', 'cuenta_corriente')`),
  restriccion("facturas_estado_valido", expresionSql`${tabla.estado} IN ('emitida', 'anulada')`),
  restriccion("facturas_tarjeta_tipo_valido", expresionSql`${tabla.tarjetaTipo} IS NULL OR ${tabla.tarjetaTipo} IN ('debito', 'credito')`),
  restriccion("facturas_ultimos4_validos", expresionSql`${tabla.tarjetaUltimos4} IS NULL OR (length(${tabla.tarjetaUltimos4}) = 4 AND ${tabla.tarjetaUltimos4} NOT GLOB '*[^0-9]*')`),
]);

export const facturaItems = tablaSqlite("factura_items", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  facturaId: entero("factura_id").notNull().references(() => facturas.id),
  productoId: entero("producto_id").notNull().references(() => productos.id),
  codigo: texto("codigo").notNull(),
  descripcion: texto("descripcion").notNull(),
  cantidad: entero("cantidad").notNull(),
  precioUnitario: entero("precio_unitario").notNull(),
  subtotal: entero("subtotal").notNull(),
}, (tabla) => [
  indiceUnico("factura_items_producto_unico").on(tabla.facturaId, tabla.productoId),
  restriccion("factura_items_cantidad_valida", expresionSql`typeof(${tabla.cantidad}) = 'integer' AND ${tabla.cantidad} BETWEEN 1 AND 9007199254740991`),
  restriccion("factura_items_precio_valido", importeValido(tabla.precioUnitario)),
  restriccion("factura_items_subtotal_valido", importeValido(tabla.subtotal)),
]);

export const movimientosStock = tablaSqlite("movimientos_stock", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  productoId: entero("producto_id").notNull().references(() => productos.id),
  usuarioId: entero("usuario_id").notNull().references(() => usuarios.id),
  facturaId: entero("factura_id").references(() => facturas.id),
  tipo: texto("tipo", { enum: ["venta", "anulacion", "ingreso", "egreso"] }).notNull(),
  cantidad: entero("cantidad").notNull(),
  existenciaResultante: entero("existencia_resultante").notNull(),
  motivo: texto("motivo").notNull(),
  observacion: texto("observacion"),
  fecha: texto("fecha").notNull().default(fechaActual),
}, (tabla) => [
  indice("movimientos_stock_producto_fecha_indice").on(tabla.productoId, tabla.fecha),
  restriccion("movimientos_stock_tipo_valido", expresionSql`${tabla.tipo} IN ('venta', 'anulacion', 'ingreso', 'egreso')`),
  restriccion("movimientos_stock_cantidad_valida", expresionSql`typeof(${tabla.cantidad}) = 'integer' AND ${tabla.cantidad} BETWEEN -9007199254740991 AND 9007199254740991 AND ((${tabla.tipo} IN ('venta', 'egreso') AND ${tabla.cantidad} < 0) OR (${tabla.tipo} IN ('ingreso', 'anulacion') AND ${tabla.cantidad} > 0))`),
  restriccion("movimientos_stock_existencia_valida", importeValido(tabla.existenciaResultante)),
]);

export const pagos = tablaSqlite("pagos", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  puntoVenta: entero("punto_venta").notNull().default(1),
  numeroRecibo: entero("numero_recibo").notNull(),
  fecha: texto("fecha").notNull().default(fechaActual),
  clienteId: entero("cliente_id").notNull().references(() => clientes.id),
  usuarioId: entero("usuario_id").notNull().references(() => usuarios.id),
  importe: entero("importe").notNull(),
  medio: texto("medio", { enum: ["efectivo", "transferencia", "tarjeta_debito"] }).notNull(),
  observacion: texto("observacion"),
}, (tabla) => [
  indiceUnico("pagos_numeracion_unica").on(tabla.puntoVenta, tabla.numeroRecibo),
  indice("pagos_cliente_fecha_indice").on(tabla.clienteId, tabla.fecha),
  restriccion("pagos_punto_venta_valido", expresionSql`typeof(${tabla.puntoVenta}) = 'integer' AND ${tabla.puntoVenta} BETWEEN 1 AND 9999`),
  restriccion("pagos_numero_valido", expresionSql`typeof(${tabla.numeroRecibo}) = 'integer' AND ${tabla.numeroRecibo} BETWEEN 1 AND 99999999`),
  restriccion("pagos_importe_valido", expresionSql`(${importeValido(tabla.importe)}) AND ${tabla.importe} > 0`),
  restriccion("pagos_medio_valido", expresionSql`${tabla.medio} IN ('efectivo', 'transferencia', 'tarjeta_debito')`),
]);

export const movimientosCuenta = tablaSqlite("movimientos_cuenta", {
  id: entero("id").primaryKey({ autoIncrement: true }),
  fechaCreacion: fechaCreacion(),
  clienteId: entero("cliente_id").notNull().references(() => clientes.id),
  facturaId: entero("factura_id").references(() => facturas.id),
  pagoId: entero("pago_id").references(() => pagos.id),
  tipo: texto("tipo", { enum: ["debito", "credito"] }).notNull(),
  importe: entero("importe").notNull(),
  fecha: texto("fecha").notNull().default(fechaActual),
  descripcion: texto("descripcion").notNull(),
}, (tabla) => [
  indice("movimientos_cuenta_cliente_fecha_indice").on(tabla.clienteId, tabla.fecha),
  restriccion("movimientos_cuenta_tipo_valido", expresionSql`${tabla.tipo} IN ('debito', 'credito')`),
  restriccion("movimientos_cuenta_importe_valido", importeValido(tabla.importe)),
  restriccion("movimientos_cuenta_origen_unico", expresionSql`(${tabla.facturaId} IS NOT NULL AND ${tabla.pagoId} IS NULL) OR (${tabla.facturaId} IS NULL AND ${tabla.pagoId} IS NOT NULL)`),
]);

export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioNuevo = typeof usuarios.$inferInsert;
export type UsuarioAutenticado = Pick<Usuario, "id" | "nombre" | "email" | "rol">;
export type Categoria = typeof categorias.$inferSelect;
export type CategoriaNueva = typeof categorias.$inferInsert;
export type Producto = typeof productos.$inferSelect;
export type ProductoNuevo = typeof productos.$inferInsert;
export type Cliente = typeof clientes.$inferSelect;
export type ClienteNuevo = typeof clientes.$inferInsert;
export type Factura = typeof facturas.$inferSelect;
export type FacturaNueva = typeof facturas.$inferInsert;
export type ItemFactura = typeof facturaItems.$inferSelect;
export type ItemFacturaNuevo = typeof facturaItems.$inferInsert;
export type MovimientoStock = typeof movimientosStock.$inferSelect;
export type MovimientoStockNuevo = typeof movimientosStock.$inferInsert;
export type Pago = typeof pagos.$inferSelect;
export type PagoNuevo = typeof pagos.$inferInsert;
export type MovimientoCuenta = typeof movimientosCuenta.$inferSelect;
export type MovimientoCuentaNuevo = typeof movimientosCuenta.$inferInsert;
