import { convertirRangoDiasAInstantesUtc } from "./fechas-consulta";

// shortcut: se usa el UTC−3 fijo de las consultas existentes; usar zonas IANA si cambia el horario argentino.
export function calcularPeriodosTablero(referencia: Date) {
  const hoy = new Date(referencia.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const diaInicioMes = `${hoy.slice(0, 7)}-01`;
  const ultimoDiaMes = new Date(`${diaInicioMes}T00:00:00Z`);
  ultimoDiaMes.setUTCMonth(ultimoDiaMes.getUTCMonth() + 1);
  ultimoDiaMes.setUTCDate(ultimoDiaMes.getUTCDate() - 1);
  const fechas = Array.from({ length: 30 }, (_, indice) => {
    const dia = new Date(`${hoy}T00:00:00Z`);
    dia.setUTCDate(dia.getUTCDate() - 29 + indice);
    return dia.toISOString().slice(0, 10);
  });
  const mes = convertirRangoDiasAInstantesUtc({ desde: diaInicioMes, hasta: ultimoDiaMes.toISOString().slice(0, 10) });
  const serie = convertirRangoDiasAInstantesUtc({ desde: fechas[0], hasta: hoy });
  return {
    hoy, diaInicioMes, fechas,
    desdeMesUtc: mes.desdeInclusivo!, hastaMesUtc: mes.hastaExclusivo!,
    desdeConsultaUtc: mes.desdeInclusivo! < serie.desdeInclusivo! ? mes.desdeInclusivo! : serie.desdeInclusivo!,
  };
}
