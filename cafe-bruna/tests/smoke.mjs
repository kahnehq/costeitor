// Pruebas de humo de la app Café de Bruna (cafe-bruna/index.html y js/*.js).
// Uso:  cd cafe-bruna/tests && npm install && npx playwright install chromium && npm test
// Con un Chrome ya instalado:  CHROME_PATH="/ruta/a/chrome" npm test
// GitHub se simula: nunca se llama a la API real.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
// Los módulos ES no cargan desde file://, así que se sirve la carpeta cafe-bruna/ por HTTP local
const root = path.resolve(here, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new globalThis.URL(req.url, 'http://x').pathname); const f = path.join(root, rel.endsWith('/') ? rel + 'index.html' : rel);
  if (!f.startsWith(root) || f.includes('node_modules') || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + server.address().port + '/index.html';
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: esperado ≈${b}, obtenido ${a}`);
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log('✔', name); };

// GitHub simulado (API de contenidos): guarda el último PUT en memoria
const gh = { content: null, sha: null, puts: 0 };
async function mockGitHub(ctx) {
  await ctx.route('https://fonts.googleapis.com/**', r => r.abort());
  await ctx.route('https://api.github.com/**', async route => {
    const req = route.request();
    if (req.url().includes('/contents/')) {
      if (req.method() === 'GET') return gh.content ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: gh.sha, content: gh.content }) }) : route.fulfill({ status: 404, body: '{}' });
      if (req.method() === 'PUT') {
        const b = JSON.parse(req.postData());
        if (gh.sha && b.sha !== gh.sha) return route.fulfill({ status: 409, body: '{}' });
        gh.content = b.content; gh.puts++; gh.sha = 'sha' + gh.puts;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{"content":{}}' });
      }
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}
async function newPage(browser, viewport = { width: 1100, height: 900 }) {
  const ctx = await browser.newContext({ viewport }); await mockGitHub(ctx);
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => d.accept());
  return { ctx, page, errors };
}

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
try {
  const { ctx, page, errors } = await newPage(browser);
  await page.goto(URL);

  await test('instalación nueva: abre el asistente sin errores', async () => {
    assert.equal(await page.locator('.wiz-title').innerText(), 'Bienvenido');
    assert.equal(await page.evaluate('D.v'), 3);
  });

  await test('costeo: receta, merma, comisión y precio sugerido', async () => {
    const r = await page.evaluate(() => {
      const m = byId('menu', 'm3'); const c = costMenu(m); const mg = margen(m.precio, c);
      return { costo: c, com: mg.com, m: mg.m, p: mg.p, sug: sugerido(c), comPct: comPct(), base: costBase(byId('items', 'i1')), cons: consumo('i1'), eq: equilibrio().cafesDia, agua: costBase(byId('items', 'i9')) };
    });
    near(r.base, 25000 / 1.19 / 0.95, 0.01, 'café: costo por kg (sin IVA, 5% merma)');
    near(r.costo, 25000 / 1.19 / 0.95 * 10 / 1000, 0.01, 'americano: costo de receta 10 g');
    near(r.comPct, 0.35 * 0.0149 + 0.25 * 0.0219 + 0.15 * 0.0269, 1e-9, 'comisión promedio');
    near(r.m, 1900 / 1.19 - r.costo - 1900 * r.comPct, 0.01, 'americano: margen por unidad');
    assert.equal(r.sug, 900, 'americano: precio sugerido con 200% sobre costo');
    near(r.agua, 250, 0.01, 'agua: bidón 20 L a $5.000 → $250 por litro');
    near(r.cons, 15 * 26 * 10 / 1000 / 0.95, 0.001, 'consumo de grano al mes (kg con merma)');
    near(r.eq, 23.8, 0.2, 'equilibrio en cafés por día');
  });

  await test('caja del día: conteo, cobro y diferencia', async () => {
    for (let i = 0; i < 5; i++) await page.click('[data-act=wNext]');
    await page.click('[data-act=wNext]'); // terminar
    for (const n of ['Americano', 'Americano', 'Americano', 'Cappuccino', 'Cappuccino']) await page.click(`.prod:has(.prod-name:text-is("${n}"))`);
    const f = await page.evaluate('UI.fecha');
    await page.fill(`[data-bind="day:${f}:ef:clp"]`, '3000');
    await page.fill(`[data-bind="day:${f}:tuu:clp"]`, '6.700');
    assert.equal(await page.innerText('[data-live=hoyTeo]'), '$9.700');
    assert.equal(await page.innerText('[data-live=hoyCob]'), '$9.700');
    assert.equal(await page.innerText('[data-live=hoyDif]'), '$0');
  });

  await test('gastos: registrar café en grano y costos fijos del mes', async () => {
    await page.click('[data-act=tab][data-k=gastos]'); await page.click('[data-act=gNew]');
    await page.click('[data-act=gCat][data-k=cafe]'); await page.click('.item-btn:has-text("Café en grano")');
    await page.fill('[data-bind="g::cant:dec"]', '2'); await page.click('[data-act=gSave]');
    await page.click('[data-act=loadFixed]');
    const r = await page.evaluate(() => { const x = real(thisMonth()); return { kg: x.granoKg, n: x.exps.length, cafe: x.cats.cafe.bruto }; });
    assert.equal(r.kg, 2); assert.equal(r.cafe, 50000); assert.equal(r.n, 5);
  });

  await test('sincronización con GitHub (simulada) entre dos equipos', async () => {
    await page.click('[data-act=tab][data-k=ajustes]'); await page.click('details[data-sec=sync] summary');
    await page.fill('[data-bind="sd::owner:text"]', 'kahnehq'); await page.fill('[data-bind="sd::repo:text"]', 'cafe-bruna-datos'); await page.fill('[data-bind="sd::token:text"]', 'github_pat_TEST');
    await page.click('[data-act=ghConnect]'); await page.waitForFunction('SYNC.st === "ok"');
    assert.ok(gh.puts >= 1);
    const d2 = await newPage(browser, { width: 390, height: 844 });
    await d2.page.goto(URL); await d2.page.click('[data-act=wRecover]');
    await d2.page.fill('[data-bind="sd::owner:text"]', 'kahnehq'); await d2.page.fill('[data-bind="sd::repo:text"]', 'cafe-bruna-datos'); await d2.page.fill('[data-bind="sd::token:text"]', 'github_pat_TEST');
    await d2.page.click('[data-act=ghConnect]'); await d2.page.waitForFunction('S().setupDone === true');
    assert.equal(await d2.page.evaluate('D.expenses.length'), 5);
    await d2.page.click('.prod:has(.prod-name:text-is("Espresso"))');
    await d2.page.evaluate('sync(true)'); await page.evaluate('sync(true)');
    assert.equal(await page.evaluate("dayOf(UI.fecha).u['m1']"), 1, 'el espresso del equipo 2 llega al equipo 1');
    assert.deepEqual(d2.errors, []);
    await d2.ctx.close();
  });

  await test('migración de datos v1 (reventa en la carta) a v3', async () => {
    const { ctx: c3, page: p3, errors: e3 } = await newPage(browser);
    await p3.goto(URL);
    const today = await p3.evaluate('today()');
    await p3.evaluate(([t]) => {
      localStorage.clear();
      localStorage.setItem('bruna.data.v1', JSON.stringify({
        v: 1, settings: { setupDone: true, updatedAt: 1 },
        menu: [{ id: 'm3', nombre: 'Americano', cat: 'cafe', precio: 1900, esperado: 5, por: 'dia', ord: 2, updatedAt: 0 },
               { id: 'm8', nombre: 'Alfajor', cat: 'reventa', precio: 2000, esperado: 10, por: 'semana', ord: 7, updatedAt: 0 }],
        items: [{ id: 'i1', nombre: 'Café en grano', cat: 'cafe', unidad: 'kg', precio: 25000, mensual: 5, factura: true, grano: true, ord: 0, updatedAt: 0 },
                { id: 'i12', nombre: 'Alfajores', cat: 'reventa', unidad: 'unidad', precio: 1100, mensual: 43, factura: false, ord: 11, updatedAt: 0 }],
        fixed: [], expenses: [],
        days: [{ id: t, fecha: t, ef: 0, tuu: 0, mpd: 0, mpc: 0, tr: 0, tickets: 0, u: { m8: 2, m3: 1 }, nota: '', updatedAt: 1 }]
      }));
    }, [today]);
    await p3.reload();
    const r = await p3.evaluate(() => ({ v: D.v, u: dayOf(UI.fecha).u, m8: byId('menu', 'm8').deleted, alf: byId('items', 'i12'), rec: byId('menu', 'm3').receta, teo: dayTeorico(dayOf(UI.fecha)) }));
    assert.equal(r.v, 3); assert.equal(r.m8, true);
    assert.deepEqual(r.u, { m3: 1, i12: 2 });
    assert.equal(r.alf.venta, true); assert.equal(r.alf.precioVenta, 2000);
    assert.deepEqual(r.rec, [{ itemId: 'i1', qty: 10 }]);
    assert.equal(r.teo, 5900);
    assert.deepEqual(e3, []);
    await c3.close();
  });

  assert.deepEqual(errors, [], 'sin errores de JavaScript');
  console.log(`\n${passed} pruebas OK`);
} catch (e) {
  console.error('✘', e.message); process.exitCode = 1;
} finally { await browser.close(); server.close(); }
