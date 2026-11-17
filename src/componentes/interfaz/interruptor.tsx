"use client";

import { combinarEstilos } from "@/utilidades/clases";

interface PropiedadesInterruptor {
  id: string;
  marcado: boolean;
  alCambiar: (marcado: boolean) => void;
  etiqueta: string;
  deshabilitado?: boolean;
}

export function Interruptor({ id, marcado, alCambiar, etiqueta, deshabilitado }: PropiedadesInterruptor) {
  return (
    <button id={id} type="button" role="switch" aria-checked={marcado} aria-label={etiqueta}
      disabled={deshabilitado} onClick={() => alCambiar(!marcado)}
      className={combinarEstilos("inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50", marcado ? "bg-primary" : "bg-input")}>
      <span className={combinarEstilos("pointer-events-none block size-5 rounded-full bg-background shadow transition-transform", marcado ? "translate-x-5" : "translate-x-0")} />
    </button>
  );
}
