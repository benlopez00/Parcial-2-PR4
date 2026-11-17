import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar } from "vitest";
import { eq as igual, sql as expresionSql } from "drizzle-orm";
import { mkdtemp as crearDirectorioTemporal, rm as eliminar, writeFile as escribirArchivo } from "node:fs/promises";
import { execFile as ejecutarArchivo } from "node:child_process";
import { promisify as convertirEnPromesa } from "node:util";
import { join as unirRuta } from "node:path";
import { categorias, facturas, movimientosStock, productos, usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { traducirErrorEscrituraCategoria, traducirErrorEscrituraProducto } from "@/errores/verificadores-negocio";
import { crearCategoria, actualizarCategoria, listarCategorias } from "@/servicios/servicio-categorias";
import { crearProducto, actualizarProducto, listarProductos, obtenerProductoPorId } from "@/servicios/servicio-productos";
import { listarMovimientosProducto, listarMovimientosStockGeneral, moverStock, registrarMovimientoManual } from "@/servicios/servicio-stock";
import { crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

describir("Categorías, productos y stock transaccional", () => {
  let entorno: BaseDatosPrueba;
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let categoriaId: number;

  antesDeCadaPrueba(async () => {
    entorno = await crearBaseDatosPrueba();
    [admin, vendedor] = await entorno.bd.insert(usuarios).values([
      { nombre: "Administradora", email: "admin@prueba.test", rol: "admin", contrasenaHash: "no-se-usa-para-login" },
      { nombre: "Vendedor", email: "vendedor@prueba.test", rol: "vendedor", contrasenaHash: "no-se-usa-para-login" },
    ]).returning();
    categoriaId = (await crearCategoria(admin, { nombre: "Herramientas" }, entorno.bd)).id;
  });
  despuesDeCadaPrueba(() => entorno.cerrar());

  function datosProducto(cambios: Record<string, unknown> = {}) {
    return { codigo: "HE-001", descripcion: "Martillo", categoriaId, precio: 1250000, stockMinimo: 5, ...cambios };
  }
  async function ajustar(productoId: number, tipo: "ingreso" | "egreso", cantidad: number) {
    return registrarMovimientoManual(admin, {
      productoId, movimiento: { tipo, cantidad, motivo: tipo === "ingreso" ? "Reposición" : "Rotura", observacion: "Depósito" },
    }, entorno.bd);
  }

  probar("alta con 15 unidades registra un ingreso y devuelve exactamente el contrato público", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 15 }), entorno.bd);
    esperar(producto).toEqual({ id: producto.id, codigo: "HE-001", descripcion: "Martillo", categoria: { id: categoriaId, nombre: "Herramientas" },
      precio: 1250000, existencia: 15, stockMinimo: 5, bajoMinimo: false, activo: true });
    const historial = await listarMovimientosProducto(vendedor, { productoId: producto.id }, entorno.bd);
    esperar(historial.total).toBe(1);
    esperar(historial.data[0]).toMatchObject({ tipo: "ingreso", cantidad: 15, existenciaResultante: 15, motivo: "Stock inicial", referencia: null,
      producto: { id: producto.id, codigo: "HE-001" }, usuario: { id: admin.id, nombre: admin.nombre } });
    esperar(new Date(historial.data[0].fecha).toISOString()).toBe(historial.data[0].fecha);
  });

  probar.each([undefined, 0])("stock inicial %s conserva cero sin un movimiento ficticio", async (stockInicial) => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial }), entorno.bd);
    esperar(producto.existencia).toBe(0);
    esperar((await listarMovimientosProducto(admin, { productoId: producto.id }, entorno.bd)).data).toEqual([]);
  });

  probar("duplicados en alta/edición y conservación del propio código o nombre", async () => {
    const primero = await crearProducto(admin, datosProducto(), entorno.bd);
    const segundo = await crearProducto(admin, datosProducto({ codigo: "HE-002" }), entorno.bd);
    await esperar(crearProducto(admin, datosProducto(), entorno.bd)).rejects.toMatchObject({ estadoHttp: 409, codigo: "CODIGO_DUPLICADO" });
    await esperar(actualizarProducto(admin, { id: segundo.id, cambios: { codigo: primero.codigo } }, entorno.bd)).rejects.toMatchObject({ codigo: "CODIGO_DUPLICADO" });
    esperar((await actualizarProducto(admin, { id: primero.id, cambios: { codigo: primero.codigo } }, entorno.bd)).codigo).toBe(primero.codigo);
    await esperar(crearCategoria(admin, { nombre: "Herramientas" }, entorno.bd)).rejects.toMatchObject({ codigo: "NOMBRE_DUPLICADO" });
    const otra = await crearCategoria(admin, { nombre: "Pinturas" }, entorno.bd);
    await esperar(actualizarCategoria(admin, { id: otra.id, cambios: { nombre: "Herramientas" } }, entorno.bd)).rejects.toMatchObject({ codigo: "NOMBRE_DUPLICADO" });
    esperar((await actualizarCategoria(admin, { id: categoriaId, cambios: { nombre: "Herramientas" } }, entorno.bd)).nombre).toBe("Herramientas");
    await actualizarProducto(admin, { id: primero.id, cambios: { activo: false } }, entorno.bd);
    await esperar(crearProducto(admin, datosProducto(), entorno.bd)).rejects.toMatchObject({ codigo: "CODIGO_DUPLICADO" });
    await actualizarCategoria(admin, { id: otra.id, cambios: { activa: false } }, entorno.bd);
    await esperar(crearCategoria(admin, { nombre: "Pinturas" }, entorno.bd)).rejects.toMatchObject({ codigo: "NOMBRE_DUPLICADO" });
  });

  probar("las colisiones reales de los índices únicos se traducen y los errores ajenos se conservan", async () => {
    await crearProducto(admin, datosProducto(), entorno.bd);
    const colisionProducto = await entorno.bd.insert(productos).values(datosProducto()).catch((error: unknown) => error);
    esperar(() => traducirErrorEscrituraProducto(colisionProducto)).toThrow(expectativaCodigo("CODIGO_DUPLICADO"));
    const colisionCategoria = await entorno.bd.insert(categorias).values({ nombre: "Herramientas" }).catch((error: unknown) => error);
    esperar(() => traducirErrorEscrituraCategoria(colisionCategoria)).toThrow(expectativaCodigo("NOMBRE_DUPLICADO"));
    const inesperado = new Error("Falla inesperada");
    esperar(() => traducirErrorEscrituraProducto(inesperado)).toThrow(inesperado);
    esperar(() => traducirErrorEscrituraCategoria(inesperado)).toThrow(inesperado);
  });

  probar.each([
    { existencia: 100 }, { precio: -1 }, { precio: 1.5 }, { stockMinimo: -1 }, { stockInicial: 1.5 },
    { categoriaId: "1" }, { precio: "100" }, { codigo: " " }, { descripcion: " " }, { inesperado: true },
    { stockInicial: Number.MAX_SAFE_INTEGER + 1 },
  ])("alta rechaza datos inválidos: %j", async (cambios) => {
    await esperar(crearProducto(admin, datosProducto(cambios), entorno.bd)).rejects.toHaveProperty("name", "ZodError");
    esperar(await entorno.bd.select().from(productos)).toHaveLength(0);
  });

  probar.each([{ existencia: 100 }, { stockInicial: 8 }, {}, { activo: "false" }])("edición estricta rechaza %j", async (cambios) => {
    const producto = await crearProducto(admin, datosProducto(), entorno.bd);
    await esperar(actualizarProducto(admin, { id: producto.id, cambios }, entorno.bd)).rejects.toHaveProperty("name", "ZodError");
  });

  probar("egreso excesivo no altera stock ni historial; egreso exacto deja cero", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 2 }), entorno.bd);
    await esperar(ajustar(producto.id, "egreso", 3)).rejects.toMatchObject({ estadoHttp: 409, codigo: "STOCK_INSUFICIENTE",
      detalles: { productoId: producto.id, solicitado: 3, disponible: 2 } });
    esperar((await obtenerProductoPorId(admin, { id: producto.id }, entorno.bd)).existencia).toBe(2);
    esperar((await listarMovimientosProducto(admin, { productoId: producto.id }, entorno.bd)).total).toBe(1);
    esperar(await ajustar(producto.id, "egreso", 2)).toMatchObject({ cantidad: -2, existenciaResultante: 0 });
    esperar((await entorno.bd.select().from(movimientosStock))[1].observacion).toBe("Depósito");
  });

  probar.each([
    { tipo: "ingreso", motivo: "Rotura", cantidad: 1 }, { tipo: "egreso", motivo: "Reposición", cantidad: 1 },
    { tipo: "venta", motivo: "Venta", cantidad: 1 }, { tipo: "ingreso", motivo: "Reposición", cantidad: 0 },
    { tipo: "egreso", motivo: "Rotura", cantidad: -1 }, { tipo: "ingreso", motivo: "Reposición", cantidad: 1, usuarioId: 9 },
  ])("movimiento manual rechaza %j", async (movimiento) => {
    const producto = await crearProducto(admin, datosProducto(), entorno.bd);
    await esperar(registrarMovimientoManual(admin, { productoId: producto.id, movimiento }, entorno.bd)).rejects.toHaveProperty("name", "ZodError");
  });

  probar("la suma firmada de movimientos coincide con existencia tras altas y ajustes", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 15 }), entorno.bd);
    await ajustar(producto.id, "egreso", 4);
    await ajustar(producto.id, "ingreso", 7);
    await ajustar(producto.id, "egreso", 2);
    const [{ suma }] = await entorno.bd.select({ suma: expresionSql<number>`sum(${movimientosStock.cantidad})`.mapWith(Number) })
      .from(movimientosStock).where(igual(movimientosStock.productoId, producto.id));
    esperar((await obtenerProductoPorId(admin, { id: producto.id }, entorno.bd)).existencia).toBe(suma);
    esperar(suma).toBe(16);
  });

  probar("fallo de inserción del movimiento revierte existencia y también el producto nuevo", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 2 }), entorno.bd);
    await entorno.cliente.execute("CREATE TRIGGER rechazar_movimiento BEFORE INSERT ON movimientos_stock BEGIN SELECT RAISE(ABORT, 'fallo deliberado'); END");
    await esperar(ajustar(producto.id, "ingreso", 3)).rejects.toThrow();
    esperar((await obtenerProductoPorId(admin, { id: producto.id }, entorno.bd)).existencia).toBe(2);
    await esperar(crearProducto(admin, datosProducto({ codigo: "NUEVO", stockInicial: 1 }), entorno.bd)).rejects.toThrow();
    esperar(await entorno.bd.select().from(productos)).toHaveLength(1);
    esperar(await entorno.bd.select().from(movimientosStock)).toHaveLength(1);
  });

  probar("el stock no supera el entero seguro y el rechazo no persiste movimientos", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: Number.MAX_SAFE_INTEGER }), entorno.bd);
    await esperar(ajustar(producto.id, "ingreso", 1)).rejects.toMatchObject({ estadoHttp: 422, codigo: "VALIDACION" });
    esperar((await obtenerProductoPorId(admin, { id: producto.id }, entorno.bd)).existencia).toBe(Number.MAX_SAFE_INTEGER);
    esperar((await listarMovimientosProducto(admin, { productoId: producto.id }, entorno.bd)).total).toBe(1);
  });

  probar("categoría en uso, baja lógica, compatibilidad y conservación del historial", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 3 }), entorno.bd);
    await esperar(actualizarCategoria(admin, { id: categoriaId, cambios: { activa: false } }, entorno.bd)).rejects.toMatchObject({ codigo: "CATEGORIA_EN_USO" });
    await actualizarProducto(admin, { id: producto.id, cambios: { activo: false } }, entorno.bd);
    await actualizarCategoria(admin, { id: categoriaId, cambios: { activa: false } }, entorno.bd);
    esperar(await listarCategorias(vendedor, {}, entorno.bd)).toEqual([]);
    esperar((await obtenerProductoPorId(vendedor, { id: producto.id }, entorno.bd)).activo).toBe(false);
    esperar((await listarMovimientosProducto(vendedor, { productoId: producto.id }, entorno.bd)).total).toBe(1);
    await esperar(actualizarProducto(admin, { id: producto.id, cambios: { activo: true } }, entorno.bd)).rejects.toMatchObject({ codigo: "VALIDACION" });
    await esperar(crearProducto(admin, datosProducto({ codigo: "NUEVO" }), entorno.bd)).rejects.toMatchObject({ codigo: "VALIDACION" });
    await actualizarCategoria(admin, { id: categoriaId, cambios: { activa: true } }, entorno.bd);
    esperar((await actualizarProducto(admin, { id: producto.id, cambios: { activo: true } }, entorno.bd)).activo).toBe(true);
  });

  probar("catálogo filtra texto literal, categoría, estado y mínimo estricto con paginación", async () => {
    const otra = await crearCategoria(admin, { nombre: "Pinturas" }, entorno.bd);
    await crearProducto(admin, datosProducto({ descripcion: "Martillo 100%", stockInicial: 4 }), entorno.bd);
    await crearProducto(admin, datosProducto({ codigo: "HE-002", descripcion: "Martillo igual", stockInicial: 5 }), entorno.bd);
    const tercero = await crearProducto(admin, datosProducto({ codigo: "PI-001", categoriaId: otra.id, descripcion: "Ácido y Caño" }), entorno.bd);
    const pagina = await listarProductos(vendedor, { q: "MARTILLO", categoriaId: String(categoriaId), pageSize: "1", page: "2" }, entorno.bd);
    esperar(pagina).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    esperar(pagina.data[0]).toMatchObject({ codigo: "HE-002", bajoMinimo: false });
    esperar((await listarProductos(vendedor, { q: "ácido" }, entorno.bd)).total).toBe(1);
    esperar((await listarProductos(vendedor, { q: "CAÑO" }, entorno.bd)).total).toBe(1);
    esperar((await listarProductos(vendedor, { q: "%" }, entorno.bd)).total).toBe(1);
    esperar((await listarProductos(vendedor, { q: "_" }, entorno.bd)).total).toBe(0);
    esperar((await listarProductos(vendedor, { categoriaId, bajoMinimo: "true" }, entorno.bd)).total).toBe(1);
    esperar((await listarProductos(vendedor, { categoriaId, bajoMinimo: "false" }, entorno.bd)).total).toBe(2);
    await actualizarProducto(admin, { id: tercero.id, cambios: { activo: false } }, entorno.bd);
    esperar((await listarProductos(admin, {}, entorno.bd)).total).toBe(2);
    esperar((await listarProductos(admin, { activo: "todos" }, entorno.bd)).total).toBe(3);
    esperar((await listarProductos(admin, { activo: "false" }, entorno.bd)).data[0].id).toBe(tercero.id);
    await esperar(listarProductos(vendedor, { activo: "todos" }, entorno.bd)).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    await esperar(listarProductos(vendedor, { activo: "false" }, entorno.bd)).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    esperar((await listarProductos(vendedor, { page: 50 }, entorno.bd)).data).toEqual([]);
  });

  probar("historial filtra días argentinos, tipo y producto, con orden estable y total correcto", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 10 }), entorno.bd);
    const ingreso = await ajustar(producto.id, "ingreso", 1);
    const egreso = await ajustar(producto.id, "egreso", 1);
    const posterior = await ajustar(producto.id, "ingreso", 1);
    await entorno.bd.update(movimientosStock).set({ fecha: "2026-11-16T02:59:59.999Z" }).where(igual(movimientosStock.id, 1));
    await entorno.bd.update(movimientosStock).set({ fecha: "2026-11-16T03:00:00.000Z" }).where(igual(movimientosStock.id, ingreso.id));
    await entorno.bd.update(movimientosStock).set({ fecha: "2026-11-17T02:59:59.999Z" }).where(igual(movimientosStock.id, egreso.id));
    await entorno.bd.update(movimientosStock).set({ fecha: "2026-11-17T03:00:00.000Z" }).where(igual(movimientosStock.id, posterior.id));
    const filtros = { productoId: producto.id, desde: "2026-11-16", hasta: "2026-11-16" };
    esperar((await listarMovimientosStockGeneral(vendedor, filtros, entorno.bd)).data.map((fila) => fila.id)).toEqual([egreso.id, ingreso.id]);
    esperar((await listarMovimientosStockGeneral(vendedor, { ...filtros, tipo: "ingreso" }, entorno.bd)).total).toBe(1);
    esperar((await listarMovimientosStockGeneral(vendedor, { desde: "2026-11-16" }, entorno.bd)).total).toBe(3);
    esperar((await listarMovimientosStockGeneral(vendedor, { hasta: "2026-11-16" }, entorno.bd)).total).toBe(3);
    esperar((await listarMovimientosStockGeneral(vendedor, { productoId: 999 }, entorno.bd)).total).toBe(0);
    await entorno.bd.update(movimientosStock).set({ fecha: "2026-11-16T18:00:00.000Z" });
    const pagina = await listarMovimientosProducto(vendedor, { productoId: producto.id, pageSize: 2 }, entorno.bd);
    esperar(pagina.total).toBe(4);
    esperar(pagina.data.map((fila) => fila.id)).toEqual([posterior.id, egreso.id]);
  });

  probar.each([{ desde: "2026-02-30" }, { desde: "16/11/2026" }, { desde: "2026-11-17", hasta: "2026-11-16" }, { pageSize: 101 }, { page: 0 }, { tipo: "otro" }])(
    "historial rechaza consulta %j", async (consulta) => {
      await esperar(listarMovimientosStockGeneral(admin, consulta, entorno.bd)).rejects.toHaveProperty("name", "ZodError");
    });

  probar("venta/anulación internas conservan referencia y no admiten ajuste administrativo del vendedor", async () => {
    const producto = await crearProducto(admin, datosProducto({ stockInicial: 2 }), entorno.bd);
    const [factura] = await entorno.bd.insert(facturas).values({ numero: 1233, usuarioId: vendedor.id, total: 1250000, formaPago: "contado" }).returning();
    const venta = await entorno.bd.transaction((transaccion) => moverStock(vendedor, {
      productoId: producto.id, tipo: "venta", cantidad: 1, motivo: "Venta", facturaId: factura.id,
    }, transaccion));
    esperar(venta).toMatchObject({ cantidad: -1, referencia: { facturaId: factura.id, numero: "0001-00001233" } });
    const anulacion = await entorno.bd.transaction((transaccion) => moverStock(admin, {
      productoId: producto.id, tipo: "anulacion", cantidad: 1, motivo: "Anulación", facturaId: factura.id,
    }, transaccion));
    esperar(anulacion).toMatchObject({ cantidad: 1, existenciaResultante: 2, referencia: venta.referencia });
    await esperar(entorno.bd.transaction((transaccion) => moverStock(vendedor, {
      productoId: producto.id, tipo: "ingreso", cantidad: 1, motivo: "Reposición",
    }, transaccion))).rejects.toMatchObject({ codigo: "SIN_PERMISO" });
    await esperar(entorno.bd.transaction((transaccion) => moverStock(admin, {
      productoId: producto.id, tipo: "venta", cantidad: 1, motivo: "Venta", facturaId: 999,
    }, transaccion))).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
  });

  probar("referencias inexistentes responden NO_ENCONTRADO y no se insertan productos", async () => {
    await esperar(crearProducto(admin, datosProducto({ categoriaId: 999 }), entorno.bd)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await esperar(actualizarCategoria(admin, { id: 999, cambios: { nombre: "Inexistente" } }, entorno.bd)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await esperar(actualizarProducto(admin, { id: 999, cambios: { activo: false } }, entorno.bd)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await esperar(obtenerProductoPorId(admin, { id: 999 }, entorno.bd)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await esperar(listarMovimientosProducto(admin, { productoId: 999 }, entorno.bd)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await esperar(ajustar(999, "ingreso", 1)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    esperar(await entorno.bd.select().from(productos)).toHaveLength(0);
  });

  probar("dos conexiones compiten por la última unidad sin stock negativo ni movimientos huérfanos", async () => {
    const carpeta = await crearDirectorioTemporal(unirRuta(process.cwd(), ".prueba-stock-"));
    try {
      // El proceso separado libera los archivos nativos de SQLite antes de borrarlos en Windows.
      const rutaPrueba = unirRuta(carpeta, "concurrencia.ts");
      await escribirArchivo(rutaPrueba, `
        import verificar from "node:assert/strict";
        import { fileURLToPath as rutaDesdeUrl } from "node:url";
        import { migrate as migrar } from "drizzle-orm/libsql/migrator";
        import { crearConexionBaseDatos } from "../src/base-de-datos/conexion.ts";
        import { usuarios } from "../src/base-de-datos/esquema.ts";
        import { crearCategoria } from "../src/servicios/servicio-categorias.ts";
        import { crearProducto, obtenerProductoPorId } from "../src/servicios/servicio-productos.ts";
        import { registrarMovimientoManual, listarMovimientosProducto } from "../src/servicios/servicio-stock.ts";
        const url = new URL("stock.db", import.meta.url).href;
        const primera = crearConexionBaseDatos({ url });
        const segunda = crearConexionBaseDatos({ url });
        try {
          await migrar(primera.bd, { migrationsFolder: rutaDesdeUrl(new URL("../src/base-de-datos/migraciones", import.meta.url)) });
          const [operador] = await primera.bd.insert(usuarios).values({ nombre: "Admin", email: "admin@concurrencia.test", rol: "admin", contrasenaHash: "sin-login" }).returning();
          const categoria = await crearCategoria(operador, { nombre: "Prueba" }, primera.bd);
          const producto = await crearProducto(operador, { codigo: "UNICO", descripcion: "Última unidad", categoriaId: categoria.id, precio: 100, stockMinimo: 0, stockInicial: 1 }, primera.bd);
          const entrada = { productoId: producto.id, movimiento: { tipo: "egreso", cantidad: 1, motivo: "Rotura" } };
          const resultados = await Promise.allSettled([
            registrarMovimientoManual(operador, entrada, primera.bd), registrarMovimientoManual(operador, entrada, segunda.bd),
          ]);
          verificar.equal(resultados.filter((resultado) => resultado.status === "fulfilled").length, 1);
          const rechazo = resultados.find((resultado) => resultado.status === "rejected");
          verificar.equal(rechazo?.reason.codigo, "STOCK_INSUFICIENTE");
          verificar.equal((await obtenerProductoPorId(operador, { id: producto.id }, primera.bd)).existencia, 0);
          verificar.deepEqual((await listarMovimientosProducto(operador, { productoId: producto.id }, primera.bd)).data.map((fila) => fila.cantidad), [-1, 1]);
        } finally { primera.cliente.close(); segunda.cliente.close(); }
      `);
      await convertirEnPromesa(ejecutarArchivo)(process.execPath, ["--import", "tsx", rutaPrueba], { timeout: 15000 });
    } finally {
      await eliminar(carpeta, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  }, 20000);
});

function expectativaCodigo(codigo: string) {
  return esperar.objectContaining({ codigo });
}
