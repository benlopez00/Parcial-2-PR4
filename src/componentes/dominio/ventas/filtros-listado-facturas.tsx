"use client";

import Enlace from "next/link";
import { useState as usarEstado } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import type { OpcionesListadoFacturas } from "@/servicios/servicio-facturas";
import type { CambiosConsultaFacturas, ConsultaListadoFacturas } from "@/utilidades/consultas-facturas";

interface PropiedadesFiltrosListadoFacturas {
  consulta: ConsultaListadoFacturas;
  opciones: OpcionesListadoFacturas;
  pendiente: boolean;
  alAplicar: (cambios: CambiosConsultaFacturas) => void;
}

export function FiltrosListadoFacturas({ consulta, opciones, pendiente, alAplicar }: PropiedadesFiltrosListadoFacturas) {
  const [expandidos, cambiarExpandidos] = usarEstado(false);
  const selectores = [
    { nombre: "clienteId", etiqueta: "Cliente", todos: "Todos los clientes", valor: consulta.clienteId,
      opciones: opciones.clientes.map((cliente) => ({ valor: String(cliente.id), texto: cliente.nombre })) },
    { nombre: "forma", etiqueta: "Forma de pago", todos: "Todas las formas de pago", valor: consulta.forma,
      opciones: [{ valor: "contado", texto: "Contado" }, { valor: "tarjeta", texto: "Tarjeta" }, { valor: "cuenta_corriente", texto: "Cuenta corriente" }] },
    { nombre: "vendedorId", etiqueta: "Vendedor", todos: "Todos los vendedores", valor: consulta.vendedorId,
      opciones: opciones.vendedores.map((vendedor) => ({ valor: String(vendedor.id), texto: vendedor.nombre })) },
    { nombre: "estado", etiqueta: "Estado", todos: "Todos los estados", valor: consulta.estado,
      opciones: [{ valor: "emitida", texto: "Emitida" }, { valor: "anulada", texto: "Anulada" }] },
  ];
  return <form className="border-b p-4" onSubmit={(evento) => {
    evento.preventDefault();
    alAplicar(Object.fromEntries(new FormData(evento.currentTarget)) as Record<string, string>);
  }}>
    <fieldset disabled={pendiente} className="min-w-0 space-y-3">
      <div className="space-y-1.5">
        <Etiqueta htmlFor="buscar-facturas">Número o cliente</Etiqueta>
        <Entrada id="buscar-facturas" name="q" type="search" defaultValue={consulta.q} placeholder="Buscar factura…" />
      </div>
      <Boton type="button" variant="outline" className="md:hidden" aria-expanded={expandidos} aria-controls="filtros-secundarios-facturas"
        onClick={() => cambiarExpandidos(!expandidos)}>{expandidos ? "Ocultar filtros" : "Más filtros"}</Boton>
      <div id="filtros-secundarios-facturas" className={`${expandidos ? "grid" : "hidden md:grid"} gap-3 sm:grid-cols-2 xl:grid-cols-3`}>
        {(["desde", "hasta"] as const).map((campo) => <div key={campo} className="min-w-0 space-y-1.5">
          <Etiqueta htmlFor={`facturas-${campo}`}>{campo === "desde" ? "Desde" : "Hasta"}</Etiqueta>
          <Entrada id={`facturas-${campo}`} name={campo} type="date" defaultValue={consulta[campo]} />
        </div>)}
        {selectores.map((selector) => <div key={selector.nombre} className="min-w-0 space-y-1.5">
          <Etiqueta htmlFor={`facturas-${selector.nombre}`}>{selector.etiqueta}</Etiqueta>
          <Selector name={selector.nombre} defaultValue={String(selector.valor ?? "todos")}>
            <SelectorDisparador id={`facturas-${selector.nombre}`}><SelectorValor /></SelectorDisparador>
            <SelectorContenido>
              <SelectorOpcion value="todos">{selector.todos}</SelectorOpcion>
              {selector.opciones.map((opcion) => <SelectorOpcion key={opcion.valor} value={opcion.valor}>{opcion.texto}</SelectorOpcion>)}
            </SelectorContenido>
          </Selector>
        </div>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Boton type="submit" variant="outline">Aplicar filtros</Boton>
        <Boton comoHijo variant="ghost"><Enlace href="/ventas">Limpiar filtros</Enlace></Boton>
        <input type="hidden" name="pageSize" value={consulta.pageSize} />
      </div>
    </fieldset>
  </form>;
}
