"use client";

import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { Search as Buscar } from "lucide-react";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Boton } from "@/componentes/interfaz/boton";
import type { ProductoPublico } from "@/servicios/servicio-productos";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";
import { usarBusquedaVenta } from "./usar-busqueda-venta";

interface PropiedadesBuscadorItemsVenta {
  deshabilitado: boolean;
  alAgregar: (producto: ProductoPublico, cantidad: number) => boolean;
}

export function BuscadorItemsVenta({ deshabilitado, alAgregar }: PropiedadesBuscadorItemsVenta) {
  const [cantidad, cambiarCantidad] = usarEstado("1");
  const [busqueda, cambiarBusqueda] = usarEstado("");
  const [abierto, cambiarAbierto] = usarEstado(false);
  const [seleccionado, cambiarSeleccionado] = usarEstado(0);
  const { resultados, cargando, error, reintentar, pagina, hayAnterior, haySiguiente, anterior, siguiente }
    = usarBusquedaVenta<ProductoPublico>("/api/productos", busqueda, abierto && !deshabilitado);
  const mostrar = abierto && busqueda.trim().length > 0;

  usarEfecto(() => {
    if (mostrar && !cargando && resultados[seleccionado]) {
      document.getElementById(`opcion-producto-${resultados[seleccionado].id}`)?.scrollIntoView({ block: "nearest" });
    }
  }, [mostrar, cargando, resultados, seleccionado]);

  function agregar(producto: ProductoPublico) {
    if (alAgregar(producto, Number(cantidad))) {
      cambiarBusqueda(""); cambiarCantidad("1"); cambiarSeleccionado(0);
      document.getElementById("buscar-producto-venta")?.focus();
    }
  }

  return <div className="relative" onBlur={(evento) => {
    if (!evento.currentTarget.contains(evento.relatedTarget)) cambiarAbierto(false);
  }}>
    <div className="mb-4 grid grid-cols-[4.5rem_minmax(0,1fr)] items-end gap-3">
      <div className="space-y-2">
        <Etiqueta htmlFor="cantidad-agregar-venta">Cantidad</Etiqueta>
        <Entrada id="cantidad-agregar-venta" type="number" min={1} step={1} value={cantidad} disabled={deshabilitado}
          onChange={(evento) => cambiarCantidad(evento.target.value)} className="h-11 text-center tabular-nums" />
      </div>
      <div className="space-y-2">
        <Etiqueta htmlFor="buscar-producto-venta">Código o descripción <span className="text-muted-foreground">· F2</span></Etiqueta>
        <div className="relative">
          <Buscar className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
          <Entrada id="buscar-producto-venta" role="combobox" autoComplete="off" className="h-11 pl-9"
            placeholder="Buscar un producto" value={busqueda} disabled={deshabilitado}
            aria-autocomplete="list" aria-expanded={mostrar} aria-controls="opciones-productos-venta"
            aria-activedescendant={mostrar && !cargando && resultados[seleccionado] ? `opcion-producto-${resultados[seleccionado].id}` : undefined}
            aria-describedby="ayuda-buscar-producto" onFocus={() => cambiarAbierto(true)}
            onChange={(evento) => { cambiarBusqueda(evento.target.value); cambiarSeleccionado(0); cambiarAbierto(true); }}
            onKeyDown={(evento) => {
              if (evento.key === "Escape") { evento.preventDefault(); cambiarAbierto(false); return; }
              if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
                evento.preventDefault(); cambiarAbierto(true);
                if (resultados.length) cambiarSeleccionado((anterior) => (anterior + (evento.key === "ArrowDown" ? 1 : -1) + resultados.length) % resultados.length);
              }
              if (evento.key === "Enter") {
                evento.preventDefault();
                if (mostrar && !cargando && !error && resultados[seleccionado]) agregar(resultados[seleccionado]);
              }
            }} />
        </div>
      </div>
    </div>
    <p id="ayuda-buscar-producto" className="mb-4 text-xs text-muted-foreground">↑ ↓ elegís el producto · Enter lo agrega</p>
    {mostrar && <div className="absolute inset-x-0 top-full z-20 rounded-lg border bg-popover p-2 shadow-md">
      <div role="status" aria-live="polite" className="text-sm">
        {cargando && <p className="p-3 text-muted-foreground">Buscando productos…</p>}
        {error && <div className="p-3"><p role="alert">{error}</p><Boton variant="link" onClick={reintentar}>Reintentar búsqueda</Boton></div>}
        {!cargando && !error && resultados.length === 0 && <p className="p-3 text-muted-foreground">No encontramos productos activos con esa búsqueda.</p>}
      </div>
      <ul id="opciones-productos-venta" role="listbox" aria-label="Productos encontrados" className="max-h-72 overflow-y-auto">
        {!cargando && !error && resultados.map((producto, indice) => <li key={producto.id} role="option"
          id={`opcion-producto-${producto.id}`} aria-selected={seleccionado === indice}>
          <button type="button" tabIndex={-1} disabled={producto.existencia === 0}
            onMouseEnter={() => cambiarSeleccionado(indice)} onMouseDown={(evento) => evento.preventDefault()}
            onClick={() => agregar(producto)}
            className={`flex min-h-16 w-full items-center justify-between gap-3 rounded-md p-3 text-left disabled:opacity-60 ${seleccionado === indice ? "bg-secondary" : "hover:bg-secondary"}`}>
            <span className="min-w-0"><span className="block font-medium break-words">{producto.descripcion}</span>
              <span className="text-xs text-muted-foreground">{producto.codigo} · Disponible: {formatearNumero(producto.existencia)}</span></span>
            <span className="shrink-0 text-sm font-medium tabular-nums">{formatearMoneda(producto.precio)}</span>
          </button>
        </li>)}
      </ul>
      {!cargando && !error && (hayAnterior || haySiguiente) && <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
        <Boton variant="ghost" className="min-h-11" disabled={!hayAnterior} onClick={() => { cambiarSeleccionado(0); anterior(); }}>Anterior</Boton>
        <span className="text-xs text-muted-foreground">Página {formatearNumero(pagina)}</span>
        <Boton variant="ghost" className="min-h-11" disabled={!haySiguiente} onClick={() => { cambiarSeleccionado(0); siguiente(); }}>Siguiente</Boton>
      </div>}
    </div>}
  </div>;
}
