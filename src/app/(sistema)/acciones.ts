"use server";

import { asegurarUsuarioAutenticado } from "@/errores/verificadores-negocio";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";
import { eliminarCookieSesion } from "@/utilidades/sesion";
import { esquemaSinDatos } from "@/validaciones/validacion-autenticacion";

// Implementa RF-U1: cierra la sesión activa desde el sistema protegido.
export const cerrarSesionAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  esquemaSinDatos.parse(datosSinValidar);
  asegurarUsuarioAutenticado(usuarioActual);
  await eliminarCookieSesion();
  return null;
});
