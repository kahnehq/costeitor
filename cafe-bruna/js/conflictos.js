/* Conflictos de sincronización: cuando dos equipos editaron lo mismo desde la última sincronización,
   merge() deja ganar al último en escribir; aquí se detecta lo que se pisó para poder mostrarlo y recuperarlo.
   Funciones puras (sin DOM ni localStorage). */
const COLS = ['fixed', 'menu', 'items', 'days', 'expenses'];
const clone = x => JSON.parse(JSON.stringify(x));

/** Campos con valor distinto entre dos versiones de la misma entidad (se ignora updatedAt). */
export function camposDistintos(a, b) {
  const ks = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]); ks.delete('updatedAt');
  return [...ks].filter(k => JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k]));
}

/** Conflictos entre los datos locales y los remotos. `desde` = momento de la última sincronización exitosa:
    solo es conflicto lo que ambos lados modificaron DESPUÉS de esa fecha y quedó con contenido distinto. */
export function detectarConflictos(local, remoto, desde = 0) {
  const out = [];
  const revisar = (k, id, l, r) => {
    const lu = (l && l.updatedAt) || 0, ru = (r && r.updatedAt) || 0;
    if (!l || !r || lu === ru || lu <= desde || ru <= desde) return;
    const campos = camposDistintos(l, r); if (!campos.length) return;
    out.push({ k, id, gana: lu >= ru ? 'local' : 'remoto', local: clone(l), remoto: clone(r), campos, cuando: Date.now() });
  };
  COLS.forEach(k => {
    const rem = new Map((remoto[k] || []).map(x => [x && x.id, x]));
    (local[k] || []).forEach(l => { if (l && l.id) revisar(k, l.id, l, rem.get(l.id)); });
  });
  revisar('settings', 'settings', local.settings, remoto.settings);
  return out;
}

export const claveConflicto = c => `${c.k}:${c.id}:${c.local.updatedAt || 0}:${c.remoto.updatedAt || 0}`;
/** La versión que perdió (la que se pisó). */
export const perdedora = c => c.gana === 'local' ? c.remoto : c.local;
export const ganadora = c => c.gana === 'local' ? c.local : c.remoto;
