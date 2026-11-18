"use client";

import { Minus as Menos, Plus as Mas, Trash2 as Quitar } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import type { RenglonVenta } from "@/servicios/borrador-venta";
import type { ProductoPublico } from "@/servicios/servicio-productos";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";

interface PropiedadesTablaRenglonesVenta {
  renglones: RenglonVenta[];
  deshabilitado: boolean;
  alCambiarCantidad: (producto: ProductoPublico, cantidad: number) => void;
  alQuitar: (productoId: number) => void;
}

export function TablaRenglonesVenta({ renglones, deshabilitado, alCambiarCantidad, alQuitar }: PropiedadesTablaRenglonesVenta) {
  if (!renglones.length) return <div className="rounded-lg bg-secondary/45 px-5 py-10 text-center">
    <p className="font-medium">Todavía no hay productos</p>
    <p className="mt-2 text-sm text-muted-foreground">Buscá por código o descripción para empezar la venta.</p>
  </div>;
  return <div>
    <div className="hidden grid-cols-[minmax(0,1fr)_8rem_6rem_6rem_2.75rem] gap-3 border-b pb-3 text-xs text-muted-foreground xl:grid" aria-hidden="true">
      <span>Descripción</span><span className="text-center">Cantidad</span><span className="text-right">Precio unit.</span><span className="text-right">Subtotal</span><span />
    </div>
    <ul aria-label="Renglones de la venta" className="divide-y">
      {renglones.map(({ producto, cantidad, subtotal }) => <li key={producto.id}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-4 xl:grid-cols-[minmax(0,1fr)_8rem_6rem_6rem_2.75rem]">
        <div className="min-w-0"><p className="font-medium break-words">{producto.descripcion}</p>
          <p className="mt-1 text-xs text-muted-foreground">{producto.codigo} · Disponible: {formatearNumero(producto.existencia)}</p></div>
        <div className="col-start-1 row-start-2 row-span-2 flex items-center gap-1 xl:col-auto xl:row-auto xl:row-span-1 xl:justify-center">
          <Boton variant="ghost" className="size-11 px-0" disabled={deshabilitado || cantidad <= 1}
            aria-label={`Restar una unidad de ${producto.descripcion}`} onClick={() => alCambiarCantidad(producto, cantidad - 1)}><Menos /></Boton>
          <Entrada type="number" min={1} max={producto.existencia} step={1} value={cantidad} disabled={deshabilitado}
            aria-label={`Cantidad de ${producto.descripcion}`} className="h-11 w-12 px-1 text-center tabular-nums xl:w-16"
            onChange={(evento) => alCambiarCantidad(producto, Number(evento.target.value))} />
          <Boton variant="ghost" className="size-11 px-0" disabled={deshabilitado || cantidad >= producto.existencia}
            aria-label={`Sumar una unidad de ${producto.descripcion}`} onClick={() => alCambiarCantidad(producto, cantidad + 1)}><Mas /></Boton>
        </div>
        <p className="col-start-2 row-start-2 text-right text-sm xl:col-auto xl:row-auto"><span className="block text-xs text-muted-foreground xl:hidden">Precio unit.</span>
          <span className="tabular-nums">{formatearMoneda(producto.precio)}</span></p>
        <p className="col-start-2 row-start-3 text-right text-sm font-medium xl:col-auto xl:row-auto"><span className="block text-xs font-normal text-muted-foreground xl:hidden">Subtotal</span>
          <span className="tabular-nums">{formatearMoneda(subtotal)}</span></p>
        <Boton variant="ghost" className="col-start-2 row-start-1 size-11 px-0 xl:col-auto xl:row-auto" disabled={deshabilitado}
          aria-label={`Quitar ${producto.descripcion}`} onClick={() => alQuitar(producto.id)}><Quitar /></Boton>
      </li>)}
    </ul>
  </div>;
}
