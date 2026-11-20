import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesTitulo extends React.HTMLAttributes<HTMLHeadingElement> {
  nivel?: "h1" | "h2" | "h3";
}

const mapaEstilos = {
  h1: "text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
  h2: "text-lg font-semibold tracking-tight text-foreground",
  h3: "text-base font-semibold text-foreground",
} as const;

export function Titulo({ nivel = "h2", className, ...props }: PropiedadesTitulo) {
  const Etiqueta = nivel;
  return <Etiqueta className={combinarEstilos(mapaEstilos[nivel], className)} {...props} />;
}
