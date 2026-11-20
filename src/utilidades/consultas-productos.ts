import { esquemaPantallaProductos, type CambiosConsultaProductos, type ConsultaPantallaProductos,
  type ParametrosUrlProductos } from "@/validaciones/validacion-pantalla-productos";

export function leerConsultaProductos(parametros: ParametrosUrlProductos): ConsultaPantallaProductos {
  const entrada = Object.fromEntries(Object.entries(parametros).map(([clave, valor]) => [clave, Array.isArray(valor) ? valor[0] : valor]));
  const { pestana, productoId, tipo, desde, hasta, paginaMovimientos, tamanoPaginaMovimientos, ...catalogo } = esquemaPantallaProductos.parse(entrada);
  return { pestana, catalogo, movimientos: { productoId, tipo, desde, hasta, page: paginaMovimientos, pageSize: tamanoPaginaMovimientos } };
}

export function construirUrlProductos(ruta: string, consultaActual: URLSearchParams, cambios: CambiosConsultaProductos): string {
  const parametros = new URLSearchParams(consultaActual);
  const claves = Object.keys(cambios);
  if (claves.some((clave) => ["q", "categoriaId", "activo", "bajoMinimo", "pageSize"].includes(clave))) parametros.delete("page");
  if (claves.some((clave) => ["productoId", "tipo", "desde", "hasta", "tamanoPaginaMovimientos"].includes(clave))) parametros.delete("paginaMovimientos");
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === undefined || valor === null || valor === "") parametros.delete(clave);
    else parametros.set(clave, String(valor));
  }
  const consulta = parametros.toString();
  return consulta ? `${ruta}?${consulta}` : ruta;
}
