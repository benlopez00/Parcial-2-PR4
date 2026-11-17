"use client";

import { Search } from "lucide-react";
import { Entrada } from "@/componentes/interfaz/entrada";
import {
  Selector,
  SelectorContenido,
  SelectorOpcion,
  SelectorDisparador,
  SelectorValor,
} from "@/componentes/interfaz/selector";

export type FiltroEstadoUsuario = "todos" | "true" | "false";

export interface PropiedadesFiltrosUsuarios {
  busqueda: string;
  estado: FiltroEstadoUsuario;
  alCambiarBusqueda: (valor: string) => void;
  alCambiarEstado: (valor: FiltroEstadoUsuario) => void;
}

export function FiltrosUsuarios({
  busqueda,
  estado,
  alCambiarBusqueda,
  alCambiarEstado,
}: PropiedadesFiltrosUsuarios) {
  return (
    <search aria-label="Filtrar usuarios" className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Entrada
          type="search"
          aria-label="Buscar por nombre o email"
          placeholder="Nombre o email"
          value={busqueda}
          onChange={(evento) => alCambiarBusqueda(evento.target.value)}
          className="pl-9"
        />
      </div>

      <div className="w-full sm:w-44">
        <Selector
          value={estado}
          onValueChange={(valor) => alCambiarEstado(valor as FiltroEstadoUsuario)}
        >
          <SelectorDisparador aria-label="Filtrar por estado">
            <SelectorValor />
          </SelectorDisparador>
          <SelectorContenido>
            <SelectorOpcion value="todos">Todos</SelectorOpcion>
            <SelectorOpcion value="true">Activos</SelectorOpcion>
            <SelectorOpcion value="false">Inactivos</SelectorOpcion>
          </SelectorContenido>
        </Selector>
      </div>
    </search>
  );
}
