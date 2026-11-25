/* Render general, campos enlazados y valores en vivo. */
import { wizardScreen } from './asistente.js';
import { CATS } from './constantes.js';
import { comprasRecientes, consumo, costBase, costIng, costMenu, itemUB, margen, sugerido } from './costeo.js';
import { aBruto } from './iva.js';
import { UB } from './defaults.js';
import { D, G, S, UI, byId, dayOf, dayTeorico, dayTotal, dayUnits, live, touch, upsertDay } from './estado.js';
import { budget, equilibrio } from './finanzas.js';
import { appScreen } from './paneles.js';
import { pinScreen } from './pin.js';
import { SD } from './sync.js';
import { $, clp, dec, esc, nfmt, now, parseCLP, parseDec, pct, sum } from './util.js';

/* ═══════════════ RENDER GENERAL ═══════════════ */
export function render() {
  const sc = window.scrollY;
  let html;
  if (!UI.unlocked) html = pinScreen();
  else if (!S().setupDone || UI.wizard) html = wizardScreen();
  else html = appScreen();
  $('#app').innerHTML = html;
  if (!UI.unlocked) { const f = document.querySelector('.pin-digit'); f && f.focus(); }
  window.scrollTo(0, UI._keepScroll ? sc : 0); UI._keepScroll = true;
  refreshLive();
}
export function rerender() { UI._keepScroll = true; render(); }

/* campos enlazados */
export function fv(type, v) {
  if (type === 'clp') return v ? nfmt(v) : '';
  if (type === 'pct') return v ? dec(v * 100, 2).replace(/,?0+$/, '') : '0';
  if (type === 'dec') return v ? String(Math.round(v * 100) / 100).replace('.', ',') : '';
  return v ?? '';
}
export function input(bind, type, v, attrs = '') {
  const im = type === 'clp' ? 'numeric' : (type === 'pct' || type === 'dec') ? 'decimal' : 'text';
  const cls = (type === 'text' ? '' : ' num');
  return `<input class="field-input${cls}" data-bind="${bind}:${type}" inputmode="${im}" value="${esc(fv(type, v))}" ${attrs}>`;
}
export function fld(label, bind, type, v, attrs = '') { return `<label class="fld"><span>${label}</span>${input(bind, type, v, attrs)}</label>`; }
export function tgl(bind, on, label) { return `<button type="button" class="tgl ${on ? 'on' : ''}" data-act="toggle" data-t="${bind}"><i></i>${label}</button>`; }
export function sel(bind, v, opts) { return `<select class="field-input" data-bind="${bind}:text">${Object.entries(opts).map(([k, n]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`; }
export function catPill(k) { const c = CATS[k] || CATS.otros; return `<span class="pill" style="background:${c.bg};color:${c.c}">${c.n}</span>`; }

export function getVal(coll, id, field) {
  if (coll === 'settings') return field.split('.').reduce((o, k) => o[k], D.settings);
  if (coll === 'g') return G[field];
  if (coll === 'sd') return SD[field];
  if (coll === 'day') { const d = dayOf(id); return d ? d[field] : 0; }
  const o = byId(coll, id); return o ? o[field] : undefined;
}
export function setVal(coll, id, field, v) {
  if (coll === 'g') { G[field] = v; return; }
  if (coll === 'sd') { SD[field] = v; return; }
  if (coll === 'settings') { const ks = field.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], D.settings)[last] = v; D.settings.updatedAt = now(); touch(); return; }
  if (coll === 'day') { upsertDay(id)[field] = v; touch(); return; }
  if (coll === 'rec' || coll === 'recit') { const m = byId('menu', id); const r = m && m.receta[+field]; if (!r) return; r[coll === 'rec' ? 'qty' : 'itemId'] = v; m.updatedAt = now(); touch(); return; }
  const o = byId(coll, id); if (!o) return; o[field] = v; o.updatedAt = now(); touch();
}
export function parseBind(s) { const [coll, id, field, type] = s.split(':'); return { coll, id, field, type }; }
export function onBind(el, commit) {
  const b = parseBind(el.dataset.bind); let v;
  if (b.type === 'clp') v = parseCLP(el.value);
  else if (b.type === 'pct') v = parseDec(el.value) / 100;
  else if (b.type === 'dec') v = parseDec(el.value);
  else if (b.type === 'int') v = Math.round(parseDec(el.value));
  else v = el.value;
  setVal(b.coll, b.id, b.field, v);
  if (b.coll === 'g' && (b.field === 'cant' || b.field === 'precio')) { G.monto = Math.round((G.cant || 0) * (G.precio || 0)); const m = $('[data-bind="g::monto:clp"]'); if (m) m.value = fv('clp', G.monto); }
  if (commit) {
    if (b.type !== 'text') el.value = fv(b.type, v);
    if (el.tagName === 'SELECT' || el.type === 'date' || el.type === 'month') rerender();
  }
  refreshLive();
}

