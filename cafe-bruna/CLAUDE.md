# Café de Bruna — app de caja y control

App web estática, sin build (HTML + CSS + módulos ES nativos), para administrar **Café de Bruna**, una cafetería al paso (take-away, pocos asientos) en Av. Las Salinas, Las Cruces (El Tabo, Chile). Dueño y único usuario: Carlos. Vende pocos cafés al día; cobra con **TUU** y **Mercado Pago Point**, además de efectivo y transferencias; declara y paga IVA mensual (F29) al SII.

La carta es fija porque la máquina es estándar: Espresso $1.500, Lungo $1.800, Americano $1.900, Cappuccino $2.000, Latte macchiato $2.000 y Té en bolsita $1.000 (vaso 8 oz + 1 bolsita Selección). La dosis de café es **siempre 10 g por taza**. El café en grano se compra por kilo ($25.000/kg con factura) con **5 % de merma**. También vende helado soft (máquina financiada con un préstamo) y productos de reventa (alfajores, barritas, etc.).

Publicada en https://kahnehq.github.io/costeitor/cafe-bruna/ (GitHub Pages desde `main`). Carlos la usa en **Microsoft Edge**, en el PC y en el celular.

## Estructura del código

Sin build: `index.html` solo carga `styles.css` y `js/main.js` (`<script type="module">`), y los módulos se importan entre sí con rutas relativas. **Los módulos ES no cargan desde `file://`**: abre la app por HTTP (GitHub Pages o un servidor estático local). Las pruebas ya lo hacen.

| Módulo (`js/`) | Contenido | ¿Toca el DOM? |
| --- | --- | --- |
| `constantes.js` | claves de `localStorage`, `CATS`, `ITEM_CATS`, `MENU_CATS`, `MEDIOS`, `COBROS` | no |
| `util.js` | formato (`clp`, `pct`, `dec`, `nfmt`), parseo, fechas, `esc`, `ICONS`, `toast` | solo `$` y `toast` |
| `defaults.js` | `DEF_RECETAS`, `MEDIDAS`, `UB`, `defaults()` | no |
| `estado.js` | `D`, `UI`, `G`, `load()`, `migrate()`, `saveLocal()`, `touch()`, acceso a colecciones | no |
| `iva.js` | `aBruto`, `aNeto`: conversión de montos con/sin IVA (funciones puras) | no |
| `costeo.js` | `costBase`, `costMenu`, `margen`, `sugerido`, `consumo` | no |
| `finanzas.js` | `budget`, `real`, `pl`, `equilibrio`, `flujo` (F29) | no |
| `render.js` | `render`/`rerender`, campos enlazados (`onBind`), `LIVE` | sí |
| `pin.js`, `editores.js`, `asistente.js`, `paneles.js` | pantallas y pestañas | sí |
| `dialogo.js` | `ask({ titulo, texto, ok, peligro, escribir })` → `Promise<boolean>`: confirmaciones propias (reemplazan a `confirm()`) | sí |
| `acciones.js` | `ACTS`, `CHANGES`, exportar CSV/JSON | sí |
| `sync.js` | sincronización opcional con GitHub (`merge`, `gh`, `sync`) | solo `paintSync` |
| `main.js` | eventos globales e inicio | sí |
| `depuracion.js` | publica la API interna en `window`, solo para pruebas y consola | — |

Reglas de la división (pensadas para poder envolver la app en una APK u otro contenedor más adelante):

- **La lógica de negocio no toca el DOM** (`costeo.js`, `finanzas.js`, `defaults.js`, `constantes.js`). Mantenla así: se prueba sola y se reutiliza.
- Cada módulo importa lo que usa; no dependas de globales (solo `depuracion.js` las crea, para las pruebas). `D` y `G` se reasignan **únicamente** con `setD()` y `setG()`, porque un import es un enlace vivo de solo lectura.
- El acceso a `localStorage` está en `estado.js` (datos), `sync.js` (configuración de GitHub) y `pin.js` (PIN). Un contenedor nuevo debería reemplazar solo esos puntos.
- Los módulos se importan en ciclo (render ↔ paneles ↔ acciones). Es seguro mientras el código de nivel superior no llame a funciones de otro módulo al cargarse; hazlo solo dentro de funciones.

