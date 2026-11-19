"use client";

import Enlace from "next/link";
import { useRouter as usarEnrutador } from "next/navigation";
import { useState as usarEstado } from "react";
import { Printer as Impresora, Ban as Prohibido } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Insignia } from "@/componentes/interfaz/insignia";
import { Alerta, AlertaDescripcion, AlertaTitulo } from "@/componentes/interfaz/alerta";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import { Titulo } from "@/componentes/maquetacion/titulo";
import type { FacturaPublica } from "@/servicios/servicio-facturas";
import { formatearFechaHora, formatearMoneda, formatearNumero } from "@/utilidades/formatos";
import { ModalAnularFactura } from "./modal-anular-factura";

interface PropiedadesVistaComprobanteFactura { factura: FacturaPublica; esAdministrador: boolean }

export function VistaComprobanteFactura({ factura, esAdministrador }: PropiedadesVistaComprobanteFactura) {
  const [modalAbierto, cambiarModalAbierto] = usarEstado(false);
  const [facturaAnulada, cambiarFacturaAnulada] = usarEstado<FacturaPublica | null>(null);
  const enrutador = usarEnrutador();
  const comprobante = facturaAnulada?.id === factura.id ? facturaAnulada : factura;
  const anulada = comprobante.estado === "anulada";
  const pago = comprobante.pago;
  return <ContenedorPagina className="print:max-w-none print:p-0">
    <div className="print:hidden">
      <Boton comoHijo variant="link" className="mb-3 px-0"><Enlace href="/ventas">← Facturas</Enlace></Boton>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Titulo nivel="h1">Factura {comprobante.numeroFormateado}</Titulo>
          <Insignia variant={anulada ? "destructive" : "success"}>{anulada ? "Anulada" : "Emitida"}</Insignia>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {esAdministrador && !anulada && <Boton variant="outline" className="text-destructive" onClick={() => cambiarModalAbierto(true)}><Prohibido className="size-4" />Anular</Boton>}
          <Boton variant="outline" onClick={() => window.print()}><Impresora className="size-4" />Imprimir</Boton>
        </div>
      </header>
    </div>
    <Tarjeta className="comprobante-factura mx-auto max-w-4xl print:max-w-none print:border-0 print:shadow-none">
      <TarjetaContenido className="space-y-6 p-4 sm:p-8 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">Ferretería del Centro S.R.L.</h2>
            <p className="text-sm text-muted-foreground">Av. Mitre 1234 · San Miguel de Tucumán</p>
            <p className="text-sm text-muted-foreground">CUIT 30-71555222-4 · Tel. 381 422-0000</p>
          </div>
          <div className="space-y-1 sm:text-right">
            <p className="font-semibold">FACTURA</p>
            <p className="font-mono font-semibold tabular-nums">N° {comprobante.numeroFormateado}</p>
            <p className="text-sm text-muted-foreground">{formatearFechaHora(comprobante.fecha)}</p>
            <Insignia variant={anulada ? "destructive" : "success"}>{anulada ? "Anulada" : "Emitida"}</Insignia>
          </div>
        </header>
        {comprobante.anulacion && <Alerta variant="destructive" className="break-words">
          <AlertaTitulo>Anulada el {formatearFechaHora(comprobante.anulacion.fecha)} por {comprobante.anulacion.usuario.nombre}</AlertaTitulo>
          <AlertaDescripcion>Motivo: {comprobante.anulacion.motivo}</AlertaDescripcion>
        </Alerta>}
        <dl className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          <div className="min-w-0 break-words">
            <dt className="text-sm text-muted-foreground">Cliente</dt>
            <dd className="font-medium">{comprobante.cliente?.nombre ?? "Consumidor final"}</dd>
            {comprobante.cliente && <dd className="text-sm text-muted-foreground">
              {comprobante.cliente.tipoDoc} {comprobante.cliente.nroDoc}
              {comprobante.cliente.domicilio ? ` · ${comprobante.cliente.domicilio}` : ""}
            </dd>}
          </div>
          <div className="min-w-0 break-words"><dt className="text-sm text-muted-foreground">Vendedor</dt><dd className="font-medium">{comprobante.vendedor.nombre}</dd></div>
        </dl>
        <Tabla aria-label="Renglones de la factura" className="tabla-comprobante">
          <TablaEncabezado><TablaFila>
            <TablaCeldaEncabezado>Código</TablaCeldaEncabezado><TablaCeldaEncabezado>Descripción</TablaCeldaEncabezado>
            <TablaCeldaEncabezado className="text-right">Cant.</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">P. unit.</TablaCeldaEncabezado>
            <TablaCeldaEncabezado className="text-right">Subtotal</TablaCeldaEncabezado>
          </TablaFila></TablaEncabezado>
          <TablaCuerpo>{comprobante.items.map((item) => <TablaFila key={item.productoId}>
            <TablaCelda className="font-mono text-xs">{item.codigo}</TablaCelda>
            <TablaCelda className="min-w-36 break-words">{item.descripcion}</TablaCelda>
            <TablaCelda className="text-right tabular-nums">{formatearNumero(item.cantidad)}</TablaCelda>
            <TablaCelda className="whitespace-nowrap text-right tabular-nums">{formatearMoneda(item.precioUnitario)}</TablaCelda>
            <TablaCelda className="whitespace-nowrap text-right tabular-nums">{formatearMoneda(item.subtotal)}</TablaCelda>
          </TablaFila>)}</TablaCuerpo>
        </Tabla>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="text-muted-foreground">Forma de pago</p>
            <p className="font-medium">{pago.forma === "contado" ? "Contado" : pago.forma === "tarjeta" ? "Tarjeta" : "Cuenta corriente"}</p>
            {pago.forma === "contado" && <><p>Recibido: {formatearMoneda(pago.montoRecibido)}</p><p>Vuelto: {formatearMoneda(pago.vuelto)}</p></>}
            {pago.forma === "tarjeta" && <p className="break-words">{pago.tarjeta.tipo === "debito" ? "Débito" : "Crédito"} · {pago.tarjeta.marca} · Terminada en {pago.tarjeta.ultimos4}</p>}
            {pago.forma === "cuenta_corriente" && <p>Saldo de la cuenta al emitir: {comprobante.saldoCliente === undefined ? "—" : formatearMoneda(comprobante.saldoCliente)}</p>}
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className={`break-words text-2xl font-semibold tabular-nums sm:text-3xl ${anulada ? "text-muted-foreground line-through" : ""}`}>{formatearMoneda(comprobante.total)}</p>
          </div>
        </div>
        <p className="border-t pt-4 text-center text-xs text-muted-foreground">Comprobante interno sin validez fiscal · Precios finales con impuestos incluidos</p>
      </TarjetaContenido>
    </Tarjeta>
    {modalAbierto && esAdministrador && !anulada && <ModalAnularFactura factura={comprobante} alCerrar={() => cambiarModalAbierto(false)}
      alCompletar={(resultado) => { cambiarFacturaAnulada(resultado); cambiarModalAbierto(false); enrutador.refresh(); }} />}
  </ContenedorPagina>;
}
