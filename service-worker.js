const CACHE_NAME = 'lpg-stations-v1.0.0';
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
      .then(() => {
        console.log('All resources cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
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
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Intercept network requests
self.addEventListener('fetch', (event) => {
  // התעלם מבקשות לא-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // התעלם מבקשות ל-Google Sheets API
  if (event.request.url.includes('docs.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // החזר מהמטמון אם קיים
        if (response) {
          return response;
        }

        // אחרת, נסה מהרשת
        return fetch(event.request)
          .then((response) => {
            // בדוק שהתגובה תקינה
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // שמור במטמון לתשובות חיוביות
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // אם אין חיבור לאינטרנט, החזר דף offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// טיפול בהודעות מהאפליקציה
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 