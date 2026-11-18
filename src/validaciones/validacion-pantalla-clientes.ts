import { z as esquema } from "zod";
import { esquemaListadoClientes } from "./validacion-clientes";

const diaCalendario = esquema.iso.date();

// Implementa RF-C1: los filtros del listado viven en la URL, así la pantalla se puede
// recargar, compartir y volver atrás sin perder el estado.
export const esquemaPantallaClientes = esquemaListadoClientes;

// Implementa RF-C3 y RF-C4: la ficha recuerda en la URL qué pestaña está abierta
// y el rango de fechas de la cuenta corriente.
export const esquemaPantallaFichaCliente = esquema.object({
  pestana: esquema.enum(["datos", "cuenta"]).default("datos"),
  desde: diaCalendario.optional(),
  hasta: diaCalendario.optional(),
}).strict().refine((datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta, {
  path: ["hasta"], message: "La fecha hasta no puede ser anterior a desde.",
});

export type ConsultaPantallaClientes = esquema.output<typeof esquemaListadoClientes>;
export type ConsultaFichaCliente = esquema.output<typeof esquemaPantallaFichaCliente>;
export type ParametrosUrlClientes = Record<string, string | string[] | undefined>;
export type CambiosConsultaClientes = Record<string, string | number | undefined | null>;
