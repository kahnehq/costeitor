# Repositorio kahnehq/costeitor

Dos apps web estáticas (Costeitor en un solo archivo; Café de Bruna en módulos ES nativos), publicadas con GitHub Pages desde la rama `main`:

| Carpeta | App | URL |
| --- | --- | --- |
| `/` (`index.html`) | **PrecioCosto / Costeitor**: calculadora de costos y precios para pymes | https://kahnehq.github.io/costeitor/ |
| `/cafe-bruna/` | **Café de Bruna**: caja diaria, gastos, costeo por receta, resumen mensual y flujo de caja de una cafetería | https://kahnehq.github.io/costeitor/cafe-bruna/ |

Cada app tiene sus propias instrucciones: lee `cafe-bruna/CLAUDE.md` antes de tocar esa carpeta.

## Reglas comunes

- **Sin build ni dependencias en tiempo de ejecución.** Costeitor es un único `index.html`; Café de Bruna reparte HTML, CSS y módulos ES nativos (`<script type="module">`) en archivos estáticos, sin transpilar ni empaquetar. En ambas, con Google Fonts (DM Serif Display + DM Sans) como único recurso externo. No agregues frameworks, bundlers ni npm en la app. `npm` solo existe en `cafe-bruna/tests/`.
- **Idioma:** interfaz, textos y mensajes de commit en español de Chile. Montos en CLP (`$1.234`, sin decimales), porcentajes con coma (`1,5%`).
- **Estilo visual compartido:** variables CSS de Costeitor (`--green #1a9e72`, `--gray-800 #2a2724`, radios de 12 y 8 px, tarjetas blancas sobre `--gray-50`, barra de pestañas con íconos SVG de trazo). Mantén esa línea.
- **Flujo de trabajo:** trabaja en una rama y abre un pull request hacia `main`. Carlos revisa y hace el merge; el merge publica el sitio. No hagas push directo a `main`.
- **Pruebas:** antes de abrir un PR que toque `cafe-bruna/`, corre `cd cafe-bruna/tests && npm install && npx playwright install chromium && npm test`. Todas deben pasar.
- No toques una app al trabajar en la otra.
