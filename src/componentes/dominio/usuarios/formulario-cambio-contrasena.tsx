"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cambiarContrasenaPropiaAccion } from "@/app/(sistema)/perfil/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Alerta, AlertaDescripcion } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";
import { Tarjeta, TarjetaContenido, TarjetaEncabezado, TarjetaTitulo } from "@/componentes/interfaz/tarjeta";
import { Entrada } from "@/componentes/interfaz/entrada";
import { esquemaFormularioCambioContrasena } from "@/validaciones/validacion-autenticacion";

export function FormularioCambioContrasena() {
  const [actual, setActual] = React.useState("");
  const [nueva, setNueva] = React.useState("");
  const [confirmacion, setConfirmacion] = React.useState("");
  const [exito, setExito] = React.useState(false);

  const { enviar, enviando, erroresPorCampo, errorGeneral, limpiarErrorCampo } =
    usarFormularioAccion({
      esquema: esquemaFormularioCambioContrasena,
      accion: cambiarContrasenaPropiaAccion,
      alCompletar: () => {
        setActual("");
        setNueva("");
        setConfirmacion("");
        setExito(true);
      },
    });

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setExito(false);
    await enviar({ actual, nueva, confirmacion });
  }

  return (
    <Tarjeta>
      <TarjetaEncabezado>
        <TarjetaTitulo>Cambiar contraseña</TarjetaTitulo>
      </TarjetaEncabezado>
      <TarjetaContenido>
        <form onSubmit={(evento) => void manejarEnvio(evento)} noValidate className="space-y-4">
          {exito ? (
            <Alerta variant="success" role="status">
              <CheckCircle2 className="size-4" />
              <AlertaDescripcion>Tu contraseña se actualizó correctamente.</AlertaDescripcion>
            </Alerta>
          ) : null}

          {errorGeneral ? (
            <Alerta variant="destructive">
              <AlertCircle className="size-4" />
              <AlertaDescripcion>{errorGeneral}</AlertaDescripcion>
            </Alerta>
          ) : null}

          <CampoFormulario
            id="perfil-actual"
            etiqueta="Contraseña actual"
            error={erroresPorCampo.actual}
            obligatorio
          >
            <Entrada
              id="perfil-actual"
              name="actual"
              type="password"
              autoComplete="current-password"
              required
              value={actual}
              aria-invalid={Boolean(erroresPorCampo.actual)}
              aria-describedby={erroresPorCampo.actual ? "perfil-actual-error" : undefined}
              onChange={(evento) => {
                setActual(evento.target.value);
                limpiarErrorCampo("actual");
                setExito(false);
              }}
            />
          </CampoFormulario>

          <CampoFormulario
            id="perfil-nueva"
            etiqueta="Contraseña nueva"
            ayuda="Al menos 8 caracteres."
            error={erroresPorCampo.nueva}
            obligatorio
          >
            <Entrada
              id="perfil-nueva"
              name="nueva"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={nueva}
              aria-invalid={Boolean(erroresPorCampo.nueva)}
              aria-describedby={erroresPorCampo.nueva ? "perfil-nueva-error" : "perfil-nueva-ayuda"}
              onChange={(evento) => {
                setNueva(evento.target.value);
                limpiarErrorCampo("nueva");
                setExito(false);
              }}
            />
          </CampoFormulario>

          <CampoFormulario
            id="perfil-confirmacion"
            etiqueta="Repetir contraseña nueva"
            error={erroresPorCampo.confirmacion}
            obligatorio
          >
            <Entrada
              id="perfil-confirmacion"
              name="confirmacion"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmacion}
              aria-invalid={Boolean(erroresPorCampo.confirmacion)}
              aria-describedby={erroresPorCampo.confirmacion ? "perfil-confirmacion-error" : undefined}
              onChange={(evento) => {
                setConfirmacion(evento.target.value);
                limpiarErrorCampo("confirmacion");
                setExito(false);
              }}
            />
          </CampoFormulario>

          <div className="pt-1">
            <Boton type="submit" disabled={enviando}>
              {enviando ? "Guardando..." : "Cambiar contraseña"}
            </Boton>
          </div>
        </form>
      </TarjetaContenido>
    </Tarjeta>
  );
}
