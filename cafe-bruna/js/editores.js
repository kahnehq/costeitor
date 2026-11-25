/* Editores de Ajustes y asistente. */
import { CATS, COBROS, ITEM_CATS, MENU_CATS } from './constantes.js';
import { itemUB } from './costeo.js';
import { S, byId, live } from './estado.js';
import { catPill, fld, input, sel, tgl } from './render.js';
import { SD, SYNC, ghCfg } from './sync.js';
import { ICONS, esc, icon } from './util.js';

/* ═══════════════ EDITORES (asistente y ajustes) ═══════════════ */
export function fixedEditor() {
  return live('fixed').map(f => `<div class="erow">
      <div class="erow-top">${input(`fixed:${f.id}:nombre`, 'text', f.nombre, 'placeholder="Nombre del costo"')}<button class="btn-rm" data-act="rm" data-k="fixed" data-id="${f.id}" title="Quitar">×</button></div>
      <div class="erow-fields">
        ${fld('Monto mensual', `fixed:${f.id}:monto`, 'clp', f.monto, 'placeholder="0"')}
        ${f.factura ? `<label class="fld"><span>El monto está…</span>${sel(`fixed:${f.id}:montoTipo`, f.montoTipo || 'bruto', { bruto: 'Incluye IVA (bruto)', neto: 'Sin IVA (neto)' })}</label>` : ''}
        <label class="fld"><span>Tipo</span>${sel(`fixed:${f.id}:tipo`, f.tipo, { fijo: 'Costo fijo', prestamo: 'Cuota de préstamo' })}</label>
        <div>${tgl(`fixed:${f.id}:factura`, f.factura, 'Con factura')}</div>
      </div></div>`).join('') +
    `<button class="btn-secondary btn-sm" data-act="add" data-k="fixed">+ Agregar costo fijo</button>
     <div class="total-line"><span>Total mensual</span><b data-live="fixedTot"></b></div>`;
}
export function menuEditor() {
  return live('menu').map(p => `<div class="erow">
      <div class="erow-top">${input(`menu:${p.id}:nombre`, 'text', p.nombre, 'placeholder="Producto"')}<button class="btn-rm" data-act="rm" data-k="menu" data-id="${p.id}" title="Quitar">×</button></div>
      <div class="erow-fields">
        <label class="fld"><span>Tipo</span>${sel(`menu:${p.id}:cat`, p.cat, MENU_CATS)}</label>
        ${fld('Precio de venta (con IVA)', `menu:${p.id}:precio`, 'clp', p.precio, 'placeholder="0"')}
        ${fld('Venta esperada', `menu:${p.id}:esperado`, 'dec', p.esperado, 'placeholder="0"')}
        <label class="fld"><span>Por</span>${sel(`menu:${p.id}:por`, p.por, { dia: 'día', semana: 'semana' })}</label>
      </div>
      <div class="group-h">Receta (por unidad vendida)</div>
      ${(p.receta || []).map((r, ix) => { const it = byId('items', r.itemId); return `<div class="rec-row">${itemSelect(p.id, ix, r.itemId)}<div class="rec-q">${input(`rec:${p.id}:${ix}`, 'dec', r.qty, 'placeholder="0"')}<span>${it ? itemUB(it).r : ''}</span></div><b class="rec-c" data-live="ic:${p.id}:${ix}"></b><button class="btn-rm" data-act="recRm" data-id="${p.id}" data-ix="${ix}" title="Quitar">×</button></div>`; }).join('')}
      <div class="rec-foot"><button class="btn-link" data-act="recAdd" data-id="${p.id}">+ Ingrediente</button><label class="fld"><span>Otros costos variables por unidad</span>${input(`menu:${p.id}:extra`, 'clp', p.extra, 'placeholder="0"')}</label></div>
      <div class="muted mt-12" data-live="mg:menu:${p.id}"></div></div>`).join('') +
    `<div class="note info">Como en Costeitor: el costo de cada taza sale de su receta. Los precios de compra, el contenido de cada compra y la merma se configuran en el <b>catálogo de insumos</b>. Lo que revendes tal cual (alfajores, barritas…) va en el catálogo con “Se vende en caja”.<br>El margen descuenta la comisión promedio de TUU y Mercado Pago según tu mezcla de pagos. En “otros costos variables” no pongas luz ni arriendo: ya están en costos fijos.</div>
     <div class="grid2 mb-12" style="max-width:360px">${fld('Margen objetivo sobre costo %', 'settings::margenObj', 'pct', S().margenObj)}</div>
     <button class="btn-secondary btn-sm" data-act="add" data-k="menu">+ Agregar producto preparado</button>
     <div class="total-line"><span>Venta mensual presupuestada (carta + reventa)</span><b data-live="menuTot"></b></div>`;
}
export const costeable = i => !['limpieza', 'otros'].includes(i.cat) || i.venta;
export function itemSelect(mid, ix, v) {
  return `<select class="field-input" data-bind="recit:${mid}:${ix}:text"><option value="">Elige un insumo…</option>${ITEM_CATS.map(c => { const its = live('items').filter(i => i.cat === c); return its.length ? `<optgroup label="${CATS[c].n}">${its.map(i => `<option value="${i.id}" ${i.id === v ? 'selected' : ''}>${esc(i.nombre || '(sin nombre)')}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>`;
}
export function itemsEditor() {
  return ITEM_CATS.map(c => {
    const its = live('items').filter(i => i.cat === c);
    return `<div class="group-h">${catPill(c)}</div>` + its.map(i => `<div class="erow">
        <div class="erow-top">${input(`items:${i.id}:nombre`, 'text', i.nombre, 'placeholder="Insumo"')}<button class="btn-rm" data-act="rm" data-k="items" data-id="${i.id}" title="Quitar">×</button></div>
        <div class="erow-fields">
          ${fld('Se compra por', `items:${i.id}:unidad`, 'text', i.unidad, 'placeholder="bolsa 1 kg, bidón, paquete…"')}
          ${fld('Precio de compra' + (i.factura && i.precioTipo === 'neto' ? ' (sin IVA)' : ' (con IVA)'), `items:${i.id}:precio`, 'clp', i.precio, 'placeholder="0"')}
          ${i.factura ? `<label class="fld"><span>El precio está…</span>${sel(`items:${i.id}:precioTipo`, i.precioTipo || 'bruto', { bruto: 'Incluye IVA (bruto)', neto: 'Sin IVA (neto)' })}</label>` : ''}
          ${costeable(i) ? `<label class="fld"><span>Medida para recetas</span>${sel(`items:${i.id}:ub`, i.ub || 'und', { kg: 'Kilo → g', l: 'Litro → ml', und: 'Unidad' })}</label>
          ${fld(`Contenido de cada compra (${{ kg: 'kg', l: 'litros', und: 'unidades' }[i.ub || 'und']})`, `items:${i.id}:contenido`, 'dec', i.contenido, 'placeholder="1"')}
          ${fld('Merma %', `items:${i.id}:merma`, 'pct', i.merma)}` : ''}
          ${fld('Compra al mes', `items:${i.id}:mensual`, 'dec', i.mensual, 'placeholder="0"')}
          <div>${tgl(`items:${i.id}:factura`, i.factura, 'Con factura')}</div>
          <div>${tgl(`items:${i.id}:venta`, i.venta, 'Se vende en caja')}</div>
        </div>
        ${costeable(i) ? `<div class="muted mt-12" data-live="cb:${i.id}"></div><div class="muted" data-live="cons:${i.id}"></div>` : ''}
        ${i.venta ? `<div class="erow-fields mt-12">
          ${fld('Precio de venta (con IVA)', `items:${i.id}:precioVenta`, 'clp', i.precioVenta, 'placeholder="0"')}
          ${fld('Venta esperada', `items:${i.id}:esperado`, 'dec', i.esperado, 'placeholder="0"')}
          <label class="fld"><span>Por</span>${sel(`items:${i.id}:por`, i.por || 'semana', { dia: 'día', semana: 'semana' })}</label>
        </div><div class="muted mt-12" data-live="mg:items:${i.id}"></div>` : ''}</div>`).join('') +
      `<button class="btn-link" data-act="add" data-k="items" data-cat="${c}">+ Agregar en ${CATS[c].n}</button>`;
  }).join('') + `<div class="total-line"><span>Compras mensuales presupuestadas</span><b data-live="itemsTot"></b></div>`;
}
export function paramsEditor() {
  const s = S();
  return `<div class="group-h">Comisiones (sin IVA)</div>
    <div class="grid3 mb-12">${fld('TUU %', 'settings::tuu', 'pct', s.tuu)}${fld('MP débito %', 'settings::mpd', 'pct', s.mpd)}${fld('MP crédito %', 'settings::mpc', 'pct', s.mpc)}</div>
    <div class="mb-12">${tgl('settings::facturaCom', s.facturaCom, 'Recibo factura por las comisiones (su IVA es crédito)')}</div>
    <div class="group-h">¿Cómo te pagan? (para proyectar)</div>
    <div class="gridauto mb-8">${COBROS.map(([k, n]) => fld(n + ' %', `settings::mix.${k}`, 'pct', s.mix[k])).join('')}</div>
    <div class="muted mb-12">Suma: <b data-live="mixSum"></b> (debe dar 100%)</div>
    <div class="group-h">Costeo</div>
    <div class="mb-12">${tgl('settings::usaCompras', s.usaCompras !== false, 'Costear con el promedio de mis compras de los últimos 3 meses (si no hay compras, usa el precio del insumo)')}</div>
    <div class="group-h">Impuestos y operación</div>
    <div class="gridauto">${fld('IVA %', 'settings::iva', 'pct', s.iva)}${fld('PPM %', 'settings::ppm', 'pct', s.ppm)}${fld('Días abiertos al mes', 'settings::dias', 'dec', s.dias)}</div>
    <p class="muted mt-12">TUU: tasa plana 1,49% + IVA. Mercado Pago Point Smart 2: 2,19% débito y 2,69% crédito (bajo $2 MM/mes). PPM Pro Pyme General 0,25% (confírmalo con tu contador).</p>`;
}
export function cajaEditor() {
  const s = S();
  return `<div class="gridauto">
    <label class="fld"><span>Mes de inicio del flujo</span><input type="month" class="field-input" data-bind="settings::inicio:text" value="${esc(s.inicio)}"></label>
    ${fld('Caja inicial (efectivo + bancos)', 'settings::cajaInicial', 'clp', s.cajaInicial, 'placeholder="0"')}
    ${fld('F29 pendiente del mes anterior', 'settings::f29Pendiente', 'clp', s.f29Pendiente, 'placeholder="0"')}
    ${fld('Remanente de IVA crédito', 'settings::remanente', 'clp', s.remanente, 'placeholder="0"')}
    ${fld('Retiro mensual del dueño', 'settings::retiro', 'clp', s.retiro, 'placeholder="0"')}
  </div>`;
}
export function syncEditor() {
  const c = ghCfg();
  if (c) return `<div class="note info">Conectado a <b>${esc(c.owner)}/${esc(c.repo)}</b> · ${esc(c.path)} (${esc(c.branch)}).<br>${SYNC.last ? 'Última sincronización: ' + new Date(SYNC.last).toLocaleString('es-CL') : 'Aún no sincroniza.'}${SYNC.st === 'err' ? `<br><b class="bad-t">${esc(SYNC.msg)}</b>` : ''}</div>
    <div class="btn-row"><button class="btn-primary btn-sm" data-act="sync">Sincronizar ahora</button><button class="btn-secondary btn-sm btn-danger" data-act="ghOff">Desconectar este equipo</button></div>`;
  return `<div class="note info"><b>Cómo prepararlo (una vez):</b><ol>
      <li>En GitHub crea un repositorio <b>privado</b>, por ejemplo <code>cafe-bruna-datos</code>.</li>
      <li>Ve a Settings → Developer settings → Fine-grained tokens → Generate new token. En <i>Repository access</i> elige solo ese repositorio y en <i>Permissions</i> → <i>Contents</i>: <b>Read and write</b>.</li>
      <li>Pega aquí tu usuario, el repositorio y el token. El token queda guardado solo en este navegador.</li></ol></div>
    <div class="grid2 mb-8">${fld('Usuario u organización', 'sd::owner', 'text', SD.owner, 'placeholder="kahnehq" autocapitalize="off"')}${fld('Repositorio privado', 'sd::repo', 'text', SD.repo, 'placeholder="cafe-bruna-datos" autocapitalize="off"')}</div>
    <div class="grid2 mb-8">${fld('Archivo', 'sd::path', 'text', SD.path)}${fld('Rama', 'sd::branch', 'text', SD.branch)}</div>
    <div class="mb-12">${fld('Token (github_pat_…)', 'sd::token', 'text', SD.token, 'type="password" autocomplete="off" placeholder="github_pat_…"')}</div>
    ${SYNC.st === 'err' ? `<div class="note"><b>No se pudo conectar:</b> ${esc(SYNC.msg)}</div>` : ''}
    <button class="btn-primary" data-act="ghConnect">${icon(ICONS.cloud).replace('<svg', '<svg width="18" height="18" style="stroke:white;fill:none;stroke-width:2"')} Conectar y sincronizar</button>`;
}

