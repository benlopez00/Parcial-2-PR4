import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";
import { Texto } from "./texto";
import { Titulo } from "./titulo";

export interface PropiedadesEncabezadoPagina {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  className?: string;
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
  className,
}: PropiedadesEncabezadoPagina) {
  return (
    <header
      className={combinarEstilos(
        "mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <Titulo nivel="h1">{titulo}</Titulo>
        {descripcion ? <Texto variante="atenuado">{descripcion}</Texto> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </header>
  );
}
