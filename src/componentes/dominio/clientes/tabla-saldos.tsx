"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador } from "next/navigation";
import { useState as usarEstado, useTransition as usarTransicion } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Tabla, TablaCelda, TablaCeldaEncabezado, TablaCuerpo, TablaEncabezado, TablaFila } from "@/componentes/interfaz/tabla";
import { EstadoVacio } from "@/componentes/estados/estado-vacio";
import { PaginadorListado } from "@/componentes/formularios/paginador-listado";
import type { ClientePublico, ListadoClientes } from "@/servicios/servicio-clientes";
import { formatearMoneda } from "@/utilidades/formatos";
import { ModalRegistrarPago } from "./modal-registrar-pago";

interface PropiedadesTablaSaldos { listado: ListadoClientes }

export function TablaSaldos({ listado }: PropiedadesTablaSaldos) {
  const enrutador = usarEnrutador();
  const [, iniciarTransicion] = usarTransicion();
  const [clienteACobrar, cambiarClienteACobrar] = usarEstado<ClientePublico | null>(null);

  if (!listado.data.length) {
    return <EstadoVacio titulo="Nadie tiene deuda" descripcion="Ningún cliente tiene saldo pendiente en su cuenta corriente."
      accion={<Boton comoHijo variant="outline"><Enlace href="/clientes">Ver todos los clientes</Enlace></Boton>} />;
  }

  return <>
    <Tabla>
      <TablaEncabezado><TablaFila>
        <TablaCeldaEncabezado>Cliente</TablaCeldaEncabezado>
        <TablaCeldaEncabezado>Documento</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="hidden text-right xl:table-cell">Límite</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="hidden text-right xl:table-cell">Disponible</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Deuda</TablaCeldaEncabezado>
        <TablaCeldaEncabezado className="text-right">Acciones</TablaCeldaEncabezado>
      </TablaFila></TablaEncabezado>
      <TablaCuerpo>{listado.data.map((cliente) => <TablaFila key={cliente.id}>
        <TablaCelda className="min-w-48">
          <Enlace className="font-medium text-primary underline-offset-4 hover:underline" href={`/clientes/${cliente.id}?pestana=cuenta`}>{cliente.nombre}</Enlace>
        </TablaCelda>
        <TablaCelda className="whitespace-nowrap font-mono text-xs">
          <span className="text-muted-foreground">{cliente.tipoDoc}</span> {cliente.nroDoc}
        </TablaCelda>
        <TablaCelda className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground xl:table-cell">
          {cliente.limiteCredito === null ? <Insignia variant="secondary">Sin límite</Insignia> : formatearMoneda(cliente.limiteCredito)}
        </TablaCelda>
        <TablaCelda className="hidden whitespace-nowrap text-right tabular-nums text-muted-foreground xl:table-cell">
          {cliente.disponible === null ? "—" : formatearMoneda(cliente.disponible)}
        </TablaCelda>
        <TablaCelda className="whitespace-nowrap text-right font-medium tabular-nums text-destructive">{formatearMoneda(cliente.saldo)}</TablaCelda>
        <TablaCelda className="text-right">
          <Boton variant="outline" size="sm" onClick={() => cambiarClienteACobrar(cliente)}>Registrar pago</Boton>
        </TablaCelda>
      </TablaFila>)}</TablaCuerpo>
    </Tabla>
    <PaginadorListado pagina={listado.page} tamanoPagina={listado.pageSize} total={listado.total}
      etiquetaElemento="clientes con deuda" alCambiarPagina={(page) => iniciarTransicion(() => enrutador.push(`/clientes/saldos?page=${page}`, { scroll: false }))} />
    {clienteACobrar && <ModalRegistrarPago abierto cliente={clienteACobrar}
      alCambiarAbierto={(abierto) => !abierto && cambiarClienteACobrar(null)}
      alCompletar={(recibo) => enrutador.push(`/clientes/recibos/${recibo.id}`)} />}
  </>;
}
