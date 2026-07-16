const CACHE_NAME = 'triarc-store-cache-v1';

// Avoid aggressive caching of html/root in dev preview or completely
const isDevPreview = typeof self !== 'undefined' && self.location && (
  self.location.hostname.includes('localhost') || 
  self.location.hostname.includes('127.0.0.1') || 
  self.location.hostname.includes('run.app') || 
  self.location.hostname.includes('aistudio')
);

if (isDevPreview) {
  // Self-destruct and clear caches if in dev/preview to prevent blank screen traps
  self.addEventListener('install', (event) => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(keys.map(key => caches.delete(key)));
      }).then(() => {
        return self.registration.unregister();
      }).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach(client => {
          if (client.url) {
            client.navigate(client.url);
          }
        });
      })
    );
  });
} else {
  // Production service worker: Do NOT cache the main '/' or '/index.html' to avoid trapping updates,
  // only cache non-HTML static assets to allow offline experience for static content
  const ASSETS_TO_CACHE = [
    '/manifest.json',
    '/icon.svg',
    '/robots.txt'
  ];

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      }).then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    // Only attempt to cache GET requests, skipping HTML requests to avoid trapping the index page,
    // and skip internal/chrome extension URLs
    if (
      event.request.method !== 'GET' || 
      !event.request.url.startsWith(self.location.origin) ||
      event.request.mode === 'navigate' ||
      event.request.url.endsWith('/') ||
      event.request.url.includes('index.html')
    ) {
      return;
    }

    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch new data in the background to update cache (stale-while-revalidate)
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {/* Ignore network errors offline */});
          
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Ignore offline errors for minor assets
        });
      })
    );
  });
}

