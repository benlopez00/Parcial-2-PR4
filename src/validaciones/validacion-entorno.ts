// T12: un despliegue de Vercel nunca puede caer silenciosamente en SQLite local.
export function obtenerConfiguracionBaseDatos(entorno: Record<string, string | undefined> = process.env) {
  const url = entorno.DATABASE_URL || entorno.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = entorno.DATABASE_AUTH_TOKEN || entorno.TURSO_AUTH_TOKEN || undefined;
  if (entorno.VERCEL === "1" && (!/^(libsql|https):\/\//.test(url) || !authToken?.trim())) {
    throw new Error("Vercel requiere DATABASE_URL remota de Turso y DATABASE_AUTH_TOKEN; SQLite local no está permitido en el despliegue.");
  }
  return { url, authToken };
}
