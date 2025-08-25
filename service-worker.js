const CACHE_NAME = 'lpg-stations-v1';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './accessibility.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Background sync for data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(updateStationsData());
  }
});

async function updateStationsData() {
  try {
    const response = await fetch('https://docs.google.com/spreadsheets/d/1FDx3CdFpCLxQAKFRqQ1DpiF8l6k46L6M6hWoahuGB30/gviz/tq?tqx=out:json');
    const data = await response.text();
    
    // Store updated data in IndexedDB or cache
    const cache = await caches.open(CACHE_NAME);
    await cache.put('/api/stations', new Response(data));
    
    // Notify clients of update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_UPDATED',
        data: data
      });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
} 