export function convertirRangoDiasAInstantesUtc(rango: { desde?: string; hasta?: string }): {
  desdeInclusivo?: string;
  hastaExclusivo?: string;
} {
  const desdeInclusivo = rango.desde ? new Date(`${rango.desde}T00:00:00-03:00`).toISOString() : undefined;
  const fin = rango.hasta ? new Date(`${rango.hasta}T00:00:00-03:00`) : undefined;
  if (fin) fin.setUTCDate(fin.getUTCDate() + 1);
  return { desdeInclusivo, hastaExclusivo: fin?.toISOString() };
}
