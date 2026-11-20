"use client";

import { useEffect as usarEfecto, useId as usarId, useState as usarEstado } from "react";
import { buscarOpcionesProductosAccion } from "@/app/(sistema)/productos/acciones";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { EstadoError } from "@/componentes/estados/estado-error";
import type { ListadoOpcionesProductos, OpcionProducto } from "@/servicios/servicio-productos";

interface PropiedadesSelectorProducto {
  uso: "movimiento" | "historial";
  valor: OpcionProducto | null;
  alSeleccionar: (producto: OpcionProducto | null) => void;
  deshabilitado?: boolean;
  error?: string;
}

export function SelectorProducto({ uso, valor, alSeleccionar, deshabilitado, error }: PropiedadesSelectorProducto) {
  const identificador = usarId();
  const [abierto, cambiarAbierto] = usarEstado(false);
  const [busqueda, cambiarBusqueda] = usarEstado("");
  const [pagina, cambiarPagina] = usarEstado(1);
  const [listado, cambiarListado] = usarEstado<ListadoOpcionesProductos | null>(null);
  const [cargando, cambiarCargando] = usarEstado(false);
  const [mensajeError, cambiarMensajeError] = usarEstado<string | null>(null);
  const [reintento, cambiarReintento] = usarEstado(0);

  usarEfecto(() => {
    if (!abierto) return;
    let vigente = true;
    cambiarCargando(true);
    cambiarMensajeError(null);
    const temporizador = setTimeout(async () => {
      try {
        const resultado = await buscarOpcionesProductosAccion({ uso, q: busqueda, page: pagina, pageSize: 10 });
        if (!vigente) return;
        if (resultado.ok) cambiarListado(resultado.datos);
        else cambiarMensajeError(resultado.error.message);
      } catch {
        if (vigente) cambiarMensajeError("No pudimos buscar productos.");
      } finally {
        if (vigente) cambiarCargando(false);
      }
    }, 250);
    return () => { vigente = false; clearTimeout(temporizador); };
  }, [abierto, busqueda, pagina, uso, reintento]);

  return <div className="space-y-2">
    <Boton type="button" variant="outline" className="h-auto min-h-10 w-full justify-between whitespace-normal text-left font-normal"
      disabled={deshabilitado} aria-expanded={abierto} aria-controls={`${identificador}-opciones`} aria-invalid={Boolean(error)}
      onClick={() => cambiarAbierto(!abierto)}>
      {valor ? `${valor.codigo} · ${valor.descripcion}${valor.activo ? "" : " (inactivo)"}` : uso === "historial" ? "Todos los productos" : "Elegí un producto"}
      <span aria-hidden="true">⌄</span>
    </Boton>
    {abierto && <div id={`${identificador}-opciones`} className="space-y-2 rounded-lg border bg-card p-3"
      onKeyDown={(evento) => { if (evento.key === "Escape") { evento.stopPropagation(); cambiarAbierto(false); } }}>
      <Etiqueta htmlFor={`${identificador}-buscar`}>Buscar por código o descripción</Etiqueta>
      <Entrada id={`${identificador}-buscar`} autoFocus value={busqueda} onChange={(evento) => { cambiarBusqueda(evento.target.value); cambiarPagina(1); }} />
      <div aria-live="polite" aria-busy={cargando}>
        {cargando ? <p className="py-2 text-sm text-muted-foreground" role="status">Buscando productos…</p>
          : mensajeError ? <EstadoError mensaje={mensajeError} alReintentar={() => cambiarReintento(reintento + 1)} />
          : <div className="max-h-48 space-y-1 overflow-y-auto" role="group" aria-label="Resultados de productos"
            onKeyDown={(evento) => {
              if (evento.key !== "ArrowDown" && evento.key !== "ArrowUp") return;
              const botones = Array.from(evento.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
              const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
              const siguiente = actual + (evento.key === "ArrowDown" ? 1 : -1);
              if (botones.length) { evento.preventDefault(); botones[(siguiente + botones.length) % botones.length]?.focus(); }
            }}>
            {uso === "historial" && <Boton type="button" variant="ghost" className="w-full justify-start" onClick={() => { alSeleccionar(null); cambiarAbierto(false); }}>Todos los productos</Boton>}
            {listado?.data.map((producto) => <Boton key={producto.id} type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal text-left"
              aria-pressed={valor?.id === producto.id} onClick={() => { alSeleccionar(producto); cambiarAbierto(false); }}>
              {producto.codigo} · {producto.descripcion}{!producto.activo && " (inactivo)"}
            </Boton>)}
            {listado?.data.length === 0 && <p className="p-2 text-sm text-muted-foreground">No se encontraron productos.</p>}
          </div>}
      </div>
      {!cargando && !mensajeError && listado && <div className="flex items-center justify-between gap-2 border-t pt-2">
        <Boton type="button" size="sm" variant="outline" disabled={pagina <= 1} onClick={() => cambiarPagina(pagina - 1)}>Anterior</Boton>
        <span className="text-xs text-muted-foreground">Página {pagina}</span>
        <Boton type="button" size="sm" variant="outline" disabled={pagina * listado.pageSize >= listado.total} onClick={() => cambiarPagina(pagina + 1)}>Siguiente</Boton>
      </div>}
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
