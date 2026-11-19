import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { eq as igual } from "drizzle-orm";
import { usuarios } from "@/base-de-datos/esquema";
import { crearAlmacenCookiesPrueba, crearBaseDatosPrueba, type BaseDatosPrueba } from "./ayudantes-prueba";

const estado = vi.hoisted(() => ({ entorno: null as BaseDatosPrueba | null, cookies: null as ReturnType<typeof crearAlmacenCookiesPrueba> | null }));
vi.mock("@/base-de-datos/conexion", () => ({ get bd() { if (!estado.entorno) throw new Error("Falta base de prueba"); return estado.entorno.bd; } }));
vi.mock("next/headers", () => ({ cookies: async () => estado.cookies }));

import { GET } from "@/app/api/tablero/route";
import { establecerCookieSesion } from "@/utilidades/sesion";

describir("GET /api/tablero con sesión y servicio real", () => {
  let adminId: number;
  let vendedorId: number;
  antesDeCadaPrueba(async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-largo-para-tablero-api");
    estado.entorno = await crearBaseDatosPrueba();
    estado.cookies = crearAlmacenCookiesPrueba();
    const creados = await estado.entorno.bd.insert(usuarios).values([
      { nombre: "Laura", email: "admin@tablero.test", rol: "admin", contrasenaHash: "privado" },
      { nombre: "Pablo", email: "vendedor@tablero.test", rol: "vendedor", contrasenaHash: "privado" },
    ]).returning();
    adminId = creados[0].id; vendedorId = creados[1].id;
  });
  despuesDeCadaPrueba(() => { estado.entorno?.cerrar(); estado.entorno = null; });
  const consultar = (consulta = "") => GET(new Request(`http://localhost/api/tablero${consulta}`), { params: Promise.resolve({}) });

  probar("sin cookie responde 401 incluso con consulta inválida", async () => {
    const respuesta = await consultar("?extra=1");
    esperar(respuesta.status).toBe(401);
    esperar(await respuesta.json()).toMatchObject({ error: { code: "NO_AUTENTICADO" } });
  });
  probar.each(["admin", "vendedor"])("%s recibe el contrato exacto sin datos privados", async (rol) => {
    await establecerCookieSesion(rol === "admin" ? adminId : vendedorId);
    const respuesta = await consultar();
    esperar(respuesta.status).toBe(200);
    const datos = await respuesta.json();
    esperar(Object.keys(datos).sort()).toEqual(["bajoMinimo", "cuentasCorrientes", "hoy", "masVendidos", "mes", "porFormaDePago", "ventasDiarias"]);
    esperar(datos.ventasDiarias).toHaveLength(30);
    esperar(datos.porFormaDePago).toHaveLength(3);
    esperar(datos.mes).toEqual({ cantidad: 0, importe: 0, ticketPromedio: 0 });
    esperar(JSON.stringify(datos)).not.toMatch(/contrasenaHash|email|reposicion/);
  });
  probar("no acepta parámetros para alterar el tablero", async () => {
    await establecerCookieSesion(vendedorId);
    const respuesta = await consultar("?estado=anulada");
    esperar(respuesta.status).toBe(422);
    esperar(await respuesta.json()).toMatchObject({ error: { code: "VALIDACION" } });
  });
  probar("una baja de usuario invalida la misma cookie inmediatamente", async () => {
    await establecerCookieSesion(vendedorId);
    esperar((await consultar()).status).toBe(200);
    await estado.entorno!.bd.update(usuarios).set({ activo: false }).where(igual(usuarios.id, vendedorId));
    esperar((await consultar()).status).toBe(401);
  });
});
