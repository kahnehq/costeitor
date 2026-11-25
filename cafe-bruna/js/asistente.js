/* Asistente de configuración inicial. */
import { LS_PIN } from './constantes.js';
import { cajaEditor, fixedEditor, itemsEditor, menuEditor, paramsEditor, syncEditor } from './editores.js';
import { S, UI } from './estado.js';
import { fld } from './render.js';
import { ICONS, esc, icon } from './util.js';

/* ═══════════════ ASISTENTE ═══════════════ */
export const WSTEPS = [
  { t: 'Bienvenido', s: 'Configuremos tu cafetería en 5 pasos. Todo se puede cambiar después en Ajustes.' },
  { t: 'Costos fijos', s: 'Lo que pagas todos los meses, vendas o no. Marca si te dan factura: su IVA lo descuentas en el F29.' },
  { t: 'Insumos y compras', s: 'Cómo compras cada cosa: precio, si viene por kilo, litro o unidad, cuánto trae y su merma. Marca “Se vende en caja” en lo que revendes (alfajores, barritas…).' },
  { t: 'Carta y recetas', s: 'Cada producto con su receta: el costo por taza se calcula solo desde tus insumos. Agrega el precio de venta y cuánto esperas vender.' },
  { t: 'Cobros e impuestos', s: 'Comisiones de TUU y Mercado Pago, cómo te pagan los clientes, IVA y PPM.' },
  { t: 'Respaldo en GitHub', s: 'Opcional: guarda tus datos en un repositorio privado y úsalos desde cualquier Edge (PC o celular).' }
];
export function wizardScreen() {
  const st = UI.wstep, s = S(), last = st === WSTEPS.length - 1;
  let body = '';
  if (st === 0) {
    body = UI.recover ? `<div class="mb-12">${syncEditor()}</div><button class="btn-link" data-act="wRecover">← Volver a configurar desde cero</button>`
      : `<div class="grid2 mb-12">${fld('Nombre del negocio', 'settings::nombre', 'text', s.nombre)}${fld('Días abiertos al mes', 'settings::dias', 'dec', s.dias)}</div>
         <div class="mb-12">${cajaEditor()}</div>
         ${S().setupDone ? '' : `<div class="divider">¿Ya usas la app en otro equipo?</div><button class="btn-secondary" data-act="wRecover">${icon(ICONS.cloud).replace('<svg', '<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"')} Recuperar mis datos desde GitHub</button>`}`;
  }
  else if (st === 1) body = fixedEditor();
  else if (st === 2) body = itemsEditor();
  else if (st === 3) body = menuEditor() + `<div class="note info mt-12">Equilibrio estimado: <b data-live="equi"></b> para no perder plata.</div>`;
  else if (st === 4) body = paramsEditor();
  else if (st === 5) body = syncEditor() + `<div class="divider">Seguridad</div>${pinEditor()}`;
  return `<div class="screen dark-bg"><div class="login-card wiz-card">
    <div class="login-logo"><div class="logo-icon">${icon(ICONS.cup)}</div><div><div class="login-brand">${esc(s.nombre)}</div><div class="login-tagline">Asistente de configuración · paso ${st + 1} de ${WSTEPS.length}</div></div></div>
    <div class="wiz-dots">${WSTEPS.map((_, i) => `<i class="${i <= st ? 'on' : ''}"></i>`).join('')}</div>
    <div class="wiz-title">${WSTEPS[st].t}</div><div class="panel-sub">${WSTEPS[st].s}</div>
    ${body}
    <div class="wiz-nav">${st > 0 ? `<button class="btn-secondary" data-act="wPrev">Atrás</button>` : (S().setupDone ? `<button class="btn-secondary" data-act="wExit">Cerrar</button>` : '')}
      ${UI.recover && st === 0 ? '' : `<button class="btn-primary" data-act="wNext">${last ? 'Terminar y empezar' : 'Siguiente'}</button>`}</div>
  </div></div>`;
}
export function pinEditor() {
  const has = !!localStorage.getItem(LS_PIN);
  return has ? `<div class="btn-row"><span class="muted" style="align-self:center">Este equipo pide PIN al abrir.</span><button class="btn-secondary btn-sm" data-act="pinOff">Quitar PIN</button></div>`
    : `<div class="grid2" style="align-items:end"><label class="fld"><span>PIN de 4 dígitos (opcional)</span><input class="field-input num" id="newpin" inputmode="numeric" maxlength="4" type="password" placeholder="••••"></label><button class="btn-secondary btn-sm" data-act="pinSet">Guardar PIN</button></div>`;
}

