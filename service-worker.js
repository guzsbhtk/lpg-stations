const CACHE_NAME = 'lpg-stations-v1';
const urlsToCache = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './accessibility.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/waze.svg',
  './icons/maps.svg',
  './privacy-policy.html',
  './terms-of-use.html'
];

// התקנה - שמירת קבצים במטמון
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// הפעלה - ניקוי מטמון ישן
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
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
    })
  );
  self.clients.claim();
});

// יירוט בקשות - אסטרטגיית Cache First
self.addEventListener('fetch', (event) => {
  // דילוג על בקשות לא-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // דילוג על בקשות לשרתים חיצוניים (Google Sheets, Forms)
  if (event.request.url.includes('docs.google.com') || 
      event.request.url.includes('forms.google.com') ||
      event.request.url.includes('waze.com') ||
      event.request.url.includes('google.com/maps')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // החזרת תגובה מהמטמון אם קיימת
        if (response) {
          return response;
        }

        // אחרת, בקשה מהרשת
        return fetch(event.request)
          .then((response) => {
            // בדיקה שהתגובה תקינה
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // שמירה במטמון
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // במקרה של שגיאת רשת, החזרת דף offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
}); 