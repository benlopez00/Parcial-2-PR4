"use client";

import * as React from "react";
import { AlertCircle, Check, Copy, KeyRound } from "lucide-react";
import { restablecerContrasenaUsuarioAccion } from "@/app/(sistema)/usuarios/acciones";
import { Alerta, AlertaDescripcion, AlertaTitulo } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";
import {
  Dialogo,
  DialogoContenido,
  DialogoDescripcion,
  DialogoEncabezado,
  DialogoPie,
  DialogoTitulo,
} from "@/componentes/interfaz/dialogo";
import type { UsuarioPublico } from "@/servicios/servicio-usuarios";

export interface PropiedadesDialogoRestablecerContrasena {
  usuario: UsuarioPublico | null;
  alCerrar: () => void;
}

export function DialogoRestablecerContrasena({
  usuario,
  alCerrar,
}: PropiedadesDialogoRestablecerContrasena) {
  const [pendiente, setPendiente] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [passwordTemporal, setPasswordTemporal] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState(false);

  React.useEffect(() => {
    setPendiente(false);
    setError(null);
    setPasswordTemporal(null);
    setCopiado(false);
  }, [usuario]);

  function manejarCierre() {
    if (pendiente) {
      return;
    }
    setPasswordTemporal(null);
    setError(null);
    setCopiado(false);
    alCerrar();
  }

  async function manejarConfirmacion() {
    if (!usuario || pendiente) {
      return;
    }
    setPendiente(true);
    setError(null);
    try {
      const resultado = await restablecerContrasenaUsuarioAccion({ id: usuario.id });
      if (!resultado.ok) {
        setError(resultado.error.message);
        return;
      }
      setPasswordTemporal(resultado.datos.passwordTemporal);
    } catch {
      setError("No pudimos restablecer la contraseña. Intentá nuevamente.");
    } finally {
      setPendiente(false);
    }
  }

  async function manejarCopia() {
    if (!passwordTemporal || !navigator.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(passwordTemporal);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Dialogo
      open={Boolean(usuario)}
      onOpenChange={(abierto) => {
        if (!abierto) {
          manejarCierre();
        }
      }}
    >
      <DialogoContenido>
        <DialogoEncabezado>
          <DialogoTitulo>Restablecer contraseña</DialogoTitulo>
          <DialogoDescripcion>
            {passwordTemporal
              ? `Se generó una nueva contraseña temporal para ${usuario?.nombre ?? "el usuario"}.`
              : `Se generará una nueva contraseña temporal para ${usuario?.nombre ?? "el usuario"} y la anterior dejará de funcionar.`}
          </DialogoDescripcion>
        </DialogoEncabezado>

        {error ? (
          <Alerta variant="destructive">
            <AlertCircle className="size-4" />
            <AlertaDescripcion>{error}</AlertaDescripcion>
          </Alerta>
        ) : null}

        {passwordTemporal ? (
          <div className="space-y-3">
            <Alerta variant="warning">
              <KeyRound className="size-4" />
              <AlertaTitulo>Mostrada por única vez</AlertaTitulo>
              <AlertaDescripcion>
                Comunicále esta clave al usuario; al cerrar este cuadro no volverá a mostrarse.
              </AlertaDescripcion>
            </Alerta>
            <div className="flex items-center justify-between gap-2 rounded-lg border bg-secondary/50 px-3 py-2.5">
              <code className="select-all font-mono text-base font-semibold tracking-wide text-foreground">
                {passwordTemporal}
              </code>
              <Boton type="button" variant="outline" size="sm" onClick={() => void manejarCopia()}>
                {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                <span>{copiado ? "Copiada" : "Copiar"}</span>
              </Boton>
            </div>
          </div>
        ) : null}

        <DialogoPie>
          {passwordTemporal ? (
            <Boton type="button" onClick={manejarCierre}>
              Cerrar
            </Boton>
          ) : (
            <>
              <Boton type="button" variant="outline" disabled={pendiente} onClick={manejarCierre}>
                Cancelar
              </Boton>
              <Boton type="button" disabled={pendiente} onClick={() => void manejarConfirmacion()}>
                {pendiente ? "Restableciendo..." : "Restablecer contraseña"}
              </Boton>
            </>
          )}
        </DialogoPie>
      </DialogoContenido>
    </Dialogo>
  );
}
