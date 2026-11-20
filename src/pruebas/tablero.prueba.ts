import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { facturas, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { crearCliente } from "@/servicios/servicio-clientes";
import { crearProducto, actualizarProducto } from "@/servicios/servicio-productos";
import { confirmarFactura, anularFactura, type PagoFacturaPublico } from "@/servicios/servicio-facturas";
import { registrarPagoCuentaCorriente } from "@/servicios/servicio-pagos";
import { obtenerDatosTablero } from "@/servicios/servicio-tablero";
import { calcularPeriodosTablero } from "@/utilidades/fechas-tablero";
import { formatearDiaMes, formatearFechaLarga, formatearMesAnio, formatearEjeVentas, formatearPorcentaje } from "@/utilidades/formatos";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Períodos y formatos del tablero", () => {
  probar.each([
    ["2026-03-01T02:59:59.999Z", "2026-02-28", "2026-02-01T03:00:00.000Z", "2026-03-01T03:00:00.000Z"],
    ["2026-03-01T03:00:00.000Z", "2026-03-01", "2026-03-01T03:00:00.000Z", "2026-04-01T03:00:00.000Z"],
    ["2028-03-01T02:59:59.999Z", "2028-02-29", "2028-02-01T03:00:00.000Z", "2028-03-01T03:00:00.000Z"],
    ["2027-01-01T02:59:59.999Z", "2026-12-31", "2026-12-01T03:00:00.000Z", "2027-01-01T03:00:00.000Z"],
  ])("usa día y mes argentinos en %s", (referencia, hoy, desde, hasta) => {
    const periodo = calcularPeriodosTablero(new Date(referencia));
    esperar(periodo.hoy).toBe(hoy);
    esperar(periodo.desdeMesUtc).toBe(desde);
    esperar(periodo.hastaMesUtc).toBe(hasta);
    esperar(periodo.fechas).toHaveLength(30);
    esperar(new Set(periodo.fechas).size).toBe(30);
    esperar(periodo.fechas[29]).toBe(hoy);
    esperar(periodo.fechas).toEqual([...periodo.fechas].sort());
  });
  probar("centraliza fechas, ejes y porcentajes sin dividir por cero", () => {
    esperar(formatearDiaMes("2026-11-19")).toBe("19/11");
    esperar(formatearFechaLarga("2026-11-19")).toContain("jueves");
    esperar(formatearMesAnio("2026-11-19")).toBe("noviembre de 2026");
    esperar(formatearPorcentaje(0, 0).replace(/\s/g, "")).toBe("0%");
    esperar(formatearPorcentaje(1, 4).replace(/\s/g, "")).toBe("25%");
    esperar(formatearEjeVentas(1)).toContain("0,01");
  });
});

