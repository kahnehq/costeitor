/* IVA: conversión entre montos ingresados "con IVA" (bruto) o "sin IVA" (neto). Funciones puras, sin estado ni DOM.
   tipo = 'bruto' (el monto ya incluye IVA, valor por defecto) | 'neto' (el monto es sin IVA).
   Sin factura el IVA no es crédito fiscal: es parte del costo, así que ahí el monto vale lo mismo en bruto y en neto. */
export const esNeto = (factura, tipo) => !!factura && tipo === 'neto';
/** Monto que se paga de verdad (con IVA). */
export const aBruto = (monto, factura, tipo, iva) => esNeto(factura, tipo) ? Math.round((monto || 0) * (1 + iva)) : (monto || 0);
/** Costo para el negocio: sin IVA si hay factura (crédito fiscal), con IVA si no la hay. */
export const aNeto = (monto, factura, tipo, iva) => !factura ? (monto || 0) : esNeto(factura, tipo) ? (monto || 0) : (monto || 0) / (1 + iva);
