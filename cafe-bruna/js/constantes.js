/* Constantes: claves de localStorage, categorías, medios de pago. */


/* ═══════════════ CONSTANTES ═══════════════ */
export const LS_DATA = 'bruna.data.v1', LS_SYNC = 'bruna.sync.v1', LS_PIN = 'bruna.pin.v1', LS_SYNCMETA = 'bruna.syncmeta.v1', LS_CONFLICTOS = 'bruna.conflictos.v1';
export const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const CATS = {
  fijo:        { n: 'Costo fijo',      c: '#d94040', bg: '#fdeaea', e: '🏠' },
  prestamo:    { n: 'Préstamo',        c: '#b0407a', bg: '#f8e6f0', e: '🏦' },
  cafe:        { n: 'Café y bebidas',  c: '#c27410', bg: '#fef3dc', e: '☕' },
  helado:      { n: 'Helado',          c: '#178a8a', bg: '#e0f4f4', e: '🍦' },
  reventa:     { n: 'Reventa',         c: '#7a4fb3', bg: '#efe8f8', e: '🍫' },
  desechables: { n: 'Desechables',     c: '#2f6fb3', bg: '#e6effa', e: '🥤' },
  limpieza:    { n: 'Limpieza',        c: '#1a9e72', bg: '#e0f5ee', e: '🧽' },
  otros:       { n: 'Otros',           c: '#5c5850', bg: '#eeece8', e: '📦' },
  retiro:      { n: 'Retiro dueño',    c: '#9a7a10', bg: '#fbf3d6', e: '👤' }
};
export const ITEM_CATS = ['cafe','helado','reventa','desechables','limpieza','otros'];
export const MENU_CATS = { cafe: 'Café', te: 'Té', helado: 'Helado', otro: 'Otro preparado' };
export const MEDIOS = { ef: 'Efectivo', deb: 'Débito / transferencia', cred: 'Tarjeta de crédito' };
export const COBROS = [['ef','Efectivo'],['tuu','TUU'],['mpd','Mercado Pago débito'],['mpc','Mercado Pago crédito'],['tr','Transferencia']];
