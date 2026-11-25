/* Datos por defecto y medidas de compra. */
import { thisMonth } from './util.js';

/* ═══════════════ DATOS POR DEFECTO ═══════════════ */
/* Recetas base (como en Costeitor: cantidad usada × precio por unidad de compra). i1 = café en grano, i5 = té en bolsita, i19 = vaso 8 oz */
export const DEF_RECETAS = {
  m1: [{ itemId: 'i1', qty: 10 }], m2: [{ itemId: 'i1', qty: 10 }], m3: [{ itemId: 'i1', qty: 10 }],
  m4: [{ itemId: 'i1', qty: 10 }], m5: [{ itemId: 'i1', qty: 10 }], m6: [{ itemId: 'i5', qty: 1 }, { itemId: 'i19', qty: 1 }]
};
/* medida de compra: ub = kg | l | und (la receta usa g, ml o und), contenido = cuánto trae cada compra, merma = pérdida */
export const MEDIDAS = { 'Café en grano': ['kg', 1, 0.05], 'Café descafeinado': ['kg', 1, 0.05], 'Leche': ['l', 1, 0], 'Leche de almendras': ['l', 1, 0], 'Agua (bidón 20 L)': ['l', 20, 0], 'Preparado de helado Calo': ['l', 1, 0] };
export const defMedida = n => { const m = MEDIDAS[n] || ['und', 1, 0]; return { ub: m[0], contenido: m[1], merma: m[2] }; };
export const UB = { kg: { n: 'kilo', r: 'g', f: 1000 }, l: { n: 'litro', r: 'ml', f: 1000 }, und: { n: 'unidad', r: 'und', f: 1 } };
export function defaults() {
  const e = (o, i) => ({ ord: i, updatedAt: 0, deleted: false, ...o });
  return {
    v: 3,
    settings: {
      updatedAt: 0, setupDone: false, nombre: 'Café de Bruna', inicio: thisMonth(), dias: 26,
      iva: 0.19, tuu: 0.0149, mpd: 0.0219, mpc: 0.0269, facturaCom: true, ppm: 0.0025, dosis: 10, margenObj: 2,
      cajaInicial: 0, f29Pendiente: 0, remanente: 0, retiro: 0,
      mix: { ef: 0.25, tuu: 0.35, mpd: 0.25, mpc: 0.15, tr: 0 }
    },
    fixed: [
      ['Renta local', 400000, false, 'fijo'], ['Comodato máquina de café', 172000, true, 'fijo'], ['Celular', 32000, false, 'fijo'],
      ['Electricidad', 0, true, 'fijo'], ['Contador', 0, false, 'fijo'], ['Patente municipal (mensual)', 0, false, 'fijo'],
      ['Préstamo máquina de helado', 110000, false, 'prestamo']
    ].map(([nombre, monto, factura, tipo], i) => e({ id: 'f' + (i + 1), nombre, monto, factura, tipo }, i)),
    menu: [
      ['Espresso', 'cafe', 1500, 2, 'dia', 250], ['Lungo', 'cafe', 1800, 1, 'dia', 250], ['Americano', 'cafe', 1900, 5, 'dia', 250],
      ['Cappuccino', 'cafe', 2000, 4, 'dia', 250], ['Latte macchiato', 'cafe', 2000, 3, 'dia', 250], ['Té en bolsita', 'te', 1000, 2, 'dia', 0],
      ['Helado', 'helado', 2000, 5, 'dia', 0]
    ].map(([nombre, cat, precio, esperado, por], i) => e({ id: 'm' + (i + 1), nombre, cat, precio, esperado, por, extra: 0, receta: DEF_RECETAS['m' + (i + 1)] || [] }, i)),
    items: [
      ['Café en grano', 'cafe', 'kg', 25000, 5, true, true], ['Café descafeinado', 'cafe', 'kg', 0, 0, true], ['Leche', 'cafe', 'litro', 0, 0, false],
      ['Leche de almendras', 'cafe', 'litro', 0, 0, false], ['Té en bolsita Selección', 'cafe', 'bolsita', 0, 52, false], ['Té en hoja', 'cafe', 'paquete', 0, 0, false],
      ['Azúcar en sobre', 'cafe', 'caja', 0, 0, false], ['Stevia en sobre', 'cafe', 'caja', 0, 0, false], ['Agua (bidón 20 L)', 'cafe', 'bidón', 5000, 15, false],
      ['Preparado de helado Calo', 'helado', 'litro', 1690, 12, true], ['Barquillos', 'helado', 'caja', 0, 0, false],
      ['Alfajores', 'reventa', 'unidad', 1100, 43, false], ['Alfajores 2 sabores', 'reventa', 'unidad', 2000, 22, false], ['Bollería', 'reventa', 'unidad', 0, 0, false],
      ['Barritas de proteína', 'reventa', 'unidad', 0, 0, false], ['Snickers veganos', 'reventa', 'unidad', 0, 0, false],
      ['Vasos 4 oz', 'desechables', 'paquete', 0, 0, false], ['Vasos 6 oz', 'desechables', 'paquete', 0, 0, false], ['Vasos 8 oz', 'desechables', 'paquete', 0, 0, false],
      ['Tapas', 'desechables', 'paquete', 0, 0, false], ['Palitos para revolver', 'desechables', 'paquete', 0, 0, false], ['Servilletas', 'desechables', 'paquete', 0, 0, false],
      ['Detergente', 'limpieza', 'unidad', 0, 0, false], ['Papel Nova', 'limpieza', 'paquete', 0, 0, false], ['Papel higiénico', 'limpieza', 'paquete', 0, 0, false],
      ['Limpia piso', 'limpieza', 'unidad', 0, 0, false], ['Limpia vidrios', 'limpieza', 'unidad', 0, 0, false], ['Limpia baños', 'limpieza', 'unidad', 0, 0, false],
      ['Esponjas', 'limpieza', 'paquete', 0, 0, false], ['Toallitas desinfectantes', 'limpieza', 'paquete', 0, 0, false]
    ].map(([nombre, cat, unidad, precio, mensual, factura, grano], i) => e({ id: 'i' + (i + 1), nombre, cat, unidad, precio, mensual, factura, grano: !!grano, venta: cat === 'reventa', precioVenta: 0, esperado: 0, por: 'semana', ...defMedida(nombre) }, i))
      .map(it => Object.assign(it, ({ 'Alfajores': { precioVenta: 2000, esperado: 10 }, 'Alfajores 2 sabores': { precioVenta: 3500, esperado: 5 } })[it.nombre] || {})),
    days: [],
    expenses: []
  };
}
