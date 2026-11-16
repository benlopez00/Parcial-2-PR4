import "dotenv/config";
import { defineConfig as definirConfiguracion } from "drizzle-kit";

export default definirConfiguracion({
  dialect: "turso",
  schema: "./src/base-de-datos/esquema.ts",
  out: "./src/base-de-datos/migraciones",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
  },
});
