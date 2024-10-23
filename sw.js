const CACHE_NAME = 'laboratory-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/status.html',
    '/js/status.js',
    '/js/main.js',
    '/css/style.css',
    '/site.webmanifest',
    '/favicon.ico',
    '/apple-touch-icon.png',
    '/favicon-32x32.png',
    '/favicon-16x16.png',
    '/safari-pinned-tab.svg',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    'https://img.shields.io/github/last-commit/',
    'https://img.shields.io/website'
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

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', event => {
    // Handle shield.io badges differently - network only
    if (event.request.url.includes('img.shields.io')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => new Response('', {
                    status: 404,
                    statusText: 'Not Found'
                }))
        );
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then(response => {
                        if (response) {
                            return response;
                        }
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        return new Response('', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
    );
});

// Handle background sync for status updates
self.addEventListener('sync', event => {
    if (event.tag === 'status-update') {
        event.waitUntil(
            fetch('/status.json')
                .then(response => response.json())
                .then(data => {
                    // Update status data
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put('/status.json', new Response(JSON.stringify(data)));
                        });
                })
        );
    }
});

// Handle push notifications
self.addEventListener('push', event => {
    if (event.data) {
        const notification = event.data.json();
        const options = {
            body: notification.body,
            icon: '/android-chrome-192x192.png',
            badge: '/favicon-32x32.png',
            data: {
                url: notification.url
            }
        };

        event.waitUntil(
            self.registration.showNotification('The Laboratory', options)
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.notification.data && event.notification.data.url) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});
