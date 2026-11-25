/* Ventas por día de la semana y por temporada (hemisferio sur). Sin DOM.
   Solo cuentan los días con ventas registradas (día abierto). Las ventas son brutas (con IVA), como en el resumen del mes. */
import { dayTotal, dayUnits } from './estado.js';
import { sum } from './util.js';

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const TEMPORADAS = [
  { k: 'verano', n: 'Verano', meses: [12, 1, 2] }, { k: 'otono', n: 'Otoño', meses: [3, 4, 5] },
  { k: 'invierno', n: 'Invierno', meses: [6, 7, 8] }, { k: 'primavera', n: 'Primavera', meses: [9, 10, 11] }
];
/** 0 = lunes … 6 = domingo */
export const diaSemana = fecha => (new Date(fecha + 'T12:00:00').getDay() + 6) % 7;
export const temporadaDe = fecha => TEMPORADAS.find(t => t.meses.includes(+fecha.slice(5, 7)));
const abiertos = days => days.filter(d => !d.deleted && dayTotal(d) > 0);
// «dias» (no «n»): en las temporadas «n» es el nombre
const resumen = ds => { const total = sum(ds, dayTotal), dias = ds.length, cafes = sum(ds, d => dayUnits(d, 'cafe')); return { dias, total, prom: dias ? total / dias : 0, cafes, cafesDia: dias ? cafes / dias : 0 }; };

/** Promedio por día abierto, para cada día de la semana (siempre 7 filas, de lunes a domingo). */
export function porDiaSemana(days) {
  const ds = abiertos(days);
  return DIAS.map((dia, i) => ({ i, dia, ...resumen(ds.filter(d => diaSemana(d.fecha) === i)) }));
}
/** Promedio por día abierto en cada temporada, con cuántos meses distintos aportaron datos. */
export function porTemporada(days) {
  const ds = abiertos(days);
  return TEMPORADAS.map(t => { const x = ds.filter(d => temporadaDe(d.fecha).k === t.k); return { ...t, ...resumen(x), meses: new Set(x.map(d => d.fecha.slice(0, 7))).size }; });
}
/** Total de ventas y promedio por día abierto de cada mes con datos, en orden cronológico. */
export function porMes(days) {
  const ds = abiertos(days), mks = [...new Set(ds.map(d => d.fecha.slice(0, 7)))].sort();
  return mks.map(mk => ({ mk, temporada: temporadaDe(mk + '-01'), ...resumen(ds.filter(d => d.fecha.startsWith(mk))) }));
}
