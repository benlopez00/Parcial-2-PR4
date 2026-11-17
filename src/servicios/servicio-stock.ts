import { and as yLogico, count as contar, desc as descendente, eq as igual, gte as mayorOIgual, lt as menor, sql as expresionSql, type SQL as ExpresionSql } from "drizzle-orm";
import { bd, type BaseDatos, type TransaccionBaseDatos } from "@/base-de-datos/conexion";
import { facturas, movimientosStock, productos, usuarios, type MovimientoStock, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarExistenciaDentroDeRango, asegurarPermisoMovimientoStock, asegurarRecursoExiste,
  asegurarRolAdmin, asegurarStockSuficiente, asegurarUsuarioAutenticado,
} from "@/errores/verificadores-negocio";
import { convertirRangoDiasAInstantesUtc } from "@/utilidades/fechas-consulta";
import { formatearNumeroComprobante } from "@/utilidades/formatos";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";
import {
  esquemaListadoMovimientosProducto, esquemaListadoMovimientosStockGeneral, esquemaMoverStock, esquemaRegistrarMovimientoManual,
} from "@/validaciones/validacion-productos";

export interface MovimientoStockPublico {
  id: number; producto: { id: number; codigo: string }; tipo: MovimientoStock["tipo"];
  cantidad: number; existenciaResultante: number; motivo: string;
  referencia: { facturaId: number; numero: string } | null;
  usuario: { id: number; nombre: string }; fecha: string;
}
export interface ListadoMovimientosStock { data: MovimientoStockPublico[]; page: number; pageSize: number; total: number }
export interface MovimientoStockPantalla extends MovimientoStockPublico {
  producto: MovimientoStockPublico["producto"] & { descripcion: string };
  observacion: string | null;
}
export interface ListadoMovimientosStockPantalla extends Omit<ListadoMovimientosStock, "data"> { data: MovimientoStockPantalla[] }
const columnasMovimiento = {
  id: movimientosStock.id, producto: { id: productos.id, codigo: productos.codigo, descripcion: productos.descripcion },
  tipo: movimientosStock.tipo, cantidad: movimientosStock.cantidad, existenciaResultante: movimientosStock.existenciaResultante,
  motivo: movimientosStock.motivo, observacion: movimientosStock.observacion,
  usuario: { id: usuarios.id, nombre: usuarios.nombre }, fecha: movimientosStock.fecha,
  factura: { id: facturas.id, puntoVenta: facturas.puntoVenta, numero: facturas.numero },
};

// Implementa RF-P6: proyecta el historial sin exponer columnas internas y formatea la referencia.
async function consultarMovimientos(baseDatos: BaseDatos | TransaccionBaseDatos, filtro: ExpresionSql | undefined, page: number, pageSize: number): Promise<ListadoMovimientosStockPantalla> {
  const [{ total }] = await baseDatos.select({ total: contar() }).from(movimientosStock).where(filtro);
  const filas = await baseDatos.select(columnasMovimiento).from(movimientosStock)
    .innerJoin(productos, igual(movimientosStock.productoId, productos.id))
    .innerJoin(usuarios, igual(movimientosStock.usuarioId, usuarios.id))
    .leftJoin(facturas, igual(movimientosStock.facturaId, facturas.id)).where(filtro)
    .orderBy(descendente(movimientosStock.fecha), descendente(movimientosStock.id)).limit(pageSize).offset((page - 1) * pageSize);
  const data = filas.map(({ factura, ...movimiento }) => ({
    ...movimiento,
    referencia: factura ? { facturaId: factura.id, numero: formatearNumeroComprobante(factura.puntoVenta, factura.numero) } : null,
  }));
  return { data, page, pageSize, total };
}

// Implementa sección 11.4: preserva la proyección REST sin campos exclusivos de pantalla.
function proyectarMovimientoPublico(movimiento: MovimientoStockPantalla): MovimientoStockPublico {
  const { observacion: observacionInterna, producto, ...datos } = movimiento;
  void observacionInterna;
  return { ...datos, producto: { id: producto.id, codigo: producto.codigo } };
}

// Implementa RF-P6: comparte los filtros por producto, tipo y días argentinos entre API y pantalla.
function construirFiltroMovimientos(consulta: ReturnType<typeof esquemaListadoMovimientosStockGeneral.parse>): ExpresionSql | undefined {
  const rango = convertirRangoDiasAInstantesUtc(consulta);
  return yLogico(
    consulta.productoId !== undefined ? igual(movimientosStock.productoId, consulta.productoId) : undefined,
    consulta.tipo ? igual(movimientosStock.tipo, consulta.tipo) : undefined,
    rango.desdeInclusivo ? mayorOIgual(movimientosStock.fecha, rango.desdeInclusivo) : undefined,
    rango.hastaExclusivo ? menor(movimientosStock.fecha, rango.hastaExclusivo) : undefined,
  );
}

