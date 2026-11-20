import { ZodError as ErrorZod } from "zod";
import { ErrorApi, type EstadoHttpError } from "./error-api";
import type { ErrorPublico } from "./manejador-errores";

export function describirErrorVenta(error: unknown): string {
  if (error instanceof ErrorZod) return error.issues[0]?.message ?? "Revisá los datos de la venta.";
  if (error instanceof ErrorApi) return describirRechazoVenta({ code: error.codigo, message: error.mensaje, details: error.detalles });
  if (error instanceof Error) return error.message;
  return "No pudimos completar la operación.";
}

export function describirRechazoVenta(error: ErrorPublico): string {
  const faltantes = error.code === "STOCK_INSUFICIENTE" && Array.isArray(error.details)
    ? error.details.flatMap((detalle) => detalle && typeof detalle === "object" && "codigo" in detalle && "disponible" in detalle
      ? [`${detalle.codigo}: disponible ${detalle.disponible}`] : []) : [];
  return [error.message, ...faltantes].join(" · ");
}

export function clasificarErrorEmisionVenta(error: unknown) {
  if (error instanceof ErrorApi && error.estadoHttp < 500) {
    return { incierto: false, sesionVencida: error.estadoHttp === 401, mensaje: describirErrorVenta(error) };
  }
  return { incierto: true, sesionVencida: false,
    mensaje: "No pudimos verificar si se emitió la factura. Consultá las facturas antes de iniciar otra venta para evitar duplicarla." };
}

export async function leerRespuestaVenta<Datos>(respuesta: Response): Promise<Datos> {
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    const error = datos.error as ErrorPublico | undefined;
    throw new ErrorApi(respuesta.status as EstadoHttpError, error?.code ?? "ERROR_INTERNO",
      error ? describirRechazoVenta(error) : "No pudimos completar la consulta.");
  }
  return datos as Datos;
}
