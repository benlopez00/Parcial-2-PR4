"use server";

import { revalidatePath as revalidarRuta } from "next/cache";
import {
  actualizarUsuario,
  crearUsuario,
  restablecerContrasenaUsuario,
} from "@/servicios/servicio-usuarios";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";

// Implementa RF-U4: crea un usuario y revalida el listado de usuarios.
export const crearUsuarioAccion = envoltorioAccion(async (datosSinValidar: unknown, usuarioActual) => {
  const creado = await crearUsuario(usuarioActual, datosSinValidar);
  revalidarRuta("/usuarios");
  return creado;
});

// Implementa RF-U4: actualiza un usuario y revalida el listado (y el layout si cambia el propio usuario).
export const actualizarUsuarioAccion = envoltorioAccion(
  async (datosSinValidar: unknown, usuarioActual) => {
    const actualizado = await actualizarUsuario(usuarioActual, datosSinValidar);
    revalidarRuta("/usuarios");
    if (actualizado.id === usuarioActual.id) {
      revalidarRuta("/", "layout");
    }
    return actualizado;
  },
);

// Implementa RF-U5: restablece la contraseña de un usuario devolviendo la temporal una sola vez.
export const restablecerContrasenaUsuarioAccion = envoltorioAccion(
  async (datosSinValidar: unknown, usuarioActual) => {
    return restablecerContrasenaUsuario(usuarioActual, datosSinValidar);
  },
);
