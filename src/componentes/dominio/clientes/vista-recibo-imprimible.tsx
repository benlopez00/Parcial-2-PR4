"use client";

import Enlace from "next/link";
import { Printer as Impresora } from "lucide-react";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { ContenedorPagina } from "@/componentes/maquetacion/contenedor-pagina";
import type { ReciboPago } from "@/servicios/servicio-pagos";
import { formatearFechaHora, formatearMoneda } from "@/utilidades/formatos";

const ETIQUETAS_MEDIO: Record<ReciboPago["medio"], string> = {
  efectivo: "Efectivo", transferencia: "Transferencia", tarjeta_debito: "Tarjeta de débito",
};

interface PropiedadesVistaReciboImprimible { recibo: ReciboPago }

export function VistaReciboImprimible({ recibo }: PropiedadesVistaReciboImprimible) {
  const datos = [
    { etiqueta: "Recibimos de", valor: recibo.cliente.nombre },
    { etiqueta: "Atendió", valor: recibo.usuario.nombre },
    { etiqueta: "Concepto", valor: "Pago a cuenta corriente" },
    { etiqueta: "Medio", valor: ETIQUETAS_MEDIO[recibo.medio] },
    ...(recibo.observacion ? [{ etiqueta: "Observación", valor: recibo.observacion }] : []),
  ];

  return <ContenedorPagina ancho="angosto">
    {/* print:hidden saca de la impresión todo lo que es navegación de pantalla. */}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
      <Boton comoHijo variant="link" className="px-0">
        <Enlace href={`/clientes/${recibo.cliente.id}?pestana=cuenta`}>← Cuenta corriente</Enlace>
      </Boton>
      <Boton variant="outline" onClick={() => window.print()}><Impresora className="size-4" />Imprimir</Boton>
    </div>

    <Tarjeta className="print:border-0 print:shadow-none">
      <TarjetaContenido className="space-y-6 p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div>
            <p className="text-lg font-semibold">Ferretería del Centro</p>
            <p className="text-sm text-muted-foreground">Av. Mitre 1234 · San Miguel de Tucumán</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground">RECIBO</p>
            <p className="font-mono text-lg font-semibold tabular-nums">N° {recibo.numeroRecibo}</p>
            <p className="text-sm text-muted-foreground">{formatearFechaHora(recibo.fecha)}</p>
          </div>
        </header>

        <dl className="grid gap-3 sm:grid-cols-2">
          {datos.map((dato) => <div key={dato.etiqueta} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{dato.etiqueta}</dt>
            <dd className="break-words font-medium">{dato.valor}</dd>
          </div>)}
        </dl>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-sm text-muted-foreground">Importe recibido</p>
            <p className="text-3xl font-semibold tabular-nums">{formatearMoneda(recibo.importe)}</p>
          </div>
          <div className="text-right">
            {/* El saldo del recibo queda congelado al momento de emitirlo, igual que el precio en una factura. */}
            <p className="text-sm text-muted-foreground">Saldo de la cuenta tras este pago</p>
            <p className={`text-xl font-semibold tabular-nums ${recibo.saldoCliente > 0 ? "text-destructive" : ""}`}>
              {formatearMoneda(recibo.saldoCliente)}
            </p>
          </div>
        </div>

        <p className="border-t pt-4 text-center text-xs text-muted-foreground">
          Comprobante interno sin validez fiscal.
        </p>
      </TarjetaContenido>
    </Tarjeta>
  </ContenedorPagina>;
}