describir("Servicio de tablero con SQLite y servicios reales", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let categoriaId: number;
  antesDeCadaPrueba(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T15:00:00Z"));
    entorno = await crearBaseDatosPrueba();
    [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Laura", email: "admin@tablero.test", rol: "admin", contrasenaHash: "no-se-usa" },
      { nombre: "Pablo", email: "vendedor@tablero.test", rol: "vendedor", contrasenaHash: "no-se-usa" },
    ]).returning();
    categoriaId = (await crearCategoria(admin, { nombre: "Herramientas" }, entorno.bd)).id;
  });
  despuesDeCadaPrueba(() => { entorno.cerrar(); vi.useRealTimers(); });
  const producto = (codigo: string, precio = 101, stockInicial = 100, stockMinimo = 0) => crearProducto(admin, { codigo, descripcion: `Producto ${codigo}`, categoriaId, precio, stockInicial, stockMinimo }, entorno.bd);
  const cliente = (nombre = "Mariana", nroDoc = "28000101") => crearCliente(admin, { nombre, tipoDoc: "DNI", nroDoc, cuentaCorriente: true }, entorno.bd);
  async function emitir(productoId: number, cantidad = 1, fecha = "2026-11-19T15:00:00.000Z", pago: PagoFacturaPublico | { forma: "contado" } = { forma: "contado" }, clienteId: number | null = null) {
    const factura = await confirmarFactura(vendedor, { clienteId, items: [{ productoId, cantidad }], pago }, entorno.bd);
    await entorno.bd.update(facturas).set({ fecha }).where(igual(facturas.id, factura.id));
    return factura;
  }
  const leer = () => obtenerDatosTablero(vendedor, {}, entorno.bd);

  probar("sin ventas devuelve siete claves, treinta ceros, tres medios y promedio cero", async () => {
    const datos = await leer();
    esperar(Object.keys(datos).sort()).toEqual(["bajoMinimo", "cuentasCorrientes", "hoy", "masVendidos", "mes", "porFormaDePago", "ventasDiarias"]);
    esperar(datos.hoy).toEqual({ cantidad: 0, importe: 0 });
    esperar(datos.mes).toEqual({ cantidad: 0, importe: 0, ticketPromedio: 0 });
    esperar(datos.cuentasCorrientes).toEqual({ totalAdeudado: 0, clientesConSaldo: 0 });
    esperar(datos.bajoMinimo).toEqual({ cantidad: 0 });
    esperar(datos.masVendidos).toEqual([]);
    esperar(datos.ventasDiarias).toHaveLength(30);
    esperar(datos.ventasDiarias[0]).toEqual({ fecha: "2026-10-21", importe: 0 });
    esperar(datos.ventasDiarias[29]).toEqual({ fecha: "2026-11-19", importe: 0 });
    esperar(datos.ventasDiarias.every((dia) => dia.importe === 0)).toBe(true);
    esperar(datos.porFormaDePago).toEqual([{ forma: "contado", importe: 0 }, { forma: "tarjeta", importe: 0 }, { forma: "cuenta_corriente", importe: 0 }]);
  });
  probar("excluye anuladas de todos los indicadores, series, formas y ranking", async () => {
    const item = await producto("BASE");
    const comprador = await cliente();
    await emitir(item.id, 2);
    await emitir(item.id, 1, "2026-11-18T15:00:00.000Z", { forma: "tarjeta", tarjeta: { tipo: "debito", marca: "Visa", ultimos4: "1234" } });
    await emitir(item.id, 3, "2026-11-01T03:00:00.000Z", { forma: "cuenta_corriente" }, comprador.id);
    await emitir(item.id, 1, "2026-10-20T15:00:00.000Z");
    await emitir(item.id, 4, "2026-10-21T03:00:00.000Z");
    const anulada = await emitir(item.id, 20, "2026-11-19T15:00:00.000Z", { forma: "cuenta_corriente" }, comprador.id);
    await anularFactura(admin, { id: anulada.id, motivo: "Error" }, entorno.bd);
    const datos = await leer();
    esperar(datos.hoy).toEqual({ cantidad: 1, importe: 202 });
    esperar(datos.mes).toEqual({ cantidad: 3, importe: 606, ticketPromedio: 202 });
    esperar(datos.porFormaDePago).toEqual([{ forma: "contado", importe: 202 }, { forma: "tarjeta", importe: 101 }, { forma: "cuenta_corriente", importe: 303 }]);
    esperar(datos.ventasDiarias.reduce((suma, dia) => suma + dia.importe, 0)).toBe(1010);
    esperar(datos.ventasDiarias[0].importe).toBe(404);
    esperar(datos.cuentasCorrientes).toEqual({ totalAdeudado: 303, clientesConSaldo: 1 });
    esperar(datos.masVendidos).toEqual([{ productoId: item.id, codigo: "BASE", descripcion: "Producto BASE", unidades: 6, importe: 606 }]);
  });
  probar("incluye ambos extremos del día argentino y excluye sus vecinos", async () => {
    vi.setSystemTime(new Date("2026-11-02T02:59:59.999Z"));
    const item = await producto("FECHAS");
    for (const fecha of ["2026-11-01T02:59:59.999Z", "2026-11-01T03:00:00.000Z", "2026-11-02T02:59:59.999Z", "2026-11-02T03:00:00.000Z"]) await emitir(item.id, 1, fecha);
    const datos = await leer();
    esperar(datos.hoy).toEqual({ cantidad: 2, importe: 202 });
    esperar(datos.ventasDiarias[29]).toEqual({ fecha: "2026-11-01", importe: 202 });
    esperar(datos.ventasDiarias[28]).toEqual({ fecha: "2026-10-31", importe: 101 });
  });
  probar("el mes de 31 días incluye el día 1 aunque ya no esté en la serie de 30", async () => {
    vi.setSystemTime(new Date("2026-01-31T15:00:00Z"));
    const item = await producto("MES");
    await emitir(item.id, 2, "2026-01-01T03:00:00.000Z");
    await emitir(item.id, 1, "2026-02-01T03:00:00.000Z");
    const datos = await leer();
    esperar(datos.mes).toEqual({ cantidad: 1, importe: 202, ticketPromedio: 202 });
    esperar(datos.ventasDiarias[0].fecha).toBe("2026-01-02");
    esperar(datos.ventasDiarias.every((dia) => dia.importe === 0)).toBe(true);
    esperar(datos.masVendidos[0].unidades).toBe(2);
  });
  probar("top cinco numérico, desempate estable, precio congelado y producto luego inactivo", async () => {
    const items = [];
    for (const [indice, unidades] of [9, 10, 10, 8, 7, 1].entries()) {
      const item = await producto(`TOP-${indice}`, 100 + indice);
      await emitir(item.id, unidades); items.push(item);
    }
    await actualizarProducto(admin, { id: items[1].id, cambios: { activo: false, precio: 9999, descripcion: "Descripción actual" } }, entorno.bd);
    const datos = await leer();
    esperar(datos.masVendidos.map((item) => item.productoId)).toEqual([items[1].id, items[2].id, items[0].id, items[3].id, items[4].id]);
    esperar(datos.masVendidos[0]).toMatchObject({ descripcion: "Descripción actual", unidades: 10, importe: 1010 });
  });
  probar("la deuda suma clientes positivos sin compensarlos con saldos a favor", async () => {
    const item = await producto("DEUDA", 100);
    const deudor = await cliente();
    const aFavor = await cliente("Pedro", "28000102");
    await emitir(item.id, 2, undefined, { forma: "cuenta_corriente" }, deudor.id);
    const venta = await emitir(item.id, 1, undefined, { forma: "cuenta_corriente" }, aFavor.id);
    await registrarPagoCuentaCorriente(admin, { clienteId: aFavor.id, pago: { importe: 100, medio: "efectivo" } }, entorno.bd);
    await anularFactura(admin, { id: venta.id, motivo: "Devolución" }, entorno.bd);
    esperar((await leer()).cuentasCorrientes).toEqual({ totalAdeudado: 200, clientesConSaldo: 1 });
  });
  probar("bajo mínimo solo cuenta activos con existencia estrictamente menor", async () => {
    await producto("BAJO", 100, 2, 3); await producto("IGUAL", 100, 3, 3); await producto("CERO", 100, 0, 0);
    const inactivo = await producto("INACTIVO", 100, 0, 10);
    await actualizarProducto(admin, { id: inactivo.id, cambios: { activo: false } }, entorno.bd);
    esperar((await leer()).bajoMinimo.cantidad).toBe(1);
  });
  probar("con una venta de importe cero no inventa importes ni pierde la cantidad", async () => {
    const item = await producto("GRATUITO", 0);
    await emitir(item.id);
    const datos = await leer();
    esperar(datos.hoy).toEqual({ cantidad: 1, importe: 0 });
    esperar(datos.mes).toEqual({ cantidad: 1, importe: 0, ticketPromedio: 0 });
    esperar(datos.masVendidos[0]).toMatchObject({ unidades: 1, importe: 0 });
  });
  probar("redondea medio centavo hacia arriba", async () => {
    const a = await producto("REDONDEO-A", 101);
    const b = await producto("REDONDEO-B", 102);
    await emitir(a.id); await emitir(b.id);
    esperar((await leer()).mes).toEqual({ cantidad: 2, importe: 203, ticketPromedio: 102 });
  });
  probar("conserva precisión al calcular el promedio con importes grandes", async () => {
    const a = await producto("GRANDE-A", 3002399751580329);
    const b = await producto("GRANDE-B", 3002399751580330);
    await emitir(a.id); await emitir(a.id); await emitir(b.id);
    esperar((await leer()).mes).toEqual({ cantidad: 3, importe: 9007199254740988, ticketPromedio: 3002399751580329 });
  });
  probar("no convierte un total que excede los enteros seguros a un número impreciso", async () => {
    const item = await producto("LIMITE", Number.MAX_SAFE_INTEGER);
    await emitir(item.id); await emitir(item.id);
    await esperar(leer()).rejects.toMatchObject({ estadoHttp: 422, codigo: "VALIDACION" });
  });
  probar("exige sesión y rechaza parámetros ajenos al contrato", async () => {
    await esperar(obtenerDatosTablero(null as unknown as UsuarioAutenticado, {}, entorno.bd)).rejects.toMatchObject({ estadoHttp: 401 });
    await esperar(obtenerDatosTablero(vendedor, { precio: 1 }, entorno.bd)).rejects.toThrow();
  });
});
