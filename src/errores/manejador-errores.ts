import { ZodError as ErrorZod } from "zod";
import { CODIGOS_ERROR, type CodigoError } from "./codigos-error";
import { ErrorApi, type EstadoHttpError, type ValorDetalleError } from "./error-api";

export interface ErrorPublico {
  code: CodigoError;
  message: string;
  details?: ValorDetalleError;
}

export interface ResultadoAccionFallida {
  ok: false;
  error: ErrorPublico;
}

interface ErrorNormalizado {
  estadoHttp: EstadoHttpError;
  error: ErrorPublico;
}

function normalizarError(error: unknown): ErrorNormalizado {
  if (error instanceof ErrorApi) {
    return {
      estadoHttp: error.estadoHttp,
      error: {
        code: error.codigo,
        message: error.mensaje,
        ...(error.detalles === undefined ? {} : { details: error.detalles }),
      },
    };
  }

  if (error instanceof ErrorZod) {
    const detalles = error.issues.flatMap((problema) => {
      const campos = problema.code === "unrecognized_keys"
        ? problema.keys.map((clave) => [...problema.path, clave].join("."))
        : [problema.path.join(".")];
      return campos.map((campo) => ({ campo, mensaje: problema.message }));
    });
    return {
      estadoHttp: 422,
      error: { code: CODIGOS_ERROR.VALIDACION, message: "Hay campos con errores.", details: detalles },
    };
  }

  // Los adaptadores deben entregar aquí el SyntaxError producido al leer el JSON.
  if (error instanceof SyntaxError) {
    return { estadoHttp: 400, error: { code: CODIGOS_ERROR.JSON_INVALIDO, message: "El cuerpo no es JSON válido." } };
  }

  console.error("Error inesperado en el servidor:", error);
  return { estadoHttp: 500, error: { code: CODIGOS_ERROR.ERROR_INTERNO, message: "Ocurrió un error interno." } };
}

export function convertirErrorARespuestaHttp(error: unknown): Response {
  const resultado = normalizarError(error);
  return Response.json({ error: resultado.error }, { status: resultado.estadoHttp });
}

export function convertirErrorAResultadoAccion(error: unknown): ResultadoAccionFallida {
  return { ok: false, error: normalizarError(error).error };
}
