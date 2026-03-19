const CACHE_NAME = 'medtracker-v1';
// Base path from service worker URL (e.g. /medi-track when deployed at project path)
const BASE = self.location.pathname.replace(/\/sw\.js$/i, '') || '';

const urlsToCache = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/styles.css',
  BASE + '/app.js',
  BASE + '/manifest.json',
  BASE + '/config.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install service worker
self.addEventListener('install', (event) => {
  self.skipWaiting(); // ← take over immediately after install without waiting for page reload
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// ─── Push notifications ───────────────────────────────────────────────────────

// Fired when the browser receives a push message from the server.
// The payload should be JSON: { title, body, icon, badge, tag, data }
self.addEventListener('push', (event) => {
    let payload = { title: 'MedTracker', body: 'You have a new update.' };
    try {
        if (event.data) payload = event.data.json();
    } catch {
        payload.body = event.data?.text() ?? payload.body;
    }

    const { title, ...options } = payload;
    event.waitUntil(
        self.registration.showNotification(title, {
            icon: BASE + '/icon-192.png',
            badge: BASE + '/icon-192.png',
            ...options,
        })
    );
});

// Fired when the user taps a notification.
// Opens the app (or focuses an existing tab) and closes the notification.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = self.location.origin + BASE + '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open, focus it
            for (const client of clientList) {
                if (client.url.startsWith(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});

// Update service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});