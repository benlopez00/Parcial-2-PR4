import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoCarga } from "@/componentes/estados/estado-carga";

export default function CargaProductos() {
  return <ContenedorPagina><EstadoCarga mensaje="Cargando productos…" /></ContenedorPagina>;
}
