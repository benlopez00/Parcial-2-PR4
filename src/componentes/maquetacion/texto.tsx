import * as React from "react";
import { combinarEstilos } from "@/utilidades/clases";

export interface PropiedadesTexto extends React.HTMLAttributes<HTMLParagraphElement> {
  variante?: "normal" | "atenuado" | "pequeno" | "error";
  como?: "p" | "span";
}

const mapaVariantes = {
  normal: "text-sm text-foreground",
  atenuado: "text-sm text-muted-foreground",
  pequeno: "text-xs text-muted-foreground",
  error: "text-xs font-medium text-destructive",
} as const;

export function Texto({ variante = "normal", como = "p", className, ...props }: PropiedadesTexto) {
  const Etiqueta = como;
  return <Etiqueta className={combinarEstilos(mapaVariantes[variante], className)} {...props} />;
}
