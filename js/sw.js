const CACHE_NAME = 'laboratory-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/status.html',
    '/site.webmanifest',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/safari-pinned-tab.svg',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request)
                    .then(fetchResponse => {
                        // Cache successful responses
                        if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Handle background sync for status updates
self.addEventListener('sync', event => {
    if (event.tag === 'status-update') {
        event.waitUntil(
            // Implement status update logic here
            updateStatuses()
        );
    }
});

// Optional: Handle push notifications
self.addEventListener('push', event => {
    if (event.data) {
        const notification = event.data.json();
        const options = {
            body: notification.body,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png'
        };

        event.waitUntil(
            self.registration.showNotification('The Laboratory', options)
        );
    }
});
