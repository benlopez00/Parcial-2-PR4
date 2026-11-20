"use client";

import Enlace from "next/link";
import { useEffect as usarEfecto, useState as usarEstado } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Etiqueta } from "@/componentes/interfaz/etiqueta";
import { Tabla, TablaCelda, TablaCeldaEncabezado, TablaCuerpo, TablaEncabezado, TablaFila, TablaPie } from "@/componentes/interfaz/tabla";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import type { CuentaCorrienteCliente } from "@/servicios/servicio-pagos";
import { formatearFechaHora, formatearMoneda } from "@/utilidades/formatos";
import type { CambiosConsultaClientes, ConsultaFichaCliente } from "@/validaciones/validacion-pantalla-clientes";

interface PropiedadesPestanaCuentaCorriente {
  cuenta: CuentaCorrienteCliente;
  consulta: ConsultaFichaCliente;
  alCambiar: (cambios: CambiosConsultaClientes) => void;
}

export function PestanaCuentaCorriente({ cuenta, consulta, alCambiar }: PropiedadesPestanaCuentaCorriente) {
  const [desde, cambiarDesde] = usarEstado(consulta.desde ?? "");
  const [hasta, cambiarHasta] = usarEstado(consulta.hasta ?? "");
  usarEfecto(() => { cambiarDesde(consulta.desde ?? ""); cambiarHasta(consulta.hasta ?? ""); }, [consulta.desde, consulta.hasta]);
  const hayFiltro = Boolean(consulta.desde || consulta.hasta);

  return <>
    <form className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-end"
      onSubmit={(evento) => { evento.preventDefault(); alCambiar({ desde: desde || null, hasta: hasta || null }); }}>
      <div className="space-y-1.5 sm:w-44">
        <Etiqueta htmlFor="cuenta-desde">Desde</Etiqueta>
        <Entrada id="cuenta-desde" type="date" value={desde} onChange={(evento) => cambiarDesde(evento.target.value)} />
      </div>
      <div className="space-y-1.5 sm:w-44">
        <Etiqueta htmlFor="cuenta-hasta">Hasta</Etiqueta>
        <Entrada id="cuenta-hasta" type="date" value={hasta} onChange={(evento) => cambiarHasta(evento.target.value)} />
      </div>
      <Boton type="submit" variant="outline">Filtrar</Boton>
      {hayFiltro && <Boton type="button" variant="ghost" onClick={() => alCambiar({ desde: null, hasta: null })}>Limpiar</Boton>}
    </form>

    {cuenta.movimientos.length || cuenta.saldoAnterior !== 0 ? <Tabla>
      <TablaEncabezado><TablaFila>
        <TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado>
        <TablaCeldaEncabezado>Concepto</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Débito</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Crédito</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Saldo</TablaCeldaEncabezado>
      </TablaFila></TablaEncabezado>
      <TablaCuerpo>
        {/* Si el filtro corta el historial, el arrastre se muestra como primer renglón informativo. */}
        {hayFiltro && <TablaFila className="bg-muted/40">
          <TablaCelda className="text-muted-foreground">—</TablaCelda>
          <TablaCelda className="italic text-muted-foreground">Saldo anterior al período</TablaCelda>
          <TablaCelda /><TablaCelda />
          <TablaCelda className="text-right tabular-nums text-muted-foreground">{formatearMoneda(cuenta.saldoAnterior)}</TablaCelda>
        </TablaFila>}
        {cuenta.movimientos.map((movimiento, indice) => <TablaFila key={`${movimiento.fecha}-${indice}`}>
          <TablaCelda className="whitespace-nowrap text-muted-foreground">{formatearFechaHora(movimiento.fecha)}</TablaCelda>
          <TablaCelda className="min-w-52">
            {movimiento.facturaId !== null
              ? <Enlace className="text-primary underline-offset-4 hover:underline" href={`/ventas/${movimiento.facturaId}`}>{movimiento.descripcion}</Enlace>
              : movimiento.pagoId !== null
                ? <Enlace className="text-primary underline-offset-4 hover:underline" href={`/clientes/recibos/${movimiento.pagoId}`}>{movimiento.descripcion}</Enlace>
                : movimiento.descripcion}
          </TablaCelda>
          <TablaCelda className="whitespace-nowrap text-right tabular-nums">
            {movimiento.tipo === "debito" ? formatearMoneda(movimiento.importe) : <span className="text-muted-foreground">—</span>}
          </TablaCelda>
          <TablaCelda className="whitespace-nowrap text-right tabular-nums">
            {movimiento.tipo === "credito" ? formatearMoneda(movimiento.importe) : <span className="text-muted-foreground">—</span>}
          </TablaCelda>
          {/* El saldo acumulado lo calcula el servidor renglón por renglón (Regla 7). */}
          <TablaCelda className="whitespace-nowrap text-right font-medium tabular-nums">{formatearMoneda(movimiento.saldo)}</TablaCelda>
        </TablaFila>)}
      </TablaCuerpo>
      <TablaPie><TablaFila>
        <TablaCelda colSpan={4} className="font-medium">Saldo al cierre</TablaCelda>
        <TablaCelda className={`whitespace-nowrap text-right text-base font-semibold tabular-nums ${cuenta.saldo > 0 ? "text-destructive" : ""}`}>
          {formatearMoneda(cuenta.saldo)}
        </TablaCelda>
      </TablaFila></TablaPie>
    </Tabla> : <EstadoVacio titulo="Sin movimientos en la cuenta"
      descripcion={hayFiltro ? "No hay movimientos en el período elegido." : "Las ventas en cuenta corriente y los pagos van a aparecer acá."}
      accion={hayFiltro ? <Boton variant="outline" onClick={() => alCambiar({ desde: null, hasta: null })}>Limpiar filtros</Boton> : undefined} />}
  </>;
}
