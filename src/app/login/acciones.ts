"use server";

import { iniciarSesion } from "@/servicios/servicio-autenticacion";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";
import { establecerCookieSesion } from "@/utilidades/sesion";

// Implementa RF-U1: inicia sesión desde el formulario y establece la cookie httpOnly.
export const iniciarSesionAccion = envoltorioAccion(
  async (datosSinValidar: unknown) => {
    const usuario = await iniciarSesion(datosSinValidar);
    await establecerCookieSesion(usuario.id);
    return usuario;
  },
  { requiereSesion: false },
);