/* valores en vivo (sin redibujar) */
export const LIVE = {
  hoyTeo: () => clp(dayTeorico(dayOf(UI.fecha))),
  hoyCob: () => clp(dayTotal(dayOf(UI.fecha))),
  hoyDif: () => { const d = dayOf(UI.fecha); if (!d || !dayUnits(d)) return '<span class="muted">anota productos</span>'; const df = dayTotal(d) - dayTeorico(d); const t = Math.abs(df) < 1 ? 'ok-t' : Math.abs(df) <= 2000 ? 'warn-t' : 'bad-t'; return `<span class="${t}">${df > 0 ? '+' : ''}${clp(df)}</span>`; },
  hoyTicket: () => { const d = dayOf(UI.fecha); return d && d.tickets ? clp(dayTotal(d) / d.tickets) : '—'; },
  fixedTot: () => clp(sum(live('fixed'), f => aBruto(f.monto, f.factura, f.montoTipo, S().iva))),
  menuTot: () => clp(budget().bruto),
  itemsTot: () => clp(sum(live('items'), i => aBruto(i.precio, i.factura, i.precioTipo, S().iva) * i.mensual)),
  mixSum: () => { const s = sum(Object.values(S().mix)); return `<span class="${Math.abs(s - 1) < 0.001 ? 'ok-t' : 'bad-t'}">${pct(s, 0)}</span>`; },
  equi: () => { const e = equilibrio(); return e.cafesDia ? dec(e.cafesDia, 1) + ' cafés/día' : '—'; },
  mg: (k, id) => {
    const o = byId(k, id); if (!o) return '';
    const venta = k === 'menu' ? o.precio : o.precioVenta, costo = k === 'menu' ? costMenu(o) : costBase(o);
    const sg = costo > 0 ? ` · Precio sugerido (${pct(S().margenObj, 0)} sobre costo): <b>${clp(sugerido(costo))}</b>` : '';
    if (!venta) return `<span class="muted">Costo ${clp(costo)}. Pon el precio de venta para ver el margen</span>${sg}`;
    const r = margen(venta, costo), t = r.p == null ? '' : r.p >= 0.6 ? 'ok-t' : r.p >= 0.35 ? 'warn-t' : 'bad-t';
    return `Costo <b>${clp(costo)}</b> + comisión de cobro ${clp(r.com)} · Margen por unidad (sin IVA): <b class="${t}">${clp(r.m)} · ${pct(r.p, 0)}</b>${sg}`;
  },
  ic: (mid, idx) => { const p = byId('menu', mid); const r = p && p.receta[+idx]; return r ? clp(costIng(r)) : ''; },
  cb: id => {
    const it = byId('items', id); if (!it) return ''; const u = itemUB(it), cb = costBase(it);
    const cp = S().usaCompras !== false ? comprasRecientes(it) : [];
    if (!it.precio && !cp.length) return '<span class="muted">Pon el precio de compra para calcular el costo por receta</span>';
    const origen = cp.length ? ` · promedio de ${cp.length} compra${cp.length > 1 ? 's' : ''} de los últimos 3 meses` : '';
    return `Costo real ${it.factura ? 'sin IVA' : 'con IVA'}${origen}${it.merma ? `, con ${pct(it.merma, 0)} de merma` : ''}: <b>${clp(cb)} por ${u.n}</b>${u.f > 1 ? ` · $${(cb / u.f).toFixed(1).replace('.', ',')} por ${u.r}` : ''}`;
  },
  cons: id => { const it = byId('items', id); const c = consumo(id); return c > 0 ? `Según tus recetas y ventas esperadas usas ~<b>${dec(c, 1)} ${esc(it.unidad || UB[it.ub].n)}</b> al mes · <button class="btn-link" data-act="useCons" data-id="${id}">Usar como compra al mes</button>` : ''; }
};
export function refreshLive() { document.querySelectorAll('[data-live]').forEach(el => { const [k, ...args] = el.dataset.live.split(':'); const f = LIVE[k]; if (f) el.innerHTML = f(...args); }); }

