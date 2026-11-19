"use client";

import { Chart as RegistroGraficos, ArcElement as Arco, Tooltip as Ayuda, type ChartOptions as OpcionesGrafico } from "chart.js";
import { Doughnut as GraficoDona } from "react-chartjs-2";
import { Tarjeta, TarjetaEncabezado, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Titulo } from "@/componentes/maquetacion/titulo";
import type { DatosTablero, FormaPagoTablero } from "@/servicios/servicio-tablero";
import { formatearMesAnio, formatearMoneda, formatearPorcentaje } from "@/utilidades/formatos";

RegistroGraficos.register(Arco, Ayuda);
const formas: Record<FormaPagoTablero, { nombre: string; color: string }> = {
  contado: { nombre: "Contado", color: "#0f766e" },
  tarjeta: { nombre: "Tarjeta", color: "#d09a38" },
  cuenta_corriente: { nombre: "Cuenta corriente", color: "#7c8794" },
};
const opciones: OpcionesGrafico<"doughnut"> = {
  responsive: true, maintainAspectRatio: false, animation: false, cutout: "72%",
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (dato) => `${dato.label}: ${formatearMoneda(dato.parsed)}` } } },
};

export function GraficoFormasPago({ ventas, total, fecha }: { ventas: DatosTablero["porFormaDePago"]; total: number; fecha: string }) {
  return <Tarjeta className="min-w-0">
    <TarjetaEncabezado className="p-4 pb-2"><Titulo nivel="h2" className="text-base">Por forma de pago</Titulo><p className="text-sm text-muted-foreground">{formatearMesAnio(fecha)}</p></TarjetaEncabezado>
    <TarjetaContenido className="space-y-4 p-4 pt-2">
      <div className="relative mx-auto h-32 w-full max-w-56">
        <GraficoDona role="img" aria-label={`Ventas emitidas del mes: ${formatearMoneda(total)}. Desglose por forma de pago debajo del gráfico.`}
          options={opciones} data={{ labels: ventas.map((venta) => formas[venta.forma].nombre), datasets: [{ data: ventas.map((venta) => venta.importe), backgroundColor: ventas.map((venta) => formas[venta.forma].color), borderWidth: 2, borderColor: "#ffffff" }] }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-muted-foreground">Total</span><span className="max-w-20 break-words text-xs font-semibold tabular-nums">{formatearMoneda(total)}</span>
        </div>
      </div>
      <dl className="space-y-2">
        {ventas.map((venta) => <div key={venta.forma} className="flex items-center justify-between gap-3 text-sm">
          <dt className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: formas[venta.forma].color }} />{formas[venta.forma].nombre}</dt>
          <dd className="shrink-0 text-right tabular-nums"><span className="block">{formatearMoneda(venta.importe)}</span><span className="text-xs text-muted-foreground">{formatearPorcentaje(venta.importe, total)}</span></dd>
        </div>)}
      </dl>
      {total === 0 && <p className="text-sm text-muted-foreground">Sin importes de ventas este mes.</p>}
    </TarjetaContenido>
  </Tarjeta>;
}
