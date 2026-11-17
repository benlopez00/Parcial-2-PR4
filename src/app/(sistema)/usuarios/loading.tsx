import { EstadoCarga } from "@/componentes/estados/estado-carga";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";

export default function CargandoUsuarios() {
  return (
    <ContenedorPagina>
      <EstadoCarga filas={5} mensaje="Cargando usuarios..." />
    </ContenedorPagina>
  );
}
