import { z as esquema } from "zod";

const nombreCategoria = esquema.string().trim().min(1, "El nombre es obligatorio.");
const identificadorCategoria = esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export const esquemaListadoCategorias = esquema.object({}).strict();
export const esquemaCrearCategoria = esquema.object({ nombre: nombreCategoria }).strict();
export const esquemaEditarCategoria = esquema.object({
  nombre: nombreCategoria.optional(),
  activa: esquema.boolean().optional(),
}).strict().refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indicá al menos un cambio.");
export const esquemaActualizarCategoria = esquema.object({
  id: identificadorCategoria,
  cambios: esquemaEditarCategoria,
}).strict();
