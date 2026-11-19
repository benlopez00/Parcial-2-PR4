import { randomBytes as bytesAleatorios } from "node:crypto";
import { readFile as leerArchivo, writeFile as escribirArchivo } from "node:fs/promises";
import { parse as leerVariables } from "dotenv";
import { obtenerConfiguracionBaseDatos } from "@/validaciones/validacion-entorno";

// T12: los comandos de instalación generan una clave local una sola vez y conservan cualquier clave ya configurada.
export async function prepararSesionLocal(rutaEntorno = ".env") {
  if (process.env.SESSION_SECRET?.trim() || process.env.VERCEL === "1" || !obtenerConfiguracionBaseDatos().url.startsWith("file:")) return;
  let contenido = "";
  try { contenido = await leerArchivo(rutaEntorno, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const existente = leerVariables(contenido).SESSION_SECRET;
  if (existente?.trim()) { process.env.SESSION_SECRET = existente; return; }
  const secreto = bytesAleatorios(32).toString("hex");
  const linea = `SESSION_SECRET=${secreto}`;
  const actualizado = /^\s*SESSION_SECRET\s*=.*$/m.test(contenido)
    ? contenido.replace(/^\s*SESSION_SECRET\s*=.*$/m, linea)
    : `${contenido.trimEnd()}\n${linea}\n`;
  await escribirArchivo(rutaEntorno, actualizado, { mode: 0o600 });
  process.env.SESSION_SECRET = secreto;
}
