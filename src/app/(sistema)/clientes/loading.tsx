import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoCarga } from "@/componentes/estados/estado-carga";

export default function CargaClientes() {
  return <ContenedorPagina><EstadoCarga mensaje="Cargando clientes…" /></ContenedorPagina>;
}
