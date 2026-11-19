import { and as yLogico, asc as ascendente, count as contar, desc as descendente, eq as igual, gte as mayorOIgual, lt as menor, sql as expresionSql } from "drizzle-orm";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { facturaItems, facturas, productos, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { asegurarUsuarioAutenticado } from "@/errores/verificadores-negocio";
import { convertirEnteroTablero } from "@/errores/errores-tablero";
import { esquemaSinDatos } from "@/validaciones/validacion-autenticacion";
import { calcularPeriodosTablero } from "@/utilidades/fechas-tablero";
import { listarClientes } from "./servicio-clientes";
import { obtenerResumenNavegacion } from "./servicio-navegacion";

export type FormaPagoTablero = "contado" | "tarjeta" | "cuenta_corriente";
export interface DatosTablero {
  hoy: { cantidad: number; importe: number };
  mes: { cantidad: number; importe: number; ticketPromedio: number };
  cuentasCorrientes: { totalAdeudado: number; clientesConSaldo: number };
  bajoMinimo: { cantidad: number };
  ventasDiarias: { fecha: string; importe: number }[];
  porFormaDePago: { forma: FormaPagoTablero; importe: number }[];
  masVendidos: { productoId: number; codigo: string; descripcion: string; unidades: number; importe: number }[];
}

// Implementa RF-T1 a RF-T3: agrega emitidas en días argentinos; saldo y stock reutilizan sus fuentes existentes.
export async function obtenerDatosTablero(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<DatosTablero> {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const periodo = calcularPeriodosTablero(new Date());
  const diaArgentino = expresionSql<string>`date(${facturas.fecha}, '-3 hours')`;
  const unidadesVendidas = expresionSql`sum(${facturaItems.cantidad})`;

  const [grupos, ranking, deuda, stock] = await Promise.all([
    baseDatos.select({
      fecha: diaArgentino, forma: facturas.formaPago, cantidad: contar(),
      importe: expresionSql<string>`cast(sum(${facturas.total}) as text)`,
    }).from(facturas).where(yLogico(
      igual(facturas.estado, "emitida"), mayorOIgual(facturas.fecha, periodo.desdeConsultaUtc), menor(facturas.fecha, periodo.hastaMesUtc),
    )).groupBy(diaArgentino, facturas.formaPago),
    baseDatos.select({
      productoId: productos.id, codigo: productos.codigo, descripcion: productos.descripcion,
      unidades: expresionSql<string>`cast(${unidadesVendidas} as text)`,
      importe: expresionSql<string>`cast(sum(${facturaItems.subtotal}) as text)`,
    }).from(facturaItems).innerJoin(facturas, igual(facturaItems.facturaId, facturas.id))
      .innerJoin(productos, igual(facturaItems.productoId, productos.id)).where(yLogico(
        igual(facturas.estado, "emitida"), mayorOIgual(facturas.fecha, periodo.desdeMesUtc), menor(facturas.fecha, periodo.hastaMesUtc),
      )).groupBy(productos.id, productos.codigo, productos.descripcion)
      .orderBy(descendente(unidadesVendidas), ascendente(productos.id)).limit(5),
    listarClientes(usuarioActual, { conDeuda: "true", activo: "todos", pageSize: 1 }, baseDatos),
    obtenerResumenNavegacion(usuarioActual, {}, baseDatos),
  ]);

  let cantidadHoy = 0;
  let cantidadMes = 0;
  let importeHoy = 0n;
  let importeMes = 0n;
  const porDia = new Map<string, bigint>();
  const porForma: Record<FormaPagoTablero, bigint> = { contado: 0n, tarjeta: 0n, cuenta_corriente: 0n };
  for (const grupo of grupos) {
    const importe = BigInt(grupo.importe);
    porDia.set(grupo.fecha, (porDia.get(grupo.fecha) ?? 0n) + importe);
    if (grupo.fecha === periodo.hoy) { cantidadHoy += grupo.cantidad; importeHoy += importe; }
    if (grupo.fecha >= periodo.diaInicioMes) {
      cantidadMes += grupo.cantidad; importeMes += importe; porForma[grupo.forma] += importe;
    }
  }
  // Redondeo al centavo más cercano sin pasar por una división de coma flotante.
  const cantidad = BigInt(cantidadMes);
  const promedio = cantidad === 0n ? 0n : (importeMes * 2n + cantidad) / (cantidad * 2n);
  return {
    hoy: { cantidad: cantidadHoy, importe: convertirEnteroTablero(importeHoy) },
    mes: { cantidad: cantidadMes, importe: convertirEnteroTablero(importeMes), ticketPromedio: convertirEnteroTablero(promedio) },
    cuentasCorrientes: { totalAdeudado: convertirEnteroTablero(BigInt(deuda.totalAdeudado ?? 0)), clientesConSaldo: deuda.total },
    bajoMinimo: { cantidad: stock.cantidadProductosBajoMinimo },
    ventasDiarias: periodo.fechas.map((fecha) => ({ fecha, importe: convertirEnteroTablero(porDia.get(fecha) ?? 0n) })),
    porFormaDePago: (Object.keys(porForma) as FormaPagoTablero[]).map((forma) => ({ forma, importe: convertirEnteroTablero(porForma[forma]) })),
    masVendidos: ranking.map((producto) => ({ ...producto, unidades: convertirEnteroTablero(BigInt(producto.unidades)), importe: convertirEnteroTablero(BigInt(producto.importe)) })),
  };
}
