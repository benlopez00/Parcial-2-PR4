"use client";

import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { describirErrorVenta, leerRespuestaVenta } from "@/errores/errores-nueva-venta";

export function usarBusquedaVenta<Datos>(ruta: string, busqueda: string, habilitada: boolean) {
  const [resultados, cambiarResultados] = usarEstado<Datos[]>([]);
  const [cargando, cambiarCargando] = usarEstado(false);
  const [error, cambiarError] = usarEstado<string | null>(null);
  const [reintento, cambiarReintento] = usarEstado(0);
  usarEfecto(() => {
    cambiarResultados([]);
    cambiarError(null);
    if (!habilitada || !busqueda.trim()) { cambiarCargando(false); return; }
    const control = new AbortController();
    cambiarCargando(true);
    const temporizador = setTimeout(async () => {
      try {
        const parametros = new URLSearchParams({ q: busqueda, activo: "true", pageSize: "10" });
        const respuesta = await fetch(`${ruta}?${parametros}`, { signal: control.signal });
        const listado = await leerRespuestaVenta<{ data: Datos[] }>(respuesta);
        if (!control.signal.aborted) cambiarResultados(listado.data);
      } catch (fallo) {
        if (!control.signal.aborted) cambiarError(describirErrorVenta(fallo));
      } finally {
        if (!control.signal.aborted) cambiarCargando(false);
      }
    }, 250);
    return () => { clearTimeout(temporizador); control.abort(); };
  }, [ruta, busqueda, habilitada, reintento]);
  return { resultados, cargando, error, reintentar: () => cambiarReintento((valor) => valor + 1) };
}
