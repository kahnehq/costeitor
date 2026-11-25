/* Costeo de recetas y márgenes (lógica heredada de Costeitor). Sin DOM. */
import { UB } from './defaults.js';
import { D, S, byId, live } from './estado.js';
import { unitsMes } from './finanzas.js';
import { aNeto } from './iva.js';
import { addMonths, sum, thisMonth } from './util.js';

/* ── costeo (lógica de Costeitor) ── */
/* Compras registradas del insumo en el mes actual y los 2 anteriores (con cantidad y monto) */
export function comprasRecientes(it) {
  if (!it) return []; const ini = addMonths(thisMonth(), -2) + '-01';
  return D.expenses.filter(e => !e.deleted && e.itemId === it.id && e.cant > 0 && e.monto > 0 && e.fecha >= ini);
}
/* Precio neto de costo por unidad de compra. Si hay compras recientes, promedio ponderado por cantidad
   (así el precio del café por kilo puede variar según lo que compres); si no, el precio del catálogo. */
export function precioCosto(it) {
  const iva = S().iva;
  if (S().usaCompras !== false) {
    const c = comprasRecientes(it), q = sum(c, e => e.cant);
    if (q > 0) return sum(c, e => aNeto(e.monto, e.factura, 'bruto', iva)) / q; // e.monto siempre se guarda con IVA
  }
  return aNeto(it.precio, it.factura, it.precioTipo, iva);
}
export function costBase(it) { // costo por kg / litro / unidad, después de merma; sin IVA si hay factura
  if (!it) return 0; const p = precioCosto(it);
  const c = it.contenido > 0 ? it.contenido : 1, r = 1 - (it.merma || 0);
  return p / c / (r > 0 ? r : 1);
}
export const itemUB = it => UB[(it && it.ub) || 'und'];
export function costIng(ing) { const it = D.items.find(x => x.id === ing.itemId && !x.deleted); return it ? costBase(it) * (ing.qty || 0) / itemUB(it).f : 0; }
export function costMenu(p) { return sum(p.receta || [], costIng) + (p.extra || 0); }
export function costSell(id) { const m = D.menu.find(x => x.id === id); if (m) return costMenu(m); const i = D.items.find(x => x.id === id); return i ? costBase(i) : 0; }
/* comisión promedio de cobro, como fracción del precio con IVA (según la mezcla de medios de pago); es costo si no hay factura por ella, también su IVA */
export function comPct() { const s = S(), g = (s.mix.tuu || 0) * s.tuu + (s.mix.mpd || 0) * s.mpd + (s.mix.mpc || 0) * s.mpc; return s.facturaCom ? g : g * (1 + s.iva); }
/* precio con IVA tal que: precio/(1+IVA) − comisión = costo × (1 + margen objetivo) — redondeado a $100 */
export function sugerido(costo) { const s = S(), k = 1 / (1 + s.iva) - comPct(); return k > 0 ? Math.ceil(costo * (1 + s.margenObj) / k / 100) * 100 : 0; }
/* consumo mensual de un insumo según recetas y ventas esperadas, en unidades de compra */
export function consumo(itemId) {
  const it = byId('items', itemId); if (!it) return 0; let base = 0;
  live('menu').forEach(p => (p.receta || []).forEach(r => { if (r.itemId === itemId) base += unitsMes(p) * (r.qty || 0) / itemUB(it).f; }));
  if (it.venta) base += unitsMes(it);
  const c = it.contenido > 0 ? it.contenido : 1, rm = 1 - (it.merma || 0);
  return base / c / (rm > 0 ? rm : 1);
}
/* costo teórico de lo vendido en un conjunto de días (según recetas) */
export function costoTeorico(days) { return sum(days, d => sum(Object.entries(d.u || {}), ([id, n]) => costSell(id) * n)); }
export function dosisReceta() { // gramos promedio de grano por café según recetas
  const gIds = new Set(live('items').filter(i => i.grano).map(i => i.id)); const cafes = live('menu').filter(p => p.cat === 'cafe');
  const gs = cafes.map(p => sum((p.receta || []).filter(r => gIds.has(r.itemId)), r => r.qty || 0)).filter(x => x > 0);
  return gs.length ? sum(gs) / gs.length : S().dosis;
}
/* lo que se puede vender en caja: la carta + insumos marcados “Se vende en caja” */
export function sellables() {
  return [...live('menu').map(p => ({ id: p.id, nombre: p.nombre, precio: p.precio, cat: p.cat, grupo: 'carta' })),
          ...live('items').filter(i => i.venta).map(i => ({ id: i.id, nombre: i.nombre, precio: i.precioVenta || 0, cat: 'reventa', grupo: 'reventa' }))];
}
export function sellById(id) { const m = D.menu.find(x => x.id === id); if (m) return { precio: m.precio, cat: m.cat }; const i = D.items.find(x => x.id === id); return i ? { precio: i.precioVenta || 0, cat: 'reventa' } : null; }
/* margen de contribución por unidad, sin IVA: venta neta − costo de receta − comisión de cobro promedio */
export function margen(precioVenta, costoNeto) { const vn = (precioVenta || 0) / (1 + S().iva), com = (precioVenta || 0) * comPct(), m = vn - costoNeto - com; return { m, com, p: vn > 0 ? m / vn : null }; }
