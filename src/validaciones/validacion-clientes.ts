import { z as esquema } from "zod";
import { normalizarDocumento } from "@/utilidades/documentos";

const identificadorConsulta = esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const enteroNoNegativo = esquema.number({ error: "Ingresá un número entero no negativo." })
  .int("Ingresá un número entero.").min(0, "No puede ser negativo.").max(Number.MAX_SAFE_INTEGER);
const textoObligatorio = esquema.string().trim().min(1, "Este campo es obligatorio.");
const paginacion = {
  page: esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1),
  pageSize: esquema.coerce.number().int().min(1).max(100).default(20),
};

// Un campo opcional ausente queda en undefined (no se toca); vacío o nulo se guarda como null.
const textoOpcional = esquema.string().trim().nullable().optional()
  .transform((valor) => (valor === "" ? null : valor));
const emailOpcional = textoOpcional.refine(
  (valor) => valor === undefined || valor === null || esquema.email().safeParse(valor).success,
  "Ingresá un email válido.",
);

const camposCliente = {
  tipoDoc: esquema.enum(["DNI", "CUIT"], { error: "Elegí DNI o CUIT." }),
  nroDoc: textoObligatorio.refine((valor) => normalizarDocumento(valor) !== "", "Ingresá un número de documento."),
  nombre: textoObligatorio,
  domicilio: textoOpcional,
  telefono: textoOpcional,
  email: emailOpcional,
  cuentaCorriente: esquema.boolean().optional(),
  limiteCredito: enteroNoNegativo.nullable().optional(),
};

export const esquemaListadoClientes = esquema.object({
  q: esquema.string().trim().default(""),
  conDeuda: esquema.enum(["true", "false"]).default("false"),
  orden: esquema.enum(["nombre", "saldo"]).default("nombre"),
  activo: esquema.enum(["true", "false", "todos"]).default("true"),
  ...paginacion,
}).strict();

export const esquemaObtenerCliente = esquema.object({ id: identificadorConsulta }).strict();

// Implementa RF-C2 y RF-V2: el alta del listado y la del modal de Nueva venta comparten esquema.
export const esquemaCrearCliente = esquema.object(camposCliente).strict();

// .strict() rechaza "saldo" y cualquier otro campo no previsto con 422 VALIDACION.
export const esquemaEditarCliente = esquema.object({ ...camposCliente, activo: esquema.boolean() })
  .partial().strict()
  .refine((datos) => Object.values(datos).some((valor) => valor !== undefined), "Indicá al menos un cambio.");

export const esquemaActualizarCliente = esquema.object({
  id: identificadorConsulta,
  cambios: esquemaEditarCliente,
}).strict();
