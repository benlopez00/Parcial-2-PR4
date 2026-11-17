import type { UsuarioAutenticado } from "@/base-de-datos/esquema";
import { convertirErrorAResultadoAccion, type ResultadoAccionFallida } from "@/errores/manejador-errores";
import { obtenerUsuarioActual } from "./sesion";

export type ResultadoAccion<Datos> = { ok: true; datos: Datos } | ResultadoAccionFallida;

export interface OpcionesAccion {
  requiereSesion?: boolean;
}

export type OperacionAccionProtegida<Entrada, Salida> = (
  entrada: Entrada,
  usuarioActual: UsuarioAutenticado,
) => Promise<Salida>;

export type OperacionAccionPublica<Entrada, Salida> = (entrada: Entrada) => Promise<Salida>;

function esSenalNavegacionNext(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }
  const { digest } = error;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest.startsWith("NEXT_NOT_FOUND") ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export function envoltorioAccion<Entrada, Salida>(
  operacion: OperacionAccionPublica<Entrada, Salida>,
  opciones: OpcionesAccion & { requiereSesion: false },
): (entrada: Entrada) => Promise<ResultadoAccion<Salida>>;
export function envoltorioAccion<Entrada, Salida>(
  operacion: OperacionAccionProtegida<Entrada, Salida>,
  opciones?: OpcionesAccion & { requiereSesion?: true },
): (entrada: Entrada) => Promise<ResultadoAccion<Salida>>;
export function envoltorioAccion<Entrada, Salida>(
  operacion: OperacionAccionProtegida<Entrada, Salida> | OperacionAccionPublica<Entrada, Salida>,
  opciones: OpcionesAccion = {},
): (entrada: Entrada) => Promise<ResultadoAccion<Salida>> {
  const { requiereSesion = true } = opciones;

  return async (entrada: Entrada): Promise<ResultadoAccion<Salida>> => {
    try {
      if (requiereSesion) {
        const usuarioActual = await obtenerUsuarioActual();
        const datos = await (operacion as OperacionAccionProtegida<Entrada, Salida>)(entrada, usuarioActual);
        return { ok: true, datos };
      }

      const datos = await (operacion as OperacionAccionPublica<Entrada, Salida>)(entrada);
      return { ok: true, datos };
    } catch (error) {
      if (esSenalNavegacionNext(error)) {
        throw error;
      }
      return convertirErrorAResultadoAccion(error);
    }
  };
}
