import { z as esquema } from "zod";

const identificadorConsulta = esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const diaCalendario = esquema.iso.date();

// Implementa RF-C4: el rango de fechas es opcional y "desde" no puede ser posterior a "hasta".
export const esquemaCuentaCorriente = esquema.object({
  id: identificadorConsulta,
  desde: diaCalendario.optional(),
  hasta: diaCalendario.optional(),
}).strict().refine((datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta, {
  path: ["hasta"], message: "La fecha hasta no puede ser anterior a desde.",
});

// Implementa RF-C5: el importe va en centavos enteros; el número de recibo y el saldo los pone el servidor.
export const esquemaCuerpoPago = esquema.object({
  importe: esquema.number({ error: "Ingresá un importe." }).int("Ingresá un importe en centavos enteros.")
    .positive("El importe debe ser mayor que cero.").max(Number.MAX_SAFE_INTEGER),
  medio: esquema.enum(["efectivo", "transferencia", "tarjeta_debito"], { error: "Elegí un medio de pago." }),
  observacion: esquema.string().trim().nullable().optional().transform((valor) => (valor === "" ? null : valor)),
}).strict();

export const esquemaRegistrarPago = esquema.object({
  clienteId: identificadorConsulta,
  pago: esquemaCuerpoPago,
}).strict();

export const esquemaObtenerRecibo = esquema.object({ id: identificadorConsulta }).strict();
