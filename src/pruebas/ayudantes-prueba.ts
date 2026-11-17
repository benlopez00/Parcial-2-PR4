import bcryptjs from "bcryptjs";
import { createClient as crearCliente, type Client as ClienteLibsql } from "@libsql/client";
import { drizzle as crearDrizzle } from "drizzle-orm/libsql";
import { migrate as migrar } from "drizzle-orm/libsql/migrator";
import { fileURLToPath as rutaDesdeUrl } from "node:url";
import type { BaseDatos } from "@/base-de-datos/conexion";
import * as esquema from "@/base-de-datos/esquema";

export interface BaseDatosPrueba {
  bd: BaseDatos;
  cliente: ClienteLibsql;
  cerrar: () => void;
}

export async function crearBaseDatosPrueba(): Promise<BaseDatosPrueba> {
  const cliente = crearCliente({ url: ":memory:" });
  const bd = crearDrizzle(cliente, { schema: esquema });
  try {
    await cliente.execute("PRAGMA foreign_keys = ON");
    await migrar(bd, {
      migrationsFolder: rutaDesdeUrl(new URL("../base-de-datos/migraciones", import.meta.url)),
    });
    return { bd, cliente, cerrar: () => cliente.close() };
  } catch (error) {
    cliente.close();
    throw error;
  }
}

export interface DatosUsuarioPrueba {
  nombre: string;
  email: string;
  password: string;
  rol: "admin" | "vendedor";
  activo?: boolean;
}

export async function crearUsuarioPrueba(
  bd: BaseDatos,
  datos: DatosUsuarioPrueba,
): Promise<esquema.Usuario> {
  const contrasenaHash = await bcryptjs.hash(datos.password, 12);
  const [creado] = await bd
    .insert(esquema.usuarios)
    .values({
      nombre: datos.nombre,
      email: datos.email.trim().toLowerCase(),
      rol: datos.rol,
      contrasenaHash,
      activo: datos.activo ?? true,
    })
    .returning();
  return creado;
}

export interface RegistroCookiePrueba {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    sameSite?: "lax" | "strict" | "none" | boolean;
    path?: string;
    secure?: boolean;
    maxAge?: number;
  };
}

export function crearAlmacenCookiesPrueba() {
  const cookies = new Map<string, RegistroCookiePrueba>();
  return {
    get(nombre: string) {
      const registro = cookies.get(nombre);
      return registro ? { name: registro.name, value: registro.value } : undefined;
    },
    set(nombre: string, valor: string, opciones?: RegistroCookiePrueba["options"]) {
      cookies.set(nombre, { name: nombre, value: valor, options: opciones });
    },
    obtenerRegistro(nombre: string) {
      return cookies.get(nombre);
    },
  };
}
