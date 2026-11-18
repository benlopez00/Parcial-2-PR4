"use client";

import { EstadoError } from "@/componentes/estados/estado-error";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";

export default function ErrorNuevaVenta({ reset: reintentar }: { reset: () => void }) {
  return <ContenedorPagina><EstadoError mensaje="No pudimos cargar Nueva Venta." alReintentar={reintentar} /></ContenedorPagina>;
}
