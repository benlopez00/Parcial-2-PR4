import { beforeEach as antesDeCadaPrueba, describe as describir, expect as esperar, it as probar, vi } from "vitest";

const estado = vi.hoisted(() => ({ total: 3 }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((ruta: string) => { throw new Error(`REDIRECCION:${ruta}`); }) }));
vi.mock("@/utilidades/sesion", () => ({ obtenerUsuarioActual: async () => ({ id: 1, nombre: "Laura", email: "laura@demo.test", rol: "admin" }) }));
vi.mock("@/servicios/servicio-facturas", () => ({
  listarFacturas: async (_usuario: unknown, consulta: { page: number; pageSize: number }) => ({ data: [], total: estado.total, page: consulta.page, pageSize: consulta.pageSize, totalEmitido: 0 }),
  obtenerOpcionesListadoFacturas: async () => ({ clientes: [], vendedores: [] }),
}));

import PaginaFacturas from "@/app/(sistema)/ventas/page";
import { redirect as redirigir } from "next/navigation";

describir("Cierre T12: página de facturas después de una anulación", () => {
  antesDeCadaPrueba(() => { estado.total = 3; vi.mocked(redirigir).mockClear(); });
  probar("si desaparece la última fila de página 2 vuelve a la última página válida conservando filtros", async () => {
    await esperar(PaginaFacturas({ searchParams: Promise.resolve({ page: "2", pageSize: "3", estado: "emitida", clienteId: "7" }) })).rejects.toThrow("REDIRECCION:");
    const destino = new URL(vi.mocked(redirigir).mock.calls[0][0], "http://localhost");
    esperar(destino.pathname).toBe("/ventas");
    esperar(destino.searchParams.has("page")).toBe(false);
    esperar(destino.searchParams.get("estado")).toBe("emitida");
    esperar(destino.searchParams.get("clienteId")).toBe("7");
    esperar(destino.searchParams.get("pageSize")).toBe("3");
  });
  probar("normaliza una página excesiva al último resultado disponible", async () => {
    estado.total = 7;
    await esperar(PaginaFacturas({ searchParams: Promise.resolve({ page: "999", pageSize: "3", q: "Mariana" }) })).rejects.toThrow("REDIRECCION:");
    const destino = new URL(vi.mocked(redirigir).mock.calls[0][0], "http://localhost");
    esperar(destino.searchParams.get("page")).toBe("3");
    esperar(destino.searchParams.get("q")).toBe("Mariana");
  });
  probar("una página válida no redirige", async () => {
    esperar(await PaginaFacturas({ searchParams: Promise.resolve({ pageSize: "3" }) })).toBeDefined();
    esperar(redirigir).not.toHaveBeenCalled();
  });
});
