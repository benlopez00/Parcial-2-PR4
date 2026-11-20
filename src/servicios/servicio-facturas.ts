import { and as yLogico, count as contar, desc as descendente, eq as igual, gte as mayorOIgual, inArray as dentroDe, lt as menor, lte as menorOIgual, or as oLogico, sql as expresionSql, type SQL as ExpresionSql } from "drizzle-orm";
import { alias as aliasDe, type AnySQLiteColumn as ColumnaSqlite } from "drizzle-orm/sqlite-core";
import { bd, type BaseDatos, type TransaccionBaseDatos } from "@/base-de-datos/conexion";
import { clientes, facturaItems, facturas, movimientosCuenta, productos, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import {
  asegurarClienteActivo, asegurarCuentaCorrientePermitida, asegurarFacturaNoAnulada,
  asegurarLimiteCreditoNoExcedido, asegurarMontoRecibidoSuficiente,
  asegurarProductosActivosYConStock, asegurarRecursoExiste, asegurarRolAdmin, asegurarUsuarioAutenticado,
} from "@/errores/verificadores-negocio";
import {
  esquemaAnularFactura, esquemaEmitirFactura, esquemaListadoFacturas, esquemaObtenerFactura,
} from "@/validaciones/validacion-facturas";
import { esquemaSinDatos } from "@/validaciones/validacion-autenticacion";
import { convertirRangoDiasAInstantesUtc } from "@/utilidades/fechas-consulta";
import { formatearNumeroFactura, PUNTO_VENTA_ACTUAL } from "@/utilidades/formatos";
import { ejecutarTransaccionEscritura } from "@/utilidades/transacciones";
import { calcularSaldoCliente } from "./servicio-clientes";
import { moverStock } from "./servicio-stock";
import { calcularSubtotalVenta, sumarImportesVenta } from "./calculos-venta";

export interface ItemFacturaPublico {
  productoId: number; codigo: string; descripcion: string;
  cantidad: number; precioUnitario: number; subtotal: number;
}
export type PagoFacturaPublico =
  | { forma: "contado"; montoRecibido: number; vuelto: number }
  | { forma: "tarjeta"; tarjeta: { tipo: "debito" | "credito"; marca: string; ultimos4: string } }
  | { forma: "cuenta_corriente" };
export interface FacturaPublica {
  id: number; puntoVenta: number; numero: number; numeroFormateado: string;
  fecha: string; estado: "emitida" | "anulada";
  cliente: { id: number; nombre: string; tipoDoc: string | null; nroDoc: string | null; domicilio: string | null } | null;
  vendedor: { id: number; nombre: string };
  items: ItemFacturaPublico[]; total: number; pago: PagoFacturaPublico;
  saldoCliente?: number;
  anulacion?: { fecha: string; motivo: string; usuario: { id: number; nombre: string } };
}
export interface ResumenFactura {
  id: number; numeroFormateado: string; fecha: string; estado: "emitida" | "anulada";
  cliente: { id: number; nombre: string } | null; vendedor: { id: number; nombre: string };
  total: number; formaPago: "contado" | "tarjeta" | "cuenta_corriente";
}
export interface ListadoFacturas {
  data: ResumenFactura[]; page: number; pageSize: number; total: number; totalEmitido: number;
}

const anulador = aliasDe(usuarios, "anulador");

export interface OpcionesListadoFacturas {
  clientes: { id: number; nombre: string }[];
  vendedores: { id: number; nombre: string }[];
}

// Implementa RF-V8: ambos roles filtran por personas con facturas, incluso desactivadas, sin exponer datos privados de usuarios.
export async function obtenerOpcionesListadoFacturas(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<OpcionesListadoFacturas> {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const [opcionesClientes, opcionesVendedores] = await Promise.all([
    baseDatos.selectDistinct({ id: clientes.id, nombre: clientes.nombre }).from(clientes)
      .innerJoin(facturas, igual(facturas.clienteId, clientes.id)).orderBy(clientes.nombre, clientes.id),
    baseDatos.selectDistinct({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios)
      .innerJoin(facturas, igual(facturas.usuarioId, usuarios.id)).orderBy(usuarios.nombre, usuarios.id),
  ]);
  return { clientes: opcionesClientes, vendedores: opcionesVendedores };
}

// Implementa RF-V8: interpreta lo que el usuario escribió como número de comprobante.
// Acepta "123", "00000123" y "0001-00000123" (se queda con lo que va después del guion) y
// compara por igualdad, no por subcadena: buscar "1" tiene que traer la factura 1 y no
// todas las del punto de venta 0001. Devuelve null si el texto no parece un número.
function interpretarNumeroComprobante(busqueda: string): number | null {
  if (!/^[\d\s-]+$/.test(busqueda)) return null;
  const parte = busqueda.includes("-") ? busqueda.slice(busqueda.lastIndexOf("-") + 1) : busqueda;
  const digitos = parte.replace(/\D/g, "");
  if (digitos === "") return null;
  const numero = Number(digitos);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}

// Implementa RF-V8: la búsqueda por nombre contempla mayúsculas y caracteres castellanos.
// En consumidor final el nombre es NULL, así que esa comparación da falso y la factura no matchea.
function minusculasSql(columna: ColumnaSqlite): ExpresionSql {
  return expresionSql`replace(replace(replace(replace(replace(replace(replace(lower(${columna}), 'Á', 'á'), 'É', 'é'), 'Í', 'í'), 'Ó', 'ó'), 'Ú', 'ú'), 'Ü', 'ü'), 'Ñ', 'ñ')`;
}

// Implementa RF-V5: arma el objeto de pago desde las columnas congeladas de la factura.
function construirPago(fila: {
  formaPago: "contado" | "tarjeta" | "cuenta_corriente"; total: number; montoRecibido: number | null;
  tarjetaTipo: "debito" | "credito" | null; tarjetaMarca: string | null; tarjetaUltimos4: string | null;
}): PagoFacturaPublico {
  if (fila.formaPago === "contado") {
    const montoRecibido = fila.montoRecibido ?? fila.total;
    return { forma: "contado", montoRecibido, vuelto: montoRecibido - fila.total };
  }
  if (fila.formaPago === "tarjeta") {
    return {
      forma: "tarjeta",
      tarjeta: { tipo: fila.tarjetaTipo ?? "debito", marca: fila.tarjetaMarca ?? "", ultimos4: fila.tarjetaUltimos4 ?? "" },
    };
  }
  return { forma: "cuenta_corriente" };
}

// Implementa RF-V7: devuelve la factura tal como se emitió.
// El saldo del cliente se congela igual que en el recibo del T06: se calcula hasta el propio
// movimiento de débito de esta factura, no con el saldo de hoy, porque el comprobante es histórico.
async function leerFactura(baseDatos: BaseDatos | TransaccionBaseDatos, facturaId: number): Promise<FacturaPublica> {
  const [fila] = await baseDatos.select({
    id: facturas.id, puntoVenta: facturas.puntoVenta, numero: facturas.numero, fecha: facturas.fecha,
    estado: facturas.estado, clienteId: facturas.clienteId, clienteNombre: facturas.clienteNombre,
    clienteTipoDoc: facturas.clienteTipoDoc, clienteNroDoc: facturas.clienteNroDoc,
    clienteDomicilio: facturas.clienteDomicilio, total: facturas.total, formaPago: facturas.formaPago,
    montoRecibido: facturas.montoRecibido, tarjetaTipo: facturas.tarjetaTipo,
    tarjetaMarca: facturas.tarjetaMarca, tarjetaUltimos4: facturas.tarjetaUltimos4,
    motivoAnulacion: facturas.motivoAnulacion, fechaAnulacion: facturas.fechaAnulacion,
    vendedorId: usuarios.id, vendedorNombre: usuarios.nombre,
    anuladorId: anulador.id, anuladorNombre: anulador.nombre,
  }).from(facturas)
    .innerJoin(usuarios, igual(facturas.usuarioId, usuarios.id))
    .leftJoin(anulador, igual(facturas.usuarioAnulacionId, anulador.id))
    .where(igual(facturas.id, facturaId)).limit(1);
  asegurarRecursoExiste(fila, "la factura");

  const renglones = await baseDatos.select({
    productoId: facturaItems.productoId, codigo: facturaItems.codigo, descripcion: facturaItems.descripcion,
    cantidad: facturaItems.cantidad, precioUnitario: facturaItems.precioUnitario, subtotal: facturaItems.subtotal,
  }).from(facturaItems).where(igual(facturaItems.facturaId, facturaId)).orderBy(facturaItems.id);

  const factura: FacturaPublica = {
    id: fila.id, puntoVenta: fila.puntoVenta, numero: fila.numero,
    numeroFormateado: formatearNumeroFactura(fila.puntoVenta, fila.numero),
    fecha: fila.fecha, estado: fila.estado,
    cliente: fila.clienteId === null ? null : {
      id: fila.clienteId, nombre: fila.clienteNombre ?? "", tipoDoc: fila.clienteTipoDoc,
      nroDoc: fila.clienteNroDoc, domicilio: fila.clienteDomicilio,
    },
    vendedor: { id: fila.vendedorId, nombre: fila.vendedorNombre },
    items: renglones, total: fila.total, pago: construirPago(fila),
  };

  if (fila.formaPago === "cuenta_corriente" && fila.clienteId !== null) {
    const [debito] = await baseDatos.select({ id: movimientosCuenta.id, fecha: movimientosCuenta.fecha })
      .from(movimientosCuenta)
      .where(yLogico(igual(movimientosCuenta.facturaId, facturaId), igual(movimientosCuenta.tipo, "debito")))
      .limit(1);
    if (debito) {
      factura.saldoCliente = await calcularSaldoCliente(baseDatos, fila.clienteId, { hastaMovimiento: debito });
    }
  }
  if (fila.estado === "anulada" && fila.fechaAnulacion && fila.anuladorId !== null) {
    factura.anulacion = {
      fecha: fila.fechaAnulacion, motivo: fila.motivoAnulacion ?? "",
      usuario: { id: fila.anuladorId, nombre: fila.anuladorNombre ?? "" },
    };
  }
  return factura;
}

// Implementa RF-V1 y Regla 4: el número que se muestra en pantalla es informativo.
export async function obtenerProximoNumeroFactura(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<{ numeroFormateado: string }> {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  const [{ ultimo }] = await baseDatos
    .select({ ultimo: expresionSql<number>`coalesce(max(${facturas.numero}), 0)`.mapWith(Number) })
    .from(facturas).where(igual(facturas.puntoVenta, PUNTO_VENTA_ACTUAL));
  return { numeroFormateado: formatearNumeroFactura(PUNTO_VENTA_ACTUAL, ultimo + 1) };
}

// Implementa RF-V1 a RF-V6 y Reglas 1 a 7 y 10: emitir una factura es una sola transacción.
// O se graban factura, renglones, stock y cuenta corriente, o no se graba nada.
export async function confirmarFactura(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<FacturaPublica> {
  const entrada = esquemaEmitirFactura.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  return ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
    // Paso 1: los productos existen, están activos y tienen existencia suficiente.
    const identificadores = entrada.items.map((item) => item.productoId);
    const catalogo = await transaccion.select({
      id: productos.id, codigo: productos.codigo, descripcion: productos.descripcion,
      precio: productos.precio, existencia: productos.existencia, activo: productos.activo,
    }).from(productos).where(dentroDe(productos.id, identificadores));
    const porId = new Map(catalogo.map((producto) => [producto.id, producto]));
    for (const item of entrada.items) asegurarRecursoExiste(porId.get(item.productoId), "el producto");
    asegurarProductosActivosYConStock(catalogo, entrada.items);

    // Paso 2: el comprador. Sin clienteId es consumidor final (Regla 6).
    let cliente: typeof clientes.$inferSelect | null = null;
    if (entrada.clienteId !== null) {
      const [encontrado] = await transaccion.select().from(clientes).where(igual(clientes.id, entrada.clienteId)).limit(1);
      asegurarRecursoExiste(encontrado, "el cliente");
      asegurarClienteActivo(encontrado);
      cliente = encontrado;
    }
    if (entrada.pago.forma === "cuenta_corriente") asegurarCuentaCorrientePermitida(cliente);

    // Paso 3 y 4: el precio sale del catálogo, nunca del cliente (Regla 3). Total con BigInt (Regla 10).
    const renglones = entrada.items.map((item) => {
      const producto = porId.get(item.productoId);
      if (!producto) throw new Error("producto ausente tras la verificación");
      const subtotal = calcularSubtotalVenta(producto.precio, item.cantidad);
      return {
        productoId: producto.id, codigo: producto.codigo, descripcion: producto.descripcion,
        cantidad: item.cantidad, precioUnitario: producto.precio, subtotal,
      };
    });
    const total = sumarImportesVenta(renglones.map((renglon) => renglon.subtotal));

    // Paso 5: las reglas propias de cada forma de pago.
    let montoRecibido: number | null = null;
    if (entrada.pago.forma === "contado") {
      // Sección 11.6: si no viene el monto recibido se toma el total, de modo que el vuelto da cero.
      montoRecibido = entrada.pago.montoRecibido ?? total;
      asegurarMontoRecibidoSuficiente(montoRecibido, total);
    } else if (entrada.pago.forma === "cuenta_corriente" && cliente) {
      asegurarLimiteCreditoNoExcedido(await calcularSaldoCliente(transaccion, cliente.id), total, cliente.limiteCredito);
    }

    // Paso 6: el número se asigna acá adentro; si la transacción aborta, no se consume (Regla 4).
    const [{ ultimo }] = await transaccion
      .select({ ultimo: expresionSql<number>`coalesce(max(${facturas.numero}), 0)`.mapWith(Number) })
      .from(facturas).where(igual(facturas.puntoVenta, PUNTO_VENTA_ACTUAL));
    const numero = ultimo + 1;
    const numeroFormateado = formatearNumeroFactura(PUNTO_VENTA_ACTUAL, numero);

    // Paso 7: la factura congela también los datos del comprador.
    const tarjeta = entrada.pago.forma === "tarjeta" ? entrada.pago.tarjeta : null;
    const [creada] = await transaccion.insert(facturas).values({
      puntoVenta: PUNTO_VENTA_ACTUAL, numero, clienteId: cliente?.id ?? null, usuarioId: usuarioActual.id,
      clienteNombre: cliente?.nombre ?? null, clienteTipoDoc: cliente?.tipoDoc ?? null,
      clienteNroDoc: cliente?.nroDoc ?? null, clienteDomicilio: cliente?.domicilio ?? null,
      total, formaPago: entrada.pago.forma, montoRecibido,
      tarjetaTipo: tarjeta?.tipo ?? null, tarjetaMarca: tarjeta?.marca ?? null, tarjetaUltimos4: tarjeta?.ultimos4 ?? null,
    }).returning({ id: facturas.id, fecha: facturas.fecha });

    await transaccion.insert(facturaItems).values(renglones.map((renglon) => ({ facturaId: creada.id, ...renglon })));

    // Paso 8: moverStock() es la ÚNICA función que toca existencias, y descuenta con condición atómica.
    for (const renglon of renglones) {
      await moverStock(usuarioActual, {
        productoId: renglon.productoId, tipo: "venta", cantidad: renglon.cantidad,
        motivo: `Venta ${numeroFormateado}`, facturaId: creada.id,
      }, transaccion);
    }

    // Paso 9: la venta a cuenta deja el débito en la cuenta corriente del cliente.
    if (entrada.pago.forma === "cuenta_corriente" && cliente) {
      await transaccion.insert(movimientosCuenta).values({
        clienteId: cliente.id, facturaId: creada.id, tipo: "debito", importe: total,
        fecha: creada.fecha, descripcion: `Factura ${numeroFormateado}`,
      });
    }
    return leerFactura(transaccion, creada.id);
  });
}

// Implementa RF-V9 y Regla 5: la factura no se borra ni se edita; se anula y se revierte todo.
export async function anularFactura(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<FacturaPublica> {
  const { id, motivo } = esquemaAnularFactura.parse(datosSinValidar);
  asegurarRolAdmin(usuarioActual);

  return ejecutarTransaccionEscritura(baseDatos, async (transaccion) => {
    const [factura] = await transaccion.select().from(facturas).where(igual(facturas.id, id)).limit(1);
    asegurarRecursoExiste(factura, "la factura");
    asegurarFacturaNoAnulada(factura.estado);

    const numeroFormateado = formatearNumeroFactura(factura.puntoVenta, factura.numero);
    const renglones = await transaccion.select({ productoId: facturaItems.productoId, cantidad: facturaItems.cantidad })
      .from(facturaItems).where(igual(facturaItems.facturaId, id));

    const [anulada] = await transaccion.update(facturas).set({
      estado: "anulada", motivoAnulacion: motivo,
      fechaAnulacion: expresionSql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
      usuarioAnulacionId: usuarioActual.id,
    }).where(igual(facturas.id, id)).returning({ fechaAnulacion: facturas.fechaAnulacion });

    // El stock vuelve por el mismo camino que salió: moverStock, nunca un UPDATE suelto.
    for (const renglon of renglones) {
      await moverStock(usuarioActual, {
        productoId: renglon.productoId, tipo: "anulacion", cantidad: renglon.cantidad,
        motivo: `Anulación ${numeroFormateado}`, facturaId: id,
      }, transaccion);
    }

    if (factura.formaPago === "cuenta_corriente" && factura.clienteId !== null) {
      await transaccion.insert(movimientosCuenta).values({
        clienteId: factura.clienteId, facturaId: id, tipo: "credito", importe: factura.total,
        fecha: anulada.fechaAnulacion ?? factura.fecha, descripcion: `Anulación ${numeroFormateado}`,
      });
    }
    return leerFactura(transaccion, id);
  });
}

// Implementa RF-V8: listado filtrado y paginado, de la más nueva a la más vieja, sin renglones.
export async function listarFacturas(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<ListadoFacturas> {
  const consulta = esquemaListadoFacturas.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);

  const rango = convertirRangoDiasAInstantesUtc(consulta);
  let filtroBusqueda: ExpresionSql | undefined;
  if (consulta.q) {
    const patron = `%${consulta.q.toLowerCase().replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const numeroBuscado = interpretarNumeroComprobante(consulta.q);
    filtroBusqueda = oLogico(
      numeroBuscado === null ? undefined : igual(facturas.numero, numeroBuscado),
      expresionSql`${minusculasSql(facturas.clienteNombre)} LIKE ${patron} ESCAPE '\\'`,
    );
  }
  const filtro = yLogico(
    filtroBusqueda,
    rango.desdeInclusivo ? mayorOIgual(facturas.fecha, rango.desdeInclusivo) : undefined,
    rango.hastaExclusivo ? menor(facturas.fecha, rango.hastaExclusivo) : undefined,
    consulta.clienteId !== undefined ? igual(facturas.clienteId, consulta.clienteId) : undefined,
    consulta.vendedorId !== undefined ? igual(facturas.usuarioId, consulta.vendedorId) : undefined,
    consulta.forma ? igual(facturas.formaPago, consulta.forma) : undefined,
    consulta.estado ? igual(facturas.estado, consulta.estado) : undefined,
  );

  const [{ total }] = await baseDatos.select({ total: contar() }).from(facturas).where(filtro);
  const [{ totalEmitido }] = await baseDatos.select({
    totalEmitido: expresionSql<number>`coalesce(sum(case when ${facturas.estado} = 'emitida' then ${facturas.total} else 0 end), 0)`.mapWith(Number),
  }).from(facturas).where(filtro);

  const filas = await baseDatos.select({
    id: facturas.id, puntoVenta: facturas.puntoVenta, numero: facturas.numero, fecha: facturas.fecha,
    estado: facturas.estado, clienteId: facturas.clienteId, clienteNombre: facturas.clienteNombre,
    total: facturas.total, formaPago: facturas.formaPago,
    vendedorId: usuarios.id, vendedorNombre: usuarios.nombre,
  }).from(facturas).innerJoin(usuarios, igual(facturas.usuarioId, usuarios.id)).where(filtro)
    .orderBy(descendente(facturas.fecha), descendente(facturas.id))
    .limit(consulta.pageSize).offset((consulta.page - 1) * consulta.pageSize);

  return {
    data: filas.map((fila) => ({
      id: fila.id, numeroFormateado: formatearNumeroFactura(fila.puntoVenta, fila.numero),
      fecha: fila.fecha, estado: fila.estado,
      cliente: fila.clienteId === null ? null : { id: fila.clienteId, nombre: fila.clienteNombre ?? "" },
      vendedor: { id: fila.vendedorId, nombre: fila.vendedorNombre },
      total: fila.total, formaPago: fila.formaPago,
    })),
    page: consulta.page, pageSize: consulta.pageSize, total, totalEmitido,
  };
}

// Implementa RF-V7: el comprobante completo, con renglones, pago y anulación si corresponde.
export async function obtenerFacturaPorId(
  usuarioActual: UsuarioAutenticado, datosSinValidar: unknown, baseDatos: BaseDatos = bd,
): Promise<FacturaPublica> {
  const { id } = esquemaObtenerFactura.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  return leerFactura(baseDatos, id);
}
