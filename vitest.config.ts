import { fileURLToPath as rutaDesdeUrl } from "node:url";
import { defineConfig as definirConfiguracion } from "vitest/config";

export default definirConfiguracion({
  resolve: { alias: { "@": rutaDesdeUrl(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // bcrypt de costo 12 compite por CPU; limitar archivos paralelos evita agotar el tiempo de autenticación.
    maxWorkers: 2,
    include: ["src/pruebas/**/*.prueba.ts"],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
