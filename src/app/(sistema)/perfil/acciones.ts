"use server";

import { cambiarContrasenaPropia } from "@/servicios/servicio-autenticacion";
import { envoltorioAccion } from "@/utilidades/envoltorio-accion";
import { esquemaFormularioCambioContrasena } from "@/validaciones/validacion-autenticacion";

// Implementa RF-U5: valida la confirmación del formulario y delega el cambio de contraseña al servicio.
export const cambiarContrasenaPropiaAccion = envoltorioAccion(
  async (datosSinValidar: unknown, usuarioActual) => {
    const { actual, nueva } = esquemaFormularioCambioContrasena.parse(datosSinValidar);
    await cambiarContrasenaPropia(usuarioActual, { actual, nueva });
    return null;
  },
);
