import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesGrilla extends React.HTMLAttributes<HTMLDivElement> {
  columnas?: 1 | 2 | 3 | 4;
  espacio?: "sm" | "md" | "lg";
}

const mapaColumnas = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

const mapaEspacios = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
} as const;

export function Grilla({ columnas = 2, espacio = "md", className, ...props }: PropiedadesGrilla) {
  return (
    <div
      className={combinarEstilos("grid", mapaColumnas[columnas], mapaEspacios[espacio], className)}
      {...props}
    />
  );
}
