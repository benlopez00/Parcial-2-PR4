import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesAlinear extends React.HTMLAttributes<HTMLDivElement> {
  espacio?: "xs" | "sm" | "md" | "lg";
  justificar?: "inicio" | "centro" | "fin" | "entre";
  alinear?: "inicio" | "centro" | "fin" | "estirar";
  envolver?: boolean;
}

const mapaEspacios = {
  xs: "gap-1.5",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
} as const;

const mapaJustificar = {
  inicio: "justify-start",
  centro: "justify-center",
  fin: "justify-end",
  entre: "justify-between",
} as const;

const mapaAlinear = {
  inicio: "items-start",
  centro: "items-center",
  fin: "items-end",
  estirar: "items-stretch",
} as const;

export function Alinear({
  espacio = "sm",
  justificar = "inicio",
  alinear = "centro",
  envolver = false,
  className,
  ...props
}: PropiedadesAlinear) {
  return (
    <div
      className={combinarEstilos(
        "flex",
        mapaEspacios[espacio],
        mapaJustificar[justificar],
        mapaAlinear[alinear],
        envolver && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
}
