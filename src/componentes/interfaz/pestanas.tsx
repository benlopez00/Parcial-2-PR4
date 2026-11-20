"use client";

import { useRef as usarReferencia } from "react";
import { combinarEstilos } from "@/utilidades/clases";

interface PropiedadesPestanas<Valor extends string> {
  valor: Valor;
  opciones: readonly { valor: Valor; etiqueta: string }[];
  alCambiar: (valor: Valor) => void;
  etiqueta: string;
}

export function Pestanas<Valor extends string>({ valor, opciones, alCambiar, etiqueta }: PropiedadesPestanas<Valor>) {
  const botones = usarReferencia<(HTMLButtonElement | null)[]>([]);
  return <div role="tablist" aria-label={etiqueta} className="mb-5 flex gap-1 overflow-x-auto border-b">
    {opciones.map((opcion, indice) => <button key={opcion.valor} type="button" role="tab"
      ref={(elemento) => { botones.current[indice] = elemento; }}
      id={`pestana-${opcion.valor}`} aria-controls={`panel-${opcion.valor}`} aria-selected={valor === opcion.valor}
      tabIndex={valor === opcion.valor ? 0 : -1} onClick={() => alCambiar(opcion.valor)}
      onKeyDown={(evento) => {
        const desplazamiento = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
        if (!desplazamiento && evento.key !== "Home" && evento.key !== "End") return;
        evento.preventDefault();
        const siguiente = evento.key === "Home" ? 0 : evento.key === "End" ? opciones.length - 1 : (indice + desplazamiento + opciones.length) % opciones.length;
        botones.current[siguiente]?.focus();
        alCambiar(opciones[siguiente].valor);
      }}
      className={combinarEstilos("shrink-0 cursor-pointer border-b-2 px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", valor === opcion.valor ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
      {opcion.etiqueta}
    </button>)}
  </div>;
}
