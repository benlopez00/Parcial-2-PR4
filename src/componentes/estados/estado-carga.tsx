import { Esqueleto } from "@/componentes/interfaz/esqueleto";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";

export interface PropiedadesEstadoCarga {
  filas?: number;
  mensaje?: string;
}

export function EstadoCarga({ filas = 5, mensaje = "Cargando información..." }: PropiedadesEstadoCarga) {
  return (
    <Tarjeta aria-busy="true" aria-label={mensaje}>
      <TarjetaContenido className="space-y-3 pt-6">
        <div className="flex flex-wrap gap-3">
          <Esqueleto className="h-10 w-64" />
          <Esqueleto className="h-10 w-36" />
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: filas }).map((_, indice) => (
            <Esqueleto key={indice} className="h-12 w-full" />
          ))}
        </div>
      </TarjetaContenido>
    </Tarjeta>
  );
}
