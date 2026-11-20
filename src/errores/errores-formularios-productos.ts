import type { ResultadoAccionFallida } from "./manejador-errores";

export function asociarErroresFormularioProductos(
  resultado: ResultadoAccionFallida,
  formulario: "producto" | "categoria" | "movimiento",
): ResultadoAccionFallida {
  if (Array.isArray(resultado.error.details)) {
    return { ...resultado, error: { ...resultado.error, details: resultado.error.details.map((detalle) => {
      if (detalle && typeof detalle === "object" && "campo" in detalle && typeof detalle.campo === "string") {
        return { ...detalle, campo: detalle.campo.replace(/^cambios\./, "") };
      }
      return detalle;
    }) } };
  }
  const campo = formulario === "producto" && resultado.error.code === "CODIGO_DUPLICADO" ? "codigo"
    : formulario === "categoria" && resultado.error.code === "NOMBRE_DUPLICADO" ? "nombre"
    : formulario === "movimiento" && resultado.error.code === "STOCK_INSUFICIENTE" ? "movimiento.cantidad" : null;
  if (!campo) return resultado;
  const detalle = resultado.error.details;
  const mensaje = formulario === "movimiento" && detalle && typeof detalle === "object" && "disponible" in detalle
    ? `${resultado.error.message} Disponible: ${detalle.disponible}.` : resultado.error.message;
  return { ok: false, error: { ...resultado.error, details: [{ campo, mensaje }] } };
}
