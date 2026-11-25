/* Pestañas: Hoy, Gastos, Mes, Flujo y Ajustes. */
import { pinEditor } from './asistente.js';
import { CATS, COBROS, ITEM_CATS, MEDIOS } from './constantes.js';
import { dosisReceta, sellables } from './costeo.js';
import { aBruto, aNeto } from './iva.js';
import { cajaEditor, fixedEditor, itemsEditor, menuEditor, paramsEditor, syncEditor } from './editores.js';
import { G, S, UI, dayOf, dayTotal, live } from './estado.js';
import { budget, equilibrio, flujo, pl, real } from './finanzas.js';
import { catPill, fld, sel, tgl } from './render.js';
import { SYNC, ghCfg } from './sync.js';
import { $, ICONS, clp, daysInMonth, dec, esc, fmtDay, icon, monthLabel, monthShort, nfmt, pad, pct, sum, thisMonth, today } from './util.js';

/* ═══════════════ APP ═══════════════ */
export const TABS = [['hoy', 'Caja', ICONS.cup], ['gastos', 'Gastos', ICONS.bag], ['mes', 'Mes', ICONS.chart], ['flujo', 'Flujo', ICONS.flow], ['ajustes', 'Ajustes', ICONS.sliders]];
export function syncPill() {
  if (!ghCfg()) return `<span class="code-pill" data-act="goSync"><span class="dot"></span>Solo este equipo</span>`;
  const l = { ok: 'Sincronizado', busy: 'Sincronizando…', err: 'Error de sync', pend: 'Cambios por subir', off: 'GitHub' }[SYNC.st] || 'GitHub';
  return `<span class="code-pill sync-${SYNC.st}" data-act="sync" title="${esc(SYNC.msg || '')}"><span class="dot"></span>${l}</span>`;
}
export function paintSync() { const h = $('#sync-slot'); if (h) h.innerHTML = syncPill(); }
export function appScreen() {
  const panel = { hoy: panelHoy, gastos: panelGastos, mes: panelMes, flujo: panelFlujo, ajustes: panelAjustes }[UI.tab]();
  return `<div class="screen">
    <header class="app-header"><div class="app-header-brand"><span class="logo-dot"></span>${esc(S().nombre)}</div><div id="sync-slot">${syncPill()}</div></header>
    <nav class="tab-bar">${TABS.map(([k, n, ic]) => `<button class="tab-btn ${UI.tab === k ? 'active' : ''}" data-act="tab" data-k="${k}">${icon(ic)}${n}</button>`).join('')}</nav>
    <main class="app-content"><div class="wrap">${panel}</div></main>
    ${G.open ? gastoModal() : ''}
  </div>`;
}
export function monthNav() { return `<div class="date-nav"><button class="nav-btn" data-act="mPrev">‹</button><div class="month-label">${monthLabel(UI.month)}</div><button class="nav-btn" data-act="mNext">›</button>${UI.month !== thisMonth() ? `<button class="btn-link" data-act="mNow">Mes actual</button>` : ''}</div>`; }

