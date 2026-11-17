import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar } from "vitest";
import { eq as igual } from "drizzle-orm";
import {
  facturaItems, facturas, movimientosCuenta, movimientosStock, productos, usuarios, type UsuarioAutenticado,
} from "@/base-de-datos/esquema";
import { convertirErrorARespuestaHttp } from "@/errores/manejador-errores";
import { crearCliente } from "@/servicios/servicio-clientes";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { actualizarProducto, crearProducto, obtenerProductoPorId } from "@/servicios/servicio-productos";
import { obtenerCuentaCorrienteCliente } from "@/servicios/servicio-pagos";
import {
  anularFactura, confirmarFactura, listarFacturas, obtenerFacturaPorId, obtenerProximoNumeroFactura,
} from "@/servicios/servicio-facturas";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Facturación: transacción atómica, concurrencia y anulación", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let martillo: { id: number; precio: number };
  let cinta: { id: number; precio: number };
  let clienteId: number;

  antesDeCadaPrueba(async () => {
    entorno = await crearBaseDatosPrueba();
    [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Administradora", email: "admin@prueba.test", rol: "admin", contrasenaHash: "no-se-usa" },
      { nombre: "Vendedor", email: "vendedor@prueba.test", rol: "vendedor", contrasenaHash: "no-se-usa" },
    ]).returning();
    const categoriaId = (await crearCategoria(admin, { nombre: "Herramientas" }, entorno.bd)).id;
    martillo = await crearProducto(admin, {
      codigo: "HE-001", descripcion: "Martillo carpintero 500 g", categoriaId,
      precio: 1250000, stockMinimo: 5, stockInicial: 10,
    }, entorno.bd);
    cinta = await crearProducto(admin, {
      codigo: "EL-001", descripcion: "Cinta aisladora 20 m", categoriaId,
      precio: 190000, stockMinimo: 2, stockInicial: 4,
    }, entorno.bd);
    clienteId = (await crearCliente(admin, {
      tipoDoc: "DNI", nroDoc: "28.456.123", nombre: "Mariana López",
      cuentaCorriente: true, limiteCredito: 40000000, domicilio: "Las Heras 455",
    }, entorno.bd)).id;
  });
  despuesDeCadaPrueba(() => entorno.cerrar());

  const existencia = async (id: number) => (await obtenerProductoPorId(admin, { id }, entorno.bd)).existencia;
  const emitir = (datos: Record<string, unknown>, usuario = vendedor) => confirmarFactura(usuario, datos, entorno.bd);
  const codigoDe = async (promesa: Promise<unknown>) => {
    const falla = await promesa.then(() => null, (error: unknown) => error);
    const respuesta = convertirErrorARespuestaHttp(falla);
    return { estado: respuesta.status, cuerpo: await respuesta.json() as { error: { code: string; details?: unknown } } };
  };

  probar("emite en contado y modifica las cinco tablas esperadas (P1.7)", async () => {
    const factura = await emitir({
      clienteId: null,
      items: [{ productoId: martillo.id, cantidad: 2 }, { productoId: cinta.id, cantidad: 1 }],
      pago: { forma: "contado", montoRecibido: 3000000 },
    });

    esperar(factura.numeroFormateado).toBe("0001-00000001");
    esperar(factura.cliente, "consumidor final no lleva cliente").toBeNull();
    esperar(factura.total).toBe(2690000);
    esperar(factura.pago).toEqual({ forma: "contado", montoRecibido: 3000000, vuelto: 310000 });
    esperar(factura.vendedor).toEqual({ id: vendedor.id, nombre: "Vendedor" });
    esperar(factura.saldoCliente, "una venta de contado no toca la cuenta corriente").toBeUndefined();

    esperar(factura.items).toEqual([
      { productoId: martillo.id, codigo: "HE-001", descripcion: "Martillo carpintero 500 g", cantidad: 2, precioUnitario: 1250000, subtotal: 2500000 },
      { productoId: cinta.id, codigo: "EL-001", descripcion: "Cinta aisladora 20 m", cantidad: 1, precioUnitario: 190000, subtotal: 190000 },
    ]);
    esperar(await existencia(martillo.id)).toBe(8);
    esperar(await existencia(cinta.id)).toBe(3);

    const movimientos = await entorno.bd.select().from(movimientosStock).where(igual(movimientosStock.facturaId, factura.id));
    esperar(movimientos.map((fila) => [fila.tipo, fila.cantidad, fila.existenciaResultante])).toEqual([
      ["venta", -2, 8], ["venta", -1, 3],
    ]);
    esperar(movimientos[0].motivo).toBe("Venta 0001-00000001");
    esperar(await entorno.bd.select().from(movimientosCuenta)).toHaveLength(0);
  });

  probar("sin montoRecibido toma el total y el vuelto da cero", async () => {
    const factura = await emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } });
    esperar(factura.pago).toEqual({ forma: "contado", montoRecibido: 190000, vuelto: 0 });
    esperar((await codigoDe(emitir({
      clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado", montoRecibido: 1000 },
    }))).cuerpo.error.code).toBe("MONTO_INSUFICIENTE");
  });

  probar("con tarjeta guarda solo tipo, marca y últimos 4, y rechaza el número completo (P4.1)", async () => {
    const factura = await emitir({
      clienteId, items: [{ productoId: cinta.id, cantidad: 1 }],
      pago: { forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "6411" } },
    });
    esperar(factura.pago).toEqual({ forma: "tarjeta", tarjeta: { tipo: "credito", marca: "Visa", ultimos4: "6411" } });
    esperar(factura.cliente?.nroDoc, "la factura congela los datos del comprador").toBe("28.456.123");

    // Regla 9: el número completo de la tarjeta no entra ni como campo extra ni como ultimos4.
    for (const tarjeta of [
      { tipo: "credito", marca: "Visa", ultimos4: "6411", numeroTarjeta: "4111111111116411" },
      { tipo: "credito", marca: "Visa", ultimos4: "4111111111116411" },
    ]) {
      const rechazo = await codigoDe(emitir({ clienteId, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "tarjeta", tarjeta } }));
      esperar(rechazo.estado).toBe(422);
      esperar(rechazo.cuerpo.error.code).toBe("VALIDACION");
    }
  });

  probar("a cuenta corriente deja el débito y respeta el límite de crédito (P3.6 y P3.7)", async () => {
    const factura = await emitir({ clienteId, items: [{ productoId: martillo.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } });
    esperar(factura.saldoCliente).toBe(1250000);
    const [debito] = await entorno.bd.select().from(movimientosCuenta).where(igual(movimientosCuenta.facturaId, factura.id));
    esperar(debito).toMatchObject({ tipo: "debito", importe: 1250000, descripcion: "Factura 0001-00000001" });

    // Regla 6: el consumidor final no compra en cuenta corriente.
    const sinCliente = await codigoDe(emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } }));
    esperar(sinCliente.cuerpo.error.code).toBe("CUENTA_CORRIENTE_NO_HABILITADA");

    // Un cliente registrado pero sin cuenta corriente habilitada tampoco puede.
    const contado = (await crearCliente(admin, { tipoDoc: "DNI", nroDoc: "30111222", nombre: "Juan Contado" }, entorno.bd)).id;
    esperar((await codigoDe(emitir({ clienteId: contado, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } })))
      .cuerpo.error.code).toBe("CUENTA_CORRIENTE_NO_HABILITADA");
  });

  probar("rechaza la venta que supera el límite de crédito, con el detalle del excedente", async () => {
    const apretado = (await crearCliente(admin, {
      tipoDoc: "DNI", nroDoc: "27888999", nombre: "Límite Justo", cuentaCorriente: true, limiteCredito: 2000000,
    }, entorno.bd)).id;
    await emitir({ clienteId: apretado, items: [{ productoId: martillo.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } });

    const rechazo = await codigoDe(emitir({ clienteId: apretado, items: [{ productoId: martillo.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } }));
    esperar(rechazo.estado).toBe(422);
    esperar(rechazo.cuerpo.error.code).toBe("LIMITE_CREDITO_EXCEDIDO");
    esperar(rechazo.cuerpo.error.details).toEqual({ saldoActual: 1250000, limite: 2000000, excedente: 500000 });
    esperar(await existencia(martillo.id), "la venta rechazada no descontó stock").toBe(9);
  });

  probar("si un renglón no tiene stock no se graba nada de la factura (P3.3)", async () => {
    const rechazo = await codigoDe(emitir({
      clienteId: null,
      items: [{ productoId: martillo.id, cantidad: 1 }, { productoId: cinta.id, cantidad: 99 }],
      pago: { forma: "contado" },
    }));
    esperar(rechazo.estado).toBe(409);
    esperar(rechazo.cuerpo.error.code).toBe("STOCK_INSUFICIENTE");
    esperar(rechazo.cuerpo.error.details).toEqual([{ productoId: cinta.id, codigo: "EL-001", solicitado: 99, disponible: 4 }]);

    esperar(await existencia(martillo.id), "el primer renglón no se descontó").toBe(10);
    esperar(await entorno.bd.select().from(facturas)).toHaveLength(0);
    esperar(await entorno.bd.select().from(facturaItems)).toHaveLength(0);
    esperar(await entorno.bd.select().from(movimientosStock).where(igual(movimientosStock.tipo, "venta"))).toHaveLength(0);
  });

  probar("rechaza productos dados de baja y lista todos los faltantes juntos", async () => {
    await actualizarProducto(admin, { id: cinta.id, cambios: { activo: false } }, entorno.bd);
    esperar((await codigoDe(emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } })))
      .cuerpo.error.code).toBe("PRODUCTO_INACTIVO");

    const faltantes = await codigoDe(emitir({
      clienteId: null,
      items: [{ productoId: martillo.id, cantidad: 50 }, { productoId: cinta.id, cantidad: 50 }],
      pago: { forma: "contado" },
    }));
    // Primero avisa de los inactivos; si estuvieran todos activos, listaría los dos faltantes juntos.
    esperar(faltantes.cuerpo.error.code).toBe("PRODUCTO_INACTIVO");
    await actualizarProducto(admin, { id: cinta.id, cambios: { activo: true } }, entorno.bd);
    esperar((await codigoDe(emitir({
      clienteId: null,
      items: [{ productoId: martillo.id, cantidad: 50 }, { productoId: cinta.id, cantidad: 50 }],
      pago: { forma: "contado" },
    }))).cuerpo.error.details).toHaveLength(2);
  });

  probar("dos ventas de la última unidad terminan en una sola factura (P3.2)", async () => {
    const ultimo = await crearProducto(admin, {
      codigo: "UNICO", descripcion: "Última unidad", categoriaId: (await crearCategoria(admin, { nombre: "Varios" }, entorno.bd)).id,
      precio: 500000, stockMinimo: 0, stockInicial: 1,
    }, entorno.bd);

    const venta = () => emitir({ clienteId: null, items: [{ productoId: ultimo.id, cantidad: 1 }], pago: { forma: "contado" } });
    const resultados = await Promise.allSettled([venta(), venta()]);

    const confirmadas = resultados.filter((resultado) => resultado.status === "fulfilled");
    const rechazadas = resultados.filter((resultado) => resultado.status === "rejected");
    esperar(confirmadas, "solo una venta se confirma").toHaveLength(1);
    esperar(rechazadas).toHaveLength(1);
    esperar((rechazadas[0] as PromiseRejectedResult).reason).toMatchObject({ estadoHttp: 409, codigo: "STOCK_INSUFICIENTE" });

    esperar(await existencia(ultimo.id), "la existencia nunca queda negativa").toBe(0);
    esperar(await entorno.bd.select().from(facturas)).toHaveLength(1);
  });

  probar("cambiar el precio no altera las facturas ya emitidas (P3.5)", async () => {
    const factura = await emitir({ clienteId: null, items: [{ productoId: martillo.id, cantidad: 2 }], pago: { forma: "contado" } });
    await actualizarProducto(admin, { id: martillo.id, cambios: { precio: 9999999 } }, entorno.bd);

    const releida = await obtenerFacturaPorId(admin, { id: factura.id }, entorno.bd);
    esperar(releida.items[0].precioUnitario).toBe(1250000);
    esperar(releida.total).toBe(2500000);
    esperar((await obtenerProductoPorId(admin, { id: martillo.id }, entorno.bd)).precio).toBe(9999999);
  });

  probar("anular devuelve el stock y revierte la deuda; el vendedor no puede (P3.9)", async () => {
    const factura = await emitir({ clienteId, items: [{ productoId: martillo.id, cantidad: 3 }], pago: { forma: "cuenta_corriente" } });
    esperar(await existencia(martillo.id)).toBe(7);

    await esperar(anularFactura(vendedor, { id: factura.id, motivo: "Error de carga" }, entorno.bd))
      .rejects.toMatchObject({ estadoHttp: 403, codigo: "SIN_PERMISO" });
    await esperar(anularFactura(admin, { id: factura.id, motivo: "   " }, entorno.bd))
      .rejects.toMatchObject({ name: "ZodError" });

    const anulada = await anularFactura(admin, { id: factura.id, motivo: "Error en la carga de cantidades" }, entorno.bd);
    esperar(anulada.estado).toBe("anulada");
    esperar(anulada.anulacion).toMatchObject({ motivo: "Error en la carga de cantidades", usuario: { id: admin.id, nombre: "Administradora" } });
    esperar(await existencia(martillo.id), "el stock volvió").toBe(10);
    esperar((await obtenerCuentaCorrienteCliente(admin, { id: clienteId }, entorno.bd)).saldo, "la deuda se revirtió").toBe(0);

    const movimientos = await entorno.bd.select().from(movimientosStock).where(igual(movimientosStock.facturaId, factura.id));
    esperar(movimientos.map((fila) => fila.tipo)).toEqual(["venta", "anulacion"]);
    esperar((await codigoDe(anularFactura(admin, { id: factura.id, motivo: "De nuevo" }, entorno.bd))).cuerpo.error.code).toBe("FACTURA_ANULADA");
  });

  probar("el listado filtra, busca por número y suma solo las emitidas", async () => {
    const primera = await emitir({ clienteId, items: [{ productoId: martillo.id, cantidad: 1 }], pago: { forma: "cuenta_corriente" } });
    await emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } }, admin);
    await anularFactura(admin, { id: primera.id, motivo: "Prueba" }, entorno.bd);

    const todas = await listarFacturas(vendedor, {}, entorno.bd);
    esperar(todas.total).toBe(2);
    esperar(todas.totalEmitido, "la anulada no suma").toBe(190000);
    esperar(todas.data[0].numeroFormateado, "de la más nueva a la más vieja").toBe("0001-00000002");

    // El mismo número escrito de tres maneras encuentra la misma factura.
    for (const q of ["1", "00000001", "0001-00000001"]) {
      const encontradas = await listarFacturas(vendedor, { q }, entorno.bd);
      esperar(encontradas.data.map((fila) => fila.id), `buscando "${q}"`).toEqual([primera.id]);
    }
    esperar((await listarFacturas(vendedor, { q: "mariana" }, entorno.bd)).data).toHaveLength(1);
    esperar((await listarFacturas(vendedor, { estado: "anulada" }, entorno.bd)).data.map((f) => f.id)).toEqual([primera.id]);
    esperar((await listarFacturas(vendedor, { forma: "contado" }, entorno.bd)).data).toHaveLength(1);
    esperar((await listarFacturas(vendedor, { vendedorId: admin.id }, entorno.bd)).data).toHaveLength(1);
  });

  probar("el próximo número es informativo y avanza recién al confirmar (P3.4)", async () => {
    esperar(await obtenerProximoNumeroFactura(vendedor, {}, entorno.bd)).toEqual({ numeroFormateado: "0001-00000001" });
    // Consultarlo dos veces no consume numeración.
    esperar(await obtenerProximoNumeroFactura(vendedor, {}, entorno.bd)).toEqual({ numeroFormateado: "0001-00000001" });

    await emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } });
    esperar(await obtenerProximoNumeroFactura(vendedor, {}, entorno.bd)).toEqual({ numeroFormateado: "0001-00000002" });

    // Una venta rechazada tampoco consume el número: la siguiente toma el que correspondía.
    await codigoDe(emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 999 }], pago: { forma: "contado" } }));
    const siguiente = await emitir({ clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } });
    esperar(siguiente.numeroFormateado).toBe("0001-00000002");
  });

  probar("rechaza el cuerpo con precios, totales o productos repetidos", async () => {
    const casos: Record<string, unknown>[] = [
      { clienteId: null, items: [{ productoId: cinta.id, cantidad: 1, precioUnitario: 1 }], pago: { forma: "contado" } },
      { clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], total: 1, pago: { forma: "contado" } },
      { clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }, { productoId: cinta.id, cantidad: 1 }], pago: { forma: "contado" } },
      { clienteId: null, items: [], pago: { forma: "contado" } },
      { clienteId: null, items: [{ productoId: cinta.id, cantidad: 0 }], pago: { forma: "contado" } },
      { clienteId: null, items: [{ productoId: cinta.id, cantidad: 1 }], pago: { forma: "cheque" } },
    ];
    for (const caso of casos) {
      const rechazo = await codigoDe(emitir(caso));
      esperar(rechazo.estado, JSON.stringify(caso)).toBe(422);
      esperar(rechazo.cuerpo.error.code).toBe("VALIDACION");
    }
    esperar(await entorno.bd.select().from(facturas)).toHaveLength(0);
  });
});
