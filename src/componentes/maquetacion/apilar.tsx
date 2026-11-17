import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesApilar extends React.HTMLAttributes<HTMLDivElement> {
  espacio?: "xs" | "sm" | "md" | "lg" | "xl";
}

const mapaEspacios = {
  xs: "gap-1.5",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
} as const;

export function Apilar({ espacio = "md", className, ...props }: PropiedadesApilar) {
  return <div className={combinarEstilos("flex flex-col", mapaEspacios[espacio], className)} {...props} />;
}
