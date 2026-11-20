import { asegurarImporteFacturaDentroDeRango } from "@/errores/verificadores-negocio";

// Implementa Regla 10: la misma aritmética exacta sirve al borrador y a la emisión.
export function calcularSubtotalVenta(precio: number, cantidad: number): number {
  const subtotal = BigInt(precio) * BigInt(cantidad);
  asegurarImporteFacturaDentroDeRango(subtotal);
  return Number(subtotal);
}

// Implementa Regla 10: suma centavos sin perder precisión antes de comprobar el rango.
export function sumarImportesVenta(importes: readonly number[]): number {
  const total = importes.reduce((suma, importe) => suma + BigInt(importe), 0n);
  asegurarImporteFacturaDentroDeRango(total);
  return Number(total);
}
