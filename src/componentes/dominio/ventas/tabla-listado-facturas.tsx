"use client";

import Enlace from "next/link";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Boton } from "@/componentes/interfaz/boton";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import type { ListadoFacturas } from "@/servicios/servicio-facturas";
import { formatearFechaHora, formatearMoneda } from "@/utilidades/formatos";

interface PropiedadesTablaListadoFacturas {
  listado: ListadoFacturas;
  alCambiarPagina: (pagina: number) => void;
}

const FORMAS_PAGO = {
  contado: { etiqueta: "Contado", variante: "success" },
  tarjeta: { etiqueta: "Tarjeta", variante: "info" },
  cuenta_corriente: { etiqueta: "Cuenta corriente", variante: "warning" },
} as const;

export function TablaListadoFacturas({ listado, alCambiarPagina }: PropiedadesTablaListadoFacturas) {
  return <>
    {listado.data.length ? <Tabla aria-label="Listado de facturas">
      <TablaEncabezado><TablaFila>
        {["Número", "Fecha", "Cliente", "Vendedor", "Forma de pago", "Total", "Estado"].map((columna) =>
          <TablaCeldaEncabezado key={columna} className={columna === "Total" ? "text-right" : ""}>{columna}</TablaCeldaEncabezado>)}
      </TablaFila></TablaEncabezado>
      <TablaCuerpo>{listado.data.map((factura) => <TablaFila key={factura.id}>
        <TablaCelda className="sticky left-0 whitespace-nowrap bg-card font-mono tabular-nums">
          <Enlace className="font-medium text-primary underline-offset-4 hover:underline" href={`/ventas/${factura.id}`}>{factura.numeroFormateado}</Enlace>
        </TablaCelda>
        <TablaCelda className="whitespace-nowrap tabular-nums">{formatearFechaHora(factura.fecha)}</TablaCelda>
        <TablaCelda className="min-w-44">{factura.cliente?.nombre ?? "Consumidor final"}</TablaCelda>
        <TablaCelda className="min-w-36">{factura.vendedor.nombre}</TablaCelda>
        <TablaCelda><Insignia className="whitespace-nowrap" variant={FORMAS_PAGO[factura.formaPago].variante}>{FORMAS_PAGO[factura.formaPago].etiqueta}</Insignia></TablaCelda>
        <TablaCelda className={`whitespace-nowrap text-right tabular-nums ${factura.estado === "anulada" ? "text-muted-foreground line-through" : "font-medium"}`}>
          {formatearMoneda(factura.total)}
        </TablaCelda>
        <TablaCelda><Insignia variant={factura.estado === "emitida" ? "success" : "destructive"}>{factura.estado === "emitida" ? "Emitida" : "Anulada"}</Insignia></TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla> : <EstadoVacio titulo="No hay facturas para mostrar" descripcion="Probá otros filtros o registrá una nueva venta."
      accion={<Boton comoHijo variant="outline"><Enlace href="/ventas">Limpiar filtros</Enlace></Boton>} />}
    <PaginadorListado pagina={listado.page} tamanoPagina={listado.pageSize} total={listado.total}
      etiquetaElemento="facturas" alCambiarPagina={alCambiarPagina} />
  </>;
}
