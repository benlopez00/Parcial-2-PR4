import Enlace from "next/link";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { Boton } from "@/componentes/interfaz/boton";

export default function ReciboNoEncontrado() {
  return <ContenedorPagina><EstadoVacio titulo="Recibo no encontrado" descripcion="No existe un recibo con ese identificador."
    accion={<Boton comoHijo><Enlace href="/clientes">Volver a clientes</Enlace></Boton>} /></ContenedorPagina>;
}
