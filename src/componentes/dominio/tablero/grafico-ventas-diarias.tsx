"use client";

import { Chart as RegistroGraficos, BarElement as Barra, CategoryScale as EscalaCategorias, LinearScale as EscalaNumerica, Tooltip as Ayuda, type ChartOptions as OpcionesGrafico } from "chart.js";
import { Bar as GraficoBarras } from "react-chartjs-2";
import { Tarjeta, TarjetaEncabezado, TarjetaContenido } from "@/componentes/interfaz/tarjeta";
import { Titulo } from "@/componentes/maquetacion/titulo";
import { Tabla, TablaEncabezado, TablaCuerpo, TablaFila, TablaCelda, TablaCeldaEncabezado } from "@/componentes/interfaz/tabla";
import type { DatosTablero } from "@/servicios/servicio-tablero";
import { formatearDiaMes, formatearEjeVentas, formatearFecha, formatearMoneda } from "@/utilidades/formatos";

RegistroGraficos.register(Barra, EscalaCategorias, EscalaNumerica, Ayuda);

const opciones: OpcionesGrafico<"bar"> = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { display: false }, tooltip: { callbacks: { label: (dato) => formatearMoneda(dato.parsed.y ?? 0) } } },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 6, maxRotation: 0, color: "#5f6368" } },
    y: { beginAtZero: true, border: { display: false }, grid: { color: "#e8edeb" }, ticks: { precision: 0, maxTicksLimit: 5, color: "#5f6368", callback: (valor) => formatearEjeVentas(Number(valor)) } },
  },
};

export function GraficoVentasDiarias({ ventas }: { ventas: DatosTablero["ventasDiarias"] }) {
  return <Tarjeta className="min-w-0">
    <TarjetaEncabezado className="p-4 pb-2"><Titulo nivel="h2" className="text-base">Ventas diarias</Titulo><p className="text-sm text-muted-foreground">Últimos 30 días · {formatearFecha(ventas[0].fecha)} al {formatearFecha(ventas[29].fecha)}</p></TarjetaEncabezado>
    <TarjetaContenido className="space-y-3 p-4 pt-2">
      <div className="relative h-52">
        <GraficoBarras role="img" aria-label="Importes de ventas emitidas por día. Los valores completos están en Ver datos por día."
          options={opciones} data={{
            labels: ventas.map((dia) => formatearDiaMes(dia.fecha)),
            datasets: [{ label: "Ventas emitidas", data: ventas.map((dia) => dia.importe), backgroundColor: ventas.map((_, indice) => indice === 29 ? "#0f766e" : "#8bb8b1"), borderRadius: 3, maxBarThickness: 22 }],
          }} />
      </div>
      <details>
        <summary className="min-h-8 cursor-pointer text-sm font-medium text-primary">Ver datos por día</summary>
        <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
          <Tabla aria-label="Importes diarios de los últimos 30 días"><TablaEncabezado><TablaFila><TablaCeldaEncabezado>Fecha</TablaCeldaEncabezado><TablaCeldaEncabezado className="text-right">Importe</TablaCeldaEncabezado></TablaFila></TablaEncabezado>
            <TablaCuerpo>{ventas.map((dia) => <TablaFila key={dia.fecha}><TablaCelda className="tabular-nums">{formatearFecha(dia.fecha)}</TablaCelda><TablaCelda className="text-right tabular-nums">{formatearMoneda(dia.importe)}</TablaCelda></TablaFila>)}</TablaCuerpo>
          </Tabla>
        </div>
      </details>
    </TarjetaContenido>
  </Tarjeta>;
}