/* ── CAJA DEL DÍA ── */
export function panelHoy() {
  const f = UI.fecha, d = dayOf(f), mk = f.slice(0, 7), r = real(mk), e = equilibrio(), s = S();
  const cafDia = r.dias ? r.cafes / r.dias : 0, prog = e.cafesDia ? Math.min(1, cafDia / e.cafesDia) : 0;
  const vend = sellables().filter(p => p.precio > 0 || (d && d.u && d.u[p.id]));
  const tile = p => { const n = (d && d.u && d.u[p.id]) || 0; return `<div class="prod ${n ? 'has' : ''}" data-act="inc" data-id="${p.id}">${n ? `<button class="prod-minus" data-act="dec" data-id="${p.id}" title="Restar">−</button>` : ''}<div class="prod-name">${esc(p.nombre)}</div><div class="prod-price">${clp(p.precio)}</div><div class="prod-count">${n}</div></div>`; };
  const carta = vend.filter(p => p.grupo === 'carta'), rev = vend.filter(p => p.grupo === 'reventa');
  return `<div class="panel-title">Caja del día</div><div class="panel-sub">Toca cada producto que vendes y al cierre anota lo cobrado por cada medio.</div>
  <div class="date-nav"><button class="nav-btn" data-act="dPrev">‹</button><input type="date" class="field-input" value="${f}" data-change="setFecha"><button class="nav-btn" data-act="dNext">›</button>${f !== today() ? `<button class="btn-link" data-act="dToday">Hoy</button>` : ''}<span class="muted">${esc(fmtDay(f))}</span></div>
  <div class="card"><div class="card-title">${icon(ICONS.cup)} Lo que vendiste</div>
    <div class="prod-grid">${carta.map(tile).join('')}</div>
    ${rev.length ? `<div class="group-h">Reventa</div><div class="prod-grid">${rev.map(tile).join('')}</div>` : ''}
    ${!vend.length ? '<div class="muted">Pon precios de venta en Ajustes → Carta, o marca insumos con “Se vende en caja”.</div>' : ''}
    <div class="total-line"><span>Venta según la carta</span><b data-live="hoyTeo"></b></div>
  </div>
  <div class="card"><div class="card-title">${icon(ICONS.cash)} Cómo te pagaron</div>
    <div class="card-hint">Montos con IVA. Al cierre, copia los totales del día de TUU y Mercado Pago, y cuenta el efectivo.</div>
    <div class="money-grid">${COBROS.map(([k, n]) => fld(n, `day:${f}:${k}`, 'clp', d ? d[k] : 0, 'placeholder="$0"')).join('')}${fld('N.º de ventas', `day:${f}:tickets`, 'int', d ? d.tickets : 0, 'placeholder="0"')}</div>
    <div class="sum-box">
      <div class="sum-item"><span>Total cobrado</span><b data-live="hoyCob"></b></div>
      <div class="sum-item"><span>Diferencia con la carta</span><b data-live="hoyDif"></b></div>
      <div class="sum-item"><span>Ticket promedio</span><b data-live="hoyTicket"></b></div>
    </div>
    <label class="fld mt-12"><span>Nota del día (clima, evento, temporada…)</span><textarea class="field-input" data-bind="day:${f}:nota:text" placeholder="Ej: día nublado, feria en la plaza">${esc(d ? d.nota : '')}</textarea></label>
  </div>
  <div class="card"><div class="card-title">${icon(ICONS.chart)} ${monthLabel(mk)} a la fecha</div>
    <div class="sum-box" style="margin-top:0">
      <div class="sum-item"><span>Ventas del mes (con IVA)</span><b>${clp(r.bruto)}</b></div>
      <div class="sum-item"><span>Días con caja</span><b>${r.dias}</b></div>
      <div class="sum-item"><span>Cafés por día</span><b>${dec(cafDia, 1)}</b></div>
    </div>
    <div class="mt-12 muted">Meta de equilibrio: <b>${e.cafesDia ? dec(e.cafesDia, 1) : '—'} cafés/día</b></div>
    <div class="bar ${prog >= 1 ? '' : prog >= 0.7 ? 'warn' : 'bad'}"><i style="width:${prog * 100}%"></i></div>
  </div>`;
}

