import { describe as describir, it as probar, expect as esperar } from "vitest";
import {
  agregarProductoVenta, cambiarCantidadVenta, prepararEmisionVenta, resumirVenta, validarPagoVenta,
  type PagoVenta,
} from "@/servicios/borrador-venta";
import type { ProductoPublico } from "@/servicios/servicio-productos";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import { describirErrorVenta, leerRespuestaVenta } from "@/errores/errores-nueva-venta";
import { calcularSubtotalVenta, sumarImportesVenta } from "@/servicios/calculos-venta";
import { formatearNumero } from "@/utilidades/formatos";

const producto: ProductoPublico = {
  id: 1, codigo: "HE-001", descripcion: "Martillo", categoria: { id: 1, nombre: "Herramientas" },
  precio: 1001, existencia: 5, stockMinimo: 1, bajoMinimo: false, activo: true,
};
const cliente: ClientePublico = {
  id: 1, nombre: "Cliente de prueba", tipoDoc: "DNI", nroDoc: "28456123", domicilio: null, telefono: null,
  email: null, cuentaCorriente: true, limiteCredito: 5000, saldo: 2000, disponible: 3000, activo: true,
};

describir("Borrador de Nueva Venta", () => {
  probar("un producto repetido suma en su renglón y no modifica el estado anterior", () => {
    const inicial = agregarProductoVenta([], producto, 2);
    const siguiente = agregarProductoVenta(inicial, producto, 3);
    esperar(siguiente).toHaveLength(1);
    esperar(siguiente[0]).toMatchObject({ cantidad: 5, subtotal: 5005 });
    esperar(inicial[0].cantidad).toBe(2);
  });

  probar.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rechaza cantidad inválida %s sin alterar el borrador", (cantidad) => {
    const inicial = agregarProductoVenta([], producto, 1);
    esperar(() => cambiarCantidadVenta(inicial, producto, cantidad)).toThrow();
    esperar(inicial[0].cantidad).toBe(1);
  });

  probar("controla el stock acumulado e identifica el producto sin existencia", () => {
    const inicial = agregarProductoVenta([], producto, 4);
    try { agregarProductoVenta(inicial, producto, 2); throw new Error("Debería rechazar el stock."); }
    catch (error) { esperar(describirErrorVenta(error)).toContain("HE-001: disponible 5"); }
    esperar(inicial[0].cantidad).toBe(4);
    esperar(() => agregarProductoVenta([], { ...producto, existencia: 0 }, 1)).toThrow();
    esperar(() => agregarProductoVenta([], { ...producto, activo: false }, 1)).toThrow();
  });

  probar("al volver a buscar usa el precio y la existencia actualizados del catálogo", () => {
    const inicial = agregarProductoVenta([], producto, 2);
    const actualizado = agregarProductoVenta(inicial, { ...producto, precio: 1101, existencia: 3 }, 1);
    esperar(actualizado[0]).toMatchObject({ cantidad: 3, subtotal: 3303 });
    esperar(() => agregarProductoVenta(inicial, { ...producto, existencia: 2 }, 1)).toThrow();
  });

  probar("total, unidades y vuelto se calculan en centavos exactos", () => {
    const uno = agregarProductoVenta([], producto, 3);
    const ambos = agregarProductoVenta(uno, { ...producto, id: 2, precio: 500 }, 2);
    esperar(resumirVenta(ambos, null, { forma: "contado", montoRecibido: 5000 }))
      .toMatchObject({ total: 4003, unidades: 5, vuelto: 997, montoRecibido: 5000 });
    esperar(resumirVenta(ambos).vuelto).toBe(0);
    esperar(resumirVenta([])).toMatchObject({ total: 0, unidades: 0, vuelto: 0 });
  });

  probar("comprueba subtotales, total y cantidad de unidades fuera del entero seguro", () => {
    esperar(calcularSubtotalVenta(101, 3)).toBe(303);
    esperar(() => calcularSubtotalVenta(Number.MAX_SAFE_INTEGER, 2)).toThrow();
    esperar(() => sumarImportesVenta([Number.MAX_SAFE_INTEGER, 1])).toThrow();
    const grande = agregarProductoVenta([], { ...producto, precio: 0, existencia: Number.MAX_SAFE_INTEGER }, Number.MAX_SAFE_INTEGER);
    esperar(() => agregarProductoVenta(grande, { ...producto, id: 2, precio: 0 }, 1)).toThrow();
  });
});

