"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alerta, AlertaDescripcion, AlertaTitulo } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";

export interface PropiedadesEstadoError {
  titulo?: string;
  mensaje?: string;
  alReintentar?: () => void;
}

export function EstadoError({
  titulo = "No pudimos cargar los datos",
  mensaje = "Ocurrió un problema al consultar la información. Intentá nuevamente.",
  alReintentar,
}: PropiedadesEstadoError) {
  return (
    <Alerta variant="destructive" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <AlertCircle className="size-4" />
      <div className="flex-1">
        <AlertaTitulo>{titulo}</AlertaTitulo>
        <AlertaDescripcion>{mensaje}</AlertaDescripcion>
      </div>
      {alReintentar ? (
        <Boton variant="outline" size="sm" onClick={alReintentar} className="shrink-0 bg-card text-foreground">
          <RefreshCw className="size-3.5" />
          Reintentar
        </Boton>
      ) : null}
    </Alerta>
  );
}
