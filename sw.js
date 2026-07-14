const CACHE_NAME = 'agenda-facultad-v4';
const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './chart.umd.min.js',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(nombres.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estrategia: para el HTML/manifest/íconos (el "cascarón" de la app) usamos
// cache-first con actualización en segundo plano. Todo lo demás (la API de
// Google Apps Script, fuentes externas, etc.) va directo a la red: los datos
// reales siempre tienen que venir de la nube, no de una copia vieja.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const esPropio = url.origin === self.location.origin;

  if (!esPropio || event.request.method !== 'GET') {
    return; // dejamos pasar tal cual (API, CDNs, fuentes, etc.)
  }

  event.respondWith(
    caches.match(event.request).then(cacheado => {
      const redFetch = fetch(event.request)
        .then(respuesta => {
          if (respuesta && respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copia));
          }
          return respuesta;
        })
        .catch(() => cacheado);
      return cacheado || redFetch;
    })
  );
});