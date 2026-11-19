import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoCarga } from "@/componentes/estados/estado-carga";

export default function CargandoInicio() {
  return <ContenedorPagina><EstadoCarga filas={4} mensaje="Cargando información…" /></ContenedorPagina>;
}
