const CACHE_NAME = 'kwano-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching offline support assets...');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Failed to pre-cache some assets (expected in dev mode, non-blocking):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Cleaning old cache...', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Dynamic routing with caching support for seamless offline standby and instant load
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Skip API routes, Firebase calls, or Chrome extension requests
  if (req.url.includes('/api/') || req.url.includes('firestore.googleapis.com') || !req.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to keep the cache warm (stale-while-revalidate)
        fetch(req).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, networkResponse);
            });
          }
        }).catch(() => {/* Handle offline failures silently */});
        
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(req).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Cache newly requested assets
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseToCache);
        });

        return response;
      }).catch(() => {
        // Fallback offline support for direct web navigation
        if (req.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
