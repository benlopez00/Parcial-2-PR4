import { and as yLogico, asc as ascendente, eq as igual, gte as mayorOIgual, lt as menor, sql as expresionSql } from "drizzle-orm";
import { bd, type BaseDatos, type TransaccionBaseDatos } from "@/base-de-datos/conexion";
import { clientes, movimientosCuenta, pagos, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarClienteActivo, asegurarCuentaCorrienteHabilitada, asegurarPagoNoSuperaDeuda,
  asegurarRecursoExiste, asegurarUsuarioAutenticado,
} from "@/errores/verificadores-negocio";
import { esquemaCuentaCorriente, esquemaObtenerRecibo, esquemaRegistrarPago } from "@/validaciones/validacion-pagos";
import { convertirRangoDiasAInstantesUtc } from "@/utilidades/fechas-consulta";
import { formatearNumeroRecibo, PUNTO_VENTA_ACTUAL } from "@/utilidades/formatos";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";
import { calcularSaldoCliente } from "./servicio-clientes";

export interface MovimientoCuentaPublico {
  fecha: string; tipo: "debito" | "credito"; importe: number; descripcion: string;
  facturaId: number | null; pagoId: number | null; saldo: number;
}
export interface CuentaCorrienteCliente {
  cliente: { id: number; nombre: string };
  saldoAnterior: number; movimientos: MovimientoCuentaPublico[]; saldo: number;
}
export interface ReciboPago {
  id: number; numeroRecibo: string; fecha: string;
  cliente: { id: number; nombre: string }; importe: number;
  medio: "efectivo" | "transferencia" | "tarjeta_debito"; observacion: string | null;
  usuario: { id: number; nombre: string }; saldoCliente: number;
}

// Implementa RF-C5: arma el recibo tal como se imprimió.
// Igual que la Regla 3 congela el precio en la factura, el recibo congela su saldo: en vez del saldo
// de hoy devuelve el acumulado hasta su propio movimiento de crédito, con el mismo orden (fecha, id)
// que usa el estado de cuenta. Como los movimientos se graban en el momento en que ocurren,
// reimprimir el recibo mañana muestra exactamente el número que se imprimió hoy.
async function leerRecibo(baseDatos: BaseDatos | TransaccionBaseDatos, pagoId: number): Promise<ReciboPago> {
  const [fila] = await baseDatos.select({
    id: pagos.id, puntoVenta: pagos.puntoVenta, numeroRecibo: pagos.numeroRecibo, fecha: pagos.fecha,
    clienteId: clientes.id, clienteNombre: clientes.nombre, importe: pagos.importe, medio: pagos.medio,
    observacion: pagos.observacion, usuarioId: usuarios.id, usuarioNombre: usuarios.nombre,
    movimientoId: movimientosCuenta.id, movimientoFecha: movimientosCuenta.fecha,
  }).from(pagos)
    .innerJoin(clientes, igual(pagos.clienteId, clientes.id))
    .innerJoin(usuarios, igual(pagos.usuarioId, usuarios.id))
    .innerJoin(movimientosCuenta, igual(movimientosCuenta.pagoId, pagos.id))
    .where(igual(pagos.id, pagoId)).limit(1);
  asegurarRecursoExiste(fila, "el recibo");
  return {
    id: fila.id, numeroRecibo: formatearNumeroRecibo(fila.puntoVenta, fila.numeroRecibo), fecha: fila.fecha,
    cliente: { id: fila.clienteId, nombre: fila.clienteNombre }, importe: fila.importe, medio: fila.medio,
    observacion: fila.observacion, usuario: { id: fila.usuarioId, nombre: fila.usuarioNombre },
    saldoCliente: await calcularSaldoCliente(baseDatos, fila.clienteId, {
      hastaMovimiento: { fecha: fila.movimientoFecha, id: fila.movimientoId },
    }),
  };
}

// Implementa RF-C4 y Regla 7: movimientos en orden cronológico con el saldo acumulado renglón por renglón.
export async function obtenerCuentaCorrienteCliente(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<CuentaCorrienteCliente> {
  const { id, desde, hasta } = esquemaCuentaCorriente.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const [cliente] = await baseDatos.select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes).where(igual(clientes.id, id)).limit(1);
  asegurarRecursoExiste(cliente, "el cliente");

  const rango = convertirRangoDiasAInstantesUtc({ desde, hasta });
  const saldoAnterior = rango.desdeInclusivo
    ? await calcularSaldoCliente(baseDatos, id, { antesDe: rango.desdeInclusivo })
    : 0;
  const filas = await baseDatos.select({
    fecha: movimientosCuenta.fecha, tipo: movimientosCuenta.tipo, importe: movimientosCuenta.importe,
    descripcion: movimientosCuenta.descripcion, facturaId: movimientosCuenta.facturaId, pagoId: movimientosCuenta.pagoId,
  }).from(movimientosCuenta).where(yLogico(
    igual(movimientosCuenta.clienteId, id),
    rango.desdeInclusivo ? mayorOIgual(movimientosCuenta.fecha, rango.desdeInclusivo) : undefined,
    rango.hastaExclusivo ? menor(movimientosCuenta.fecha, rango.hastaExclusivo) : undefined,
  )).orderBy(ascendente(movimientosCuenta.fecha), ascendente(movimientosCuenta.id));

  let acumulado = saldoAnterior;
  const movimientos = filas.map((fila) => {
    acumulado += fila.tipo === "debito" ? fila.importe : -fila.importe;
    return { ...fila, saldo: acumulado };
  });
  return { cliente, saldoAnterior, movimientos, saldo: acumulado };
}

// Implementa RF-C5 y Reglas 4, 6, 8: el pago, su recibo y el crédito de cuenta se graban juntos o no se graba nada.
export async function registrarPagoCuentaCorriente(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ReciboPago> {
  const { clienteId, pago } = esquemaRegistrarPago.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  return ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
    const [cliente] = await transaccion.select().from(clientes).where(igual(clientes.id, clienteId)).limit(1);
    asegurarRecursoExiste(cliente, "el cliente");
    asegurarClienteActivo(cliente);
    asegurarCuentaCorrienteHabilitada(cliente);
    asegurarPagoNoSuperaDeuda(pago.importe, await calcularSaldoCliente(transaccion, clienteId));

    // Regla 4: el número se lee y se asigna dentro de la transacción; si aborta, no se consume ninguno.
    const [{ ultimo }] = await transaccion
      .select({ ultimo: expresionSql<number>`coalesce(max(${pagos.numeroRecibo}), 0)`.mapWith(Number) })
      .from(pagos).where(igual(pagos.puntoVenta, PUNTO_VENTA_ACTUAL));
    const numeroRecibo = ultimo + 1;

    const [creado] = await transaccion.insert(pagos).values({
      puntoVenta: PUNTO_VENTA_ACTUAL, numeroRecibo, clienteId, usuarioId: usuarioActual.id,
      importe: pago.importe, medio: pago.medio, observacion: pago.observacion ?? null,
    }).returning({ id: pagos.id, fecha: pagos.fecha });

    await transaccion.insert(movimientosCuenta).values({
      clienteId, pagoId: creado.id, tipo: "credito", importe: pago.importe, fecha: creado.fecha,
      descripcion: `Recibo ${formatearNumeroRecibo(PUNTO_VENTA_ACTUAL, numeroRecibo)}`,
    });
    return leerRecibo(transaccion, creado.id);
  });
}

// Implementa RF-C5: reimpresión del recibo emitido.
export async function obtenerReciboPagoPorId(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ReciboPago> {
  const { id } = esquemaObtenerRecibo.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  return leerRecibo(baseDatos, id);
}
