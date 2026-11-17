import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar } from "vitest";
import { eq as igual } from "drizzle-orm";
import { facturas, movimientosCuenta, pagos, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { convertirErrorARespuestaHttp } from "@/errores/manejador-errores";
import { actualizarCliente, crearCliente } from "@/servicios/servicio-clientes";
import {
  obtenerCuentaCorrienteCliente, obtenerReciboPagoPorId, registrarPagoCuentaCorriente,
} from "@/servicios/servicio-pagos";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Cuenta corriente y pagos con recibo", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let clienteId: number;
  let numeroFactura = 0;

  antesDeCadaPrueba(async () => {
    entorno = await crearBaseDatosPrueba();
    numeroFactura = 0;
    [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Administradora", email: "admin@prueba.test", rol: "admin", contrasenaHash: "no-se-usa" },
      { nombre: "Vendedor", email: "vendedor@prueba.test", rol: "vendedor", contrasenaHash: "no-se-usa" },
    ]).returning();
    clienteId = (await crearCliente(admin, {
      tipoDoc: "DNI", nroDoc: "28.456.123", nombre: "Mariana López", cuentaCorriente: true,
    }, entorno.bd)).id;
  });
  despuesDeCadaPrueba(() => entorno.cerrar());

  // Los débitos los grabará la facturación (T08): acá se simulan con una fecha exacta para controlar el orden.
  async function registrarDebito(importe: number, fecha: string, id = clienteId) {
    numeroFactura += 1;
    const [factura] = await entorno.bd.insert(facturas).values({
      numero: numeroFactura, clienteId: id, usuarioId: admin.id, total: importe, formaPago: "cuenta_corriente", fecha,
    }).returning({ id: facturas.id });
    await entorno.bd.insert(movimientosCuenta).values({
      clienteId: id, facturaId: factura.id, tipo: "debito", importe, fecha, descripcion: `Factura de prueba ${numeroFactura}`,
    });
  }
  const pagar = (importe: number, usuario = admin, extra: Record<string, unknown> = {}) =>
    registrarPagoCuentaCorriente(usuario, { clienteId, pago: { importe, medio: "efectivo", ...extra } }, entorno.bd);

  probar("muestra el saldo acumulado renglón por renglón (criterio 1)", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    await pagar(500000);
    const cuenta = await obtenerCuentaCorrienteCliente(vendedor, { id: clienteId }, entorno.bd);
    esperar(cuenta.movimientos.map((fila) => [fila.tipo, fila.importe, fila.saldo])).toEqual([
      ["debito", 960000, 960000],
      ["credito", 500000, 460000],
    ]);
    esperar(cuenta.saldoAnterior).toBe(0);
    esperar(cuenta.saldo).toBe(460000);
    esperar(cuenta.cliente).toEqual({ id: clienteId, nombre: "Mariana López" });
  });

  probar("con 'desde' calcula saldoAnterior y respeta el día calendario argentino", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    // 02:00 UTC del 25 son las 23:00 del 24 en Argentina: todavía pertenece al día 24.
    await registrarDebito(40000, "2026-10-25T02:00:00.000Z");
    await registrarDebito(100000, "2026-10-26T15:00:00.000Z");

    const desde25 = await obtenerCuentaCorrienteCliente(admin, { id: clienteId, desde: "2026-10-25" }, entorno.bd);
    esperar(desde25.saldoAnterior).toBe(1000000);
    esperar(desde25.movimientos.map((fila) => fila.saldo)).toEqual([1100000]);
    esperar(desde25.saldo).toBe(1100000);

    const soloDia24 = await obtenerCuentaCorrienteCliente(admin, { id: clienteId, hasta: "2026-10-24" }, entorno.bd);
    esperar(soloDia24.movimientos).toHaveLength(2);
    esperar(soloDia24.saldo).toBe(1000000);

    const vacio = await obtenerCuentaCorrienteCliente(admin, { id: clienteId, desde: "2026-10-27" }, entorno.bd);
    esperar(vacio.movimientos).toEqual([]);
    esperar(vacio.saldo).toBe(1100000);

    await esperar(obtenerCuentaCorrienteCliente(admin, { id: clienteId, desde: "2026-10-26", hasta: "2026-10-25" }, entorno.bd))
      .rejects.toMatchObject({ name: "ZodError" });
  });

  probar("el pago parcial emite recibos correlativos y graba el crédito vinculado", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    const primero = await pagar(500000, admin, { observacion: "Pago parcial" });
    esperar(primero.numeroRecibo).toBe("R 0001-00000001");
    esperar(primero.saldoCliente).toBe(460000);
    esperar(primero.observacion).toBe("Pago parcial");
    esperar(primero.usuario).toEqual({ id: admin.id, nombre: "Administradora" });

    const segundo = await pagar(60000, vendedor);
    esperar(segundo.numeroRecibo).toBe("R 0001-00000002");
    esperar(segundo.saldoCliente).toBe(400000);
    esperar(segundo.observacion).toBeNull();

    const [credito] = await entorno.bd.select().from(movimientosCuenta).where(igual(movimientosCuenta.pagoId, primero.id));
    esperar(credito).toMatchObject({ tipo: "credito", importe: 500000, clienteId, descripcion: "Recibo R 0001-00000001", facturaId: null });
  });

  probar("rechaza un pago mayor que la deuda y no deja recibo ni movimiento (criterio 2)", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    await pagar(500000);
    const rechazo = await pagar(500001).then(() => null, (falla: unknown) => falla);
    esperar(rechazo).toMatchObject({ estadoHttp: 422, codigo: "PAGO_SUPERA_DEUDA", detalles: { importe: 500001, saldoActual: 460000 } });
    esperar(await entorno.bd.select().from(pagos)).toHaveLength(1);
    esperar(await entorno.bd.select().from(movimientosCuenta)).toHaveLength(2);
    esperar((await obtenerCuentaCorrienteCliente(admin, { id: clienteId }, entorno.bd)).saldo).toBe(460000);
    // Pagar exactamente la deuda sí se admite y deja el saldo en cero.
    esperar((await pagar(460000)).saldoCliente).toBe(0);
  });

  probar("con deuda en cero cualquier pago se rechaza: no hay saldos a favor (Regla 8)", async () => {
    await esperar(pagar(1)).rejects.toMatchObject({ estadoHttp: 422, codigo: "PAGO_SUPERA_DEUDA" });
    esperar(await entorno.bd.select().from(pagos)).toHaveLength(0);
  });

  probar("el pago y el crédito se graban en la misma transacción (criterio 3)", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    // Se simula una falla al grabar el crédito: el pago insertado antes tiene que deshacerse.
    await entorno.cliente.execute(`CREATE TRIGGER falla_simulada BEFORE INSERT ON movimientos_cuenta
      WHEN NEW.tipo = 'credito' BEGIN SELECT RAISE(ABORT, 'falla simulada'); END`);
    await esperar(pagar(500000)).rejects.toBeTruthy();
    esperar(await entorno.bd.select().from(pagos), "no debe quedar un recibo huérfano").toHaveLength(0);
    await entorno.cliente.execute("DROP TRIGGER falla_simulada");
    esperar((await pagar(500000)).numeroRecibo, "el número abortado no se consumió").toBe("R 0001-00000001");
  });

  probar("rechaza clientes sin cuenta corriente, dados de baja o inexistentes", async () => {
    const sinCuenta = (await crearCliente(admin, { tipoDoc: "DNI", nroDoc: "30111222", nombre: "Sin Cuenta" }, entorno.bd)).id;
    await esperar(registrarPagoCuentaCorriente(admin, { clienteId: sinCuenta, pago: { importe: 100, medio: "efectivo" } }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 422, codigo: "CUENTA_CORRIENTE_NO_HABILITADA" });

    // El ticket pide el mismo código para el cliente de baja que para el que no tiene cuenta corriente.
    await actualizarCliente(admin, { id: clienteId, cambios: { activo: false } }, entorno.bd);
    await esperar(pagar(100)).rejects.toMatchObject({ estadoHttp: 422, codigo: "CUENTA_CORRIENTE_NO_HABILITADA" });

    await esperar(registrarPagoCuentaCorriente(admin, { clienteId: 999, pago: { importe: 100, medio: "efectivo" } }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 404, codigo: "NO_ENCONTRADO" });
    await esperar(obtenerCuentaCorrienteCliente(admin, { id: 999 }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 404, codigo: "NO_ENCONTRADO" });
    esperar(await entorno.bd.select().from(pagos)).toHaveLength(0);
  });

  probar("rechaza campos no previstos, importes no enteros y medios inválidos con 422 VALIDACION", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    for (const pago of [
      { importe: 100, medio: "efectivo", numeroRecibo: 99 },
      { importe: 100, medio: "efectivo", saldo: 0 },
      { importe: 100.5, medio: "efectivo" },
      { importe: 0, medio: "efectivo" },
      { importe: -5, medio: "efectivo" },
      { importe: 100, medio: "cheque" },
    ]) {
      const falla = await registrarPagoCuentaCorriente(admin, { clienteId, pago }, entorno.bd).then(() => null, (error: unknown) => error);
      const respuesta = convertirErrorARespuestaHttp(falla);
      esperar(respuesta.status, JSON.stringify(pago)).toBe(422);
      esperar(((await respuesta.json()) as { error: { code: string } }).error.code).toBe("VALIDACION");
    }
    esperar(await entorno.bd.select().from(pagos)).toHaveLength(0);
  });

  probar("el recibo se puede reimprimir y devuelve el mismo contenido", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    const emitido = await pagar(500000, vendedor, { medio: "transferencia" });
    esperar(await obtenerReciboPagoPorId(admin, { id: emitido.id }, entorno.bd)).toEqual(emitido);
    esperar(emitido.medio).toBe("transferencia");
    await esperar(obtenerReciboPagoPorId(admin, { id: 999 }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 404, codigo: "NO_ENCONTRADO" });
  });

  probar("el recibo congela su saldo: movimientos posteriores no cambian la reimpresión", async () => {
    await registrarDebito(960000, "2026-10-24T15:10:00.000Z");
    const primero = await pagar(500000);
    esperar(primero.saldoCliente).toBe(460000);

    // Después del primer recibo pasan más cosas en la cuenta del cliente.
    // La factura lleva fecha posterior porque los movimientos se graban cuando ocurren.
    const segundo = await pagar(460000);
    esperar(segundo.saldoCliente).toBe(0);
    await registrarDebito(700000, "2027-01-15T12:00:00.000Z");

    // Cada recibo sigue mostrando el saldo que tenía impreso, no el de hoy.
    esperar((await obtenerReciboPagoPorId(admin, { id: primero.id }, entorno.bd)).saldoCliente).toBe(460000);
    esperar((await obtenerReciboPagoPorId(admin, { id: segundo.id }, entorno.bd)).saldoCliente).toBe(0);
    esperar((await obtenerCuentaCorrienteCliente(admin, { id: clienteId }, entorno.bd)).saldo).toBe(700000);
  });
});
