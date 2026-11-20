"use client";

import * as React from "react";
import { useRouter as usarEnrutador } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { iniciarSesionAccion } from "@/app/login/acciones";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import { usarFormularioAccion } from "@/componentes/formularios/usar-formulario-accion";
import { Alerta, AlertaDescripcion } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";
import { Entrada } from "@/componentes/interfaz/entrada";
import { Apilar } from "@/componentes/maquetacion/apilar";
import { Texto } from "@/componentes/maquetacion/texto";
import { Titulo } from "@/componentes/maquetacion/titulo";
import { esquemaInicioSesion } from "@/validaciones/validacion-autenticacion";

export function FormularioAcceso() {
  const enrutador = usarEnrutador();
  const [email, setEmail] = React.useState("");
  const [contrasena, setContrasena] = React.useState("");
  const [mostrarContrasena, setMostrarContrasena] = React.useState(false);

  const { enviar, enviando, erroresPorCampo, errorGeneral, limpiarErrorCampo } =
    usarFormularioAccion({
      esquema: esquemaInicioSesion,
      accion: iniciarSesionAccion,
      alCompletar: () => {
        enrutador.push("/");
        enrutador.refresh();
      },
    });

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    await enviar({ email, password: contrasena });
  }

  return (
    <div className="w-full max-w-sm">
      <Apilar espacio="lg">
        <div className="space-y-1.5">
          <Titulo nivel="h1" className="text-2xl font-bold">
            Iniciar sesión
          </Titulo>
          <Texto variante="atenuado">Ingresá con tu email y contraseña.</Texto>
        </div>

        <form onSubmit={(evento) => void manejarEnvio(evento)} noValidate className="space-y-4">
          {errorGeneral ? (
            <Alerta variant="destructive">
              <AlertCircle className="size-4" />
              <AlertaDescripcion>{errorGeneral}</AlertaDescripcion>
            </Alerta>
          ) : null}

          <CampoFormulario id="login-email" etiqueta="Email" error={erroresPorCampo.email} obligatorio>
            <Entrada
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              required
              autoFocus
              value={email}
              aria-invalid={Boolean(erroresPorCampo.email)}
              aria-describedby={erroresPorCampo.email ? "login-email-error" : undefined}
              onChange={(evento) => {
                setEmail(evento.target.value);
                limpiarErrorCampo("email");
              }}
            />
          </CampoFormulario>

          <CampoFormulario
            id="login-contrasena"
            etiqueta="Contraseña"
            error={erroresPorCampo.password}
            obligatorio
          >
            <div className="relative flex items-center">
              <Entrada
                id="login-contrasena"
                name="password"
                type={mostrarContrasena ? "text" : "password"}
                autoComplete="current-password"
                enterKeyHint="done"
                required
                value={contrasena}
                aria-invalid={Boolean(erroresPorCampo.password)}
                aria-describedby={erroresPorCampo.password ? "login-contrasena-error" : undefined}
                onChange={(evento) => {
                  setContrasena(evento.target.value);
                  limpiarErrorCampo("password");
                }}
                className="pr-10"
              />
              <button
                type="button"
                aria-pressed={mostrarContrasena}
                aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setMostrarContrasena((previo) => !previo)}
                className="absolute right-2.5 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                {mostrarContrasena ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </CampoFormulario>

          <Boton type="submit" disabled={enviando} className="w-full h-10">
            <LogIn className="size-4" />
            <span>{enviando ? "Ingresando..." : "Ingresar"}</span>
          </Boton>
        </form>
      </Apilar>
    </div>
  );
}
