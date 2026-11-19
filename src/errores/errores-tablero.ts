import { ErrorApi } from "./error-api";
import { CODIGOS_ERROR } from "./codigos-error";

// Implementa Regla 10: ningún agregado del tablero pierde precisión al salir como número JSON.
export function convertirEnteroTablero(valor: bigint): number {
  if (valor < 0n || valor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ErrorApi(422, CODIGOS_ERROR.VALIDACION, "El total del tablero supera el rango de enteros seguros.");
  }
  return Number(valor);
}
