"use client";

import { useState as usarEstado } from "react";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Boton } from "@/componentes/interfaz/boton";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import { SelectorProducto } from "./selector-producto";
import type { OpcionProducto } from "@/servicios/servicio-productos";
import type { CambiosConsultaProductos, ConsultaPantallaProductos } from "@/validaciones/validacion-pantalla-productos";
import { esquemaListadoMovimientosStockGeneral } from "@/validaciones/validacion-productos";

interface PropiedadesFiltrosMovimientosStock {
  consulta: ConsultaPantallaProductos["movimientos"];
  productoSeleccionado: OpcionProducto | null;
  alCambiar: (cambios: CambiosConsultaProductos) => void;
}

export function FiltrosMovimientosStock({ consulta, productoSeleccionado, alCambiar }: PropiedadesFiltrosMovimientosStock) {
  const [desde, cambiarDesde] = usarEstado(consulta.desde ?? "");
  const [hasta, cambiarHasta] = usarEstado(consulta.hasta ?? "");
  const [errorFecha, cambiarErrorFecha] = usarEstado<string>();
  return <form className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_150px_150px_150px_auto] xl:items-end"
    onSubmit={(evento) => {
      evento.preventDefault();
      const validacion = esquemaListadoMovimientosStockGeneral.safeParse({ ...consulta, desde: desde || undefined, hasta: hasta || undefined });
      if (!validacion.success) { cambiarErrorFecha(validacion.error.issues[0]?.message); return; }
      cambiarErrorFecha(undefined);
      alCambiar({ desde: desde || null, hasta: hasta || null });
    }}>
    <div className="space-y-1.5"><p className="text-sm font-medium">Producto</p><SelectorProducto uso="historial" valor={productoSeleccionado} alSeleccionar={(producto) => alCambiar({ productoId: producto?.id ?? null })} /></div>
    <CampoFormulario id="tipo-movimiento" etiqueta="Tipo">
      <Selector value={consulta.tipo ?? "todos"} onValueChange={(tipo) => alCambiar({ tipo: tipo === "todos" ? null : tipo })}>
        <SelectorDisparador id="tipo-movimiento"><SelectorValor /></SelectorDisparador>
        <SelectorContenido>{[["todos", "Todos los tipos"], ["ingreso", "Ingreso"], ["egreso", "Egreso"], ["venta", "Venta"], ["anulacion", "Anulación"]].map(([valor, etiqueta]) => <SelectorOpcion key={valor} value={valor}>{etiqueta}</SelectorOpcion>)}</SelectorContenido>
      </Selector>
    </CampoFormulario>
    <CampoFormulario id="desde-movimientos" etiqueta="Desde"><Entrada id="desde-movimientos" type="date" value={desde} onChange={(evento) => cambiarDesde(evento.target.value)} /></CampoFormulario>
    <CampoFormulario id="hasta-movimientos" etiqueta="Hasta" error={errorFecha}><Entrada id="hasta-movimientos" type="date" value={hasta} aria-invalid={Boolean(errorFecha)} aria-describedby={errorFecha ? "hasta-movimientos-error" : undefined} onChange={(evento) => cambiarHasta(evento.target.value)} /></CampoFormulario>
    <Boton type="submit" variant="outline">Aplicar fechas</Boton>
  </form>;
}
