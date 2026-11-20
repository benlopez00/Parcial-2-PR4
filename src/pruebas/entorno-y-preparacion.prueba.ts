import { afterEach as despuesDeCadaPrueba, beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";
import { mkdtemp as crearTemporal, readFile as leerArchivo, writeFile as escribirArchivo, unlink as borrarArchivo, rmdir as borrarCarpeta } from "node:fs/promises";
import { tmpdir as carpetaTemporal } from "node:os";
import { join as unirRuta } from "node:path";
import { prepararSesionLocal } from "@/utilidades/preparacion-local";
import { obtenerConfiguracionBaseDatos } from "@/validaciones/validacion-entorno";

describir("T12: entorno local y destino remoto", () => {
  let carpeta: string;
  let archivo: string;
  antesDeCadaPrueba(async () => {
    carpeta = await crearTemporal(unirRuta(carpetaTemporal(), "ferreteria-t12-"));
    archivo = unirRuta(carpeta, ".env");
    vi.stubEnv("SESSION_SECRET", ""); vi.stubEnv("DATABASE_URL", "file:./demo.db"); vi.stubEnv("VERCEL", "");
  });
  despuesDeCadaPrueba(async () => {
    try { await borrarArchivo(archivo); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await borrarCarpeta(carpeta);
  });
  probar("genera una clave local y preserva variables, comentarios y la clave al repetir", async () => {
    await escribirArchivo(archivo, "# Demo\nDATABASE_URL=file:./demo.db\nSESSION_SECRET=\nSEMILLA_PASSWORD=\n");
    await prepararSesionLocal(archivo);
    const contenido = await leerArchivo(archivo, "utf8");
    const secreto = process.env.SESSION_SECRET;
    esperar(secreto).toMatch(/^[0-9a-f]{64}$/);
    esperar(contenido).toContain(`SESSION_SECRET=${secreto}`);
    esperar(contenido).toContain("# Demo\nDATABASE_URL=file:./demo.db");
    esperar(contenido).toContain("SEMILLA_PASSWORD=");
    vi.stubEnv("SESSION_SECRET", "");
    await prepararSesionLocal(archivo);
    esperar(await leerArchivo(archivo, "utf8")).toBe(contenido);
    esperar(process.env.SESSION_SECRET).toBe(secreto);
  });
  probar("conserva un secreto ya configurado y no escribe el archivo", async () => {
    vi.stubEnv("SESSION_SECRET", "secreto-ya-configurado");
    await prepararSesionLocal(archivo);
    await esperar(leerArchivo(archivo)).rejects.toMatchObject({ code: "ENOENT" });
  });
  probar.each(["DATABASE_URL", "TURSO_DATABASE_URL"])("una base remota en %s no genera ni persiste un secreto local", async (variable) => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv(variable, "libsql://demo.turso.io");
    await prepararSesionLocal(archivo);
    esperar(process.env.SESSION_SECRET).toBe("");
    await esperar(leerArchivo(archivo)).rejects.toMatchObject({ code: "ENOENT" });
  });
  probar("permite SQLite en producción local y exige Turso con token en Vercel", () => {
    esperar(obtenerConfiguracionBaseDatos({ NODE_ENV: "production" }).url).toBe("file:./local.db");
    esperar(() => obtenerConfiguracionBaseDatos({ VERCEL: "1" })).toThrow("SQLite local no está permitido");
    esperar(() => obtenerConfiguracionBaseDatos({ VERCEL: "1", DATABASE_URL: "libsql://demo.turso.io" })).toThrow("DATABASE_AUTH_TOKEN");
    esperar(() => obtenerConfiguracionBaseDatos({ VERCEL: "1", DATABASE_URL: "file:./demo.db", DATABASE_AUTH_TOKEN: "token-ficticio" })).toThrow();
    esperar(obtenerConfiguracionBaseDatos({ VERCEL: "1", DATABASE_URL: "libsql://demo.turso.io", DATABASE_AUTH_TOKEN: "token-ficticio" })).toEqual({ url: "libsql://demo.turso.io", authToken: "token-ficticio" });
  });
  probar("acepta las variables nativas de Marketplace y conserva la prioridad del destino local explícito", () => {
    const remoto = { VERCEL: "1", TURSO_DATABASE_URL: "libsql://demo.turso.io", TURSO_AUTH_TOKEN: "token-ficticio" };
    esperar(obtenerConfiguracionBaseDatos(remoto)).toEqual({ url: "libsql://demo.turso.io", authToken: "token-ficticio" });
    esperar(() => obtenerConfiguracionBaseDatos({ ...remoto, DATABASE_URL: "file:./local.db" })).toThrow("SQLite local no está permitido");
    esperar(obtenerConfiguracionBaseDatos({ ...remoto, VERCEL: "", DATABASE_URL: "file:./local.db" }).url).toBe("file:./local.db");
  });
});
