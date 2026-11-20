import { z as esquema } from "zod";
import { esquemaContrasenaNueva, esquemaEmail } from "./validacion-autenticacion";

const camposUsuario = {
  nombre: esquema.string({ error: "Ingresá el nombre." }).trim().min(1, "El nombre es obligatorio."),
  email: esquemaEmail,
  rol: esquema.enum(["admin", "vendedor"], { error: "Elegí un rol válido." }),
};

export const esquemaCrearUsuario = esquema
  .object({
    ...camposUsuario,
    password: esquemaContrasenaNueva,
  })
  .strict();

export const esquemaEditarUsuario = esquema
  .object({
    ...camposUsuario,
    activo: esquema.boolean({ error: "Indicá un estado válido." }),
  })
  .partial()
  .strict()
  .refine((datos) => Object.keys(datos).length > 0, "Indicá al menos un cambio.");

export const esquemaIdentificadorUsuario = esquema.coerce
  .number({ error: "El identificador de usuario no es válido." })
  .int("El identificador de usuario debe ser entero.")
  .positive("El identificador de usuario debe ser positivo.")
  .max(Number.MAX_SAFE_INTEGER, "El identificador de usuario supera el máximo permitido.");

export const esquemaActualizarUsuario = esquema
  .object({
    id: esquemaIdentificadorUsuario,
    cambios: esquemaEditarUsuario,
  })
  .strict();

export const esquemaRestablecerContrasenaUsuario = esquema
  .object({
    id: esquemaIdentificadorUsuario,
  })
  .strict();

export const esquemaListadoUsuarios = esquema
  .object({
    q: esquema.string().trim().default(""),
    activo: esquema.enum(["true", "false", "todos"]).default("todos"),
    page: esquema.coerce.number().int().positive().default(1),
    pageSize: esquema.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
