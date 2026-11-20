"use client";

import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Interruptor } from "@/componentes/interfaz/interruptor";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import type { CambiosConsultaClientes, ConsultaPantallaClientes } from "@/validaciones/validacion-pantalla-clientes";

interface PropiedadesFiltrosClientes {
  consulta: ConsultaPantallaClientes;
  alCambiar: (cambios: CambiosConsultaClientes) => void;
}

export function FiltrosClientes({ consulta, alCambiar }: PropiedadesFiltrosClientes) {
  const [busqueda, cambiarBusqueda] = usarEstado(consulta.q);
  usarEfecto(() => cambiarBusqueda(consulta.q), [consulta.q]);

  return <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-end">
    <form className="flex min-w-0 flex-1 gap-2" onSubmit={(evento) => { evento.preventDefault(); alCambiar({ q: busqueda }); }}>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Etiqueta htmlFor="buscar-clientes">Nombre, DNI o CUIT</Etiqueta>
        <Entrada id="buscar-clientes" placeholder="Buscar clientes…" value={busqueda}
          onChange={(evento) => cambiarBusqueda(evento.target.value)} />
      </div>
      <Boton type="submit" variant="outline" className="self-end">Buscar</Boton>
    </form>
    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
      <div className="space-y-1.5 xl:w-36">
        <Etiqueta htmlFor="estado-clientes">Estado</Etiqueta>
        <Selector value={consulta.activo} onValueChange={(valor) => alCambiar({ activo: valor })}>
          <SelectorDisparador id="estado-clientes"><SelectorValor /></SelectorDisparador>
          <SelectorContenido>
            <SelectorOpcion value="true">Activos</SelectorOpcion>
            <SelectorOpcion value="false">Inactivos</SelectorOpcion>
            <SelectorOpcion value="todos">Todos</SelectorOpcion>
          </SelectorContenido>
        </Selector>
      </div>
      <div className="space-y-1.5 xl:w-44">
        <Etiqueta htmlFor="orden-clientes">Ordenar por</Etiqueta>
        <Selector value={consulta.orden} onValueChange={(valor) => alCambiar({ orden: valor })}>
          <SelectorDisparador id="orden-clientes"><SelectorValor /></SelectorDisparador>
          <SelectorContenido>
            <SelectorOpcion value="nombre">Nombre</SelectorOpcion>
            <SelectorOpcion value="saldo">Mayor saldo</SelectorOpcion>
          </SelectorContenido>
        </Selector>
      </div>
      <div className="flex min-h-10 items-center gap-2 sm:self-end">
        <Interruptor id="solo-con-deuda" etiqueta="Solo con deuda" marcado={consulta.conDeuda === "true"}
          alCambiar={(marcado) => alCambiar({ conDeuda: marcado ? "true" : null })} />
        <Etiqueta htmlFor="solo-con-deuda">Solo con deuda</Etiqueta>
      </div>
    </div>
  </div>;
}
