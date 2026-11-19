import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { cargarDatosDemostracion } from "@/base-de-datos/cargar-datos-demostracion";
import { CONTRASENA_DEMOSTRACION } from "@/base-de-datos/datos-demostracion";
import { categorias, clientes, facturas, movimientosCuenta, movimientosStock, pagos, productos, usuarios } from "@/base-de-datos/esquema";
import { calcularSaldoCliente } from "@/servicios/servicio-clientes";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { obtenerReciboPagoPorId } from "@/servicios/servicio-pagos";
import { registrarMovimientoManual } from "@/servicios/servicio-stock";
import { obtenerDatosTablero } from "@/servicios/servicio-tablero";
import { verificarContrasena } from "@/utilidades/sesion";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("T12: semilla y lista integral de control de la defensa", () => {
  let entorno: BaseDatosPrueba;
  antesDeCadaPrueba(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T15:00:00Z"));
    entorno = await crearBaseDatosPrueba();
  });
  despuesDeCadaPrueba(() => { entorno.cerrar(); vi.useRealTimers(); });

  probar("carga la demo completa, cronológica y consistente mediante los servicios", async () => {
    const resultado = await cargarDatosDemostracion(entorno.bd);
    esperar(resultado.creada).toBe(true);
    esperar(resultado.conteos).toMatchObject({ usuarios: 3, categorias: 5, productos: 30, clientes: 10, facturas: 51, pagos: 6 });
    const personal = await entorno.bd.select().from(usuarios);
    for (const usuario of personal) {
      esperar(usuario.contrasenaHash).not.toBe(CONTRASENA_DEMOSTRACION);
      esperar(await verificarContrasena(CONTRASENA_DEMOSTRACION, usuario.contrasenaHash)).toBe(true);
    }
    const admin = personal.find((usuario) => usuario.rol === "admin")!;
    const catalogo = await entorno.bd.select().from(productos);
    const movimientos = await entorno.bd.select().from(movimientosStock);
    for (const producto of catalogo) {
      const historial = movimientos.filter((movimiento) => movimiento.productoId === producto.id);
      esperar(producto.existencia).toBe(historial.reduce((suma, movimiento) => suma + movimiento.cantidad, 0));
      let acumulado = 0;
      for (const movimiento of historial.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)) {
        acumulado += movimiento.cantidad;
        esperar(movimiento.existenciaResultante).toBe(acumulado);
        esperar(acumulado).toBeGreaterThanOrEqual(0);
      }
    }
    esperar(catalogo.filter((producto) => producto.activo && producto.existencia < producto.stockMinimo)).toHaveLength(4);

    const compradores = await entorno.bd.select().from(clientes);
    const cuenta = await entorno.bd.select().from(movimientosCuenta);
    for (const cliente of compradores) {
      const saldo = cuenta.filter((movimiento) => movimiento.clienteId === cliente.id)
        .reduce((suma, movimiento) => suma + (movimiento.tipo === "debito" ? movimiento.importe : -movimiento.importe), 0);
      esperar(await calcularSaldoCliente(entorno.bd, cliente.id)).toBe(saldo);
    }

    const ventas = await entorno.bd.select().from(facturas);
    const recibos = await entorno.bd.select().from(pagos);
    esperar(ventas.map((factura) => factura.numero).sort((a, b) => a - b)).toEqual(Array.from({ length: 51 }, (_, indice) => indice + 1));
    esperar(recibos.map((recibo) => recibo.numeroRecibo).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
    esperar(ventas.filter((factura) => factura.estado === "anulada")).toHaveLength(3);
    esperar(new Set(ventas.map((factura) => factura.formaPago)).size).toBe(3);
    const dias = ventas.map((factura) => new Date(new Date(factura.fecha).getTime() - 3 * 3600000).toISOString().slice(0, 10));
    esperar(new Set(dias).size).toBe(30);
    esperar([...dias].sort()[0]).toBe("2026-10-21");
    esperar([...dias].sort().at(-1)).toBe("2026-11-19");
    for (const venta of ventas) {
      esperar(venta.fecha >= "2026-10-21T11:00:00.000Z").toBe(true);
      for (const movimiento of movimientos.filter((fila) => fila.facturaId === venta.id)) {
        esperar(movimiento.fecha).toBe(movimiento.tipo === "anulacion" ? venta.fechaAnulacion : venta.fecha);
      }
      for (const movimiento of cuenta.filter((fila) => fila.facturaId === venta.id)) {
        esperar(movimiento.fecha).toBe(movimiento.tipo === "credito" ? venta.fechaAnulacion : venta.fecha);
      }
    }
    for (const pago of recibos) {
      const credito = cuenta.find((movimiento) => movimiento.pagoId === pago.id)!;
      esperar(credito.fecha).toBe(pago.fecha);
      const saldoHistorico = cuenta.filter((movimiento) => movimiento.clienteId === pago.clienteId &&
        (movimiento.fecha < credito.fecha || movimiento.fecha === credito.fecha && movimiento.id <= credito.id))
        .reduce((suma, movimiento) => suma + (movimiento.tipo === "debito" ? movimiento.importe : -movimiento.importe), 0);
      esperar((await obtenerReciboPagoPorId(admin, { id: pago.id }, entorno.bd)).saldoCliente).toBe(saldoHistorico);
    }
    const tablero = await obtenerDatosTablero(admin, {}, entorno.bd);
    esperar(tablero.hoy.cantidad).toBeGreaterThan(0);
    esperar(tablero.cuentasCorrientes.totalAdeudado).toBeGreaterThan(0);
    esperar(tablero.bajoMinimo.cantidad).toBe(4);
    esperar(tablero.ventasDiarias).toHaveLength(30);
    esperar(tablero.porFormaDePago.every((forma) => forma.importe > 0)).toBe(true);
    esperar((await entorno.cliente.execute("pragma foreign_key_check")).rows).toEqual([]);
  }, 15000);

  probar("repetir no duplica ni reinicia operaciones posteriores de la demo", async () => {
    await cargarDatosDemostracion(entorno.bd);
    const [admin] = await entorno.bd.select().from(usuarios).where(igual(usuarios.rol, "admin"));
    const [producto] = await entorno.bd.select().from(productos);
    const nueva = await crearCategoria(admin, { nombre: "Agregada después de la semilla" }, entorno.bd);
    await registrarMovimientoManual(admin, { productoId: producto.id, movimiento: { tipo: "ingreso", cantidad: 2, motivo: "Reposición" } }, entorno.bd);
    const antes = await entorno.cliente.execute("select * from usuarios order by id");
    const resultado = await cargarDatosDemostracion(entorno.bd, "OtraClaveDemo123!");
    esperar(resultado.creada).toBe(false);
    esperar(resultado.conteos).toMatchObject({ usuarios: 3, categorias: 6, productos: 30, clientes: 10, facturas: 51, pagos: 6 });
    esperar((await entorno.cliente.execute("select * from usuarios order by id")).rows).toEqual(antes.rows);
    esperar((await entorno.bd.select().from(categorias).where(igual(categorias.id, nueva.id)))).toHaveLength(1);
    esperar((await entorno.bd.select().from(productos).where(igual(productos.id, producto.id)))[0].existencia).toBe(producto.existencia + 2);
  }, 15000);

  probar("rechaza una base ajena sin modificar sus datos", async () => {
    await entorno.bd.insert(usuarios).values({ nombre: "Usuario existente", email: "existente@comercio.test", rol: "admin", contrasenaHash: "dato previo" });
    await esperar(cargarDatosDemostracion(entorno.bd)).rejects.toThrow("no se modificó ningún registro");
    esperar((await entorno.bd.select().from(usuarios))).toHaveLength(1);
    esperar((await entorno.bd.select().from(productos))).toHaveLength(0);
  });

  probar("un fallo después de varias ventas revierte toda la semilla y permite reintentar", async () => {
    await entorno.cliente.execute("create trigger fallo_semilla before insert on factura_items when new.factura_id > 5 begin select raise(abort, 'fallo controlado de semilla'); end");
    await esperar(cargarDatosDemostracion(entorno.bd)).rejects.toThrow();
    for (const tabla of ["usuarios", "categorias", "productos", "clientes", "facturas", "factura_items", "pagos", "movimientos_stock", "movimientos_cuenta"]) {
      esperar((await entorno.cliente.execute(`select count(*) as cantidad from ${tabla}`)).rows[0].cantidad).toBe(0);
    }
    await entorno.cliente.execute("drop trigger fallo_semilla");
    esperar((await cargarDatosDemostracion(entorno.bd)).conteos.facturas).toBe(51);
  }, 15000);
});
