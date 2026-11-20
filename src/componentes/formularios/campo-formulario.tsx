import * as React from "react";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Texto } from "@/componentes/maquetacion/texto";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesCampoFormulario {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function CampoFormulario({
  id,
  etiqueta,
  error,
  ayuda,
  obligatorio = false,
  className,
  children,
}: PropiedadesCampoFormulario) {
  return (
    <div className={combinarEstilos("space-y-1.5", className)}>
      <Etiqueta htmlFor={id} className="inline-flex items-center gap-1">
        <span>{etiqueta}</span>
        {obligatorio ? (
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </Etiqueta>
      {children}
      {error ? (
        <Texto id={`${id}-error`} variante="error" role="alert">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto id={`${id}-ayuda`} variante="pequeno">
          {ayuda}
        </Texto>
      ) : null}
    </div>
  );
}
