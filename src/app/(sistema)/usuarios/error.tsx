"use client";

import { EstadoError } from "@/componentes/estados/estado-error";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";

export default function ErrorUsuarios({ reset: reintentar }: { error: Error; reset: () => void }) {
  return (
    <ContenedorPagina>
      <EstadoError
        titulo="No pudimos cargar los usuarios"
        mensaje="Ocurrió un error al consultar el módulo de usuarios. Intentá nuevamente."
        alReintentar={reintentar}
      />
    </ContenedorPagina>
  );
}
