const zonaHoraria = "America/Argentina/Buenos_Aires";
const formatoEntero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  timeZone: zonaHoraria, day: "2-digit", month: "2-digit", year: "numeric",
});
const formatoHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: zonaHoraria, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function formatearMoneda(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new RangeError("El importe debe ser un entero seguro en centavos.");
  }
  const importe = BigInt(centavos);
  const valorAbsoluto = importe < 0n ? -importe : importe;
  const pesos = formatoEntero.format(valorAbsoluto / 100n);
  const decimales = (valorAbsoluto % 100n).toString().padStart(2, "0");
  return `${importe < 0n ? "-" : ""}$ ${pesos},${decimales}`;
}

export function formatearCantidadConSigno(cantidad: number): string {
  if (!Number.isSafeInteger(cantidad)) throw new RangeError("La cantidad debe ser un entero seguro.");
  return `${cantidad > 0 ? "+" : ""}${formatoEntero.format(cantidad)}`;
}

export function formatearImporteEditable(centavos: number | null): string {
  if (centavos === null) return "";
  if (!Number.isSafeInteger(centavos)) throw new RangeError("El importe debe ser un entero seguro en centavos.");
  const valor = BigInt(centavos);
  const absoluto = valor < 0n ? -valor : valor;
  return `${valor < 0n ? "-" : ""}${absoluto / 100n},${(absoluto % 100n).toString().padStart(2, "0")}`;
}

/** Acepta pesos numéricos, texto decimal (1234.50) o argentino (1.234,50).
 * Rechaza más de dos decimales: nunca redondea silenciosamente un importe.
 */
export function pesosACentavos(pesos: number | string): number {
  const entrada = typeof pesos === "number" ? pesos.toString() : pesos.trim();
  let valorNormalizado = entrada;

  if (typeof pesos === "string" && entrada.includes(",")) {
    if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(entrada)) {
      throw new RangeError("El importe en pesos no tiene un formato válido.");
    }
    valorNormalizado = entrada.replaceAll(".", "").replace(",", ".");
  } else if (typeof pesos === "string" && /^-?\d{1,3}(?:\.\d{3})+$/.test(entrada)) {
    valorNormalizado = entrada.replaceAll(".", "");
  }

  if (!/^-?\d+(?:\.\d{1,2})?$/.test(valorNormalizado)) {
    throw new RangeError("El importe debe tener como máximo dos decimales.");
  }

  const negativo = valorNormalizado.startsWith("-");
  const [parteEntera, parteDecimal = ""] = valorNormalizado.replace(/^-/, "").split(".");
  const centavos = BigInt(parteEntera) * 100n + BigInt(parteDecimal.padEnd(2, "0"));
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("El importe supera el máximo entero seguro en centavos.");
  }
  const resultado = Number(negativo ? -centavos : centavos);
  return resultado === 0 ? 0 : resultado;
}

function obtenerFecha(fechaIso: string | Date): Date {
  // Una fecha sin hora representa un día calendario; no debe retroceder por UTC-3.
  const fecha = typeof fechaIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaIso)
    ? new Date(`${fechaIso}T00:00:00-03:00`)
    : new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) {
    throw new RangeError("La fecha no es válida.");
  }
  return fecha;
}

export function formatearFecha(fechaIso: string | Date): string {
  return formatoFecha.format(obtenerFecha(fechaIso));
}

export function formatearHora(fechaIso: string | Date): string {
  return formatoHora.format(obtenerFecha(fechaIso));
}

export function formatearFechaHora(fechaIso: string | Date): string {
  return `${formatearFecha(fechaIso)} ${formatearHora(fechaIso)}`;
}

export function formatearNumeroComprobante(puntoVenta: number, numero: number): string {
  if (!Number.isInteger(puntoVenta) || puntoVenta < 1 || puntoVenta > 9999 ||
      !Number.isInteger(numero) || numero < 1 || numero > 99999999) {
    throw new RangeError("La numeración debe tener un punto de venta de 1 a 9999 y un número de 1 a 99999999.");
  }
  return `${puntoVenta.toString().padStart(4, "0")}-${numero.toString().padStart(8, "0")}`;
}

export function formatearNumeroFactura(puntoVenta: number, numero: number): string {
  return formatearNumeroComprobante(puntoVenta, numero);
}

export function formatearNumeroRecibo(puntoVenta: number, numero: number): string {
  return `R ${formatearNumeroComprobante(puntoVenta, numero)}`;
}
