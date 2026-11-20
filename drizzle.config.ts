import "dotenv/config";
import { defineConfig as definirConfiguracion } from "drizzle-kit";
import { obtenerConfiguracionBaseDatos } from "./src/validaciones/validacion-entorno";

export default definirConfiguracion({
  dialect: "turso",
  schema: "./src/base-de-datos/esquema.ts",
  out: "./src/base-de-datos/migraciones",
  dbCredentials: obtenerConfiguracionBaseDatos(),
});
