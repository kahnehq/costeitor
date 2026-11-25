/* Pantalla de PIN. */
import { LS_PIN } from './constantes.js';
import { S, UI } from './estado.js';
import { render } from './render.js';
import { ghCfg, sync } from './sync.js';
import { $, ICONS, esc, icon } from './util.js';

/* ═══════════════ PIN ═══════════════ */
export async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('bruna:' + s)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
export function pinScreen() {
  return `<div class="screen dark-bg"><div class="login-card">
    <div class="login-logo"><div class="logo-icon">${icon(ICONS.cup)}</div><div><div class="login-brand">${esc(S().nombre)}</div><div class="login-tagline">Caja y control del negocio</div></div></div>
    <div class="fld"><span>Ingresa tu PIN</span></div>
    <div class="pin-row">${[0, 1, 2, 3].map(i => `<input class="pin-digit" data-pin="${i}" inputmode="numeric" maxlength="1" type="password" autocomplete="off">`).join('')}</div>
    <div class="pin-error" id="pin-err"></div>
    <button class="btn-primary" data-act="pinGo">Entrar</button>
  </div></div>`;
}
export async function pinCheck() {
  const v = [...document.querySelectorAll('.pin-digit')].map(i => i.value).join('');
  if (v.length < 4) return;
  if (await sha(v) === localStorage.getItem(LS_PIN)) { UI.unlocked = true; render(); if (ghCfg()) sync(); }
  else { $('#pin-err').textContent = 'PIN incorrecto'; document.querySelectorAll('.pin-digit').forEach(i => i.value = ''); document.querySelector('.pin-digit').focus(); }
}

