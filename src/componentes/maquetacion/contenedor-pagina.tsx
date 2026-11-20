import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesContenedorPagina extends React.HTMLAttributes<HTMLDivElement> {
  ancho?: "normal" | "angosto" | "completo";
}

export function ContenedorPagina({
  ancho = "normal",
  className,
  children,
  ...props
}: PropiedadesContenedorPagina) {
  return (
    <div
      className={combinarEstilos(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8",
        ancho === "angosto" && "max-w-3xl",
        ancho === "normal" && "max-w-7xl",
        ancho === "completo" && "max-w-none",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
