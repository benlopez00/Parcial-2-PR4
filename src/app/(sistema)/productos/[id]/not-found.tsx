import Enlace from "next/link";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { Boton } from "@/componentes/interfaz/boton";

export default function ProductoNoEncontrado() {
  return <ContenedorPagina><EstadoVacio titulo="Producto no encontrado" descripcion="No existe un producto con ese identificador."
    accion={<Boton comoHijo><Enlace href="/productos">Volver a productos</Enlace></Boton>} /></ContenedorPagina>;
}
