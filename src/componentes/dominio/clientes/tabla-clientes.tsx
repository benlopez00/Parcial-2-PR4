"use client";

import Enlace from "next/link";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import { Boton } from "@/componentes/interfaz/boton";
import { Insignia } from "@/componentes/interfaz/insignia";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import { InsigniaEstado } from "@/componentes/formularios/insignia-estado";
import type { ListadoClientes } from "@/servicios/servicio-clientes";
import { formatearMoneda } from "@/utilidades/formatos";

interface PropiedadesTablaClientes {
  listado: ListadoClientes;
  alCambiarPagina: (pagina: number) => void;
  alLimpiar: () => void;
}

export function TablaClientes({ listado, alCambiarPagina, alLimpiar }: PropiedadesTablaClientes) {
  return <>
    {listado.data.length ? <Tabla>
      <TablaEncabezado><TablaFila>
        {["Documento", "Nombre o razón social", "Teléfono", "Cuenta", "Saldo"].map((columna, indice) =>
          <TablaCeldaEncabezado key={columna} className={indice === 4 ? "text-right" : ""}>{columna}</TablaCeldaEncabezado>)}
      </TablaFila></TablaEncabezado>
      <TablaCuerpo>{listado.data.map((cliente) => <TablaFila key={cliente.id}>
        <TablaCelda className="whitespace-nowrap font-mono text-xs">
          <span className="text-muted-foreground">{cliente.tipoDoc}</span> {cliente.nroDoc}
        </TablaCelda>
        <TablaCelda className="min-w-52">
          <Enlace className="font-medium text-primary underline-offset-4 hover:underline" href={`/clientes/${cliente.id}`}>{cliente.nombre}</Enlace>
          {!cliente.activo && <span className="ml-2"><InsigniaEstado tipo="inactivo" /></span>}
        </TablaCelda>
        <TablaCelda className="whitespace-nowrap text-muted-foreground">{cliente.telefono ?? "—"}</TablaCelda>
        <TablaCelda className="whitespace-nowrap">
          {cliente.cuentaCorriente ? <Insignia variant="secondary">Cta. cte.</Insignia> : <span className="text-muted-foreground">—</span>}
        </TablaCelda>
        {/* Regla 7: el saldo llega calculado desde los movimientos; acá solo se le da formato. */}
        <TablaCelda className={`whitespace-nowrap text-right tabular-nums ${cliente.saldo > 0 ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {formatearMoneda(cliente.saldo)}
        </TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla> : <EstadoVacio titulo="No hay clientes para mostrar" descripcion="Ajustá los filtros o cargá un cliente nuevo."
      accion={<Boton variant="outline" onClick={alLimpiar}>Limpiar filtros</Boton>} />}
    <PaginadorListado pagina={listado.page} tamanoPagina={listado.pageSize} total={listado.total}
      etiquetaElemento="clientes" alCambiarPagina={alCambiarPagina} />
  </>;
}
