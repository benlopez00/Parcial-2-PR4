// Implementa RF-C1 y RF-C2: los documentos se guardan como los escribe el usuario
// ("28.456.123") pero se comparan y se buscan sin puntos, guiones ni espacios,
// para que "28456123" y "28.456.123" sean la misma persona.
export function normalizarDocumento(documento: string): string {
  return documento.replace(/\D/g, "");
}
