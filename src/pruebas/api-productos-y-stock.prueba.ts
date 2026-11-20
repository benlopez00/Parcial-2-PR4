import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { crearAlmacenCookiesPrueba, crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";
import type { ManejadorRuta } from "@/utilidades/envoltorio-ruta";

const estadoPrueba = vi.hoisted(() => ({
  entorno: null as BaseDatosPrueba | null,
  cookies: null as ReturnType<typeof crearAlmacenCookiesPrueba> | null,
}));
vi.mock("@/base-de-datos/conexion", () => ({
  get bd() {
    if (!estadoPrueba.entorno) throw new Error("Falta inicializar la base de prueba.");
    return estadoPrueba.entorno.bd;
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => estadoPrueba.cookies }));

import { GET as consultarCategorias, POST as altaCategoria } from "@/app/api/categorias/route";
import { PATCH as editarCategoria } from "@/app/api/categorias/[id]/route";
import { GET as consultarProductos, POST as altaProducto } from "@/app/api/productos/route";
import { GET as consultarProducto, PATCH as editarProducto } from "@/app/api/productos/[id]/route";
import { GET as consultarHistorial, POST as altaMovimiento } from "@/app/api/productos/[id]/movimientos/route";
import { GET as consultarMovimientos } from "@/app/api/movimientos-stock/route";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { crearProducto } from "@/servicios/servicio-productos";
import { establecerCookieSesion } from "@/utilidades/sesion";

describir("Contratos HTTP de categorías, productos y stock", () => {
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let categoriaId: number;
  let productoId: number;

  function basePrueba() {
    if (!estadoPrueba.entorno) throw new Error("Falta inicializar la base de prueba.");
    return estadoPrueba.entorno.bd;
  }
  function datosProducto(cambios: Record<string, unknown> = {}) {
    return { codigo: "HE-002", descripcion: "Pinza", categoriaId, precio: 120000, stockMinimo: 2, ...cambios };
  }
  async function iniciarComo(usuario: UsuarioAutenticado) {
    await establecerCookieSesion(usuario.id);
  }
  function solicitar(manejador: ManejadorRuta, metodo: string, ruta: string, cuerpo?: unknown, id = productoId) {
    return manejador(new Request(`http://localhost${ruta}`, {
      method: metodo,
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo), headers: { "Content-Type": "application/json" } }),
    }), { params: Promise.resolve({ id: String(id) }) });
  }
  async function comprobarError(respuesta: Response, estado: number, codigo: string) {
    esperar(respuesta.status).toBe(estado);
    esperar(respuesta.headers.get("content-type")).toContain("application/json");
    const cuerpo = await respuesta.json();
    esperar(cuerpo).toMatchObject({ error: { code: codigo, message: esperar.any(String) } });
    return cuerpo;
  }

  antesDeCadaPrueba(async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-largo-de-pruebas-http-de-productos-y-stock");
    estadoPrueba.entorno = await crearBaseDatosPrueba();
    estadoPrueba.cookies = crearAlmacenCookiesPrueba();
    [admin, vendedor] = await basePrueba().insert(usuarios).values([
      { nombre: "Admin", email: "admin@api.test", rol: "admin", contrasenaHash: "no-usado" },
      { nombre: "Vendedor", email: "vendedor@api.test", rol: "vendedor", contrasenaHash: "no-usado" },
    ]).returning();
    categoriaId = (await crearCategoria(admin, { nombre: "Herramientas" })).id;
    productoId = (await crearProducto(admin, datosProducto({ codigo: "HE-001", stockInicial: 3 }))).id;
  });
  despuesDeCadaPrueba(() => {
    estadoPrueba.entorno?.cerrar();
    estadoPrueba.entorno = null;
    estadoPrueba.cookies = null;
  });

  const endpoints: [string, ManejadorRuta, string, string][] = [
    ["listar categorías", consultarCategorias, "GET", "/api/categorias"],
    ["crear categoría", altaCategoria, "POST", "/api/categorias"],
    ["editar categoría", editarCategoria, "PATCH", "/api/categorias/1"],
    ["listar productos", consultarProductos, "GET", "/api/productos"],
    ["crear producto", altaProducto, "POST", "/api/productos"],
    ["obtener producto", consultarProducto, "GET", "/api/productos/1"],
    ["editar producto", editarProducto, "PATCH", "/api/productos/1"],
    ["historial producto", consultarHistorial, "GET", "/api/productos/1/movimientos"],
    ["crear movimiento", altaMovimiento, "POST", "/api/productos/1/movimientos"],
    ["historial general", consultarMovimientos, "GET", "/api/movimientos-stock"],
  ];
  probar.each(endpoints)("%s exige sesión antes de leer el cuerpo", async (_nombre, manejador, metodo, ruta) => {
    await comprobarError(await solicitar(manejador, metodo, ruta), 401, "NO_AUTENTICADO");
  });

  probar.each([
    ["categoría nueva", altaCategoria, "POST", { nombre: "Otra" }],
    ["edición categoría", editarCategoria, "PATCH", { nombre: "Otra" }],
    ["producto nuevo", altaProducto, "POST", null],
    ["edición producto", editarProducto, "PATCH", { descripcion: "Otra" }],
    ["movimiento", altaMovimiento, "POST", { tipo: "ingreso", cantidad: 1, motivo: "Reposición" }],
  ] as const)("vendedor recibe 403 en %s con entrada válida", async (_nombre, manejador, metodo, cuerpo) => {
    await iniciarComo(vendedor);
    await comprobarError(await solicitar(manejador, metodo, "/api/prueba", cuerpo ?? datosProducto(), categoriaId), 403, "SIN_PERMISO");
  });

  probar("admin utiliza los diez endpoints con sus estados y contratos públicos", async () => {
    await iniciarComo(admin);
    const categoria = await solicitar(altaCategoria, "POST", "/api/categorias", { nombre: "Pinturas" });
    esperar(categoria.status).toBe(201);
    const categoriaNueva = await categoria.json();
    esperar(categoriaNueva).toEqual({ id: categoriaNueva.id, nombre: "Pinturas", activa: true });
    esperar((await solicitar(editarCategoria, "PATCH", "/api/categorias/2", { nombre: "Pinturería" }, categoriaNueva.id)).status).toBe(200);
    const categoriasPublicas = await (await solicitar(consultarCategorias, "GET", "/api/categorias")).json();
    esperar(categoriasPublicas).toHaveLength(2);
    const alta = await solicitar(altaProducto, "POST", "/api/productos", datosProducto({ stockInicial: 8 }));
    esperar(alta.status).toBe(201);
    const producto = await alta.json();
    esperar(producto).toMatchObject({ codigo: "HE-002", existencia: 8, bajoMinimo: false, categoria: { id: categoriaId } });
    esperar(Object.keys(producto).sort()).toEqual(["id", "codigo", "descripcion", "categoria", "precio", "existencia", "stockMinimo", "bajoMinimo", "activo"].sort());
    const edicion = await solicitar(editarProducto, "PATCH", "/api/productos/2", { descripcion: "Pinza grande" }, producto.id);
    esperar(edicion.status).toBe(200);
    const individual = await solicitar(consultarProducto, "GET", "/api/productos/2", undefined, producto.id);
    esperar(individual.status).toBe(200);
    esperar((await individual.json()).descripcion).toBe("Pinza grande");
    const listado = await solicitar(consultarProductos, "GET", "/api/productos?q=grande&pageSize=1");
    esperar(listado.status).toBe(200);
    esperar(await listado.json()).toMatchObject({ page: 1, pageSize: 1, total: 1 });
    esperar(listado.headers.get("cache-control")).toBe("no-store");
    const movimiento = await solicitar(altaMovimiento, "POST", "/api/productos/2/movimientos", { tipo: "egreso", cantidad: 2, motivo: "Uso interno" }, producto.id);
    esperar(movimiento.status).toBe(201);
    esperar(await movimiento.json()).toMatchObject({ tipo: "egreso", cantidad: -2, existenciaResultante: 6, referencia: null, usuario: { id: admin.id } });
    const historial = await solicitar(consultarHistorial, "GET", "/api/productos/2/movimientos?pageSize=1", undefined, producto.id);
    esperar(historial.status).toBe(200);
    esperar(await historial.json()).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    const general = await solicitar(consultarMovimientos, "GET", `/api/movimientos-stock?productoId=${producto.id}&tipo=egreso`);
    esperar(general.status).toBe(200);
    esperar(await general.json()).toMatchObject({ total: 1 });
  });

  probar("vendedor accede a las cinco consultas sin privilegios de escritura", async () => {
    await iniciarComo(vendedor);
    for (const [_nombre, manejador, metodo, ruta] of endpoints.filter((entrada) => entrada[2] === "GET")) {
      esperar((await solicitar(manejador, metodo, ruta)).status).toBe(200);
    }
    await comprobarError(await solicitar(consultarProductos, "GET", "/api/productos?activo=todos"), 403, "SIN_PERMISO");
  });

  probar.each([{ existencia: 100 }, { stockInicial: 1 }, {}, { activo: "false" }, { id: 999 }])("PATCH rechaza %j con detalles por campo", async (cuerpo) => {
    await iniciarComo(admin);
    const resultado = await comprobarError(await solicitar(editarProducto, "PATCH", "/api/productos/1", cuerpo), 422, "VALIDACION");
    esperar(resultado.error.details).toEqual(esperar.arrayContaining([esperar.objectContaining({ campo: esperar.any(String), mensaje: esperar.any(String) })]));
    esperar((await (await solicitar(consultarProducto, "GET", "/api/productos/1")).json()).existencia).toBe(3);
  });

  probar("rechaza existencia en alta, motivos incompatibles y cuerpo que pretende reemplazar el producto", async () => {
    await iniciarComo(admin);
    await comprobarError(await solicitar(altaProducto, "POST", "/api/productos", datosProducto({ existencia: 100 })), 422, "VALIDACION");
    await comprobarError(await solicitar(altaMovimiento, "POST", "/api/productos/1/movimientos", { tipo: "egreso", cantidad: 1, motivo: "Reposición" }), 422, "VALIDACION");
    await comprobarError(await solicitar(altaMovimiento, "POST", "/api/productos/1/movimientos", { tipo: "ingreso", cantidad: 1, motivo: "Reposición", productoId: 999 }), 422, "VALIDACION");
  });

  probar("errores 409 normalizados para código, nombre, categoría en uso y stock insuficiente", async () => {
    await iniciarComo(admin);
    await comprobarError(await solicitar(altaProducto, "POST", "/api/productos", datosProducto({ codigo: "HE-001" })), 409, "CODIGO_DUPLICADO");
    await comprobarError(await solicitar(altaCategoria, "POST", "/api/categorias", { nombre: "Herramientas" }), 409, "NOMBRE_DUPLICADO");
    await comprobarError(await solicitar(editarCategoria, "PATCH", "/api/categorias/1", { activa: false }, categoriaId), 409, "CATEGORIA_EN_USO");
    const respuesta = await comprobarError(await solicitar(altaMovimiento, "POST", "/api/productos/1/movimientos", { tipo: "egreso", cantidad: 4, motivo: "Rotura" }), 409, "STOCK_INSUFICIENTE");
    esperar(respuesta.error.details).toMatchObject({ productoId, solicitado: 4, disponible: 3 });
    esperar((await (await solicitar(consultarHistorial, "GET", "/api/productos/1/movimientos")).json()).total).toBe(1);
  });

  probar("identificadores y filtros inválidos devuelven 422; recurso ausente devuelve 404", async () => {
    await iniciarComo(admin);
    await comprobarError(await consultarProducto(new Request("http://localhost/api/productos/error"), { params: Promise.resolve({ id: "error" }) }), 422, "VALIDACION");
    await comprobarError(await solicitar(consultarProductos, "GET", "/api/productos?pageSize=101"), 422, "VALIDACION");
    await comprobarError(await solicitar(consultarMovimientos, "GET", "/api/movimientos-stock?desde=2026-02-30"), 422, "VALIDACION");
    await comprobarError(await solicitar(consultarProducto, "GET", "/api/productos/999", undefined, 999), 404, "NO_ENCONTRADO");
    await comprobarError(await solicitar(consultarHistorial, "GET", "/api/productos/999/movimientos", undefined, 999), 404, "NO_ENCONTRADO");
  });

  probar("JSON inválido devuelve 400 y la cookie inválida o usuario desactivado devuelve 401", async () => {
    await iniciarComo(admin);
    const respuesta = await altaProducto(new Request("http://localhost/api/productos", { method: "POST", body: "{invalido" }), { params: Promise.resolve({}) });
    await comprobarError(respuesta, 400, "JSON_INVALIDO");
    estadoPrueba.cookies?.set("sesion", "firma-invalida");
    await comprobarError(await solicitar(consultarProductos, "GET", "/api/productos"), 401, "NO_AUTENTICADO");
    await iniciarComo(admin);
    await basePrueba().update(usuarios).set({ activo: false }).where(igual(usuarios.id, admin.id));
    await comprobarError(await solicitar(consultarProductos, "GET", "/api/productos"), 401, "NO_AUTENTICADO");
  });

  probar("el cambio de rol en BD aplica inmediatamente sobre la misma cookie", async () => {
    await iniciarComo(admin);
    await basePrueba().update(usuarios).set({ rol: "vendedor" }).where(igual(usuarios.id, admin.id));
    await comprobarError(await solicitar(altaProducto, "POST", "/api/productos", datosProducto()), 403, "SIN_PERMISO");
  });

  probar("fallo inesperado devuelve 500 sin filtrar detalles y revierte la operación", async () => {
    await iniciarComo(admin);
    const registroError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await estadoPrueba.entorno?.cliente.execute("CREATE TRIGGER fallo_stock BEFORE INSERT ON movimientos_stock BEGIN SELECT RAISE(ABORT, 'detalle-interno-reservado'); END");
    const respuesta = await solicitar(altaMovimiento, "POST", "/api/productos/1/movimientos", { tipo: "ingreso", cantidad: 1, motivo: "Reposición" });
    const cuerpo = await comprobarError(respuesta, 500, "ERROR_INTERNO");
    esperar(JSON.stringify(cuerpo)).not.toContain("detalle-interno-reservado");
    esperar(registroError).toHaveBeenCalledOnce();
    esperar((await (await solicitar(consultarProducto, "GET", "/api/productos/1")).json()).existencia).toBe(3);
  });
});
