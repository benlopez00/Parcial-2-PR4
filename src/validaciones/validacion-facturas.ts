import { z as esquema } from "zod";

const identificadorCuerpo = esquema.number({ error: "Elegí una opción válida." }).int().positive("Elegí una opción.").max(Number.MAX_SAFE_INTEGER);
const identificadorConsulta = esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const textoObligatorio = esquema.string().trim().min(1, "Este campo es obligatorio.");
const enteroNoNegativo = esquema.number({ error: "Ingresá un importe en centavos enteros." })
  .int("Ingresá un importe en centavos enteros.").min(0, "No puede ser negativo.").max(Number.MAX_SAFE_INTEGER);
const diaCalendario = esquema.iso.date();
const paginacion = {
  page: esquema.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).default(1),
  pageSize: esquema.coerce.number().int().min(1).max(100).default(20),
};

export const esquemaCantidadVenta = esquema.number({ error: "Ingresá una cantidad." }).int("Ingresá unidades enteras.")
  .positive("La cantidad debe ser mayor que cero.").max(Number.MAX_SAFE_INTEGER);

// Implementa RF-V3 y Regla 3: el renglón solo dice qué producto y cuánto. El precio lo pone el servidor.
const esquemaItemFactura = esquema.object({
  productoId: identificadorCuerpo,
  cantidad: esquemaCantidadVenta,
}).strict();

// Implementa RF-V5 y Regla 9: de la tarjeta solo entran tipo, marca y últimos 4 dígitos.
// El .strict() es lo que rechaza un numeroTarjeta completo con 422, sin código extra.
const esquemaTarjeta = esquema.object({
  tipo: esquema.enum(["debito", "credito"], { error: "Elegí débito o crédito." }),
  marca: textoObligatorio,
  ultimos4: esquema.string().regex(/^\d{4}$/, "Ingresá solamente los últimos 4 dígitos."),
}).strict();

// Implementa RF-V5: una forma de pago por factura, cada una con sus datos propios.
export const esquemaPagoFactura = esquema.discriminatedUnion("forma", [
  esquema.object({ forma: esquema.literal("contado"), montoRecibido: enteroNoNegativo.optional() }).strict(),
  esquema.object({ forma: esquema.literal("tarjeta"), tarjeta: esquemaTarjeta }).strict(),
  esquema.object({ forma: esquema.literal("cuenta_corriente") }).strict(),
]);

// Implementa RF-V1 a RF-V6: el cuerpo no tiene precio ni total; esa ausencia es la Regla 3.
export const esquemaEmitirFactura = esquema.object({
  clienteId: identificadorCuerpo.nullable().default(null),
  items: esquema.array(esquemaItemFactura).min(1, "Agregá al menos un producto.")
    .refine((items) => new Set(items.map((item) => item.productoId)).size === items.length, {
      path: ["items"], message: "No repitas el mismo producto: sumá la cantidad en un solo renglón.",
    }),
  pago: esquemaPagoFactura,
}).strict();

// Implementa RF-V9: anular exige un motivo, y la factura nunca se borra ni se edita.
export const esquemaAnularFactura = esquema.object({
  id: identificadorConsulta,
  motivo: textoObligatorio,
}).strict();

// Implementa RF-V8: filtros del listado de facturas.
export const esquemaListadoFacturas = esquema.object({
  q: esquema.string().trim().default(""),
  desde: diaCalendario.optional(),
  hasta: diaCalendario.optional(),
  clienteId: identificadorConsulta.optional(),
  vendedorId: identificadorConsulta.optional(),
  forma: esquema.enum(["contado", "tarjeta", "cuenta_corriente"]).optional(),
  estado: esquema.enum(["emitida", "anulada"]).optional(),
  ...paginacion,
}).strict().refine((datos) => !datos.desde || !datos.hasta || datos.desde <= datos.hasta, {
  path: ["hasta"], message: "La fecha hasta no puede ser anterior a desde.",
});

export const esquemaObtenerFactura = esquema.object({ id: identificadorConsulta }).strict();
