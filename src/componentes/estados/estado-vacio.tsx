import * as React from "react";
import { Inbox } from "lucide-react";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Texto } from "@/componentes/maquetacion/texto";
import { Titulo } from "@/componentes/maquetacion/titulo";

export interface PropiedadesEstadoVacio {
  titulo?: string;
  descripcion?: string;
  accion?: React.ReactNode;
  icono?: React.ReactNode;
}

export function EstadoVacio({
  titulo = "No hay resultados",
  descripcion = "Probá ajustando los filtros de búsqueda o creá un nuevo registro.",
  accion,
  icono,
}: PropiedadesEstadoVacio) {
  return (
    <Tarjeta>
      <TarjetaContenido className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          {icono ?? <Inbox className="size-6" />}
        </div>
        <div className="max-w-md space-y-1">
          <Titulo nivel="h3">{titulo}</Titulo>
          <Texto variante="atenuado">{descripcion}</Texto>
        </div>
        {accion ? <div className="pt-2">{accion}</div> : null}
      </TarjetaContenido>
    </Tarjeta>
  );
}
