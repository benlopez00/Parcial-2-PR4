"use client";

import { startTransition as iniciarTransicion } from "react";
import { useRouter as usarEnrutador } from "next/navigation";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoError } from "@/componentes/estados/estado-error";

export default function ErrorInicio({ reset: reintentar }: { reset: () => void }) {
  const enrutador = usarEnrutador();
  return <ContenedorPagina><EstadoError alReintentar={() => iniciarTransicion(() => {
    enrutador.refresh();
    reintentar();
  })} /></ContenedorPagina>;
}
