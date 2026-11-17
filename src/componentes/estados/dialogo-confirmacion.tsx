"use client";

import { useRef as usarReferencia } from "react";
import { Boton } from "@/componentes/interfaz/boton";
import {
  DialogoAlerta,
  DialogoAlertaCancelar,
  DialogoAlertaContenido,
  DialogoAlertaDescripcion,
  DialogoAlertaEncabezado,
  DialogoAlertaPie,
  DialogoAlertaTitulo,
} from "@/componentes/interfaz/dialogo-alerta";

export interface PropiedadesDialogoConfirmacion {
  abierto: boolean;
  alCambiarAbierto: (abierto: boolean) => void;
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  destructivo?: boolean;
  pendiente?: boolean;
  alConfirmar: () => void | Promise<void>;
}

export function DialogoConfirmacion({
  abierto,
  alCambiarAbierto,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  destructivo = false,
  pendiente = false,
  alConfirmar,
}: PropiedadesDialogoConfirmacion) {
  const focoAnterior = usarReferencia<HTMLElement | null>(null);
  return (
    <DialogoAlerta open={abierto} onOpenChange={(nuevoEstado) => !pendiente && alCambiarAbierto(nuevoEstado)}>
      <DialogoAlertaContenido
        onOpenAutoFocus={() => { focoAnterior.current = document.activeElement as HTMLElement; }}
        onCloseAutoFocus={(evento) => { evento.preventDefault(); focoAnterior.current?.focus(); }}
      >
        <DialogoAlertaEncabezado>
          <DialogoAlertaTitulo>{titulo}</DialogoAlertaTitulo>
          <DialogoAlertaDescripcion>{descripcion}</DialogoAlertaDescripcion>
        </DialogoAlertaEncabezado>
        <DialogoAlertaPie>
          <DialogoAlertaCancelar disabled={pendiente}>{textoCancelar}</DialogoAlertaCancelar>
          <Boton
            type="button"
            variant={destructivo ? "destructive" : "default"}
            disabled={pendiente}
            onClick={() => void alConfirmar()}
          >
            {pendiente ? "Procesando..." : textoConfirmar}
          </Boton>
        </DialogoAlertaPie>
      </DialogoAlertaContenido>
    </DialogoAlerta>
  );
}
