import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { crearAlmacenCookiesPrueba, crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

const estado = vi.hoisted(() => ({ entorno: null as BaseDatosPrueba | null, cookies: null as ReturnType<typeof crearAlmacenCookiesPrueba> | null }));
vi.mock("@/base-de-datos/conexion", () => ({ get bd() { if (!estado.entorno) throw new Error("Falta inicializar la prueba"); return estado.entorno.bd; } }));
vi.mock("next/headers", () => ({ cookies: async () => estado.cookies }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath as revalidarRuta } from "next/cache";
import { establecerCookieSesion } from "@/utilidades/sesion";
import { accionAnularFactura } from "@/app/(sistema)/ventas/acciones";
import { crearCategoria } from "@/servicios/servicio-categorias";
import { crearProducto, obtenerProductoPorId } from "@/servicios/servicio-productos";
import { crearCliente, obtenerClientePorId } from "@/servicios/servicio-clientes";
import { confirmarFactura, obtenerFacturaPorId } from "@/servicios/servicio-facturas";

describir("Anulación desde Server Action con sesión y servicios reales", () => {
  let admin: UsuarioAutenticado;
  let vendedor: UsuarioAutenticado;
  let productoId: number;
  let clienteId: number;
  let facturaId: number;
  antesDeCadaPrueba(async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-para-pruebas-t10-de-acciones-facturas");
    estado.entorno = await crearBaseDatosPrueba();
    estado.cookies = crearAlmacenCookiesPrueba();
    [admin, vendedor] = await estado.entorno.bd.insert(usuarios).values([
      { nombre: "Laura", email: "admin@facturas.test", rol: "admin", contrasenaHash: "no-utilizada" },
      { nombre: "Pablo", email: "vendedor@facturas.test", rol: "vendedor", contrasenaHash: "no-utilizada" },
    ]).returning();
    const categoria = await crearCategoria(admin, { nombre: "Herramientas" });
    productoId = (await crearProducto(admin, { codigo: "T10-01", descripcion: "Martillo", categoriaId: categoria.id, precio: 101, stockMinimo: 1, stockInicial: 2 })).id;
    clienteId = (await crearCliente(admin, { nombre: "Mariana", tipoDoc: "DNI", nroDoc: "28000101", cuentaCorriente: true })).id;
    facturaId = (await confirmarFactura(vendedor, { clienteId, items: [{ productoId, cantidad: 1 }], pago: { forma: "cuenta_corriente" } })).id;
    vi.mocked(revalidarRuta).mockClear();
  });
  despuesDeCadaPrueba(() => { estado.entorno?.cerrar(); estado.entorno = null; });

  probar("sin sesión no anula ni revalida", async () => {
    esperar(await accionAnularFactura({ id: facturaId, motivo: "Error" })).toMatchObject({ ok: false, error: { code: "NO_AUTENTICADO" } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
    esperar((await obtenerFacturaPorId(vendedor, { id: facturaId })).estado).toBe("emitida");
  });
  probar("vendedor recibe SIN_PERMISO y no cambia stock ni saldo", async () => {
    await establecerCookieSesion(vendedor.id);
    esperar(await accionAnularFactura({ id: facturaId, motivo: "Error" })).toMatchObject({ ok: false, error: { code: "SIN_PERMISO" } });
    esperar((await obtenerProductoPorId(vendedor, { id: productoId })).existencia).toBe(1);
    esperar((await obtenerClientePorId(vendedor, { id: clienteId })).saldo).toBe(101);
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });
  probar("valida motivo en servidor y conserva la factura", async () => {
    await establecerCookieSesion(admin.id);
    esperar(await accionAnularFactura({ id: facturaId, motivo: "  " })).toMatchObject({ ok: false, error: { code: "VALIDACION", details: [{ campo: "motivo" }] } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });
  probar("anula una sola vez, devuelve el comprobante y revalida stock, cliente y navegación", async () => {
    await establecerCookieSesion(admin.id);
    esperar(await accionAnularFactura({ id: facturaId, motivo: "  Error de cantidad  " })).toMatchObject({ ok: true, datos: { id: facturaId, estado: "anulada", anulacion: { motivo: "Error de cantidad", usuario: { id: admin.id } } } });
    esperar((await obtenerProductoPorId(admin, { id: productoId })).existencia).toBe(2);
    esperar((await obtenerClientePorId(admin, { id: clienteId })).saldo).toBe(0);
    for (const ruta of ["/ventas", `/ventas/${facturaId}`, "/productos", "/clientes", `/clientes/${clienteId}`, "/clientes/saldos"]) esperar(revalidarRuta).toHaveBeenCalledWith(ruta);
    esperar(revalidarRuta).toHaveBeenCalledWith("/", "layout");
    vi.mocked(revalidarRuta).mockClear();
    esperar(await accionAnularFactura({ id: facturaId, motivo: "Repetida" })).toMatchObject({ ok: false, error: { code: "FACTURA_ANULADA" } });
    esperar((await obtenerProductoPorId(admin, { id: productoId })).existencia).toBe(2);
    esperar((await obtenerClientePorId(admin, { id: clienteId })).saldo).toBe(0);
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });
  probar("un cambio de rol o una baja se aplican con la misma cookie", async () => {
    await establecerCookieSesion(admin.id);
    await estado.entorno!.bd.update(usuarios).set({ rol: "vendedor" }).where(igual(usuarios.id, admin.id));
    esperar(await accionAnularFactura({ id: facturaId, motivo: "Error" })).toMatchObject({ ok: false, error: { code: "SIN_PERMISO" } });
    await estado.entorno!.bd.update(usuarios).set({ activo: false }).where(igual(usuarios.id, admin.id));
    esperar(await accionAnularFactura({ id: facturaId, motivo: "Error" })).toMatchObject({ ok: false, error: { code: "NO_AUTENTICADO" } });
    esperar(revalidarRuta).not.toHaveBeenCalled();
  });
});
