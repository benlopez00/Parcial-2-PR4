"use client";

import Enlace from "next/link";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Boton } from "@/componentes/interfaz/boton";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import type { ListadoMovimientosStockPantalla, MovimientoStockPantalla } from "@/servicios/servicio-stock";
import { formatearCantidadConSigno, formatearFechaHora } from "@/utilidades/formatos";

interface PropiedadesTablaMovimientosStock {
  listado: ListadoMovimientosStockPantalla;
  mostrarProducto?: boolean;
  alCambiarPagina: (pagina: number) => void;
  alLimpiar?: () => void;
}
const tiposMovimiento: Record<MovimientoStockPantalla["tipo"], { etiqueta: string; variante: "success" | "warning" | "info" | "secondary" }> = {
  ingreso: { etiqueta: "Ingreso", variante: "success" }, egreso: { etiqueta: "Egreso", variante: "warning" },
  venta: { etiqueta: "Venta", variante: "info" }, anulacion: { etiqueta: "Anulación", variante: "secondary" },
};

export function TablaMovimientosStock({ listado, mostrarProducto = true, alCambiarPagina, alLimpiar }: PropiedadesTablaMovimientosStock) {
  return <>
    {listado.data.length ? <Tabla>
      <TablaEncabezado><TablaFila>
        <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>{mostrarProducto && <TablaCeldaEncabezado>Producto</TablaCeldaEncabezado>}
        <TablaCeldaEncabezado>Tipo</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Cantidad</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Existencia</TablaCeldaEncabezado><TablaCeldaEncabezado>Motivo / referencia</TablaCeldaEncabezado><TablaCeldaEncabezado>Usuario</TablaCeldaEncabezado>
      </TablaFila></TablaEncabezado>
      <TablaCuerpo>{listado.data.map((movimiento) => <TablaFila key={movimiento.id}>
        <TablaCelda className="whitespace-nowrap tabular-nums">{formatearFechaHora(movimiento.fecha)}</TablaCelda>
        {mostrarProducto && <TablaCelda className="min-w-56"><Enlace href={`/productos/${movimiento.producto.id}`} className="hover:underline"><span className="mr-2 font-mono text-xs text-muted-foreground">{movimiento.producto.codigo}</span>{movimiento.producto.descripcion}</Enlace></TablaCelda>}
        <TablaCelda><Insignia variant={tiposMovimiento[movimiento.tipo].variante}>{tiposMovimiento[movimiento.tipo].etiqueta}</Insignia></TablaCelda>
        <TablaCelda className={`text-right font-medium tabular-nums ${movimiento.cantidad < 0 ? "text-destructive" : "text-emerald-700"}`}>{formatearCantidadConSigno(movimiento.cantidad)}</TablaCelda>
        <TablaCelda className="text-right tabular-nums">{movimiento.existenciaResultante}</TablaCelda>
        <TablaCelda className="min-w-44">{movimiento.referencia ? <Enlace className="text-primary hover:underline" href={`/ventas/${movimiento.referencia.facturaId}`}>Factura {movimiento.referencia.numero}</Enlace> : movimiento.motivo}
          {movimiento.observacion && <p className="mt-1 text-xs text-muted-foreground">{movimiento.observacion}</p>}</TablaCelda>
        <TablaCelda className="whitespace-nowrap">{movimiento.usuario.nombre}</TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla> : <EstadoVacio titulo="No hay movimientos" descripcion="Los movimientos aparecerán al registrar ingresos, egresos, ventas o anulaciones."
      accion={alLimpiar && <Boton variant="outline" onClick={alLimpiar}>Limpiar filtros</Boton>} />}
    <PaginadorListado pagina={listado.page} tamanoPagina={listado.pageSize} total={listado.total} etiquetaElemento="movimientos" alCambiarPagina={alCambiarPagina} />
  </>;
}
