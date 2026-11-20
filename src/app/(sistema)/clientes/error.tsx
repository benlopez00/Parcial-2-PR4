"use client";

import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";

export default function ErrorClientes({ reset: reintentar }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ContenedorPagina><EstadoError alReintentar={reintentar} /></ContenedorPagina>;
}