## Modelo de datos (versión 4, `D.v === 4`)

Se guarda en `localStorage['bruna.data.v1']`. El nombre de la clave no cambia entre versiones; la versión real está en `D.v`.

```
D = {
  v: 4,
  settings: { updatedAt, setupDone, nombre, inicio:'YYYY-MM', dias, iva, usaCompras, tuu, mpd, mpc, facturaCom, ppm, dosis,
              margenObj, cajaInicial, f29Pendiente, remanente, retiro, mix:{ef,tuu,mpd,mpc,tr} },
  fixed:    [{ id, ord, nombre, monto, montoTipo:'bruto'|'neto', factura, tipo:'fijo'|'prestamo', updatedAt, deleted }],
  menu:     [{ id, ord, nombre, cat:'cafe'|'te'|'helado'|'otro', precio, esperado, por:'dia'|'semana',
               receta:[{ itemId, qty }], extra, updatedAt, deleted }],
  items:    [{ id, ord, nombre, cat (ITEM_CATS), unidad (texto: “bidón”, “bolsa 1 kg”), precio (por compra), precioTipo:'bruto'|'neto',
               ub:'kg'|'l'|'und', contenido, merma, mensual, factura, grano, venta, precioVenta, esperado, por,
               fromMenu?, updatedAt, deleted }],
  days:     [{ id:'YYYY-MM-DD', fecha, ef, tuu, mpd, mpc, tr, tickets, u:{ [menuId|itemId]: unidades }, nota, updatedAt, deleted }],
  expenses: [{ id, fecha, cat (keys de CATS), itemId, concepto, cant, unidad, precio, monto (SIEMPRE con IVA = lo pagado), ingresado, tipo:'bruto'|'neto', factura,
               medio:'ef'|'deb'|'cred', nota, updatedAt, deleted }]
}
```

- **Nunca borres registros:** marca `deleted: true` y actualiza `updatedAt` (lápida). La sincronización depende de esto.
- Toda modificación de una entidad actualiza su `updatedAt = now()`. Usa `setVal` o, si mutas a mano, llama a `touch()` después.
- Los **ids por defecto son deterministas** (`f1…`, `m1…`, `i1…`). Así dos equipos que parten de cero no duplican registros. Los nuevos usan `uid()`.
- Los defaults tienen `updatedAt: 0` para que los datos remotos siempre ganen sobre una instalación nueva.
- Otras claves de `localStorage`: `bruna.sync.v1` (configuración y token de GitHub, **nunca se sincroniza**), `bruna.pin.v1` (hash SHA-256 del PIN) y `bruna.syncmeta.v1`.

### Migraciones

`migrate(d)` es **idempotente** y corre en `load()`, después de cada `merge()` en `sync()` y al importar un JSON. Para cambiar el esquema:
1. Agrega un bloque que complete los campos nuevos solo si faltan (`=== undefined`).
2. Sube `v` en `defaults()` y en la línea `if ((d.v || 1) < N)`.
3. Agrega una prueba de migración en `tests/smoke.mjs`.

**IVA bruto/neto (v4):** `precio` (insumo), `monto` (costo fijo) y el monto de cada gasto se pueden escribir con o sin IVA. `tipo`/`precioTipo`/`montoTipo` = `'bruto'` (incluye IVA, por defecto) o `'neto'`. Solo importa **con factura**; sin factura el IVA es costo y el monto vale igual. En los gastos, `monto` se guarda siempre con IVA (`aBruto`) para que `real()`, `pl()` y el F29 no cambien; `ingresado` y `tipo` recuerdan cómo lo escribió Carlos y se usan al editar. Un insumo nuevo nace como `bruto`.

