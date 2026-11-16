import { fileURLToPath as rutaDesdeUrl } from "node:url";
import { defineConfig as definirConfiguracion } from "vitest/config";

export default definirConfiguracion({
  resolve: { alias: { "@": rutaDesdeUrl(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/pruebas/**/*.prueba.ts"],
    restoreMocks: true,
    unstubEnvs: true,
  },
});
