"use client";

import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { describirErrorVenta, leerRespuestaVenta } from "@/errores/errores-nueva-venta";

export function usarBusquedaVenta<Datos>(ruta: string, busqueda: string, habilitada: boolean) {
  const [resultados, cambiarResultados] = usarEstado<Datos[]>([]);
  const [cargando, cambiarCargando] = usarEstado(false);
  const [error, cambiarError] = usarEstado<string | null>(null);
  const [reintento, cambiarReintento] = usarEstado(0);
  const [pagina, cambiarPagina] = usarEstado(1);
  const [total, cambiarTotal] = usarEstado(0);
  usarEfecto(() => { cambiarPagina(1); }, [ruta, busqueda]);
  usarEfecto(() => {
    cambiarResultados([]);
    cambiarTotal(0);
    cambiarError(null);
    if (!habilitada || !busqueda.trim()) { cambiarCargando(false); return; }
    const control = new AbortController();
    cambiarCargando(true);
    const temporizador = setTimeout(async () => {
      try {
        const parametros = new URLSearchParams({ q: busqueda, activo: "true", pageSize: "10", page: String(pagina) });
        const respuesta = await fetch(`${ruta}?${parametros}`, { signal: control.signal });
        const listado = await leerRespuestaVenta<{ data: Datos[]; total: number }>(respuesta);
        if (!control.signal.aborted) { cambiarResultados(listado.data); cambiarTotal(listado.total); }
      } catch (fallo) {
        if (!control.signal.aborted) cambiarError(describirErrorVenta(fallo));
      } finally {
        if (!control.signal.aborted) cambiarCargando(false);
      }
    }, 250);
    return () => { clearTimeout(temporizador); control.abort(); };
  }, [ruta, busqueda, habilitada, reintento, pagina]);
  return { resultados, cargando, error, pagina, hayAnterior: pagina > 1, haySiguiente: pagina * 10 < total,
    anterior: () => cambiarPagina((valor) => Math.max(1, valor - 1)), siguiente: () => cambiarPagina((valor) => valor + 1),
    reintentar: () => cambiarReintento((valor) => valor + 1) };
}
