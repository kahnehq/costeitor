/* Estado de la app (D, UI, G), carga/migración, persistencia local y acceso a colecciones. */
import { LS_DATA, LS_PIN } from './constantes.js';
import { sellById } from './costeo.js';
import { DEF_RECETAS, MEDIDAS, defMedida, defaults } from './defaults.js';
import { paintSync } from './paneles.js';
import { SYNC, ghCfg, sync } from './sync.js';
import { now, sum, thisMonth, today } from './util.js';

/* ═══════════════ ESTADO ═══════════════ */
export let D = load();
export const UI = { tab: 'hoy', fecha: today(), month: thisMonth(), wizard: false, wstep: 0, recover: false, open: {}, unlocked: !localStorage.getItem(LS_PIN) };
export let G = { open: false };                                  // modal de gasto

export function load() {
  try {
    const raw = localStorage.getItem(LS_DATA);
    if (!raw) return defaults();
    const d = JSON.parse(raw); const def = defaults();
    d.settings = Object.assign({}, def.settings, d.settings || {});
    d.settings.mix = Object.assign({}, def.settings.mix, (d.settings && d.settings.mix) || {});
    ['fixed', 'menu', 'items', 'days', 'expenses'].forEach(k => { if (!Array.isArray(d[k])) d[k] = def[k]; });
    if (migrate(d)) localStorage.setItem(LS_DATA, JSON.stringify(d));
    return d;
  } catch (e) { console.error(e); return defaults(); }
}
/* v2: los productos de reventa se venden desde el catálogo de insumos. Idempotente. */
export function migrate(d) {
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).map(w => w.replace(/(es|s)$/, '')).join(' ').trim();
  let changed = false;
  d.items.forEach(i => { if (i.venta === undefined) i.venta = false; if (i.precioVenta === undefined) i.precioVenta = 0; if (i.esperado === undefined) i.esperado = 0; if (!i.por) i.por = 'semana'; });
  // v3: medidas de compra, merma y recetas
  d.items.forEach(i => { if (i.ub === undefined) { const g = MEDIDAS[i.nombre] ? defMedida(i.nombre) : { ub: /kg|kilo/i.test(i.unidad) ? 'kg' : /litro|^l$|lt/i.test(i.unidad) ? 'l' : 'und', contenido: 1, merma: 0 }; Object.assign(i, g); } });
  d.menu.forEach(m => {
    if (m.receta === undefined) {
      const okDef = DEF_RECETAS[m.id] && DEF_RECETAS[m.id].every(r => d.items.some(i => i.id === r.itemId && !i.deleted));
      m.receta = okDef && m.cat !== 'reventa' ? JSON.parse(JSON.stringify(DEF_RECETAS[m.id])) : [];
      m.extra = m.costo && m.costo !== 250 ? m.costo : 0; delete m.costo;
    }
  });
  if (d.settings && d.settings.margenObj === undefined) d.settings.margenObj = 2;
  d.menu.filter(m => !m.deleted && m.cat === 'reventa').forEach(m => {
    let it = d.items.find(i => !i.deleted && i.fromMenu === m.id) || d.items.find(i => !i.deleted && norm(i.nombre) === norm(m.nombre));
    if (!it) { it = { id: 'x' + m.id, ord: d.items.reduce((a, x) => Math.max(a, x.ord ?? 0), -1) + 1, nombre: m.nombre, cat: 'reventa', unidad: 'unidad', precio: 0, mensual: 0, factura: false, grano: false, deleted: false, ...defMedida('') }; d.items.push(it); }
    Object.assign(it, { venta: true, precioVenta: m.precio || it.precioVenta || 0, esperado: m.esperado || 0, por: m.por || 'semana', fromMenu: m.id, updatedAt: now() });
    m.deleted = true; m.updatedAt = now(); changed = true;
  });
  const map = {}; d.items.forEach(i => { if (i.fromMenu) map[i.fromMenu] = i.id; });
  d.days.forEach(day => { if (!day.u) return; Object.keys(day.u).forEach(k => { if (map[k]) { day.u[map[k]] = (day.u[map[k]] || 0) + day.u[k]; delete day.u[k]; day.updatedAt = now(); changed = true; } }); });
  if ((d.v || 1) < 3) { d.v = 3; changed = true; }
  return changed;
}

export function saveLocal() { localStorage.setItem(LS_DATA, JSON.stringify(D)); }
export function touch() { saveLocal(); if (ghCfg()) { SYNC.st = 'pend'; paintSync(); clearTimeout(touch._t); touch._t = setTimeout(sync, 3500); } }
export const S = () => D.settings;
export const live = k => D[k].filter(x => !x.deleted).sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
export const byId = (k, id) => D[k].find(x => x.id === id);
export const menuById = id => byId('menu', id);
export const nextOrd = k => D[k].reduce((m, x) => Math.max(m, x.ord ?? 0), -1) + 1;

export function dayOf(f) { return D.days.find(d => d.id === f && !d.deleted) || null; }
export function upsertDay(f) {
  let d = D.days.find(x => x.id === f);
  if (!d) { d = { id: f, fecha: f, ef: 0, tuu: 0, mpd: 0, mpc: 0, tr: 0, tickets: 0, u: {}, nota: '', updatedAt: now(), deleted: false }; D.days.push(d); }
  if (d.deleted) Object.assign(d, { deleted: false, ef: 0, tuu: 0, mpd: 0, mpc: 0, tr: 0, tickets: 0, u: {}, nota: '' });
  d.updatedAt = now(); return d;
}
export function dayTotal(d) { return d ? (d.ef + d.tuu + d.mpd + d.mpc + d.tr) : 0; }
export function dayTeorico(d) { if (!d) return 0; return sum(Object.entries(d.u || {}), ([id, n]) => { const p = sellById(id); return p ? p.precio * n : 0; }); }
export function dayUnits(d, cat) { if (!d) return 0; return sum(Object.entries(d.u || {}), ([id, n]) => { const p = sellById(id); return p && (!cat || p.cat === cat) ? n : 0; }); }
export function setD(v) { D = v; }
export function setG(v) { G = v; }

