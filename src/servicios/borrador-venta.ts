import type { ClientePublico } from "./servicio-clientes";
import type { ProductoPublico } from "./servicio-productos";
import type { PagoFacturaPublico } from "./servicio-facturas";
import {
  asegurarClienteActivo, asegurarCuentaCorrientePermitida, asegurarLimiteCreditoNoExcedido,
  asegurarMontoRecibidoSuficiente, asegurarProductosActivosYConStock,
} from "@/errores/verificadores-negocio";
import { esquemaCantidadVenta, esquemaEmitirFactura, esquemaPagoFactura } from "@/validaciones/validacion-facturas";
import { calcularSubtotalVenta, sumarImportesVenta } from "./calculos-venta";

export interface RenglonVenta { producto: ProductoPublico; cantidad: number; subtotal: number }
export type PagoVenta = Exclude<PagoFacturaPublico, { forma: "contado" }> | { forma: "contado"; montoRecibido?: number };

// Implementa RF-V3/RF-V4: modifica el borrador sin escribir existencias ni duplicar productos.
export function cambiarCantidadVenta(renglones: RenglonVenta[], producto: ProductoPublico, cantidadSinValidar: unknown): RenglonVenta[] {
  const cantidad = esquemaCantidadVenta.parse(cantidadSinValidar);
  asegurarProductosActivosYConStock([producto], [{ productoId: producto.id, cantidad }]);
  const nuevo = { producto, cantidad, subtotal: calcularSubtotalVenta(producto.precio, cantidad) };
  const siguientes = renglones.some((renglon) => renglon.producto.id === producto.id)
    ? renglones.map((renglon) => renglon.producto.id === producto.id ? nuevo : renglon)
    : [...renglones, nuevo];
  resumirVenta(siguientes);
  return siguientes;
}

// Implementa RF-V3: una segunda selección suma unidades en el mismo renglón.
export function agregarProductoVenta(renglones: RenglonVenta[], producto: ProductoPublico, cantidadSinValidar: unknown): RenglonVenta[] {
  const cantidad = esquemaCantidadVenta.parse(cantidadSinValidar);
  const anterior = renglones.find((renglon) => renglon.producto.id === producto.id);
  return cambiarCantidadVenta(renglones, producto, (anterior?.cantidad ?? 0) + cantidad);
}

// Implementa RF-V5/RF-V6: cálculos orientativos sobre la foto del catálogo; emitir vuelve a leer la BD.
export function resumirVenta(renglones: RenglonVenta[], cliente: ClientePublico | null = null, pago: PagoVenta = { forma: "contado" }) {
  const total = sumarImportesVenta(renglones.map((renglon) => renglon.subtotal));
  const unidades = renglones.reduce((suma, renglon) => suma + renglon.cantidad, 0);
  if (unidades > 0) esquemaCantidadVenta.parse(unidades);
  const montoRecibido = pago.forma === "contado" ? pago.montoRecibido ?? total : total;
  const saldoResultanteGrande = BigInt(cliente?.saldo ?? 0) + BigInt(total);
  const saldoResultante = saldoResultanteGrande <= BigInt(Number.MAX_SAFE_INTEGER)
    && saldoResultanteGrande >= BigInt(Number.MIN_SAFE_INTEGER) ? Number(saldoResultanteGrande) : null;
  return { total, unidades, montoRecibido, vuelto: Math.max(0, montoRecibido - total), saldoResultante };
}

// Implementa RF-V5: anticipa rechazos usando los mismos verificadores que la emisión.
export function validarPagoVenta(cliente: ClientePublico | null, pago: PagoVenta, total: number): void {
  esquemaPagoFactura.parse(pago);
  if (cliente) asegurarClienteActivo(cliente);
  if (pago.forma === "contado") asegurarMontoRecibidoSuficiente(pago.montoRecibido ?? total, total);
  if (pago.forma === "cuenta_corriente") {
    asegurarCuentaCorrientePermitida(cliente);
    if (cliente) {
      sumarImportesVenta([Math.max(0, cliente.saldo), total]);
      asegurarLimiteCreditoNoExcedido(cliente.saldo, total, cliente.limiteCredito);
    }
  }
}

// Implementa Regla 3: construye exclusivamente el cuerpo público; jamás envía precios ni totales.
export function prepararEmisionVenta(renglones: RenglonVenta[], cliente: ClientePublico | null, pago: PagoVenta) {
  return esquemaEmitirFactura.parse({
    clienteId: cliente?.id ?? null,
    items: renglones.map(({ producto, cantidad }) => ({ productoId: producto.id, cantidad })),
    pago,
  });
}