Historial: v2 movió los productos de reventa de la carta al catálogo (`venta: true`) y trasladó las unidades vendidas de `day.u`. v3 agregó medidas de compra, merma y recetas. v4 agregó `precioTipo`, `montoTipo`, `usaCompras` y los campos `ingresado`/`tipo` de los gastos.

## Convenciones de UI (importante)

- **Delegación de eventos:** los botones usan `data-act="nombre"` → `ACTS.nombre(el, ev)`. Los `<input type=date|file>` usan `data-change` → `CHANGES`.
- **Campos enlazados:** `data-bind="coll:id:campo:tipo"`. `coll` puede ser `settings` (campo con punto para anidados, por ejemplo `mix.tuu`), `fixed`, `menu`, `items`, `day` (id = fecha), `rec`/`recit` (id = menuId, campo = índice del ingrediente), `g` (modal de gasto) o `sd` (borrador de sync). `tipo` puede ser `clp`, `pct` (se muestra en %, se guarda como fracción), `dec`, `int` o `text`.
- **No redibujes mientras se escribe:** el evento `input` actualiza el modelo y luego `refreshLive()`. El `change` de un input de texto solo reformatea; **no llama a `render()`**, porque se perdería el foco. Solo los `select`, `toggle`, los botones y las fechas redibujan.
- **Valores calculados en vivo:** `<span data-live="clave:arg1:arg2">`, con la función en `LIVE.clave(...args)`.
- **Confirmaciones:** nunca uses `confirm()`/`alert()` (las pruebas fallan si aparece uno). Usa `await ask({...})` de `dialogo.js` desde una acción `async`; para acciones irreversibles pasa `peligro: true` y, si no tiene vuelta atrás, `escribir: 'PALABRA'`. El diálogo vive fuera de `#app`, así que `render()` no lo cierra.
- **Seguridad:** todo texto del usuario o de GitHub pasa por `esc()` antes de entrar a una plantilla HTML. El token de GitHub está en `localStorage` del mismo origen, así que un XSS lo expondría.
- **Diseño responsivo:** se usa sobre todo en celular. Pruébalo a 390 px de ancho. El modal es una hoja inferior bajo 600 px.

## Costeo (lógica heredada de Costeitor)

En Costeitor, el costo de un ingrediente es su precio por unidad base por la cantidad usada (g→kg y ml→l ÷ 1000). Aquí se agrega la presentación de compra, la merma y el IVA:

```
costBase(item)  = precioCosto(item) / contenido / (1 − merma)
precioCosto     = promedio ponderado por cantidad de las compras del insumo (mes actual y 2 anteriores, neto si hay factura);
                  sin compras (o con usaCompras=false): precio del catálogo según precioTipo (neto: tal cual; bruto: /(1+IVA))   // $ por kg | litro | unidad
costIng(ing)    = costBase(item) × qty / (ub==='und' ? 1 : 1000)                  // receta en g, ml o und
costMenu(p)     = Σ costIng(receta) + extra                                       // extra = otros costos variables por unidad
costSell(id)    = costMenu (carta) | costBase (insumo con venta:true)
comPct()        = Σ mix_k × tasa_k  (TUU, MP débito, MP crédito; × (1+IVA) si no hay factura por la comisión)
margen(P, c)    = P/(1+IVA) − c − P×comPct()                                      // contribución por unidad, sin IVA
sugerido(c)     = ceil100( c × (1+margenObj) / (1/(1+IVA) − comPct()) )
consumo(item)   = Σ unidadesMes(producto) × qty / factor  [+ unidadesMes(item) si se revende]  / contenido / (1 − merma)
```

- Si compras el mismo café en kilos distintos y a precios distintos, el costo sigue el promedio ponderado de lo realmente comprado, no el último precio.
- El IVA de compras con factura es crédito fiscal, así que el costo es neto. Sin factura, el IVA es costo.
- `margenObj` es el margen **sobre costo**, como en Costeitor. Por defecto 200 %.
- **Precio de compra** = lo que se paga por cada compra (bolsa, bidón, paquete). `contenido` dice cuántos kg, litros o unidades trae.
- Los insumos de `limpieza`/`otros` no se costean en recetas, salvo que se revendan (`costeable()`).