describir("Comprador, pagos y contrato de emisión", () => {
  probar("contado omite el monto automático y rechaza importes insuficientes", () => {
    esperar(() => validarPagoVenta(null, { forma: "contado" }, 1001)).not.toThrow();
    esperar(() => validarPagoVenta(null, { forma: "contado", montoRecibido: 1000 }, 1001)).toThrow();
    esperar(() => validarPagoVenta(null, { forma: "contado", montoRecibido: -1 }, 1001)).toThrow();
  });

  probar("cuenta corriente exige cliente activo habilitado y respeta el límite exacto", () => {
    const pago: PagoVenta = { forma: "cuenta_corriente" };
    esperar(() => validarPagoVenta(null, pago, 1)).toThrow();
    esperar(() => validarPagoVenta({ ...cliente, cuentaCorriente: false }, pago, 1)).toThrow();
    esperar(() => validarPagoVenta({ ...cliente, activo: false }, pago, 1)).toThrow();
    esperar(() => validarPagoVenta(cliente, pago, 3000)).not.toThrow();
    esperar(() => validarPagoVenta(cliente, pago, 3001)).toThrow();
    esperar(() => validarPagoVenta({ ...cliente, saldo: 0, limiteCredito: 0 }, pago, 1)).toThrow();
    esperar(() => validarPagoVenta({ ...cliente, limiteCredito: null }, pago, 100000)).not.toThrow();
  });

  probar("un saldo a favor se aplica a la proyección y no se confunde con deuda", () => {
    const renglones = agregarProductoVenta([], producto, 1);
    esperar(resumirVenta(renglones, { ...cliente, saldo: -500 }).saldoResultante).toBe(501);
  });

  probar("el cuerpo de emisión nunca incluye precio, descripción, subtotal ni total", () => {
    const cuerpo = prepararEmisionVenta(agregarProductoVenta([], producto, 2), cliente, { forma: "contado" });
    esperar(cuerpo).toEqual({ clienteId: 1, items: [{ productoId: 1, cantidad: 2 }], pago: { forma: "contado" } });
    esperar(() => prepararEmisionVenta([], null, { forma: "contado" })).toThrow();
  });

  probar("tarjeta conserva ceros iniciales y solo envía tipo, marca y cuatro dígitos", () => {
    const pago: PagoVenta = { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "0012" } };
    const cuerpo = prepararEmisionVenta(agregarProductoVenta([], producto, 1), null, pago);
    esperar(cuerpo.pago).toEqual(pago);
  });

  probar.each(["", "123", "12345", "ABCD"])("tarjeta rechaza últimos dígitos inválidos: %s", (ultimos4) => {
    esperar(() => validarPagoVenta(null, { forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4 } }, 1001)).toThrow();
  });

  probar("una consulta rechazada conserva el estado HTTP y detalla todos los faltantes", async () => {
    const respuesta = new Response(JSON.stringify({ error: {
      code: "STOCK_INSUFICIENTE", message: "No hay stock suficiente.",
      details: [{ codigo: "HE-001", disponible: 0 }, { codigo: "HE-002", disponible: 2 }],
    } }), { status: 409 });
    await esperar(leerRespuestaVenta(respuesta)).rejects.toMatchObject({ estadoHttp: 409, mensaje: "No hay stock suficiente. · HE-001: disponible 0 · HE-002: disponible 2" });
  });

  probar("los contadores usan formato argentino sin aceptar cantidades fraccionarias", () => {
    esperar(formatearNumero(1250)).toBe("1.250");
    esperar(() => formatearNumero(1.5)).toThrow();
  });
});
