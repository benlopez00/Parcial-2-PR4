"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador } from "next/navigation";
import { useTransition as usarTransicion } from "react";
import { Plus as Mas, RefreshCw as Actualizar } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EncabezadoPagina } from "@/componentes/maquetacion/encabezado-pagina";
import type { DatosTablero } from "@/servicios/servicio-tablero";
import type { ListadoProductos } from "@/servicios/servicio-productos";
import { formatearFechaLarga } from "@/utilidades/formatos";
import { TarjetasIndicadores } from "./tarjetas-indicadores";
import { GraficoVentasDiarias } from "./grafico-ventas-diarias";
import { GraficoFormasPago } from "./grafico-formas-pago";
import { TablaMasVendidos } from "./tabla-mas-vendidos";
import { ListaReposicionStock } from "./lista-reposicion-stock";

export function PantallaTablero({ nombre, datos, reposicion }: { nombre: string; datos: DatosTablero; reposicion: ListadoProductos }) {
  const enrutador = usarEnrutador();
  const [pendiente, iniciarTransicion] = usarTransicion();
  const hoy = datos.ventasDiarias[29].fecha;
  return <ContenedorPagina ancho="completo">
    <EncabezadoPagina titulo={`Hola, ${nombre.split(/\s+/)[0]}`} descripcion={formatearFechaLarga(hoy)}
      acciones={<>
        <Boton variant="outline" disabled={pendiente} onClick={() => iniciarTransicion(() => enrutador.refresh())}><Actualizar className="size-4" />{pendiente ? "Actualizando…" : "Actualizar"}</Boton>
        <Boton comoHijo><Enlace href="/ventas/nueva"><Mas className="size-4" />Nueva venta</Enlace></Boton>
      </>} />
    <div aria-busy={pendiente} className="space-y-4">
      <TarjetasIndicadores datos={datos} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GraficoVentasDiarias ventas={datos.ventasDiarias} />
        <GraficoFormasPago ventas={datos.porFormaDePago} total={datos.mes.importe} fecha={hoy} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <TablaMasVendidos productos={datos.masVendidos} />
        <ListaReposicionStock listado={reposicion} />
      </div>
    </div>
  </ContenedorPagina>;
}
