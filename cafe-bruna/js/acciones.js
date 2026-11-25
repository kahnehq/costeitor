/* Acciones de clic (ACTS) y eventos change (CHANGES); exportar CSV/JSON. */
import { WSTEPS } from './asistente.js';
import { CATS, LS_DATA, LS_PIN, LS_SYNC, MEDIOS } from './constantes.js';
import { consumo } from './costeo.js';
import { aBruto } from './iva.js';
import { defaults } from './defaults.js';
import { D, G, S, UI, byId, dayUnits, live, migrate, nextOrd, setD, setG, touch, upsertDay } from './estado.js';
import { real } from './finanzas.js';
import { pinCheck, sha } from './pin.js';
import { getVal, parseBind, render, rerender, setVal } from './render.js';
import { SD, SYNC, ghCfg, merge, sync } from './sync.js';
import { $, addDays, addMonths, clp, monthLabel, now, sum, thisMonth, toast, today, uid } from './util.js';

/* ═══════════════ ACCIONES ═══════════════ */
export const ACTS = {
  tab: el => { UI.tab = el.dataset.k; UI._keepScroll = false; render(); },
  toggle: el => { const b = parseBind(el.dataset.t + ':bool'); setVal(b.coll, b.id, b.field, !getVal(b.coll, b.id, b.field)); rerender(); },
  rm: el => { const o = byId(el.dataset.k, el.dataset.id); if (!o) return; if (!confirm(`¿Quitar “${o.nombre}”?`)) return; o.deleted = true; o.updatedAt = now(); touch(); rerender(); },
  add: el => {
    const k = el.dataset.k, base = { id: uid(), ord: nextOrd(k), updatedAt: now(), deleted: false };
    if (k === 'fixed') D.fixed.push({ ...base, nombre: '', monto: 0, montoTipo: 'bruto', factura: false, tipo: 'fijo' });
    if (k === 'menu') D.menu.push({ ...base, nombre: '', cat: 'cafe', precio: 0, extra: 0, receta: [], esperado: 0, por: 'dia' });
    if (k === 'items') D.items.push({ ...base, nombre: '', cat: el.dataset.cat || 'otros', unidad: 'unidad', precio: 0, precioTipo: 'bruto', mensual: 0, factura: false, grano: false, venta: el.dataset.cat === 'reventa', precioVenta: 0, esperado: 0, por: 'semana', ub: 'und', contenido: 1, merma: 0 });
    touch(); rerender(); setTimeout(() => { const i = document.querySelector(`[data-bind="${k}:${base.id}:nombre:text"]`); i && i.focus(); }, 30);
  },
  recAdd: el => { const m = byId('menu', el.dataset.id); m.receta = m.receta || []; m.receta.push({ itemId: '', qty: 0 }); m.updatedAt = now(); touch(); rerender(); },
  recRm: el => { const m = byId('menu', el.dataset.id); m.receta.splice(+el.dataset.ix, 1); m.updatedAt = now(); touch(); rerender(); },
  useCons: el => { const it = byId('items', el.dataset.id); it.mensual = Math.round(consumo(it.id) * 10) / 10; it.updatedAt = now(); touch(); rerender(); toast('Compra mensual actualizada'); },
  // asistente
  wNext: () => { if (UI.wstep < WSTEPS.length - 1) { UI.wstep++; UI._keepScroll = false; render(); } else { S().setupDone = true; S().updatedAt = now(); touch(); UI.wizard = false; UI.wstep = 0; UI.tab = 'hoy'; UI._keepScroll = false; render(); toast('¡Listo! Ya puedes registrar tu caja'); } },
  wPrev: () => { UI.wstep = Math.max(0, UI.wstep - 1); UI._keepScroll = false; render(); },
  wOpen: () => { UI.wizard = true; UI.wstep = 0; UI._keepScroll = false; render(); },
  wExit: () => { UI.wizard = false; render(); },
  wRecover: () => { UI.recover = !UI.recover; render(); },
  // caja del día
  inc: el => { const d = upsertDay(UI.fecha); d.u = d.u || {}; d.u[el.dataset.id] = (d.u[el.dataset.id] || 0) + 1; touch(); rerender(); },
  dec: (el, ev) => { ev.stopPropagation(); const d = upsertDay(UI.fecha); const id = el.dataset.id; d.u[id] = Math.max(0, (d.u[id] || 0) - 1); if (!d.u[id]) delete d.u[id]; touch(); rerender(); },
  dPrev: () => { UI.fecha = addDays(UI.fecha, -1); rerender(); }, dNext: () => { UI.fecha = addDays(UI.fecha, 1); rerender(); }, dToday: () => { UI.fecha = today(); rerender(); },
  mPrev: () => { UI.month = addMonths(UI.month, -1); rerender(); }, mNext: () => { UI.month = addMonths(UI.month, 1); rerender(); }, mNow: () => { UI.month = thisMonth(); rerender(); },
  // gastos
  gNew: () => { setG({ open: true, step: 'cat' }); rerender(); },
  gClose: () => { setG({ open: false }); rerender(); },
  gBack: el => { G.step = el.dataset.k; rerender(); },
  gCat: el => { G.cat = el.dataset.k; if (G.cat === 'retiro') return ACTS.gItem({ dataset: { id: '' } }); G.step = 'item'; rerender(); },
  gItem: el => {
    const id = el.dataset.id, fx = byId('fixed', id), it = byId('items', id);
    const fecha = UI.month === thisMonth() ? today() : UI.month + '-01';
    Object.assign(G, { step: 'form', itemId: id || null, fecha, medio: G.medio || 'deb', nota: '', editId: null });
    if (fx) Object.assign(G, { concepto: fx.nombre, cant: 1, precio: fx.monto, monto: fx.monto, factura: fx.factura, tipo: fx.montoTipo || 'bruto', unidad: '' });
    else if (it) Object.assign(G, { concepto: it.nombre, cant: 1, precio: it.precio, monto: it.precio, factura: it.factura, tipo: it.precioTipo || 'bruto', unidad: it.unidad });
    else Object.assign(G, { concepto: G.cat === 'retiro' ? 'Retiro del dueño' : '', cant: 1, precio: 0, monto: 0, factura: false, tipo: 'bruto', unidad: '' });
    rerender(); setTimeout(() => { const i = $('[data-bind="g::' + (id ? 'cant' : 'concepto') + ':' + (id ? 'dec' : 'text') + '"]'); i && i.focus(); i && i.select && i.select(); }, 30);
  },
  gMedio: el => { G.medio = el.dataset.k; rerender(); },
  gSave: () => {
    if (!G.concepto || !G.concepto.trim()) return toast('Escribe un concepto');
    if (!G.monto) return toast('Falta el monto');
    const tipo = G.factura && G.tipo === 'neto' ? 'neto' : 'bruto';
    // monto = lo que se pagó (con IVA); ingresado/tipo recuerdan cómo lo escribiste para poder editarlo
    const rec = { cat: G.cat, itemId: G.itemId, concepto: G.concepto.trim(), cant: G.cant || 0, unidad: G.unidad || '', precio: G.precio || 0, monto: aBruto(G.monto, !!G.factura, tipo, S().iva), ingresado: G.monto, tipo, factura: !!G.factura, medio: G.medio, nota: G.nota || '', fecha: G.fecha, updatedAt: now(), deleted: false };
    if (G.editId) Object.assign(byId('expenses', G.editId), rec); else D.expenses.push({ id: uid(), ...rec });
    if (G.itemId && G.precio && !G.editId) { const it = byId('items', G.itemId); if (it && (it.precio !== G.precio || (G.factura && it.precioTipo !== tipo))) { it.precio = G.precio; if (G.factura) it.precioTipo = tipo; it.updatedAt = now(); } }
    UI.month = G.fecha.slice(0, 7); setG({ open: false }); touch(); rerender(); toast('Gasto guardado');
  },
  gEdit: el => { const e = byId('expenses', el.dataset.id); if (!e) return; setG({ open: true, step: 'form', editId: e.id, ...JSON.parse(JSON.stringify(e)) }); if (e.ingresado !== undefined) { G.monto = e.ingresado; } G.tipo = e.tipo || 'bruto'; G.open = true; G.step = 'form'; G.editId = e.id; rerender(); },
  gDel: () => { if (!confirm('¿Eliminar este gasto?')) return; const e = byId('expenses', G.editId); e.deleted = true; e.updatedAt = now(); setG({ open: false }); touch(); rerender(); toast('Gasto eliminado'); },
  loadFixed: () => {
    const mk = UI.month, exps = real(mk).exps, pend = live('fixed').filter(f => f.monto > 0 && !exps.some(e => e.itemId === f.id));
    if (!pend.length) return toast('Los costos fijos de este mes ya están registrados');
    if (!confirm(`Registrar ${pend.length} costos fijos en ${monthLabel(mk)} por ${clp(sum(pend, f => f.monto))}?\nPuedes editar cada uno después.`)) return;
    pend.forEach(f => D.expenses.push({ id: uid(), cat: f.tipo === 'prestamo' ? 'prestamo' : 'fijo', itemId: f.id, concepto: f.nombre, cant: 1, unidad: '', precio: f.monto, monto: aBruto(f.monto, f.factura, f.montoTipo, S().iva), ingresado: f.monto, tipo: f.montoTipo || 'bruto', factura: f.factura, medio: 'deb', nota: '', fecha: mk + '-01', updatedAt: now(), deleted: false }));
    touch(); rerender(); toast('Costos fijos registrados');
  },
  // sync
  goSync: () => { UI.tab = 'ajustes'; UI.open.sync = true; UI._keepScroll = false; render(); },
  sync: () => { if (ghCfg()) sync(true); else ACTS.goSync(); },
  ghConnect: async () => {
    const c = { owner: SD.owner.trim(), repo: SD.repo.trim(), branch: (SD.branch || 'main').trim(), path: (SD.path || 'data/cafe-bruna.json').trim().replace(/^\/+/, ''), token: SD.token.trim() };
    if (!c.owner || !c.repo || !c.token) return toast('Completa usuario, repositorio y token');
    localStorage.setItem(LS_SYNC, JSON.stringify(c));
    const ok = await sync(true);
    if (!ok) { localStorage.removeItem(LS_SYNC); rerender(); return; }
    SD.token = ''; if (UI.recover && S().setupDone) { UI.recover = false; UI.wizard = false; } rerender();
  },
  ghOff: () => { if (!confirm('¿Desconectar GitHub en este equipo? Tus datos quedan en el repositorio y en este navegador.')) return; localStorage.removeItem(LS_SYNC); SYNC.st = 'off'; rerender(); },
  // pin
  pinGo: () => pinCheck(),
  pinSet: async () => { const v = ($('#newpin') || {}).value || ''; if (!/^\d{4}$/.test(v)) return toast('El PIN debe tener 4 dígitos'); localStorage.setItem(LS_PIN, await sha(v)); toast('PIN guardado en este equipo'); rerender(); },
  pinOff: () => { localStorage.removeItem(LS_PIN); toast('PIN quitado'); rerender(); },
  // exportar
  csvV: () => {
    const rows = [['Fecha', 'Efectivo', 'TUU', 'MP débito', 'MP crédito', 'Transferencia', 'Nº de ventas', 'Cafés vendidos', 'Helados vendidos', 'Nota']];
    D.days.filter(d => !d.deleted).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(d => rows.push([d.fecha, d.ef, d.tuu, d.mpd, d.mpc, d.tr, d.tickets, dayUnits(d, 'cafe'), dayUnits(d, 'helado'), d.nota]));
    download('ventas-cafe-bruna.csv', csv(rows), 'text/csv');
  },
  csvG: () => {
    const rows = [['Fecha', 'Concepto', 'Categoría', 'Monto pagado (con IVA)', '¿Con factura?', 'Medio de pago', 'Proveedor / nota']];
    D.expenses.filter(e => !e.deleted).sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(e => rows.push([e.fecha, e.concepto, (CATS[e.cat] || CATS.otros).n, e.monto, e.factura ? 'Sí' : 'No', MEDIOS[e.medio] || '', e.nota]));
    download('gastos-cafe-bruna.csv', csv(rows), 'text/csv');
  },
  jsonOut: () => download(`respaldo-cafe-bruna-${today()}.json`, JSON.stringify(D, null, 1), 'application/json'),
  wipe: () => { if (!confirm('¿Borrar TODOS los datos guardados en este navegador? (No borra GitHub)')) return; if (!confirm('¿Seguro? Esta acción no se puede deshacer.')) return; localStorage.removeItem(LS_DATA); setD(defaults()); UI.wizard = false; rerender(); }
};
export const CHANGES = {
  setFecha: el => { if (el.value) { UI.fecha = el.value; rerender(); } },
  jsonIn: el => { const f = el.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const inc = JSON.parse(rd.result); setD(merge(D, inc)); migrate(D); touch(); rerender(); toast('Respaldo importado'); } catch (e) { toast('Archivo no válido'); } }; rd.readAsText(f); }
};
export function csv(rows) { return '﻿' + rows.map(r => r.map(v => { v = String(v ?? ''); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n'); }
export function download(name, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

