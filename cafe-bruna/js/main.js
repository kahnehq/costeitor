/* Eventos globales e inicio. */
import './depuracion.js';
import { ACTS, CHANGES } from './acciones.js';
import { G, UI } from './estado.js';
import { pinCheck } from './pin.js';
import { onBind, render } from './render.js';
import { ghCfg, sync } from './sync.js';


/* ═══════════════ EVENTOS ═══════════════ */
document.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el) return; const f = ACTS[el.dataset.act]; if (f) { e.preventDefault(); f(el, e); } });
document.addEventListener('input', e => {
  if (e.target.matches('.pin-digit')) { const i = +e.target.dataset.pin; e.target.value = e.target.value.replace(/\D/g, '').slice(-1); if (e.target.value && i < 3) document.querySelector(`[data-pin="${i + 1}"]`).focus(); if (i === 3 && e.target.value) pinCheck(); return; }
  const el = e.target.closest('[data-bind]'); if (el && el.type !== 'date' && el.type !== 'month' && el.tagName !== 'SELECT') onBind(el, false);
});
document.addEventListener('change', e => {
  const c = e.target.closest('[data-change]'); if (c) return CHANGES[c.dataset.change](c);
  const el = e.target.closest('[data-bind]'); if (el) onBind(el, true);
});
document.addEventListener('keydown', e => {
  if (e.target.matches('.pin-digit') && e.key === 'Backspace' && !e.target.value) { const p = document.querySelector(`[data-pin="${+e.target.dataset.pin - 1}"]`); p && p.focus(); }
  if (e.key === 'Escape' && G.open) ACTS.gClose();
  if (e.key === 'Enter' && G.open && G.step === 'form' && e.target.matches('input')) { e.target.blur(); ACTS.gSave(); }
});
document.addEventListener('toggle', e => { const d = e.target; if (d.dataset && d.dataset.sec) UI.open[d.dataset.sec] = d.open; }, true);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && UI.unlocked && ghCfg()) sync(); });

/* ═══════════════ INICIO ═══════════════ */
render();
if (UI.unlocked && ghCfg()) sync();

/* PWA: service worker (solo en http/https; en file:// no existe) */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(e => console.warn('Service worker no registrado:', e));
