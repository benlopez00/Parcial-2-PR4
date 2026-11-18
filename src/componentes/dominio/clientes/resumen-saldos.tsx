import { Tarjeta, TarjetaContenido, TarjetaEncabezado, TarjetaTitulo } from "@/componentes/interfaz/tarjeta";
import { formatearMoneda } from "@/utilidades/formatos";

interface PropiedadesResumenSaldos {
  totalAdeudado: number;
  clientesConDeuda: number;
}

// Implementa RF-C6: el total lo calcula el servicio; acá solo se le da formato y se muestra.
export function ResumenSaldos({ totalAdeudado, clientesConDeuda }: PropiedadesResumenSaldos) {
  const tarjetas = [
    { etiqueta: "Total adeudado", valor: formatearMoneda(totalAdeudado), destacado: true },
    { etiqueta: "Clientes con deuda", valor: String(clientesConDeuda), destacado: false },
  ];
  return <div className="mb-6 grid gap-4 sm:grid-cols-2">{tarjetas.map((tarjeta) => <Tarjeta key={tarjeta.etiqueta}>
    <TarjetaEncabezado><TarjetaTitulo className="text-sm font-normal text-muted-foreground">{tarjeta.etiqueta}</TarjetaTitulo></TarjetaEncabezado>
    <TarjetaContenido className={`break-words text-2xl font-semibold tabular-nums ${tarjeta.destacado ? "text-destructive" : ""}`}>{tarjeta.valor}</TarjetaContenido>
  </Tarjeta>)}</div>;
}
