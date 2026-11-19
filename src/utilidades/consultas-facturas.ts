import type { z as Esquema } from "zod";
import { esquemaListadoFacturas } from "@/validaciones/validacion-facturas";

export type ConsultaListadoFacturas = Esquema.output<typeof esquemaListadoFacturas>;
export type ParametrosUrlFacturas = Record<string, string | string[] | undefined>;
export type CambiosConsultaFacturas = Record<string, string | number | null | undefined>;

const FILTROS = ["q", "desde", "hasta", "clienteId", "vendedorId", "forma", "estado", "pageSize"];
const SELECTORES = ["clienteId", "vendedorId", "forma", "estado"];

export function leerConsultaFacturas(parametros: ParametrosUrlFacturas): ConsultaListadoFacturas {
  const aplanados = Object.fromEntries(Object.entries(parametros).map(([clave, valor]) => {
    const primero = Array.isArray(valor) ? valor[0] : valor;
    return [clave, primero === "" || (SELECTORES.includes(clave) && primero === "todos") ? undefined : primero];
  }));
  return esquemaListadoFacturas.parse(aplanados);
}

// Implementa RF-V8: paginar conserva filtros; cambiarlos vuelve al comienzo del resultado.
export function construirUrlFacturas(actual: URLSearchParams, cambios: CambiosConsultaFacturas): string {
  const parametros = new URLSearchParams(actual);
  if (Object.keys(cambios).some((clave) => FILTROS.includes(clave))) parametros.delete("page");
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined || valor === null || valor === "" || (SELECTORES.includes(clave) && valor === "todos")) parametros.delete(clave);
    else parametros.set(clave, String(valor));
  }
  return parametros.size ? `/ventas?${parametros}` : "/ventas";
}
