import { createHmac as crearHmac, randomInt as enteroAleatorioSeguro, timingSafeEqual as compararTiempoConstante } from "node:crypto";
import bcryptjs from "bcryptjs";
import { eq as igual } from "drizzle-orm";
import { cookies as obtenerCookies } from "next/headers";
import { bd, type BaseDatos } from "@/base-de-datos/conexion";
import { usuarios, type UsuarioAutenticado } from "@/base-de-datos/esquema";
import { asegurarSesionValida } from "@/errores/verificadores-negocio";

export const NOMBRE_COOKIE_SESION = "sesion";
export const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;
const COSTO_HASH_BCRYPT = 12;
const CARACTERES_TEMPORAL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LONGITUD_CONTRASENA_TEMPORAL = 12;

// Hash bcrypt válido de costo 12 usado cuando el email no existe para equiparar tiempos de respuesta.
export const HASH_FICTICIO_TIMING = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO1u9uB7x1r7vP2pQ8hF3pY5fV6n5xW5e";

export interface CargaSesion {
  usuarioId: number;
  venceEn: number;
}

function obtenerSecretoSesion(): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.trim().length === 0) {
    throw new Error("La variable de entorno SESSION_SECRET es obligatoria para firmar sesiones.");
  }
  return secreto;
}

function firmarCarga(cargaCodificada: string, secreto: string): string {
  return crearHmac("sha256", secreto).update(cargaCodificada).digest("base64url");
}

// Implementa RF-U1 y RF-U5: genera hash criptográfico con sal mediante bcryptjs.
export async function generarHashContrasena(contrasena: string): Promise<string> {
  return bcryptjs.hash(contrasena, COSTO_HASH_BCRYPT);
}

// Implementa RF-U1 y RF-U5: compara la contraseña contra el hash almacenado sin descifrarlo.
export async function verificarContrasena(contrasena: string, contrasenaHash: string): Promise<boolean> {
  return bcryptjs.compare(contrasena, contrasenaHash);
}

// Implementa RF-U5: genera una contraseña temporal aleatoria usando entropía criptográfica de Node.
export function generarContrasenaTemporal(): string {
  let resultado = "";
  for (let indice = 0; indice < LONGITUD_CONTRASENA_TEMPORAL; indice += 1) {
    resultado += CARACTERES_TEMPORAL[enteroAleatorioSeguro(CARACTERES_TEMPORAL.length)];
  }
  return resultado;
}

// Implementa RF-U1: firma el identificador y vencimiento de la sesión con HMAC-SHA-256.
export async function firmarSesion(usuarioId: number): Promise<string> {
  const secreto = obtenerSecretoSesion();
  const carga: CargaSesion = {
    usuarioId,
    venceEn: Date.now() + DURACION_SESION_SEGUNDOS * 1000,
  };
  const cargaCodificada = Buffer.from(JSON.stringify(carga), "utf8").toString("base64url");
  const firma = firmarCarga(cargaCodificada, secreto);
  return `${cargaCodificada}.${firma}`;
}

// Implementa RF-U2: verifica formato, firma en tiempo constante y vigencia temporal del token.
export async function verificarSesion(valorCookie: string): Promise<CargaSesion | null> {
  const secreto = obtenerSecretoSesion();
  const partes = valorCookie.split(".");
  if (partes.length !== 2) {
    return null;
  }

  const [cargaCodificada, firmaRecibida] = partes;
  if (!cargaCodificada || !firmaRecibida) {
    return null;
  }

  const firmaEsperada = firmarCarga(cargaCodificada, secreto);
  const bufferRecibido = Buffer.from(firmaRecibida, "utf8");
  const bufferEsperado = Buffer.from(firmaEsperada, "utf8");
  if (bufferRecibido.length !== bufferEsperado.length || !compararTiempoConstante(bufferRecibido, bufferEsperado)) {
    return null;
  }

  try {
    const textoCarga = Buffer.from(cargaCodificada, "base64url").toString("utf8");
    const carga = JSON.parse(textoCarga) as Partial<CargaSesion>;
    if (
      typeof carga.usuarioId !== "number" ||
      !Number.isSafeInteger(carga.usuarioId) ||
      carga.usuarioId <= 0 ||
      typeof carga.venceEn !== "number" ||
      !Number.isFinite(carga.venceEn) ||
      carga.venceEn <= Date.now()
    ) {
      return null;
    }
    return { usuarioId: carga.usuarioId, venceEn: carga.venceEn };
  } catch {
    return null;
  }
}

// Implementa RF-U1: guarda la cookie httpOnly de sesión con flags de seguridad.
export async function establecerCookieSesion(usuarioId: number): Promise<void> {
  const token = await firmarSesion(usuarioId);
  const almacenCookies = await obtenerCookies();
  almacenCookies.set(NOMBRE_COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: DURACION_SESION_SEGUNDOS,
  });
}

// Implementa RF-U1: expira la cookie de sesión en el navegador al cerrar sesión.
export async function eliminarCookieSesion(): Promise<void> {
  const almacenCookies = await obtenerCookies();
  almacenCookies.set(NOMBRE_COOKIE_SESION, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

// Implementa RF-U2: valida cookie y consulta el usuario actual en BD en cada pedido.
export async function obtenerUsuarioActual(
  baseDatos: BaseDatos = bd,
  valorCookieExterno?: string,
): Promise<UsuarioAutenticado> {
  const valorCookie =
    valorCookieExterno !== undefined
      ? valorCookieExterno
      : (await obtenerCookies()).get(NOMBRE_COOKIE_SESION)?.value;

  if (!valorCookie) {
    asegurarSesionValida(null);
    return undefined as never;
  }

  const carga = await verificarSesion(valorCookie);
  if (!carga) {
    asegurarSesionValida(null);
    return undefined as never;
  }

  const [usuario] = await baseDatos
    .select()
    .from(usuarios)
    .where(igual(usuarios.id, carga.usuarioId))
    .limit(1);

  asegurarSesionValida(usuario);

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}
