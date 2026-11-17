"use client";

import Enlace from "next/link";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import { Boton } from "@/componentes/interfaz/boton";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import type { ListadoProductos } from "@/servicios/servicio-productos";
import { formatearMoneda } from "@/utilidades/formatos";

interface PropiedadesTablaCatalogoProductos { listado: ListadoProductos; alCambiarPagina: (pagina: number) => void; alLimpiar: () => void }

export function TablaCatalogoProductos({ listado, alCambiarPagina, alLimpiar }: PropiedadesTablaCatalogoProductos) {
  return <>
    {listado.data.length ? <Tabla>
      <TablaEncabezado><TablaFila>{["Código", "Descripción", "Categoría", "Precio", "Existencia", "Mínimo"].map((columna, indice) =>
        <TablaCeldaEncabezado key={columna} className={indice >= 3 ? "text-right" : ""}>{columna}</TablaCeldaEncabezado>)}</TablaFila></TablaEncabezado>
      <TablaCuerpo>{listado.data.map((producto) => <TablaFila key={producto.id}>
        <TablaCelda className="whitespace-nowrap font-mono text-xs">{producto.codigo}</TablaCelda>
        <TablaCelda className="min-w-52"><Enlace className="font-medium text-primary underline-offset-4 hover:underline" href={`/productos/${producto.id}`}>{producto.descripcion}</Enlace>
          {!producto.activo && <span className="ml-2"><InsigniaEstado tipo="inactivo" /></span>}</TablaCelda>
        <TablaCelda className="whitespace-nowrap">{producto.categoria.nombre}</TablaCelda>
        <TablaCelda className="whitespace-nowrap text-right tabular-nums">{formatearMoneda(producto.precio)}</TablaCelda>
        <TablaCelda className="whitespace-nowrap text-right tabular-nums">{producto.bajoMinimo ? <InsigniaEstado tipo="alerta" etiqueta={`${producto.existencia} · bajo mínimo`} /> : producto.existencia}</TablaCelda>
        <TablaCelda className="text-right tabular-nums text-muted-foreground">{producto.stockMinimo}</TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla> : <EstadoVacio titulo="No hay productos para mostrar" descripcion="Ajustá los filtros para consultar otros productos."
      accion={<Boton variant="outline" onClick={alLimpiar}>Limpiar filtros</Boton>} />}
    <PaginadorListado pagina={listado.page} tamanoPagina={listado.pageSize} total={listado.total} etiquetaElemento="productos" alCambiarPagina={alCambiarPagina} />
  </>;
}
