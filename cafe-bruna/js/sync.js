/* Sincronización opcional con GitHub (repositorio privado). */
import { claveConflicto, detectarConflictos } from './conflictos.js';
import { LS_CONFLICTOS, LS_SYNC, LS_SYNCMETA } from './constantes.js';
import { defaults } from './defaults.js';
import { D, G, migrate, saveLocal, setD } from './estado.js';
import { paintSync } from './paneles.js';
import { rerender } from './render.js';
import { now, toast } from './util.js';

export let SYNC = { st: 'off', msg: '', last: (JSON.parse(localStorage.getItem(LS_SYNCMETA) || '{}')).last || null };
export let SD = Object.assign({ owner: '', repo: '', branch: 'main', path: 'data/cafe-bruna.json', token: '' }, ghCfg() || {}); // borrador de sincronización

/* Conflictos pendientes de revisar. Solo en este navegador (nunca se sube a GitHub). */
export let CONF = (() => { try { const x = JSON.parse(localStorage.getItem(LS_CONFLICTOS) || '[]'); return Array.isArray(x) ? x : []; } catch (e) { return []; } })();
export function guardarConf() { localStorage.setItem(LS_CONFLICTOS, JSON.stringify(CONF)); }
export function quitarConf(i) { CONF.splice(i, 1); guardarConf(); }
export function vaciarConf() { CONF.length = 0; guardarConf(); }
function registrarConflictos(lista) {
  const ya = new Set(CONF.map(claveConflicto)); const nuevos = lista.filter(c => !ya.has(claveConflicto(c)));
  if (nuevos.length) { CONF.unshift(...nuevos); CONF.length = Math.min(CONF.length, 50); guardarConf(); }
  return nuevos.length;
}

/* ═══════════════ SINCRONIZACIÓN GITHUB ═══════════════ */
export function ghCfg() { try { return JSON.parse(localStorage.getItem(LS_SYNC) || 'null'); } catch (e) { return null; } }
export const b64enc = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
export const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));
export function merge(a, b) {
  const out = { v: Math.max(a.v || 1, b.v || 1) };
  const sa = a.settings || {}, sb = b.settings || {};
  out.settings = JSON.parse(JSON.stringify((sa.updatedAt || 0) >= (sb.updatedAt || 0) ? sa : sb));
  const def = defaults().settings; out.settings = Object.assign({}, def, out.settings); out.settings.mix = Object.assign({}, def.mix, out.settings.mix || {});
  ['fixed', 'menu', 'items', 'days', 'expenses'].forEach(k => {
    const m = new Map();
    [...(a[k] || []), ...(b[k] || [])].forEach(x => { if (!x || !x.id) return; const cur = m.get(x.id); if (!cur || (x.updatedAt || 0) > (cur.updatedAt || 0)) m.set(x.id, x); });
    out[k] = [...m.values()].sort((x, y) => k === 'days' || k === 'expenses' ? (x.fecha || '').localeCompare(y.fecha || '') || x.id.localeCompare(y.id) : ((x.ord ?? 0) - (y.ord ?? 0)) || x.id.localeCompare(y.id));
  });
  return out;
}
export async function gh(method, body) {
  const c = ghCfg(), url = `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${c.path.split('/').map(encodeURIComponent).join('/')}` + (method === 'GET' ? `?ref=${encodeURIComponent(c.branch)}&t=${now()}` : '');
  return fetch(url, { method, cache: 'no-store', headers: { 'Authorization': 'Bearer ' + c.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
export let syncing = null;
export async function sync(manual) {
  if (!ghCfg()) return false;
  if (syncing) return syncing;
  syncing = (async () => {
    SYNC.st = 'busy'; SYNC.msg = ''; paintSync();
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await gh('GET');
        let remote = null, sha;
        if (r.status === 200) { const j = await r.json(); sha = j.sha; remote = JSON.parse(b64dec(j.content || '')); }
        else if (r.status === 404) { const chk = await fetch(`https://api.github.com/repos/${encodeURIComponent(ghCfg().owner)}/${encodeURIComponent(ghCfg().repo)}`, { headers: { 'Authorization': 'Bearer ' + ghCfg().token, 'Accept': 'application/vnd.github+json' } }); if (!chk.ok) throw new Error(chk.status === 404 ? 'No encuentro el repositorio, o el token no tiene acceso a él.' : `GitHub respondió ${chk.status}.`); }
        else if (r.status === 401) throw new Error('El token no es válido o expiró.');
        else if (r.status === 403) throw new Error('El token no tiene permiso “Contents: Read and write” en ese repositorio.');
        else throw new Error(`GitHub respondió ${r.status}.`);
        const nuevos = remote ? registrarConflictos(detectarConflictos(D, remote, SYNC.last || 0)) : 0; // antes de mezclar: después ya se perdió la otra versión
        if (nuevos) toast(`Se resolvieron ${nuevos} conflicto${nuevos > 1 ? 's' : ''} al sincronizar. Revísalos en Ajustes.`);
        const merged = remote ? merge(D, remote) : merge(D, { settings: {} });
        migrate(merged); setD(merged); saveLocal();
        const same = remote && JSON.stringify(merge(remote, { settings: {} })) === JSON.stringify(merged);
        if (!same) {
          const p = await gh('PUT', { message: `Café de Bruna · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`, content: b64enc(JSON.stringify(merged, null, 1)), branch: ghCfg().branch, ...(sha ? { sha } : {}) });
          if (p.status === 409 || p.status === 422) continue;  // alguien escribió antes: reintentar
          if (!p.ok) throw new Error(p.status === 403 || p.status === 404 ? 'El token no puede escribir en el repositorio (revisa “Contents: Read and write”).' : `No se pudo guardar (${p.status}).`);
        }
        SYNC.st = 'ok'; SYNC.last = now(); localStorage.setItem(LS_SYNCMETA, JSON.stringify({ last: SYNC.last }));
        if (manual) toast('Datos sincronizados con GitHub');
        if (!G.open && !(document.activeElement && document.activeElement.matches('input,textarea,select'))) rerender(); else paintSync();
        return true;
      }
      throw new Error('Conflicto al guardar; intenta de nuevo.');
    } catch (e) {
      SYNC.st = 'err'; SYNC.msg = e.message === 'Failed to fetch' ? 'Sin conexión a internet.' : e.message; paintSync();
      if (manual) { toast(SYNC.msg); rerender(); }
      return false;
    } finally { syncing = null; }
  })();
  return syncing;
}

