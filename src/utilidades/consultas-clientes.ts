import {
  esquemaPantallaClientes, esquemaPantallaFichaCliente,
  type CambiosConsultaClientes, type ConsultaFichaCliente, type ConsultaPantallaClientes, type ParametrosUrlClientes,
} from "@/validaciones/validacion-pantalla-clientes";

function aplanar(parametros: ParametrosUrlClientes): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(parametros).map(([clave, valor]) => [clave, Array.isArray(valor) ? valor[0] : valor]),
  );
}

export function leerConsultaClientes(parametros: ParametrosUrlClientes): ConsultaPantallaClientes {
  return esquemaPantallaClientes.parse(aplanar(parametros));
}

export function leerConsultaFichaCliente(parametros: ParametrosUrlClientes): ConsultaFichaCliente {
  return esquemaPantallaFichaCliente.parse(aplanar(parametros));
}

// Cambiar un filtro vuelve a la primera página: si no, el listado puede quedar vacío sin motivo visible.
const FILTROS_QUE_REINICIAN_PAGINA = ["q", "activo", "conDeuda", "orden", "pageSize"];

export function construirUrlClientes(
  ruta: string, consultaActual: URLSearchParams, cambios: CambiosConsultaClientes,
): string {
  const parametros = new URLSearchParams(consultaActual);
  if (Object.keys(cambios).some((clave) => FILTROS_QUE_REINICIAN_PAGINA.includes(clave))) parametros.delete("page");
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined || valor === null || valor === "") parametros.delete(clave);
    else parametros.set(clave, String(valor));
  }
  const consulta = parametros.toString();
  return consulta ? `${ruta}?${consulta}` : ruta;
}
