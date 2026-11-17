"use client";

import * as React from "react";
import type { ZodType } from "zod";
import type { ResultadoAccion } from "@/utilidades/envoltorio-accion";

export type ErroresPorCampo = Record<string, string>;

export interface OpcionesFormularioAccion<Entrada, Salida, Validado = Entrada> {
  esquema: ZodType<Validado, Entrada>;
  accion: (entrada: Validado) => Promise<ResultadoAccion<Salida>>;
  alCompletar?: (datos: Salida) => void | Promise<void>;
}

export interface EstadoFormularioAccion<Entrada, Salida> {
  enviar: (datos: Entrada) => Promise<ResultadoAccion<Salida> | null>;
  enviando: boolean;
  erroresPorCampo: ErroresPorCampo;
  errorGeneral: string | null;
  limpiarErrorCampo: (campo: string) => void;
  limpiarErrores: () => void;
}

function extraerErroresZod(problemas: ReadonlyArray<{ path: PropertyKey[]; message: string }>): ErroresPorCampo {
  const mapa: ErroresPorCampo = {};
  for (const problema of problemas) {
    const campo = problema.path.map(String).join(".");
    if (campo && !mapa[campo]) {
      mapa[campo] = problema.message;
    }
  }
  return mapa;
}

function extraerErroresDetallesServidor(detalles: unknown): ErroresPorCampo {
  if (!Array.isArray(detalles)) {
    return {};
  }
  const mapa: ErroresPorCampo = {};
  for (const detalle of detalles) {
    if (
      detalle &&
      typeof detalle === "object" &&
      "campo" in detalle &&
      "mensaje" in detalle &&
      typeof detalle.campo === "string" &&
      typeof detalle.mensaje === "string" &&
      detalle.campo.length > 0 &&
      !mapa[detalle.campo]
    ) {
      mapa[detalle.campo] = detalle.mensaje;
    }
  }
  return mapa;
}

export function usarFormularioAccion<Entrada, Salida, Validado = Entrada>({
  esquema,
  accion,
  alCompletar,
}: OpcionesFormularioAccion<Entrada, Salida, Validado>): EstadoFormularioAccion<Entrada, Salida> {
  const [enviando, setEnviando] = React.useState(false);
  const [erroresPorCampo, setErroresPorCampo] = React.useState<ErroresPorCampo>({});
  const [errorGeneral, setErrorGeneral] = React.useState<string | null>(null);
  const bloqueadoRef = React.useRef(false);

  const limpiarErrorCampo = React.useCallback((campo: string) => {
    setErroresPorCampo((previo) => {
      if (!(campo in previo)) {
        return previo;
      }
      const copia = { ...previo };
      delete copia[campo];
      return copia;
    });
  }, []);

  const limpiarErrores = React.useCallback(() => {
    setErroresPorCampo({});
    setErrorGeneral(null);
  }, []);

  const enviar = React.useCallback(
    async (datos: Entrada): Promise<ResultadoAccion<Salida> | null> => {
      if (bloqueadoRef.current) {
        return null;
      }

      setErroresPorCampo({});
      setErrorGeneral(null);

      const validacion = esquema.safeParse(datos);
      if (!validacion.success) {
        const campos = extraerErroresZod(validacion.error.issues);
        setErroresPorCampo(campos);
        if (Object.keys(campos).length === 0) {
          setErrorGeneral(validacion.error.issues[0]?.message ?? "Revisá los datos ingresados.");
        }
        return null;
      }

      bloqueadoRef.current = true;
      setEnviando(true);
      try {
        const resultado = await accion(validacion.data);
        if (!resultado.ok) {
          const camposServidor = extraerErroresDetallesServidor(resultado.error.details);
          if (Object.keys(camposServidor).length > 0) {
            setErroresPorCampo(camposServidor);
          } else {
            setErrorGeneral(resultado.error.message);
          }
          return resultado;
        }

        await alCompletar?.(resultado.datos);
        return resultado;
      } catch {
        setErrorGeneral("No pudimos completar la operación. Intentá nuevamente.");
        return null;
      } finally {
        bloqueadoRef.current = false;
        setEnviando(false);
      }
    },
    [esquema, accion, alCompletar],
  );

  return {
    enviar,
    enviando,
    erroresPorCampo,
    errorGeneral,
    limpiarErrorCampo,
    limpiarErrores,
  };
}