// Implementa RF-P6: historial de pantalla con descripción y observación, sin consultas por fila.
export async function listarMovimientosStockParaPantalla(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ListadoMovimientosStockPantalla> {
  const consulta = esquemaListadoMovimientosStockGeneral.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  if (consulta.productoId !== undefined) {
    const [producto] = await baseDatos.select({ id: productos.id }).from(productos).where(igual(productos.id, consulta.productoId)).limit(1);
    asegurarRecursoExiste(producto, "el producto");
  }
  return consultarMovimientos(baseDatos, construirFiltroMovimientos(consulta), consulta.page, consulta.pageSize);
}

// Implementa Reglas 1, 2 y 11: única actualización de existencia e inserción de su movimiento en la transacción recibida.
export async function moverStock(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, transaccion: TransaccionBaseDatos): Promise<MovimientoStockPublico> {
  const entrada = esquemaMoverStock.parse(datosSinValidar);
  asegurarPermisoMovimientoStock(usuarioActual, entrada.tipo);
  const [producto] = await transaccion.select({ id: productos.id, codigo: productos.codigo, existencia: productos.existencia })
    .from(productos).where(igual(productos.id, entrada.productoId)).limit(1);
  asegurarRecursoExiste(producto, "el producto");
  if ("facturaId" in entrada) {
    const [factura] = await transaccion.select({ id: facturas.id }).from(facturas).where(igual(facturas.id, entrada.facturaId)).limit(1);
    asegurarRecursoExiste(factura, "la factura");
  }
  const variacion = entrada.tipo === "egreso" || entrada.tipo === "venta" ? -entrada.cantidad : entrada.cantidad;
  asegurarExistenciaDentroDeRango(producto.existencia, variacion);
  const [actualizado] = await transaccion.update(productos)
    .set({ existencia: expresionSql`${productos.existencia} + ${variacion}` })
    .where(yLogico(igual(productos.id, entrada.productoId), expresionSql`${productos.existencia} + ${variacion} >= 0`,
      expresionSql`${productos.existencia} + ${variacion} <= ${Number.MAX_SAFE_INTEGER}`))
    .returning({ existencia: productos.existencia });
  if (!actualizado) {
    const [vigente] = await transaccion.select({ existencia: productos.existencia })
      .from(productos).where(igual(productos.id, entrada.productoId)).limit(1);
    const disponible = vigente?.existencia ?? producto.existencia;
    asegurarExistenciaDentroDeRango(disponible, variacion);
    asegurarStockSuficiente(false, {
      productoId: producto.id, codigo: producto.codigo, solicitado: entrada.cantidad, disponible,
    });
  }
  const [movimiento] = await transaccion.insert(movimientosStock).values({
    productoId: entrada.productoId, usuarioId: usuarioActual.id, tipo: entrada.tipo, cantidad: variacion,
    existenciaResultante: actualizado.existencia, motivo: entrada.motivo, observacion: entrada.observacion || null,
    facturaId: "facturaId" in entrada ? entrada.facturaId : null,
  }).returning({ id: movimientosStock.id });
  const resultado = await consultarMovimientos(transaccion, igual(movimientosStock.id, movimiento.id), 1, 1);
  return proyectarMovimientoPublico(resultado.data[0]);
}

// Implementa RF-P4 y RF-P5: ajuste administrativo de stock con motivo permitido y transacción completa.
export async function registrarMovimientoManual(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<MovimientoStockPublico> {
  const { productoId, movimiento } = esquemaRegistrarMovimientoManual.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);
  return ejecutarTransaccionEscritura(baseDatos, (transaccion) => moverStock(usuarioActual, { productoId, ...movimiento }, transaccion));
}

// Implementa RF-P6: historial paginado de un producto existente, incluso después de su baja.
export async function listarMovimientosProducto(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ListadoMovimientosStock> {
  const consulta = esquemaListadoMovimientosProducto.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const [producto] = await baseDatos.select({ id: productos.id }).from(productos).where(igual(productos.id, consulta.productoId)).limit(1);
  asegurarRecursoExiste(producto, "el producto");
  const listado = await consultarMovimientos(baseDatos, igual(movimientosStock.productoId, consulta.productoId), consulta.page, consulta.pageSize);
  return { ...listado, data: listado.data.map(proyectarMovimientoPublico) };
}

// Implementa RF-P6: historial general con filtros por producto, tipo y días argentinos.
export async function listarMovimientosStockGeneral(usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd): Promise<ListadoMovimientosStock> {
  const consulta = esquemaListadoMovimientosStockGeneral.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const listado = await consultarMovimientos(baseDatos, construirFiltroMovimientos(consulta), consulta.page, consulta.pageSize);
  return { ...listado, data: listado.data.map(proyectarMovimientoPublico) };
}
