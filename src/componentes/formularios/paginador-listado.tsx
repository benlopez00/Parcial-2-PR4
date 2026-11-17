"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Texto } from "@/componentes/maquetacion/texto";

export interface PropiedadesPaginadorListado {
  pagina: number;
  tamanoPagina: number;
  total: number;
  etiquetaElemento?: string;
  alCambiarPagina: (nuevaPagina: number) => void;
}

export function PaginadorListado({
  pagina,
  tamanoPagina,
  total,
  etiquetaElemento = "registros",
  alCambiarPagina,
}: PropiedadesPaginadorListado) {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * tamanoPagina + 1;
  const fin = Math.min(total, pagina * tamanoPagina);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Texto variante="pequeno">
        {total === 0
          ? `0 ${etiquetaElemento}`
          : `${inicio}–${fin} de ${total} ${etiquetaElemento}`}
      </Texto>
      {totalPaginas > 1 ? (
        <div className="flex items-center gap-2">
          <Boton
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => alCambiarPagina(pagina - 1)}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Boton>
          <Texto variante="pequeno" como="span" className="px-1">
            Página {pagina} de {totalPaginas}
          </Texto>
          <Boton
            type="button"
            variant="outline"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => alCambiarPagina(pagina + 1)}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Boton>
        </div>
      ) : null}
    </div>
  );
}