/* ── GASTOS ── */
export function panelGastos() {
  const mk = UI.month, r = real(mk), exps = r.exps.slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.updatedAt - a.updatedAt));
  const tot = sum(exps, e => e.monto), max = Math.max(1, ...Object.values(r.cats).map(c => c.bruto));
  const fixedDone = live('fixed').filter(f => exps.some(e => e.itemId === f.id)).length, fixedN = live('fixed').filter(f => f.monto > 0).length;
  return `<div class="panel-title">Gastos</div><div class="panel-sub">Registra cada compra o pago eligiendo desde tu menú de insumos.</div>
  ${monthNav()}
  <div class="btn-row mb-16"><button class="btn-primary" data-act="gNew">+ Registrar gasto</button>
    <button class="btn-secondary" data-act="loadFixed">${icon(ICONS.cash).replace('<svg', '<svg width="18" height="18" style="stroke:currentColor;fill:none;stroke-width:2"')} Costos fijos del mes (${fixedDone}/${fixedN})</button></div>
  <div class="card"><div class="card-title">${icon(ICONS.chart)} Por categoría · ${clp(tot)}</div>
    ${Object.keys(CATS).filter(k => r.cats[k]).map(k => `<div class="catbar"><span>${CATS[k].e} ${CATS[k].n}</span><div class="bar"><i style="width:${r.cats[k].bruto / max * 100}%;background:${CATS[k].c}"></i></div><b>${clp(r.cats[k].bruto)}</b></div>`).join('') || '<div class="muted">Sin gastos registrados este mes.</div>'}
  </div>
  <div class="card"><div class="card-title">${icon(ICONS.bag)} Movimientos</div>
    ${exps.map(e => { const c = CATS[e.cat] || CATS.otros; return `<div class="exp-row" data-act="gEdit" data-id="${e.id}"><div class="sw" style="background:${c.c}"></div>
      <div class="exp-main"><b>${esc(e.concepto)}</b><small>${esc(fmtDay(e.fecha))} · ${c.n}${e.cant && e.cant !== 1 ? ` · ${dec(e.cant, 2).replace(/,?0+$/, '')} ${esc(e.unidad || '')}` : ''} · ${e.factura ? 'con factura' : 'sin factura'} · ${MEDIOS[e.medio] || ''}</small></div>
      <div class="exp-amt">${clp(e.monto)}</div></div>`; }).join('') || '<div class="muted">Toca “Registrar gasto” para empezar.</div>'}
  </div>`;
}
export function gastoModal() {
  let title, body, back = '';
  if (G.step === 'cat') {
    title = '¿Qué pagaste?';
    body = `<div class="cat-grid">${Object.entries(CATS).map(([k, c]) => `<button class="cat-btn" data-act="gCat" data-k="${k}"><div class="sw" style="background:${c.bg}">${c.e}</div><b>${c.n}</b><small>${catSub(k)}</small></button>`).join('')}</div>`;
  } else if (G.step === 'item') {
    const c = CATS[G.cat]; title = `${c.e} ${c.n}`; back = 'cat';
    const list = (G.cat === 'fijo' || G.cat === 'prestamo') ? live('fixed').filter(f => (f.tipo === 'prestamo') === (G.cat === 'prestamo')).map(f => ({ id: f.id, n: f.nombre, s: clp(f.monto) + ' al mes' }))
      : G.cat === 'retiro' ? [] : live('items').filter(i => i.cat === G.cat).map(i => ({ id: i.id, n: i.nombre, s: i.precio ? clp(i.precio) + ' / ' + i.unidad : i.unidad }));
    body = `<div class="item-list">${list.map(i => `<button class="item-btn" data-act="gItem" data-id="${i.id}"><span>${esc(i.n)}</span><small>${esc(i.s)}</small></button>`).join('')}
      <button class="item-btn" data-act="gItem" data-id=""><span>✎ Otro (escribir concepto)</span><small></small></button></div>`;
  } else {
    title = G.editId ? 'Editar gasto' : 'Registrar gasto'; back = G.editId ? '' : 'item';
    body = `<div class="mb-8">${catPill(G.cat)}</div>
      <div class="mb-12">${fld('Concepto', 'g::concepto', 'text', G.concepto, 'placeholder="¿Qué compraste?"')}</div>
      <div class="grid3 mb-12"><label class="fld"><span>Fecha</span><input type="date" class="field-input" data-bind="g::fecha:text" value="${esc(G.fecha)}"></label>
        ${fld('Cantidad' + (G.unidad ? ` (${esc(G.unidad)})` : ''), 'g::cant', 'dec', G.cant)}${fld('Precio unitario', 'g::precio', 'clp', G.precio)}</div>
      <div class="mb-12">${fld(G.factura && G.tipo === 'neto' ? 'Total (sin IVA)' : 'Total pagado (con IVA)', 'g::monto', 'clp', G.monto, 'style="font-size:20px;font-weight:600"')}</div>
      <div class="mb-12">${tgl('g::factura', G.factura, 'Con factura (el IVA se descuenta en el F29)')}</div>
      ${G.factura ? `<div class="mb-12"><label class="fld"><span>Los montos que escribes están…</span>${sel('g::tipo', G.tipo || 'bruto', { bruto: 'Incluye IVA (bruto)', neto: 'Sin IVA (neto)' })}</label>${G.tipo === 'neto' ? `<div class="muted mt-8">Se registra y se paga: <b>${clp(aBruto(G.monto, true, 'neto', S().iva))}</b> con IVA</div>` : ''}</div>` : ''}
      <div class="fld mb-8"><span>Medio de pago</span></div><div class="chips mb-12">${Object.entries(MEDIOS).map(([k, n]) => `<button class="chip ${G.medio === k ? 'on' : ''}" data-act="gMedio" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="mb-16">${fld('Proveedor / nota', 'g::nota', 'text', G.nota, 'placeholder="Opcional"')}</div>
      <button class="btn-primary mb-8" data-act="gSave">Guardar gasto</button>
      ${G.editId ? `<button class="btn-secondary btn-danger" data-act="gDel">Eliminar</button>` : ''}`;
  }
  return `<div class="modal-bg" data-act="gClose"></div><div class="modal"><div class="modal-h">${back ? `<button class="nav-btn" data-act="gBack" data-k="${back}">‹</button>` : ''}<h3>${title}</h3><button class="nav-btn" data-act="gClose">×</button></div>${body}</div>`;
}
export function catSub(k) {
  if (k === 'fijo' || k === 'prestamo') return live('fixed').filter(f => (f.tipo === 'prestamo') === (k === 'prestamo')).length + ' en tu lista';
  if (k === 'retiro') return 'Tu sueldo o retiros';
  return live('items').filter(i => i.cat === k).length + ' insumos';
}

/* ── MES ── */
export function kpi(l, v, sub, tone = '', bar = null) {
  return `<div class="kpi ${tone}"><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div><div class="kpi-s">${sub}</div>${bar != null ? `<div class="bar ${tone === 'bad' ? 'bad' : tone === 'warn' ? 'warn' : ''}"><i style="width:${Math.max(0, Math.min(1, bar)) * 100}%"></i></div>` : ''}</div>`;
}
export function panelMes() {
  const mk = UI.month, s = S(), r = real(mk), b = budget(), pr = pl(r), pb = pl(b), e = equilibrio();
  const fl = flujo().find(x => x.mk === mk);
  const cafDia = r.dias ? r.cafes / r.dias : 0;
  const renta = live('fixed').find(f => /renta|arriendo/i.test(f.nombre));
  const rentaNeto = renta ? aNeto(renta.monto, renta.factura, renta.montoTipo, s.iva) : 0;
  const gpt = r.cafes ? r.granoKg * 1000 / r.cafes : null, dr = dosisReceta(), gi = live('items').find(i => i.grano), mermaG = gi && gi.merma < 1 ? gi.merma : 0;
  const ivaPerdido = sum(r.exps.filter(x => !x.factura && ITEM_CATS.includes(x.cat)), x => x.monto) * s.iva / (1 + s.iva);
  const dif = r.hasUnits ? r.bruto - r.teorico : null;
  const tone = (v, good, warn, higherBetter = true) => v == null || !isFinite(v) ? '' : higherBetter ? (v >= good ? 'ok' : v >= warn ? 'warn' : 'bad') : (v <= good ? 'ok' : v <= warn ? 'warn' : 'bad');
  const cvp = pr.neto ? pr.costoVentas / pr.neto : null, mbp = pr.neto ? pr.margen / pr.neto : null, comp = pr.neto ? pr.comCosto / pr.neto : null, rp = pr.neto ? rentaNeto / pr.neto : null;
  // gráfico diario
  const nd = daysInMonth(mk), vals = Array.from({ length: nd }, (_, i) => dayTotal(dayOf(`${mk}-${pad(i + 1)}`)));
  const ref = e.pe ? e.pe * (1 + s.iva) / s.dias : 0, mx = Math.max(1, ...vals, ref * 1.1);
  return `<div class="panel-title">Resumen del mes</div><div class="panel-sub">Real (lo que registraste) contra presupuesto.</div>
  ${monthNav()}
  ${!r.hasData ? `<div class="note info">Aún no hay registros en ${monthLabel(mk)}. Los indicadores reales aparecerán al anotar ventas y gastos.</div>` : ''}
  <div class="kpi-grid">
    ${kpi('Ventas (con IVA)', clp(r.bruto), `Presupuesto ${clp(b.bruto)}`, tone(r.bruto / b.bruto, 1, 0.8), b.bruto ? r.bruto / b.bruto : 0)}
    ${kpi('Resultado del mes', clp(pr.resultado), `Presupuesto ${clp(pb.resultado)} · antes de impuesto a la renta`, r.hasData ? (pr.resultado >= 0 ? 'ok' : 'bad') : '')}
    ${kpi('Cafés por día', dec(cafDia, 1), `Equilibrio: ${e.cafesDia ? dec(e.cafesDia, 1) : '—'} cafés/día`, r.dias ? tone(cafDia / (e.cafesDia || 1), 1, 0.7) : '', e.cafesDia ? cafDia / e.cafesDia : 0)}
    ${kpi('Ticket promedio', r.tickets ? clp(r.bruto / r.tickets) : '—', `${nfmt(r.tickets)} ventas en ${r.dias} días`, 'info')}
    ${kpi('Margen bruto', pct(mbp), 'Referencia 65% – 75%', tone(mbp, 0.65, 0.55))}
    ${kpi('Costo de ventas', pct(cvp), 'Insumos, helado, reventa, desechables · ref. 25% – 35%', tone(cvp, 0.35, 0.45, false))}
    ${kpi('Comisiones', pct(comp), `${clp(pr.comBruto)} con IVA · ref. menos de 2,5%`, tone(comp, 0.025, 0.035, false))}
    ${kpi('Renta / ventas netas', pct(rp), 'Referencia: menos de 15%', tone(rp, 0.15, 0.3, false))}
    ${kpi('Gramos por taza', gpt == null ? '—' : dec(gpt, 1) + ' g', `Receta: ${dec(dr, 0)} g + ${pct(mermaG, 0)} merma = ${dec(dr / (1 - mermaG), 1)} g · ${dec(r.granoKg, 1)} kg comprados`, gpt == null ? '' : tone(gpt, dr / (1 - mermaG) * 1.05, dr / (1 - mermaG) * 1.25, false))}
    ${kpi('Costo según recetas', clp(r.costoTeo), r.hasUnits ? `De lo vendido · ${pct(pr.neto ? r.costoTeo / pr.neto : null)} de ventas netas · compras de insumos ${clp(pr.costoVentas)}` : 'Anota productos en la Caja para calcularlo', 'info')}
    ${kpi('Diferencia de caja', dif == null ? '—' : clp(dif), 'Cobrado vs. productos anotados', dif == null ? '' : Math.abs(dif) <= 2000 ? 'ok' : 'warn')}
    ${kpi('IVA perdido sin factura', clp(ivaPerdido), 'Pide factura en tus compras de insumos', ivaPerdido > 0 ? 'warn' : 'ok')}
    ${kpi('F29 a pagar el día 20', fl ? clp(fl.f29) : '—', fl ? `IVA ${clp(fl.ivaPagar)} + PPM ${clp(fl.p.ppm)} · ${fl.real ? 'real' : 'proyectado'}` : 'Fuera del período del flujo', 'info')}
  </div>
  <div class="card"><div class="card-title">${icon(ICONS.chart)} Ventas por día</div>
    <div class="chart-line"><div class="chart">${vals.map((v, i) => `<div class="col ${v ? '' : 'zero'}" title="${i + 1}: ${clp(v)}"><i style="height:${v / mx * 100}%"></i><small>${(i + 1) % 5 === 1 || nd < 16 ? i + 1 : ''}</small></div>`).join('')}</div>
    ${ref ? `<div class="chart-ref" style="bottom:${ref / mx * 126 + 14}px"><span>equilibrio ${clp(ref)}/día</span></div>` : ''}</div>
  </div>
  <div class="card"><div class="card-title">${icon(ICONS.chart)} Estado de resultados (sin IVA)</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Concepto</th><th>Presupuesto</th><th>Real</th><th>Diferencia</th><th>% ventas</th></tr></thead><tbody>
    ${erRows(pb, pr, b, r)}</tbody></table></div></div>`;
}
export function erRows(pb, pr, b, r) {
  const row = (l, a, c, cls = '', isPct = false) => { const d = c - a; const f = isPct ? (v => pct(v)) : clp; return `<tr class="${cls}"><td>${l}</td><td>${f(a)}</td><td class="${c < 0 ? 'neg' : ''}">${f(c)}</td><td class="${d < 0 ? 'neg' : ''}">${isPct ? pct(d) : clp(d)}</td><td>${isPct || !pr.neto ? '' : pct(c / pr.neto)}</td></tr>`; };
  return row('Ventas brutas (con IVA)', b.bruto, r.bruto) + row('(–) IVA débito', -pb.ivaDeb, -pr.ivaDeb) + row('Ventas netas', pb.neto, pr.neto, 'tot') +
    `<tr class="sec"><td colspan="5">Costo de ventas</td></tr>` +
    ['cafe', 'helado', 'reventa', 'desechables'].map(k => row(CATS[k].n, -pb.cv[k], -pr.cv[k])).join('') +
    row('Margen bruto', pb.margen, pr.margen, 'tot') + row('Margen bruto %', pb.neto ? pb.margen / pb.neto : 0, pr.neto ? pr.margen / pr.neto : 0, '', true) +
    `<tr class="sec"><td colspan="5">Gastos de operación</td></tr>` +
    row('Costos fijos', -pb.fijos, -pr.fijos) + row('Comisiones TUU y MP', -pb.comCosto, -pr.comCosto) + row('Limpieza', -pb.limpieza, -pr.limpieza) + row('Otros', -pb.otros, -pr.otros) +
    row('Resultado operacional (EBITDA)', pb.ebitda, pr.ebitda, 'tot') + row('Cuota préstamo máquina de helado', -pb.prestamo, -pr.prestamo) +
    row('Resultado del mes', pb.resultado, pr.resultado, 'hl');
}

/* ── FLUJO ── */
export function panelFlujo() {
  const F = flujo(), tr = (l, f, cls = '') => `<tr class="${cls}"><td>${l}</td>${F.map(m => { const v = f(m); return `<td class="${v < 0 ? 'neg' : ''}">${clp(v)}</td>`; }).join('')}</tr>`;
  const cat = k => m => (m.x.cats[k] || { bruto: 0 }).bruto;
  const low = F.find(m => m.cajaFin < 0);
  return `<div class="panel-title">Flujo de caja</div><div class="panel-sub">12 meses desde ${monthLabel(S().inicio)}. Meses con registros usan datos reales; el resto, el presupuesto. Montos con IVA.</div>
  ${low ? `<div class="note"><b>Atención:</b> la caja queda negativa en ${monthLabel(low.mk)} (${clp(low.cajaFin)}).</div>` : ''}
  <div class="card" style="padding:0.5rem"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Concepto</th>${F.map(m => `<th>${monthShort(m.mk)}<br><span class="src ${m.real ? 'real' : 'proy'}">${m.real ? 'real' : 'proy.'}</span></th>`).join('')}</tr></thead><tbody>
  ${tr('Saldo inicial', m => m.cajaIni, 'tot')}
  <tr class="sec"><td colspan="13">Ingresos</td></tr>
  ${COBROS.map(([k, n]) => tr(n, m => m.x.med[k] || 0)).join('')}
  ${tr('(–) Comisiones', m => m.p.comBruto)}${tr('Ingresos netos', m => m.ingresos, 'tot')}
  <tr class="sec"><td colspan="13">Egresos</td></tr>
  ${['fijo', 'prestamo', 'cafe', 'helado', 'reventa', 'desechables', 'limpieza', 'otros', 'retiro'].map(k => tr(CATS[k].n, cat(k))).join('')}
  ${tr('Pago F29 del mes anterior', m => m.pagoF29)}${tr('Total egresos', m => m.egresos, 'tot')}
  ${tr('Flujo neto del mes', m => m.neto, 'tot')}${tr('Saldo final de caja', m => m.cajaFin, 'hl')}
  <tr class="sec"><td colspan="13">IVA y F29</td></tr>
  ${tr('IVA débito', m => m.p.ivaDeb)}${tr('IVA crédito', m => m.p.ivaCred)}${tr('Remanente anterior', m => m.remIni)}${tr('IVA a pagar', m => m.ivaPagar)}${tr('PPM', m => m.p.ppm)}${tr('F29 (paga el 20 del mes siguiente)', m => m.f29, 'tot')}
  </tbody></table></div></div>`;
}

/* ── AJUSTES ── */
export function sec(k, title, ic, body) { return `<details class="card" data-sec="${k}" ${UI.open[k] ? 'open' : ''}><summary class="card-title">${icon(ic)} ${title}</summary>${body}</details>`; }
export function panelAjustes() {
  return `<div class="panel-title">Ajustes</div><div class="panel-sub">Configura tu negocio, respaldo y seguridad.</div>
  <div class="btn-row mb-16"><button class="btn-secondary" data-act="wOpen">Abrir el asistente paso a paso</button></div>
  ${sec('fijos', 'Costos fijos', ICONS.cash, fixedEditor())}
  ${sec('insumos', 'Catálogo de insumos (compra, rendimiento y merma)', ICONS.bag, itemsEditor())}
  ${sec('carta', 'Carta, recetas y precios', ICONS.cup, menuEditor())}
  ${sec('params', 'Cobros, comisiones e impuestos', ICONS.sliders, paramsEditor())}
  ${sec('caja', 'Negocio y caja inicial', ICONS.flow, `<div class="grid2 mb-12">${fld('Nombre del negocio', 'settings::nombre', 'text', S().nombre)}</div>` + cajaEditor())}
  ${sec('sync', 'Respaldo en GitHub', ICONS.cloud, syncEditor())}
  ${sec('respaldo', 'Exportar e importar', ICONS.chart, `<div class="btn-row mb-8"><button class="btn-secondary btn-sm" data-act="csvV">Ventas a CSV (para la planilla)</button><button class="btn-secondary btn-sm" data-act="csvG">Gastos a CSV (para la planilla)</button></div>
     <div class="btn-row"><button class="btn-secondary btn-sm" data-act="jsonOut">Descargar respaldo JSON</button><label class="btn-secondary btn-sm" style="cursor:pointer">Importar respaldo JSON<input type="file" accept="application/json" data-change="jsonIn" hidden></label></div>`)}
  ${sec('seg', 'Seguridad', ICONS.sliders, pinEditor() + `<div class="divider">Zona de peligro</div><button class="btn-secondary btn-danger btn-sm" data-act="wipe">Borrar los datos de este equipo</button>`)}
  <p class="muted" style="text-align:center;margin-top:8px">Los datos se guardan en este navegador${ghCfg() ? ' y en tu repositorio de GitHub' : ''}.</p>`;
}

