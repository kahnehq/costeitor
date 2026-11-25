/* Utilidades puras (formato, parseo, fechas) y helpers mínimos de DOM. */
import { MESES } from './constantes.js';

/* ═══════════════ UTILIDADES ═══════════════ */
export const $ = s => document.querySelector(s);
export const now = () => Date.now();
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const thisMonth = () => today().slice(0, 7);
export const addDays = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
export const addMonths = (mk, n) => { let [y, m] = mk.split('-').map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${pad(m)}`; };
export const monthLabel = mk => { const [y, m] = mk.split('-').map(Number); const s = MESES[m - 1]; return s[0].toUpperCase() + s.slice(1) + ' ' + y; };
export const monthShort = mk => { const [y, m] = mk.split('-').map(Number); return MESES[m - 1].slice(0, 3) + ' ' + String(y).slice(2); };
export const daysInMonth = mk => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate(); };
export const fmtDay = f => { const d = new Date(f + 'T12:00:00'); return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }); };
export const nfmt = n => Math.round(n || 0).toLocaleString('es-CL');
export const clp = n => { n = Math.round(n || 0); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('es-CL'); };
export const pct = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : (x * 100).toFixed(d).replace('.', ',') + '%';
export const dec = (x, d = 1) => (x == null || !isFinite(x)) ? '—' : x.toFixed(d).replace('.', ',');
export const parseCLP = s => { const n = parseInt(String(s).replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
export const parseDec = s => { s = String(s).trim(); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
export const sum = (arr, f) => arr.reduce((a, x) => a + (f ? f(x) : x), 0);
export const icon = p => `<svg viewBox="0 0 24 24">${p}</svg>`;
export const ICONS = {
  cup: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
  bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  flow: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>'
};
export function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
