import "dotenv/config";
import { createClient as crearCliente, type Config as ConfiguracionConexion } from "@libsql/client";
import { drizzle as crearDrizzle } from "drizzle-orm/libsql";
import * as esquema from "./esquema";
import { obtenerConfiguracionBaseDatos } from "@/validaciones/validacion-entorno";

export function crearConexionBaseDatos(configuracion: ConfiguracionConexion) {
  const cliente = crearCliente(configuracion);
  const bd = crearDrizzle(cliente, { schema: esquema });
  return { cliente, bd };
}

export type BaseDatos = ReturnType<typeof crearConexionBaseDatos>["bd"];
export type TransaccionBaseDatos = Parameters<Parameters<BaseDatos["transaction"]>[0]>[0];

const conexion = crearConexionBaseDatos(obtenerConfiguracionBaseDatos());

export const bd = conexion.bd;
export const clienteBaseDatos = conexion.cliente;
