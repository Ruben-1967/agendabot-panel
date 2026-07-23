// Service worker mínimo — necesario para que el navegador considere la app
// "instalable". A propósito NO cachea las llamadas a la API (auth, agenda,
// demos, etc.) para que el panel siempre muestre datos en vivo — solo
// guarda una copia de la página principal para tener un fallback simple si
// se pierde la conexión al abrir la app.

const CACHE_NAME = 'totemsystem-panel-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/index.html'))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Solo intervenir en la navegación principal (cargar la app) — nunca en
  // llamadas a la API, para no interferir con datos en vivo.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});