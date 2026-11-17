import { describe as describir, it as probar, expect as esperar } from "vitest";
import { construirUrlProductos, leerConsultaProductos } from "@/utilidades/consultas-productos";

describir("URL de productos y movimientos", () => {
  probar("separa pestaña y páginas visuales de los contratos estrictos del servicio", () => {
    const consulta = leerConsultaProductos({ pestana: "movimientos", q: ["Martillo", "otro"], categoriaId: "2", page: "3", paginaMovimientos: "4", tamanoPaginaMovimientos: "10", desde: "2026-11-16", hasta: "2026-11-17" });
    esperar(consulta.catalogo).toEqual({ q: "Martillo", categoriaId: 2, activo: "true", bajoMinimo: "false", page: 3, pageSize: 20 });
    esperar(consulta.movimientos).toMatchObject({ page: 4, pageSize: 10, desde: "2026-11-16", hasta: "2026-11-17" });
    esperar(consulta.movimientos).not.toHaveProperty("pestana");
    esperar(consulta.catalogo).not.toHaveProperty("desde");
  });
  probar.each([{ page: "0" }, { pageSize: "101" }, { pestana: "otra" }, { desde: "2026-02-30" }, { desde: "2026-11-17", hasta: "2026-11-16" }, { desconocido: "x" }])("rechaza consulta inválida %j", (entrada) => {
    esperar(() => leerConsultaProductos(entrada)).toThrow();
  });
  probar("cada filtro reinicia solo su página y cambiar pestaña conserva ambas", () => {
    const actual = new URLSearchParams("page=3&paginaMovimientos=4&tipo=venta&q=clavo");
    const catalogo = new URL(construirUrlProductos("/productos", actual, { q: "tuerca" }), "http://localhost");
    esperar(catalogo.searchParams.get("page")).toBeNull();
    esperar(catalogo.searchParams.get("paginaMovimientos")).toBe("4");
    const movimientos = new URL(construirUrlProductos("/productos", actual, { tipo: null }), "http://localhost");
    esperar(movimientos.searchParams.get("paginaMovimientos")).toBeNull();
    esperar(movimientos.searchParams.get("page")).toBe("3");
    const pestana = new URL(construirUrlProductos("/productos", actual, { pestana: "movimientos" }), "http://localhost");
    esperar(pestana.searchParams.get("page")).toBe("3");
    esperar(pestana.searchParams.get("paginaMovimientos")).toBe("4");
    esperar(actual.get("q")).toBe("clavo");
  });
  probar("elimina filtros sin dejar valores vacíos y codifica caracteres de búsqueda", () => {
    esperar(construirUrlProductos("/productos", new URLSearchParams("q=x&page=3"), { q: null })).toBe("/productos");
    const url = new URL(construirUrlProductos("/productos", new URLSearchParams(), { q: "Bulón & arandela" }), "http://localhost");
    esperar(url.searchParams.get("q")).toBe("Bulón & arandela");
  });
});
