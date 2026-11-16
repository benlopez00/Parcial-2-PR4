import type { CodigoError } from "./codigos-error";

export type EstadoHttpError = 400 | 401 | 403 | 404 | 409 | 422 | 500;
export type ValorDetalleError = string | number | boolean | null | ValorDetalleError[] | { [campo: string]: ValorDetalleError };

export class ErrorApi extends Error {
  constructor(
    public readonly estadoHttp: EstadoHttpError,
    public readonly codigo: CodigoError,
    public readonly mensaje: string,
    public readonly detalles?: ValorDetalleError,
  ) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}
