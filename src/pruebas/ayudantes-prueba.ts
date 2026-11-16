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
