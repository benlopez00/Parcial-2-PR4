"use client";

import { AlertCircle } from "lucide-react";
import { CampoFormulario } from "@/componentes/formularios/campo-formulario";
import type { ErroresPorCampo } from "@/componentes/formularios/usar-formulario-accion";
import { Alerta, AlertaDescripcion } from "@/componentes/interfaz/alerta";
import { Boton } from "@/componentes/interfaz/boton";
import { DialogoPie } from "@/componentes/interfaz/dialogo";
import { Entrada } from "@/componentes/interfaz/entrada";
import {
  Selector,
  SelectorContenido,
  SelectorDisparador,
  SelectorOpcion,
  SelectorValor,
} from "@/componentes/interfaz/selector";

export interface ValoresFormularioUsuario {
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
  password: string;
}

export interface PropiedadesFormularioUsuario {
  modo: "crear" | "editar";
  valores: ValoresFormularioUsuario;
  esUsuarioActual: boolean;
  enviando: boolean;
  erroresPorCampo: ErroresPorCampo;
  errorGeneral: string | null;
  alCambiarCampo: <Campo extends keyof ValoresFormularioUsuario>(
    campo: Campo,
    valor: ValoresFormularioUsuario[Campo],
  ) => void;
  alCancelar: () => void;
  alEnviar: () => void | Promise<void>;
}

export function FormularioUsuario({
  modo,
  valores,
  esUsuarioActual,
  enviando,
  erroresPorCampo,
  errorGeneral,
  alCambiarCampo,
  alCancelar,
  alEnviar,
}: PropiedadesFormularioUsuario) {
  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        void alEnviar();
      }}
      noValidate
      className="space-y-4"
    >
      {errorGeneral ? (
        <Alerta variant="destructive">
          <AlertCircle className="size-4" />
          <AlertaDescripcion>{errorGeneral}</AlertaDescripcion>
        </Alerta>
      ) : null}

      <CampoFormulario id="usuario-nombre" etiqueta="Nombre" error={erroresPorCampo.nombre} obligatorio>
        <Entrada
          id="usuario-nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          autoFocus
          required
          value={valores.nombre}
          aria-invalid={Boolean(erroresPorCampo.nombre)}
          aria-describedby={erroresPorCampo.nombre ? "usuario-nombre-error" : undefined}
          onChange={(evento) => alCambiarCampo("nombre", evento.target.value)}
        />
      </CampoFormulario>

      <CampoFormulario id="usuario-email" etiqueta="Email" error={erroresPorCampo.email} obligatorio>
        <Entrada
          id="usuario-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={valores.email}
          aria-invalid={Boolean(erroresPorCampo.email)}
          aria-describedby={erroresPorCampo.email ? "usuario-email-error" : undefined}
          onChange={(evento) => alCambiarCampo("email", evento.target.value)}
        />
      </CampoFormulario>

      <CampoFormulario
        id="usuario-rol"
        etiqueta="Rol"
        error={erroresPorCampo.rol}
        ayuda={
          modo === "editar" && esUsuarioActual
            ? "No podés quitarte el rol administrador mientras estás conectado."
            : undefined
        }
        obligatorio
      >
        <Selector
          value={valores.rol}
          disabled={modo === "editar" && esUsuarioActual}
          onValueChange={(valor) => alCambiarCampo("rol", valor as "admin" | "vendedor")}
        >
          <SelectorDisparador id="usuario-rol" aria-invalid={Boolean(erroresPorCampo.rol)}>
            <SelectorValor />
          </SelectorDisparador>
          <SelectorContenido>
            <SelectorOpcion value="vendedor">Vendedor</SelectorOpcion>
            <SelectorOpcion value="admin">Administrador</SelectorOpcion>
          </SelectorContenido>
        </Selector>
      </CampoFormulario>

      {modo === "crear" ? (
        <CampoFormulario
          id="usuario-contrasena"
          etiqueta="Contraseña temporal"
          ayuda="Al menos 8 caracteres."
          error={erroresPorCampo.password}
          obligatorio
        >
          <Entrada
            id="usuario-contrasena"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={valores.password}
            aria-invalid={Boolean(erroresPorCampo.password)}
            aria-describedby={
              erroresPorCampo.password ? "usuario-contrasena-error" : "usuario-contrasena-ayuda"
            }
            onChange={(evento) => alCambiarCampo("password", evento.target.value)}
          />
        </CampoFormulario>
      ) : null}

      <DialogoPie className="pt-2">
        <Boton type="button" variant="outline" disabled={enviando} onClick={alCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : "Guardar"}
        </Boton>
      </DialogoPie>
    </form>
  );
}
