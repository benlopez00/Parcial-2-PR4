import {
  afterEach as despuesDeCadaPrueba,
  beforeEach as antesDeCadaPrueba,
  describe as describir,
  expect as esperar,
  it as probar,
  vi,
} from "vitest";
import { eq as igual } from "drizzle-orm";
import { usuarios } from "@/base-de-datos/esquema";
import { CODIGOS_ERROR } from "@/errores/codigos-error";
import {
  crearAlmacenCookiesPrueba,
  crearBaseDatosPrueba,
  crearUsuarioPrueba,
  type BaseDatosPrueba,
} from "./ayudantes-prueba";

const estadoPrueba = vi.hoisted(() => ({
  entorno: null as BaseDatosPrueba | null,
  cookies: null as ReturnType<typeof crearAlmacenCookiesPrueba> | null,
}));

vi.mock("@/base-de-datos/conexion", () => ({
  get bd() {
    if (!estadoPrueba.entorno) {
      throw new Error("Base de datos de prueba no inicializada.");
    }
    return estadoPrueba.entorno.bd;
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (!estadoPrueba.cookies) {
      throw new Error("Almacén de cookies de prueba no inicializado.");
    }
    return estadoPrueba.cookies;
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { POST as postLogin } from "@/app/api/auth/login/route";
import { POST as postLogout } from "@/app/api/auth/logout/route";
import { GET as getMe } from "@/app/api/auth/me/route";
import { PUT as putPassword } from "@/app/api/auth/password/route";
import { GET as getUsuarios, POST as postUsuarios } from "@/app/api/usuarios/route";
import { PATCH as patchUsuario } from "@/app/api/usuarios/[id]/route";
import { POST as postResetPassword } from "@/app/api/usuarios/[id]/reset-password/route";
import { iniciarSesionAccion } from "@/app/login/acciones";
import { cerrarSesionAccion } from "@/app/(sistema)/acciones";
import { cambiarContrasenaPropiaAccion } from "@/app/(sistema)/perfil/acciones";
import {
  actualizarUsuarioAccion,
  crearUsuarioAccion,
  restablecerContrasenaUsuarioAccion,
} from "@/app/(sistema)/usuarios/acciones";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";
import {
  DURACION_SESION_SEGUNDOS,
  NOMBRE_COOKIE_SESION,
  establecerCookieSesion,
  firmarSesion,
  obtenerUsuarioActual,
  verificarSesion,
} from "@/utilidades/sesion";

function contextoVacio() {
  return { params: Promise.resolve({}) };
}

function contextoConId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describir("Sesión firmada, cookie httpOnly y adaptadores API / Acciones", () => {
  let adminId: number;
  let vendedorId: number;

  antesDeCadaPrueba(async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-de-prueba-muy-largo-y-seguro-para-vitest");
    estadoPrueba.cookies = crearAlmacenCookiesPrueba();
    estadoPrueba.entorno = await crearBaseDatosPrueba();

    const admin = await crearUsuarioPrueba(estadoPrueba.entorno.bd, {
      nombre: "Laura Méndez",
      email: "laura@ferreteria.test",
      password: "ClaveAdmin123!",
      rol: "admin",
    });
    const vendedor = await crearUsuarioPrueba(estadoPrueba.entorno.bd, {
      nombre: "Pablo Ruiz",
      email: "pablo@ferreteria.test",
      password: "ClaveVendedor123!",
      rol: "vendedor",
    });
    adminId = admin.id;
    vendedorId = vendedor.id;
  });

  despuesDeCadaPrueba(() => {
    estadoPrueba.entorno?.cerrar();
    estadoPrueba.entorno = null;
  });

  probar("firma, verifica tiempo constante, detecta adulteración, expiración y falta de secreto", async () => {
    const token = await firmarSesion(adminId);
    const carga = await verificarSesion(token);
    esperar(carga?.usuarioId).toBe(adminId);
    esperar(carga?.venceEn).toBeGreaterThan(Date.now());

    esperar(await verificarSesion(`${token}x`)).toBeNull();
    esperar(await verificarSesion("sin-punto")).toBeNull();

    const [cargaBase64, firma] = token.split(".");
    const alterado = `${cargaBase64}.${firma.slice(0, -1)}${firma.endsWith("A") ? "B" : "A"}`;
    esperar(await verificarSesion(alterado)).toBeNull();

    vi.useFakeTimers();
    const ahora = Date.now();
    vi.setSystemTime(ahora);
    const tokenTemporal = await firmarSesion(adminId);
    vi.setSystemTime(ahora + (DURACION_SESION_SEGUNDOS + 1) * 1000);
    esperar(await verificarSesion(tokenTemporal)).toBeNull();
    vi.useRealTimers();

    vi.stubEnv("SESSION_SECRET", "");
    await esperar(firmarSesion(adminId)).rejects.toThrow(/SESSION_SECRET/);
  });

  probar("emite cookie con flags de seguridad y rechaza me/logout sin sesión con 401 JSON", async () => {
    const meSinSesion = await getMe(new Request("http://localhost/api/auth/me"), contextoVacio());
    esperar(meSinSesion.status).toBe(401);
    const cuerpo401 = await meSinSesion.json();
    esperar(cuerpo401.error.code).toBe(CODIGOS_ERROR.NO_AUTENTICADO);

    const postSinSesionJsonRoto = await postUsuarios(
      new Request("http://localhost/api/usuarios", {
        method: "POST",
        body: "{json-invalido",
      }),
      contextoVacio(),
    );
    esperar(postSinSesionJsonRoto.status).toBe(401);
    esperar((await postSinSesionJsonRoto.json()).error.code).toBe(CODIGOS_ERROR.NO_AUTENTICADO);

    const resLogin = await postLogin(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "laura@ferreteria.test", password: "ClaveAdmin123!" }),
      }),
      contextoVacio(),
    );
    esperar(resLogin.status).toBe(200);

    const cookieGuardada = estadoPrueba.cookies!.obtenerRegistro(NOMBRE_COOKIE_SESION);
    esperar(cookieGuardada?.value).toBeTruthy();
    esperar(cookieGuardada?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_SESION_SEGUNDOS,
    });

    const resLogout = await postLogout(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
      contextoVacio(),
    );
    esperar(resLogout.status).toBe(204);
    esperar(estadoPrueba.cookies!.obtenerRegistro(NOMBRE_COOKIE_SESION)?.options?.maxAge).toBe(0);
  });

  probar("aplica inmediatamente en el próximo pedido la desactivación o cambio de rol sobre la misma cookie", async () => {
    await establecerCookieSesion(adminId);

    const meAntes = await getMe(new Request("http://localhost/api/auth/me"), contextoVacio());
    esperar(meAntes.status).toBe(200);
    esperar(await meAntes.json()).toMatchObject({ id: adminId, rol: "admin" });

    // Cambio de rol a vendedor en la base manteniendo la misma cookie.
    await estadoPrueba.entorno!.bd
      .update(usuarios)
      .set({ rol: "vendedor" })
      .where(igual(usuarios.id, adminId));

    const meDespues = await getMe(new Request("http://localhost/api/auth/me"), contextoVacio());
    esperar(meDespues.status).toBe(200);
    esperar(await meDespues.json()).toMatchObject({ id: adminId, rol: "vendedor" });

    const usuariosTrasDegradacion = await getUsuarios(
      new Request("http://localhost/api/usuarios"),
      contextoVacio(),
    );
    esperar(usuariosTrasDegradacion.status).toBe(403);
    esperar((await usuariosTrasDegradacion.json()).error.code).toBe(CODIGOS_ERROR.SIN_PERMISO);

    // Desactivación en la base manteniendo la misma cookie.
    await estadoPrueba.entorno!.bd
      .update(usuarios)
      .set({ activo: false })
      .where(igual(usuarios.id, adminId));

    const meTrasBaja = await getMe(new Request("http://localhost/api/auth/me"), contextoVacio());
    esperar(meTrasBaja.status).toBe(401);
    esperar((await meTrasBaja.json()).error.code).toBe(CODIGOS_ERROR.NO_AUTENTICADO);
    await esperar(obtenerUsuarioActual()).rejects.toMatchObject({
      estadoHttp: 401,
      codigo: CODIGOS_ERROR.NO_AUTENTICADO,
    });
  });

  probar("atiende rutas REST con 400 JSON_INVALIDO, 422 VALIDACION con detalles, 201/200/204 y 500 seguro", async () => {
    await establecerCookieSesion(adminId);

    const jsonRoto = await postUsuarios(
      new Request("http://localhost/api/usuarios", {
        method: "POST",
        body: "{json-invalido",
      }),
      contextoVacio(),
    );
    esperar(jsonRoto.status).toBe(400);
    esperar((await jsonRoto.json()).error.code).toBe(CODIGOS_ERROR.JSON_INVALIDO);

    const campoExtra = await postUsuarios(
      new Request("http://localhost/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "Carlos",
          email: "carlos@ferreteria.test",
          rol: "vendedor",
          password: "TemporalCarlos1!",
          activo: false,
        }),
      }),
      contextoVacio(),
    );
    esperar(campoExtra.status).toBe(422);
    const cuerpoExtra = await campoExtra.json();
    esperar(cuerpoExtra.error.code).toBe(CODIGOS_ERROR.VALIDACION);
    esperar(cuerpoExtra.error.details).toEqual(
      esperar.arrayContaining([esperar.objectContaining({ campo: "activo" })]),
    );

    const patchExtra = await patchUsuario(
      new Request(`http://localhost/api/usuarios/${vendedorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contrasenaHash: "inyectado" }),
      }),
      contextoConId(String(vendedorId)),
    );
    esperar(patchExtra.status).toBe(422);

    const creado = await postUsuarios(
      new Request("http://localhost/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: "Carlos",
          email: "carlos@ferreteria.test",
          rol: "vendedor",
          password: "TemporalCarlos1!",
        }),
      }),
      contextoVacio(),
    );
    esperar(creado.status).toBe(201);
    const usuarioCreado = await creado.json();

    const reset = await postResetPassword(
      new Request(`http://localhost/api/usuarios/${usuarioCreado.id}/reset-password`, {
        method: "POST",
      }),
      contextoConId(String(usuarioCreado.id)),
    );
    esperar(reset.status).toBe(200);
    const cuerpoReset = await reset.json();
    esperar(cuerpoReset.passwordTemporal.length).toBeGreaterThanOrEqual(8);

    const cambioClave = await putPassword(
      new Request("http://localhost/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: "ClaveAdmin123!", nueva: "NuevaClaveAdmin2!" }),
      }),
      contextoVacio(),
    );
    esperar(cambioClave.status).toBe(204);

    // Simula error de infraestructura sin filtrar detalles internos.
    vi.stubEnv("SESSION_SECRET", "");
    const falloInterno = await getMe(new Request("http://localhost/api/auth/me"), contextoVacio());
    esperar(falloInterno.status).toBe(500);
    const textoFallo = await falloInterno.text();
    esperar(textoFallo).toContain(CODIGOS_ERROR.ERROR_INTERNO);
    esperar(textoFallo).not.toContain("SESSION_SECRET");
  });

  probar("respeta contrato ok/datos/error en Server Actions y no atrapa señales de redirección", async () => {
    const loginFallido = await iniciarSesionAccion({
      email: "laura@ferreteria.test",
      password: "incorrecta",
    });
    esperar(loginFallido).toMatchObject({
      ok: false,
      error: { code: CODIGOS_ERROR.CREDENCIALES_INVALIDAS },
    });

    const loginOk = await iniciarSesionAccion({
      email: "laura@ferreteria.test",
      password: "ClaveAdmin123!",
    });
    esperar(loginOk).toMatchObject({
      ok: true,
      datos: { id: adminId, rol: "admin" },
    });

    const confirmacionMala = await cambiarContrasenaPropiaAccion({
      actual: "ClaveAdmin123!",
      nueva: "NuevaClaveAdmin2!",
      confirmacion: "OtraDistinta1!",
    });
    esperar(confirmacionMala).toMatchObject({
      ok: false,
      error: { code: CODIGOS_ERROR.VALIDACION },
    });

    const nuevo = await crearUsuarioAccion({
      nombre: "Sofía Paz",
      email: "sofia@ferreteria.test",
      rol: "vendedor",
      password: "TemporalSofia1!",
    });
    esperar(nuevo.ok).toBe(true);
    if (!nuevo.ok) throw new Error("Debía crear usuario");

    const editado = await actualizarUsuarioAccion({
      id: nuevo.datos.id,
      cambios: { activo: false },
    });
    esperar(editado).toMatchObject({ ok: true, datos: { activo: false } });

    const temporal = await restablecerContrasenaUsuarioAccion({ id: nuevo.datos.id });
    esperar(temporal.ok).toBe(true);

    // Simula desactivar al usuario conectado y verificar que la acción siguiente falla con 401.
    await estadoPrueba.entorno!.bd
      .update(usuarios)
      .set({ activo: false })
      .where(igual(usuarios.id, adminId));
    const bloqueado = await crearUsuarioAccion({
      nombre: "X",
      email: "x@ferreteria.test",
      rol: "vendedor",
      password: "TemporalX123!",
    });
    esperar(bloqueado).toMatchObject({
      ok: false,
      error: { code: CODIGOS_ERROR.NO_AUTENTICADO },
    });

    // Restablece estado para probar cierre de sesión.
    await estadoPrueba.entorno!.bd
      .update(usuarios)
      .set({ activo: true })
      .where(igual(usuarios.id, adminId));
    const salida = await cerrarSesionAccion({});
    esperar(salida).toEqual({ ok: true, datos: null });

    const accionConRedireccion = envoltorioAccion(
      async () => {
        const errorRedireccion = new Error("NEXT_REDIRECT") as Error & { digest: string };
        errorRedireccion.digest = "NEXT_REDIRECT;replace;/login;307;";
        throw errorRedireccion;
      },
      { requiereSesion: false },
    );
    await esperar(accionConRedireccion({})).rejects.toThrow("NEXT_REDIRECT");
  });
});
