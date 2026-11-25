/* Datos por completar para que el costeo sea correcto (precios en $0, recetas vacías…). Sin DOM.
   Cada pendiente: { k, nivel: 'critico' | 'opcional', sec (sección de Ajustes), texto }.
   «critico» = hace que un costo, un margen o un precio sugerido salga mal (en $0). */
import { comprasRecientes } from './costeo.js';
import { byId, live } from './estado.js';

const lista = ns => ns.length > 4 ? ns.slice(0, 4).join(', ') + ` y ${ns.length - 4} más` : ns.join(', ');

export function pendientes() {
  const out = [], items = live('items'), menu = live('menu');
  const sinPrecio = it => !it.precio && comprasRecientes(it).length === 0;
  const enReceta = new Set(menu.flatMap(p => (p.receta || []).map(r => r.itemId)));

  const clave = items.filter(it => sinPrecio(it) && (enReceta.has(it.id) || it.venta));
  if (clave.length) out.push({ k: 'precios', nivel: 'critico', sec: 'insumos', texto: `Pon el precio de compra de lo que usas en recetas o vendes: ${lista(clave.map(i => i.nombre))}.` });

  const sinReceta = menu.filter(p => p.cat !== 'reventa' && !(p.receta || []).length && !p.extra);
  if (sinReceta.length) out.push({ k: 'recetas', nivel: 'critico', sec: 'carta', texto: `Arma la receta de ${lista(sinReceta.map(p => p.nombre))}: sin receta su costo sale en $0 y el margen se ve inflado.` });

  // bebidas con leche (capuchino, latte…) cuya receta no tiene ningún ingrediente en litros: casi seguro falta la leche
  const sinLeche = menu.filter(p => /cappuc|capuch|latte|moka|mocca|cortado/i.test(p.nombre) && (p.receta || []).length && !(p.receta || []).some(r => (byId('items', r.itemId) || {}).ub === 'l'));
  if (sinLeche.length) out.push({ k: 'leche', nivel: 'critico', sec: 'carta', texto: `A la receta de ${lista(sinLeche.map(p => p.nombre))} le falta la leche (ml por taza): hoy solo lleva café y su costo sale bajo.` });

  const sinVenta = menu.filter(p => !p.precio);
  if (sinVenta.length) out.push({ k: 'ventas', nivel: 'critico', sec: 'carta', texto: `Falta el precio de venta de ${lista(sinVenta.map(p => p.nombre))}.` });

  const resto = items.filter(it => sinPrecio(it) && !clave.includes(it));
  if (resto.length) out.push({ k: 'otros', nivel: 'opcional', sec: 'insumos', texto: `Insumos sin precio que aún no usas en recetas (${resto.length}): ${lista(resto.map(i => i.nombre))}. Complétalos cuando los compres: el primer gasto que registres les pone precio.` });

  const fijos0 = live('fixed').filter(f => !f.monto);
  if (fijos0.length) out.push({ k: 'fijos', nivel: 'opcional', sec: 'fijos', texto: `Costos fijos en $0: ${lista(fijos0.map(f => f.nombre))}. Déjalos en $0 si no los pagas o escribe el monto mensual.` });
  return out;
}
export const criticos = () => pendientes().filter(p => p.nivel === 'critico');
