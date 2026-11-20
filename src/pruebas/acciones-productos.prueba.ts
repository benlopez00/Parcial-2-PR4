import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { usuarios } from "@/base-de-datos/esquema";
import { crearAlmacenCookiesPrueba, crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

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
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath as revalidarRuta } from "next/cache";
import { establecerCookieSesion } from "@/utilidades/sesion";
import { crearProductoAccion, actualizarProductoAccion, registrarMovimientoStockAccion, crearCategoriaAccion,
  actualizarCategoriaAccion, buscarOpcionesProductosAccion } from "@/app/(sistema)/productos/acciones";

describir("Acciones de productos integradas con sesión y servicios reales", () => {
  let administradorId: number;
  antesDeCadaPrueba(async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-largo-para-acciones-productos");
    estadoPrueba.entorno = await crearBaseDatosPrueba();
    estadoPrueba.cookies = crearAlmacenCookiesPrueba();
    const [administrador] = await estadoPrueba.entorno.bd.insert(usuarios).values({ nombre: "Administradora", email: "admin@productos.test", rol: "admin", contrasenaHash: "no-utilizada" }).returning();
    administradorId = administrador.id;
    vi.mocked(revalidarRuta).mockClear();
  });
  despuesDeCadaPrueba(() => { estadoPrueba.entorno?.cerrar(); estadoPrueba.entorno = null; });

  async function crearProductoDesdeAccion(stockInicial = 2) {
    const categoria = await crearCategoriaAccion({ nombre: "Herramientas" });
    if (!categoria.ok) throw new Error("Debe crear la categoría.");
    const producto = await crearProductoAccion({ codigo: "HE-01", descripcion: "Martillo", categoriaId: categoria.datos.id, precio: 1250000, stockMinimo: 3, stockInicial });
    if (!producto.ok) throw new Error("Debe crear el producto.");
    return producto.datos;
  }

  probar("sin sesión no escribe ni revalida", async () => {
    esperar(await crearProductoAccion({})).toMatchObject({ ok: false, error: { code: "NO_AUTENTICADO" } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });

  probar("alta, edición, movimiento y baja devuelven contratos y revalidan navegación y ficha", async () => {
    await establecerCookieSesion(administradorId);
    const producto = await crearProductoDesdeAccion();
    esperar(producto.existencia).toBe(2);
    esperar(revalidarRuta).toHaveBeenCalledWith("/productos/categorias");
    esperar(revalidarRuta).toHaveBeenCalledWith("/", "layout");
    vi.mocked(revalidarRuta).mockClear();
    esperar(await actualizarProductoAccion({ id: producto.id, cambios: { precio: 101 } })).toMatchObject({ ok: true, datos: { precio: 101 } });
    esperar(revalidarRuta).toHaveBeenCalledWith(`/productos/${producto.id}`);
    const movimiento = await registrarMovimientoStockAccion({ productoId: producto.id, movimiento: { tipo: "egreso", cantidad: 1, motivo: "Rotura", observacion: "Depósito" } });
    esperar(movimiento).toMatchObject({ ok: true, datos: { cantidad: -1, existenciaResultante: 1 } });
    esperar(await actualizarProductoAccion({ id: producto.id, cambios: { activo: false } })).toMatchObject({ ok: true, datos: { activo: false } });
  });

  probar("los errores de negocio/validación conservan su código sin revalidaciones de éxito", async () => {
    await establecerCookieSesion(administradorId);
    const producto = await crearProductoDesdeAccion();
    vi.mocked(revalidarRuta).mockClear();
    esperar(await registrarMovimientoStockAccion({ productoId: producto.id, movimiento: { tipo: "egreso", cantidad: 3, motivo: "Rotura" } })).toMatchObject({ ok: false, error: { code: "STOCK_INSUFICIENTE", details: { solicitado: 3, disponible: 2 } } });
    esperar(await actualizarProductoAccion({ id: producto.id, cambios: { existencia: 9 } })).toMatchObject({ ok: false, error: { code: "VALIDACION" } });
    esperar(await actualizarCategoriaAccion({ id: producto.categoria.id, cambios: { activa: false } })).toMatchObject({ ok: false, error: { code: "CATEGORIA_EN_USO" } });
    esperar(await crearCategoriaAccion({ nombre: "Herramientas" })).toMatchObject({ ok: false, error: { code: "NOMBRE_DUPLICADO" } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });

  probar("renombrar/activar/desactivar categorías invalida las vistas necesarias", async () => {
    await establecerCookieSesion(administradorId);
    const categoria = await crearCategoriaAccion({ nombre: "Temporada" });
    if (!categoria.ok) throw new Error("Debe crear categoría.");
    esperar(await actualizarCategoriaAccion({ id: categoria.datos.id, cambios: { nombre: "Jardín", activa: false } })).toMatchObject({ ok: true, datos: { nombre: "Jardín", activa: false } });
    esperar(revalidarRuta).toHaveBeenCalledWith("/productos/[id]", "page");
    esperar(await actualizarCategoriaAccion({ id: categoria.datos.id, cambios: { activa: true } })).toMatchObject({ ok: true, datos: { activa: true } });
  });

  probar("la misma cookie pierde permisos inmediatamente y la búsqueda histórica no revalida", async () => {
    await establecerCookieSesion(administradorId);
    await crearProductoDesdeAccion();
    await estadoPrueba.entorno!.bd.update(usuarios).set({ rol: "vendedor" }).where(igual(usuarios.id, administradorId));
    vi.mocked(revalidarRuta).mockClear();
    esperar(await crearCategoriaAccion({ nombre: "Prohibida" })).toMatchObject({ ok: false, error: { code: "SIN_PERMISO" } });
    esperar(await buscarOpcionesProductosAccion({ uso: "movimiento" })).toMatchObject({ ok: false, error: { code: "SIN_PERMISO" } });
    esperar(await buscarOpcionesProductosAccion({ uso: "historial", q: "Martillo" })).toMatchObject({ ok: true, datos: { total: 1 } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
    await estadoPrueba.entorno!.bd.update(usuarios).set({ activo: false }).where(igual(usuarios.id, administradorId));
    esperar(await buscarOpcionesProductosAccion({ uso: "historial" })).toMatchObject({ ok: false, error: { code: "NO_AUTENTICADO" } });
  });
});
