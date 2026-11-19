import { EstadoCarga } from "@/componentes/estados/estado-carga";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";

export default function CargandoFacturas() {
  return <ContenedorPagina><EstadoCarga mensaje="Cargando facturas…" /></ContenedorPagina>;
}
