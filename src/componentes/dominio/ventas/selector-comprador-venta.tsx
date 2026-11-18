"use client";

import { useState as usarEstado } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Insignia } from "@/componentes/interfaz/insignia";
import { ModalFormularioCliente } from "@/componentes/dominio/clientes/modal-formulario-cliente";
import type { ClientePublico } from "@/servicios/servicio-clientes";
import { formatearMoneda } from "@/utilidades/formatos";
import { usarBusquedaVenta } from "./usar-busqueda-venta";

interface PropiedadesSelectorCompradorVenta {
  registrado: boolean;
  cliente: ClientePublico | null;
  deshabilitado: boolean;
  alCambiarModo: (registrado: boolean) => void;
  alSeleccionar: (cliente: ClientePublico | null) => void;
}

export function SelectorCompradorVenta({ registrado, cliente, deshabilitado, alCambiarModo, alSeleccionar }: PropiedadesSelectorCompradorVenta) {
  const [busqueda, cambiarBusqueda] = usarEstado("");
  const [nuevoCliente, cambiarNuevoCliente] = usarEstado(false);
  const { resultados, cargando, error, reintentar } = usarBusquedaVenta<ClientePublico>("/api/clientes", busqueda, registrado && !cliente && !deshabilitado);
  return <div className="space-y-3">
    <div role="group" aria-label="Tipo de comprador" className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
      <Boton variant={!registrado ? "outline" : "ghost"} className="h-auto min-h-11 whitespace-normal px-2 shadow-none" disabled={deshabilitado}
        aria-pressed={!registrado} onClick={() => alCambiarModo(false)}>Consumidor final</Boton>
      <Boton variant={registrado ? "outline" : "ghost"} className="h-auto min-h-11 whitespace-normal px-2 shadow-none" disabled={deshabilitado}
        aria-pressed={registrado} onClick={() => alCambiarModo(true)}>Cliente registrado</Boton>
    </div>
    {!registrado ? <div className="rounded-lg bg-secondary/45 p-3 text-sm">
      <p className="font-medium">Consumidor final</p><p className="mt-1 text-muted-foreground">No requiere datos. No puede comprar en cuenta corriente.</p>
    </div> : cliente ? <div className="space-y-2 rounded-lg border p-3" aria-live="polite">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-medium break-words">{cliente.nombre}</p>
        <p className="text-xs text-muted-foreground">{cliente.tipoDoc} {cliente.nroDoc}</p></div>
        <Boton variant="ghost" size="sm" disabled={deshabilitado} onClick={() => { alSeleccionar(null); cambiarBusqueda(""); }}>Cambiar</Boton></div>
      {cliente.cuentaCorriente && <Insignia variant="secondary">Cta. cte.</Insignia>}
      <p className="flex flex-wrap justify-between gap-2 text-sm"><span className="text-muted-foreground">Saldo actual</span>
        <span className="tabular-nums">{formatearMoneda(cliente.saldo)}</span></p>
    </div> : <div className="space-y-3">
      <div className="space-y-2"><Etiqueta htmlFor="buscar-cliente-venta">Nombre, DNI o CUIT · F4</Etiqueta>
        <Entrada id="buscar-cliente-venta" autoComplete="off" value={busqueda} className="h-11" disabled={deshabilitado}
          onChange={(evento) => cambiarBusqueda(evento.target.value)} />
      </div>
      <div aria-live="polite" aria-busy={cargando} className="space-y-1 text-sm">
        {cargando && <p className="text-muted-foreground">Buscando clientes…</p>}
        {error && <div><p role="alert">{error}</p><Boton variant="link" onClick={reintentar}>Reintentar búsqueda</Boton></div>}
        {!cargando && !error && busqueda.trim() && !resultados.length && <p className="text-muted-foreground">No encontramos clientes activos.</p>}
        {!cargando && !error && resultados.map((opcion) => <Boton key={opcion.id} variant="ghost" disabled={deshabilitado}
          className="h-auto min-h-11 w-full justify-start whitespace-normal text-left" onClick={() => alSeleccionar(opcion)}>
          <span><span className="block">{opcion.nombre}</span><span className="text-xs text-muted-foreground">{opcion.tipoDoc} {opcion.nroDoc}</span></span>
        </Boton>)}
      </div>
      <Boton variant="outline" className="min-h-11 w-full" disabled={deshabilitado} onClick={() => cambiarNuevoCliente(true)}>+ Nuevo cliente</Boton>
    </div>}
    {nuevoCliente && <ModalFormularioCliente abierto alCambiarAbierto={cambiarNuevoCliente} alCompletar={(creado) => {
      alSeleccionar(creado); cambiarBusqueda(""); cambiarNuevoCliente(false);
    }} />}
  </div>;
}
