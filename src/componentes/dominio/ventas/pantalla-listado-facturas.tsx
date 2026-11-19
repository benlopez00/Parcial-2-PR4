"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador, useSearchParams as usarParametrosBusqueda } from "next/navigation";
import { useTransition as usarTransicion } from "react";
import { Plus as Mas } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { ListadoFacturas, OpcionesListadoFacturas } from "@/servicios/servicio-facturas";
import { construirUrlFacturas, type CambiosConsultaFacturas, type ConsultaListadoFacturas } from "@/utilidades/consultas-facturas";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";
import { FiltrosListadoFacturas } from "./filtros-listado-facturas";
import { TablaListadoFacturas } from "./tabla-listado-facturas";

interface PropiedadesPantallaListadoFacturas {
  consulta: ConsultaListadoFacturas;
  listado: ListadoFacturas;
  opciones: OpcionesListadoFacturas;
}

export function PantallaListadoFacturas({ consulta, listado, opciones }: PropiedadesPantallaListadoFacturas) {
  const enrutador = usarEnrutador();
  const parametros = usarParametrosBusqueda();
  const [pendiente, iniciarTransicion] = usarTransicion();
  function navegar(cambios: CambiosConsultaFacturas): void {
    iniciarTransicion(() => enrutador.push(construirUrlFacturas(new URLSearchParams(parametros), cambios), { scroll: false }));
  }
  return <ContenedorPagina ancho="completo">
    <EncabezadoPagina titulo="Facturas"
      descripcion={`${formatearNumero(listado.total)} comprobantes · ${formatearMoneda(listado.totalEmitido)} emitidos con estos filtros`}
      acciones={<Boton comoHijo><Enlace href="/ventas/nueva"><Mas className="size-4" />Nueva venta</Enlace></Boton>} />
    <Tarjeta aria-busy={pendiente} className="overflow-hidden">
      <FiltrosListadoFacturas key={JSON.stringify(consulta)} consulta={consulta} opciones={opciones} pendiente={pendiente} alAplicar={navegar} />
      {pendiente && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">Actualizando facturas…</p>}
      <TablaListadoFacturas listado={listado} alCambiarPagina={(page) => navegar({ page })} />
    </Tarjeta>
  </ContenedorPagina>;
}
