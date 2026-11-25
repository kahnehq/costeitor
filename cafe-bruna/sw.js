/* Service worker de Café de Bruna: deja abrir la app sin conexión.
   - Solo maneja peticiones GET del MISMO origen (los archivos de la app).
   - Todo lo demás (api.github.com, Google Fonts, cualquier otro origen) pasa directo a la red:
     nunca se cachea ni se toca, así la sincronización y el token no pasan por la caché.
   - Los datos del café viven en localStorage, no aquí: esta caché solo guarda código y estilos.
   - Red primero, caché de respaldo: tras publicar una versión nueva la app se actualiza sola al tener conexión.
   Si agregas o renombras un archivo de la app, actualiza ARCHIVOS (una prueba lo verifica) y sube CACHE. */
const CACHE = 'bruna-app-v3';
const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/acciones.js',
  './js/asistente.js',
  './js/conflictos.js',
  './js/constantes.js',
  './js/costeo.js',
  './js/defaults.js',
  './js/depuracion.js',
  './js/dialogo.js',
  './js/editores.js',
  './js/estacionalidad.js',
  './js/estado.js',
  './js/finanzas.js',
  './js/iva.js',
  './js/main.js',
  './js/paneles.js',
  './js/pin.js',
  './js/render.js',
  './js/sync.js',
  './js/util.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return; // no respondWith: el navegador sigue normal
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
