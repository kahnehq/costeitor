/* Expone la API interna en `window` para las pruebas (tests/smoke.mjs) y la consola del navegador.
   La app no depende de estos globales: cada módulo importa lo que usa. */
import * as estado from './estado.js';
import * as costeo from './costeo.js';
import * as finanzas from './finanzas.js';
import * as util from './util.js';
import * as sync from './sync.js';
import * as render from './render.js';
import * as conflictos from './conflictos.js';
import * as estacionalidad from './estacionalidad.js';
import * as pendientes from './pendientes.js';
import * as acciones from './acciones.js';

Object.assign(window, util, costeo, finanzas, sync, acciones, estado, render, conflictos, estacionalidad, pendientes);
// D, G se reasignan: getters para ver siempre el valor vigente
for (const k of ['D', 'G']) Object.defineProperty(window, k, { get: () => estado[k], configurable: true });