## Lógica financiera

- **Presupuesto** (`budget()`): ventas = Σ venta esperada × precio, con `por: 'semana'` × 4,33 o `'dia'` × días abiertos. Gastos = costos fijos + Σ precio × compra al mes de cada insumo + retiro. Cobros según `settings.mix`. `costoTeo` = costo de las unidades esperadas según recetas.
- **Real** (`real('YYYY-MM')`): suma `days` y `expenses` del mes. El costo de ventas real es **lo comprado en el mes** (criterio de caja), no lo consumido. `costoTeo` = costo según recetas de lo vendido, para comparar y detectar merma.
- **Estado de resultados** (`pl(x)`), sin IVA: ventas netas − costo de ventas (café, helado, reventa, desechables) = margen bruto − (costos fijos + comisiones + limpieza + otros) = EBITDA − cuota del préstamo = resultado. El retiro del dueño solo afecta la caja.
- **Equilibrio**: costos fijos totales (fijos + limpieza + otros + préstamo) ÷ margen de contribución %. El costo variable usado es el **mayor** entre compras planificadas y costo según recetas (criterio conservador). Se expresa en cafés por día al precio promedio ponderado de los cafés.
- **F29 / flujo** (`flujo()`): 12 meses desde `settings.inicio`. Cada mes usa datos reales si tiene registros y, si no, el presupuesto. IVA a pagar = máx(0, débito − crédito − remanente); arrastra el remanente. PPM = ventas netas × `ppm`. El F29 del mes N se paga el día 20 del mes N+1, y por eso aparece como egreso del mes siguiente.
- Comisiones vigentes (nov 2026): TUU 1,49 % + IVA, tasa plana; Mercado Pago Point Smart 2 2,19 % débito y 2,69 % crédito (facturación bajo $2 MM/mes). Son editables en Ajustes.

## Sincronización con GitHub

- Opcional. Usa un **repositorio privado** (`kahnehq/cafe-bruna-datos`), archivo `data/cafe-bruna.json` en la rama `main`, mediante la API de contenidos (`GET`/`PUT /repos/{o}/{r}/contents/{path}`) con un token *fine-grained* que solo tiene **Contents: Read and write** en ese repositorio.
- `sync()`: GET → `merge(local, remoto)` → `migrate` → si el resultado difiere del remoto, PUT con `sha`. Ante un 409/422 reintenta (hasta 3 veces). Corre 3,5 s después de cada cambio (`touch`), al abrir la app y al volver a la pestaña.
- `merge()`: la configuración completa gana por `updatedAt`. Cada colección se mezcla por `id` y gana la entidad con el `updatedAt` mayor (último en escribir). Las lápidas se propagan.
- **Nunca** guardes datos del café en el repositorio público `costeitor`.

## Pruebas

```
cd cafe-bruna/tests
npm install
npx playwright install chromium     # o: CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" npm test
npm test
```

`smoke.mjs` sirve `cafe-bruna/` por HTTP local (los módulos ES no cargan desde `file://`) y abre la app con Playwright y GitHub simulado. Verifica los números de costeo (receta, merma, comisión, precio sugerido, consumo y equilibrio), la caja del día, los gastos, la sincronización entre dos equipos y la migración v1→v3. Si cambias una fórmula, actualiza la prueba y explica el cambio en el PR.

## Pendientes y siguientes pasos

- Completar precios de insumos en $0 (leche, vasos, tapas, azúcar, preparado de helado por ml) y las recetas de cappuccino, latte y helado. Son datos de Carlos, no del código.
- PWA: `manifest.webmanifest` + service worker para instalarla y usarla sin conexión en Edge y el celular. Si se agrega, el SW no debe cachear las llamadas a `api.github.com`.
- Mostrar conflictos de sincronización (hoy gana el último en escribir, en silencio).
- Ventas por día de la semana y por temporada (verano en la costa) en la pestaña Mes.
