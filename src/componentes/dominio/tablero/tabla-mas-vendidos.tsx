import Enlace from "next/link";
import { Tarjeta, TarjetaEncabezado, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Titulo } from "@/componentes/maquetacion/titulo";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import type { DatosTablero } from "@/servicios/servicio-tablero";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";

export function TablaMasVendidos({ productos }: { productos: DatosTablero["masVendidos"] }) {
  return <Tarjeta className="min-w-0">
    <TarjetaEncabezado className="p-4"><Titulo nivel="h2" className="text-base">Más vendidos del mes</Titulo><p className="text-sm text-muted-foreground">Por unidades · Hasta 5 productos</p></TarjetaEncabezado>
    <TarjetaContenido className="p-0">
      {productos.length ? <Tabla aria-label="Cinco productos más vendidos del mes"><TablaEncabezado><TablaFila>
        <TablaCeldaEncabezado>#</TablaCeldaEncabezado><TablaCeldaEncabezado>Producto</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Unidades</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Importe</TablaCeldaEncabezado>
      </TablaFila></TablaEncabezado><TablaCuerpo>{productos.map((producto, indice) => <TablaFila key={producto.productoId}>
        <TablaCelda className="text-right tabular-nums">{formatearNumero(indice + 1)}</TablaCelda>
        <TablaCelda className="min-w-36"><Enlace href={`/productos/${producto.productoId}`} className="font-medium text-primary underline-offset-4 hover:underline">{producto.descripcion}</Enlace><p className="font-mono text-xs text-muted-foreground">{producto.codigo}</p></TablaCelda>
        <TablaCelda className="text-right tabular-nums">{formatearNumero(producto.unidades)}</TablaCelda><TablaCelda className="whitespace-nowrap text-right tabular-nums">{formatearMoneda(producto.importe)}</TablaCelda>
      </TablaFila>)}</TablaCuerpo></Tabla> : <p className="px-4 pb-4 text-sm text-muted-foreground">Todavía no hay productos vendidos este mes.</p>}
    </TarjetaContenido>
  </Tarjeta>;
}
