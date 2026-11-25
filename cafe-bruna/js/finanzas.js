/* Presupuesto, real, estado de resultados, equilibrio y flujo/F29. Sin DOM. */
import { COBROS } from './constantes.js';
import { costBase, costMenu, costoTeorico } from './costeo.js';
import { D, S, byId, dayTeorico, dayTotal, dayUnits, live } from './estado.js';
import { aBruto } from './iva.js';
import { addMonths, sum } from './util.js';

/* ═══════════════ CÁLCULOS ═══════════════ */
export function addCat(cats, k, monto, fac) {
  const iva = S().iva; const c = cats[k] || (cats[k] = { bruto: 0, neto: 0, ivac: 0 });
  const n = fac ? monto / (1 + iva) : monto; c.bruto += monto; c.neto += n; c.ivac += monto - n;
}
export const unitsMes = p => p.por === 'semana' ? p.esperado * 4.33 : p.esperado * S().dias;
export function budget() {
  const s = S(); let bruto = 0, cafes = 0, cafeVal = 0, units = 0;
  live('menu').forEach(p => { const u = unitsMes(p); bruto += u * p.precio; units += u; if (p.cat === 'cafe') { cafes += u; cafeVal += u * p.precio; } });
  live('items').filter(i => i.venta).forEach(i => { const u = unitsMes(i); bruto += u * (i.precioVenta || 0); units += u; });
  const med = {}; COBROS.forEach(([k]) => med[k] = bruto * (s.mix[k] || 0));
  const cats = {};
  live('fixed').forEach(f => addCat(cats, f.tipo === 'prestamo' ? 'prestamo' : 'fijo', aBruto(f.monto, f.factura, f.montoTipo, s.iva), f.factura));
  live('items').forEach(i => addCat(cats, i.cat, aBruto(i.precio, i.factura, i.precioTipo, s.iva) * i.mensual, i.factura));
  if (s.retiro) addCat(cats, 'retiro', s.retiro, false);
  const granoKg = sum(live('items').filter(i => i.grano), i => i.mensual * (i.contenido || 1));
  const costoTeo = sum(live('menu'), p => unitsMes(p) * costMenu(p)) + sum(live('items').filter(i => i.venta), i => unitsMes(i) * costBase(i));
  return { real: false, bruto, med, cats, cafes, cafeVal, tickets: units, dias: s.dias, granoKg, teorico: bruto, hasUnits: true, costoTeo };
}
export function real(mk) {
  const days = D.days.filter(d => !d.deleted && d.fecha.startsWith(mk));
  const exps = D.expenses.filter(e => !e.deleted && e.fecha.startsWith(mk));
  const med = {}; COBROS.forEach(([k]) => med[k] = sum(days, d => d[k] || 0));
  const bruto = sum(Object.values(med));
  const cats = {}; exps.forEach(e => addCat(cats, e.cat, e.monto, e.factura));
  const granoIds = new Set(D.items.filter(i => i.grano).map(i => i.id));
  return {
    real: true, days, exps, bruto, med, cats, tickets: sum(days, d => d.tickets || 0),
    cafes: sum(days, d => dayUnits(d, 'cafe')), units: sum(days, d => dayUnits(d)), teorico: sum(days, dayTeorico),
    hasUnits: days.some(d => dayUnits(d) > 0), dias: days.filter(d => dayTotal(d) > 0).length,
    granoKg: sum(exps.filter(e => granoIds.has(e.itemId)), e => (e.cant || 0) * ((byId('items', e.itemId) || {}).contenido || 1)), hasData: days.length + exps.length > 0,
    costoTeo: costoTeorico(days)
  };
}
export function pl(x) {
  const s = S(), iva = s.iva, g = k => (x.cats[k] || { neto: 0 }).neto;
  const neto = x.bruto / (1 + iva), ivaDeb = x.bruto - neto;
  const comNeto = (x.med.tuu || 0) * s.tuu + (x.med.mpd || 0) * s.mpd + (x.med.mpc || 0) * s.mpc;
  const comCosto = s.facturaCom ? comNeto : comNeto * (1 + iva), comBruto = comNeto * (1 + iva), comIva = s.facturaCom ? comNeto * iva : 0;
  const cv = { cafe: g('cafe'), helado: g('helado'), reventa: g('reventa'), desechables: g('desechables') };
  const costoVentas = sum(Object.values(cv)), margen = neto - costoVentas;
  const fijos = g('fijo'), limpieza = g('limpieza'), otros = g('otros');
  const gastosOp = fijos + comCosto + limpieza + otros, ebitda = margen - gastosOp, prestamo = g('prestamo'), resultado = ebitda - prestamo;
  const ivaCred = sum(Object.values(x.cats), c => c.ivac) + comIva;
  const egresos = sum(Object.values(x.cats), c => c.bruto);
  const fixedTot = fijos + limpieza + otros + prestamo, mc = neto > 0 ? (neto - costoVentas - comCosto) / neto : null;
  return { neto, ivaDeb, comNeto, comCosto, comBruto, comIva, cv, costoVentas, margen, fijos, limpieza, otros, gastosOp, ebitda, prestamo, resultado, ivaCred, egresos, fixedTot, mc, ppm: neto * s.ppm };
}
export function equilibrio() { // según estructura del presupuesto
  const b = budget(), p = pl(b), s = S();
  // costo variable: el mayor entre recetas (consumo teórico) y compras planificadas — criterio conservador
  const cvar = Math.max(p.costoVentas, b.costoTeo), mc = p.neto > 0 ? (p.neto - cvar - p.comCosto) / p.neto : null;
  const pe = mc > 0 ? p.fixedTot / mc : null;
  const precioCafe = b.cafes > 0 ? b.cafeVal / b.cafes / (1 + s.iva) : null;
  return { pe, mc, cvar, cafesDia: pe && precioCafe ? pe / precioCafe / s.dias : null };
}
export function flujo() {
  const s = S(); let caja = s.cajaInicial, prevF29 = s.f29Pendiente, rem = s.remanente; const out = [];
  for (let i = 0; i < 12; i++) {
    const mk = addMonths(s.inicio, i), r = real(mk), x = r.hasData ? r : budget(), p = pl(x);
    const ingresos = x.bruto - p.comBruto, egresos = p.egresos + prevF29, neto = ingresos - egresos;
    const ivaPagar = Math.max(0, p.ivaDeb - p.ivaCred - rem), remSig = Math.max(0, p.ivaCred + rem - p.ivaDeb), f29 = ivaPagar + p.ppm;
    out.push({ mk, real: r.hasData, x, p, cajaIni: caja, ingresos, egresos, pagoF29: prevF29, neto, cajaFin: caja + neto, remIni: rem, ivaPagar, remSig, f29 });
    caja += neto; prevF29 = f29; rem = remSig;
  }
  return out;
}
