import Enlace from "next/link";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { Boton } from "@/componentes/interfaz/boton";

export default function FacturaNoEncontrada() {
  return <ContenedorPagina><EstadoVacio titulo="Factura no encontrada" descripcion="Revisá el número o buscala en el listado."
    accion={<Boton comoHijo variant="outline"><Enlace href="/ventas">← Facturas</Enlace></Boton>} /></ContenedorPagina>;
}
