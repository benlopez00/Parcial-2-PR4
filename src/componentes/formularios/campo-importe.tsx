"use client";

import * as React from "react";
import { Entrada } from "@/componentes/interfaz/entrada";
import { formatearImporteEditable, pesosACentavos } from "@/utilidades/formatos";
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
  alPerderFoco?: () => void;
  alCambiarValidez?: (valido: boolean) => void;
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
  alPerderFoco,
  alCambiarValidez,
}: PropiedadesCampoImporte) {
  const [texto, setTexto] = React.useState(() => formatearImporteEditable(valorCentavos));
  const [errorFormato, setErrorFormato] = React.useState<string | undefined>(undefined);
  const ultimoValorEmitido = React.useRef(valorCentavos);

  React.useEffect(() => {
    if (valorCentavos !== ultimoValorEmitido.current) {
      setTexto(formatearImporteEditable(valorCentavos));
      setErrorFormato(undefined);
      alCambiarValidez?.(true);
      ultimoValorEmitido.current = valorCentavos;
    }
  }, [valorCentavos, alCambiarValidez]);

  function manejarCambio(nuevoTexto: string) {
    setTexto(nuevoTexto);
    if (nuevoTexto.trim() === "") {
      alCambiarValidez?.(true);
      setErrorFormato(undefined);
      ultimoValorEmitido.current = null;
      alCambiarCentavos(null);
      return;
    }

    try {
      const centavos = pesosACentavos(nuevoTexto);
      alCambiarValidez?.(true);
      setErrorFormato(undefined);
      ultimoValorEmitido.current = centavos;
      alCambiarCentavos(centavos);
    } catch {
      alCambiarValidez?.(false);
      setErrorFormato("Ingresá un importe válido (hasta dos decimales).");
      ultimoValorEmitido.current = null;
      alCambiarCentavos(null);
    }
  }

  const mensajeError = errorFormato ?? error;

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
          onBlur={alPerderFoco}
          className="pl-7"
        />
      </div>
    </CampoFormulario>
  );
}
