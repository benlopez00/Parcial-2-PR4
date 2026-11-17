"use client";

import * as React from "react";
import { Entrada } from "@/componentes/interfaz/entrada";
import { pesosACentavos } from "@/utilidades/formatos";
import { CampoFormulario } from "./campo-formulario";

export interface PropiedadesCampoImporte {
  id: string;
  nombre?: string;
  etiqueta: string;
  valorCentavos: number | null;
  alCambiarCentavos: (centavos: number | null) => void;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  deshabilitado?: boolean;
  placeholder?: string;
}

function formatearValorInicial(centavos: number | null): string {
  if (centavos === null) {
    return "";
  }
  const entero = Math.trunc(centavos / 100);
  const decimales = Math.abs(centavos % 100)
    .toString()
    .padStart(2, "0");
  return `${entero},${decimales}`;
}

export function CampoImporte({
  id,
  nombre,
  etiqueta,
  valorCentavos,
  alCambiarCentavos,
  error,
  ayuda,
  obligatorio = false,
  deshabilitado = false,
  placeholder = "0,00",
}: PropiedadesCampoImporte) {
  const [texto, setTexto] = React.useState(() => formatearValorInicial(valorCentavos));
  const [errorFormato, setErrorFormato] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    setTexto(formatearValorInicial(valorCentavos));
  }, [valorCentavos]);

  function manejarCambio(nuevoTexto: string) {
    setTexto(nuevoTexto);
    if (nuevoTexto.trim() === "") {
      setErrorFormato(undefined);
      alCambiarCentavos(null);
      return;
    }

    try {
      const centavos = pesosACentavos(nuevoTexto);
      setErrorFormato(undefined);
      alCambiarCentavos(centavos);
    } catch {
      setErrorFormato("Ingresá un importe válido (hasta dos decimales).");
    }
  }

  const mensajeError = error ?? errorFormato;

  return (
    <CampoFormulario
      id={id}
      etiqueta={etiqueta}
      error={mensajeError}
      ayuda={ayuda}
      obligatorio={obligatorio}
    >
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-sm text-muted-foreground">$</span>
        <Entrada
          id={id}
          name={nombre}
          type="text"
          inputMode="decimal"
          value={texto}
          disabled={deshabilitado}
          placeholder={placeholder}
          aria-invalid={Boolean(mensajeError)}
          aria-describedby={mensajeError ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
          onChange={(evento) => manejarCambio(evento.target.value)}
          className="pl-7"
        />
      </div>
    </CampoFormulario>
  );
}
