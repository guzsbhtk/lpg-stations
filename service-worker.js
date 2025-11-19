// Basic Service Worker for offline support and runtime caching
const CACHE_NAME = 'lpg-stations-v19';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/manifest.json',
  '/accessibility.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maps.svg',
  '/icons/waze.svg',
  '/js/geolocation.js',
  '/js/utils.js',
  '/js/data-processing.js',
  '/js/device-detection.js',
  '/js/main.js',
  '/js/pwa-install.js',
  '/js/ui-rendering.js',
  '/js/debug.js',
  '/js/constants.js',
  '/js/state-manager.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);



  // Cache-first strategy for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
            return response;
          })
          .catch(() => cached);
      })
    );
  }
});


