"use client";

import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Interruptor } from "@/componentes/interfaz/interruptor";
import { Selector, SelectorContenido, SelectorDisparador, SelectorOpcion, SelectorValor } from "@/componentes/interfaz/selector";
import type { CategoriaPublica } from "@/servicios/servicio-categorias";
import type { CambiosConsultaProductos, ConsultaPantallaProductos } from "@/validaciones/validacion-pantalla-productos";

interface PropiedadesFiltrosCatalogoProductos {
  consulta: ConsultaPantallaProductos["catalogo"];
  categorias: CategoriaPublica[];
  esAdministrador: boolean;
  alCambiar: (cambios: CambiosConsultaProductos) => void;
}

export function FiltrosCatalogoProductos({ consulta, categorias, esAdministrador, alCambiar }: PropiedadesFiltrosCatalogoProductos) {
  const [busqueda, cambiarBusqueda] = usarEstado(consulta.q);
  usarEfecto(() => cambiarBusqueda(consulta.q), [consulta.q]);
  return <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-end">
    <form className="flex min-w-0 flex-1 gap-2" onSubmit={(evento) => { evento.preventDefault(); alCambiar({ q: busqueda }); }}>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Etiqueta htmlFor="buscar-productos">Código o descripción</Etiqueta>
        <Entrada id="buscar-productos" placeholder="Buscar productos…" value={busqueda} onChange={(evento) => cambiarBusqueda(evento.target.value)} />
      </div>
      <Boton type="submit" variant="outline" className="self-end">Buscar</Boton>
    </form>
    <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
      <div className="space-y-1.5 xl:w-48">
        <Etiqueta htmlFor="categoria-catalogo">Categoría</Etiqueta>
        <Selector value={consulta.categoriaId ? String(consulta.categoriaId) : "todas"} onValueChange={(valor) => alCambiar({ categoriaId: valor === "todas" ? null : valor })}>
          <SelectorDisparador id="categoria-catalogo"><SelectorValor /></SelectorDisparador>
          <SelectorContenido><SelectorOpcion value="todas">Todas las categorías</SelectorOpcion>
            {categorias.map((categoria) => <SelectorOpcion key={categoria.id} value={String(categoria.id)}>{categoria.nombre}{!categoria.activa && " (inactiva)"}</SelectorOpcion>)}
          </SelectorContenido>
        </Selector>
      </div>
      {esAdministrador && <div className="space-y-1.5 xl:w-36">
        <Etiqueta htmlFor="estado-catalogo">Estado</Etiqueta>
        <Selector value={consulta.activo} onValueChange={(valor) => alCambiar({ activo: valor })}>
          <SelectorDisparador id="estado-catalogo"><SelectorValor /></SelectorDisparador>
          <SelectorContenido><SelectorOpcion value="true">Activos</SelectorOpcion><SelectorOpcion value="false">Inactivos</SelectorOpcion><SelectorOpcion value="todos">Todos</SelectorOpcion></SelectorContenido>
        </Selector>
      </div>}
      <div className="flex min-h-10 items-center gap-2 sm:self-end">
        <Interruptor id="solo-bajo-minimo" etiqueta="Solo bajo mínimo" marcado={consulta.bajoMinimo === "true"} alCambiar={(marcado) => alCambiar({ bajoMinimo: marcado ? "true" : null })} />
        <Etiqueta htmlFor="solo-bajo-minimo">Solo bajo mínimo</Etiqueta>
      </div>
    </div>
  </div>;
}
