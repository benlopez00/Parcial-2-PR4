import { z as esquema } from "zod";

export const esquemaContrasenaNueva = esquema
  .string({ error: "Ingresá una contraseña." })
  .min(8, "Usá al menos 8 caracteres.")
  .refine((valor) => new TextEncoder().encode(valor).length <= 72, "La contraseña supera los 72 bytes.");

export const esquemaEmail = esquema
  .string({ error: "Ingresá un email." })
  .trim()
  .toLowerCase()
  .pipe(esquema.email("Ingresá un email válido."));

export const esquemaInicioSesion = esquema
  .object({
    email: esquemaEmail,
    password: esquema.string({ error: "Ingresá tu contraseña." }).min(1, "Ingresá tu contraseña."),
  })
  .strict();

export const esquemaSinDatos = esquema.object({}).strict();

export const esquemaCambioContrasena = esquema
  .object({
    actual: esquema.string({ error: "Ingresá tu contraseña actual." }).min(1, "Ingresá tu contraseña actual."),
    nueva: esquemaContrasenaNueva,
  })
  .strict();

export const esquemaFormularioCambioContrasena = esquemaCambioContrasena
  .extend({
    confirmacion: esquema.string({ error: "Repetí la contraseña nueva." }).min(1, "Repetí la contraseña nueva."),
  })
  .strict()
  .refine((datos) => datos.nueva === datos.confirmacion, {
    path: ["confirmacion"],
    message: "Las contraseñas no coinciden.",
  });
