"use client";

import { EstadoError } from "@/componentes/estados/estado-error";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";

export default function ErrorFacturas({ reset: reintentar }: { reset: () => void }) {
  return <ContenedorPagina><EstadoError mensaje="No pudimos consultar las facturas. Intentá nuevamente." alReintentar={reintentar} /></ContenedorPagina>;
}
