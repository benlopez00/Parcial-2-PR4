import type { ResultadoAccionFallida } from "./manejador-errores";

// Implementa RF-C2 y RF-C5: lleva el error del servidor al campo que lo causó, para que el
// formulario lo muestre debajo del input en vez de como un aviso suelto arriba de todo.
export function asociarErroresFormularioClientes(
  resultado: ResultadoAccionFallida,
  formulario: "cliente" | "pago",
): ResultadoAccionFallida {
  // Los servicios reciben { id, cambios } y { clienteId, pago }, así que los campos vienen
  // prefijados; el formulario conoce los nombres sueltos.
  if (Array.isArray(resultado.error.details)) {
    return {
      ...resultado,
      error: {
        ...resultado.error,
        details: resultado.error.details.map((detalle) => {
          if (detalle && typeof detalle === "object" && "campo" in detalle && typeof detalle.campo === "string") {
            return { ...detalle, campo: detalle.campo.replace(/^(cambios|pago)\./, "") };
          }
          return detalle;
        }),
      },
    };
  }

  const campo = formulario === "cliente" && resultado.error.code === "DOCUMENTO_DUPLICADO" ? "nroDoc"
    : formulario === "cliente" && resultado.error.code === "SALDO_PENDIENTE" ? "cuentaCorriente"
    : formulario === "pago" && resultado.error.code === "PAGO_SUPERA_DEUDA" ? "importe"
    : formulario === "pago" && resultado.error.code === "CUENTA_CORRIENTE_NO_HABILITADA" ? "importe"
    : null;
  if (!campo) return resultado;

  const detalle = resultado.error.details;
  const mensaje = formulario === "pago" && detalle && typeof detalle === "object" && "saldoActual" in detalle
    ? `${resultado.error.message} Deuda actual: ${detalle.saldoActual}.`
    : resultado.error.message;
  return { ok: false, error: { ...resultado.error, details: [{ campo, mensaje }] } };
}
