import Enlace from "next/link";
import { Tarjeta, TarjetaEncabezado, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Titulo } from "@/componentes/maquetacion/titulo";
import type { ListadoProductos } from "@/servicios/servicio-productos";
import { formatearNumero } from "@/utilidades/formatos";

export function ListaReposicionStock({ listado }: { listado: ListadoProductos }) {
  return <Tarjeta className="min-w-0">
    <TarjetaEncabezado className="flex-row items-start justify-between gap-3 p-4">
      <div><Titulo nivel="h2" className="text-base">Para reponer</Titulo><p className="mt-1 text-sm text-muted-foreground">Productos bajo el stock mínimo</p></div>
      <Enlace href="/productos?bajoMinimo=true" className="shrink-0 text-sm font-medium text-primary underline-offset-4 hover:underline">Ver todos →</Enlace>
    </TarjetaEncabezado>
    <TarjetaContenido className="p-0">
      {listado.data.length ? <ul className="divide-y">{listado.data.map((producto) => <li key={producto.id} className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0"><Enlace href={`/productos/${producto.id}`} className="break-words text-sm font-medium text-primary underline-offset-4 hover:underline">{producto.descripcion}</Enlace><p className="font-mono text-xs text-muted-foreground">{producto.codigo}</p></div>
        <div className="shrink-0 text-right"><Insignia variant="warning" className="whitespace-nowrap">{formatearNumero(producto.existencia)} · bajo mínimo</Insignia><p className="mt-1 text-xs text-muted-foreground">Mínimo {formatearNumero(producto.stockMinimo)}</p></div>
      </li>)}</ul> : <p className="px-4 pb-4 text-sm text-muted-foreground">No hay productos activos bajo el mínimo.</p>}
      {listado.total > listado.data.length && <p className="px-4 py-3 text-xs text-muted-foreground">Mostrando {formatearNumero(listado.data.length)} de {formatearNumero(listado.total)} productos para reponer.</p>}
    </TarjetaContenido>
  </Tarjeta>;
}
