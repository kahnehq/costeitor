/* Diálogo de confirmación propio (reemplaza a window.confirm). Construye el DOM con textContent, sin innerHTML.
   ask({ titulo, texto, ok, cancelar, peligro, escribir }) → Promise<boolean>
   - peligro: botón de confirmar en rojo y el foco parte en "Cancelar".
   - escribir: palabra que hay que teclear para habilitar el botón (para acciones irreversibles). */
let abierto = null;

export function ask({ titulo = '¿Confirmar?', texto = '', ok = 'Aceptar', cancelar = 'Cancelar', peligro = false, escribir = '' } = {}) {
  if (abierto) abierto(false);
  return new Promise(resolve => {
    const previo = document.activeElement;
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
    const raiz = el('div', 'dlg-root'); raiz.setAttribute('role', 'alertdialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'dlg-titulo');
    const fondo = el('div', 'dlg-bg'), caja = el('div', 'dlg');
    const h = el('h3', '', titulo); h.id = 'dlg-titulo';
    const p = el('p', 'dlg-text', texto);
    const bCancel = el('button', 'btn-secondary', cancelar); bCancel.type = 'button';
    const bOk = el('button', peligro ? 'btn-primary dlg-danger' : 'btn-primary', ok); bOk.type = 'button';
    let input = null;
    caja.append(h, p);
    if (escribir) {
      const lab = el('label', 'fld'); lab.append(el('span', '', `Escribe ${escribir} para confirmar`));
      input = el('input', 'field-input'); input.type = 'text'; input.autocomplete = 'off'; input.setAttribute('aria-label', `Escribe ${escribir}`);
      lab.append(input); caja.append(lab); bOk.disabled = true;
      input.addEventListener('input', () => { bOk.disabled = input.value.trim().toUpperCase() !== escribir.toUpperCase(); });
    }
    const fila = el('div', 'dlg-actions'); fila.append(bCancel, bOk); caja.append(fila);
    raiz.append(fondo, caja); document.body.append(raiz);

    const cerrar = v => {
      document.removeEventListener('keydown', teclas, true); raiz.remove(); abierto = null;
      if (previo && previo.isConnected && previo.focus) previo.focus();
      resolve(v);
    };
    const teclas = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cerrar(false); }
      else if (e.key === 'Enter' && e.target !== bCancel && !bOk.disabled) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(true); }
      else if (e.key === 'Tab') { // el foco no sale del diálogo
        const f = [input, bCancel, bOk].filter(x => x && !x.disabled); const i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    abierto = cerrar;
    document.addEventListener('keydown', teclas, true);
    fondo.addEventListener('click', () => cerrar(false));
    bCancel.addEventListener('click', () => cerrar(false));
    bOk.addEventListener('click', () => cerrar(true));
    (input || (peligro ? bCancel : bOk)).focus();
  });
}
