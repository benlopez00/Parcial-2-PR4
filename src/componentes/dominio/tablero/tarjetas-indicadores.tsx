import Enlace from "next/link";
import { AlertTriangle as Advertencia } from "lucide-react";
import { Tarjeta, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import type { DatosTablero } from "@/servicios/servicio-tablero";
import { formatearMoneda, formatearNumero } from "@/utilidades/formatos";

export function TarjetasIndicadores({ datos }: { datos: DatosTablero }) {
  const indicadores = [
    { titulo: "Ventas de hoy", valor: formatearMoneda(datos.hoy.importe), detalle: `${formatearNumero(datos.hoy.cantidad)} facturas`, enlace: "/ventas" },
    { titulo: "Ventas del mes", valor: formatearMoneda(datos.mes.importe), detalle: `${formatearNumero(datos.mes.cantidad)} facturas`, adicional: `Ticket promedio ${formatearMoneda(datos.mes.ticketPromedio)}`, enlace: "/ventas" },
    { titulo: "Deuda en cuentas corrientes", valor: formatearMoneda(datos.cuentasCorrientes.totalAdeudado), detalle: `${formatearNumero(datos.cuentasCorrientes.clientesConSaldo)} clientes con saldo`, enlace: "/clientes/saldos" },
    { titulo: "Bajo stock mínimo", valor: formatearNumero(datos.bajoMinimo.cantidad), detalle: "Productos para reponer", enlace: "/productos?bajoMinimo=true" },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {indicadores.map((indicador, indice) => <Tarjeta key={indicador.titulo}>
      <TarjetaContenido className="space-y-3 p-4">
        <p className="flex items-start justify-between gap-2 text-sm text-muted-foreground">
          <Enlace href={indicador.enlace} className="underline-offset-4 hover:underline">{indicador.titulo}</Enlace>
          {indice === 3 && datos.bajoMinimo.cantidad > 0 && <Advertencia className="size-4 shrink-0 text-amber-700" aria-label="Hay productos para reponer" />}
        </p>
        <p className="break-words text-2xl font-semibold tabular-nums">{indicador.valor}</p>
        <div className="text-xs text-muted-foreground"><p>{indicador.detalle}</p>{indicador.adicional && <p className="mt-1">{indicador.adicional}</p>}</div>
      </TarjetaContenido>
    </Tarjeta>)}
  </div>;
}
