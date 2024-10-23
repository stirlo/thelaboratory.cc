// Service Worker for The Laboratory
const CACHE_NAME = 'laboratory-v1';
const DYNAMIC_CACHE = 'laboratory-dynamic-v1';

// Assets to cache on install
const ASSETS = [
    '/',
    '/index.html',
    '/status.html',
    '/css/style.css',
    '/js/main.js',
    '/js/status.js',
    // Images
    '/apple-touch-icon.png',
    '/stirlo.space-512x512.png',
    '/tfp-green-512.png',
    '/oursquadis.top-512x512.png',
    '/infinitereality.cc-384x384.png',
    '/stirlo.be-512x512.png',
    '/JPT-flipper-512x512.png',
    '/adhan-flipper-512x512.png',
    '/adhan-swift-512x512.png',
    '/alarm-clock.svg',
    '/thegossroom-512x512.png',
    // Add any additional assets here
];

// Install event - triggered when the service worker is first installed
self.addEventListener('install', event => {
    console.log('[Service Worker] Installing Service Worker...', event);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(ASSETS).catch(error => {
                    console.error('[Service Worker] Cache addAll failed:', error);
                    throw error;
                });
            })
            .then(() => {
                console.log('[Service Worker] Skip waiting on install');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Install failed:', error);
            })
    );
});

// Activate event - triggered when the service worker is activated
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating Service Worker...', event);
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim().then(() => {
                console.log('[Service Worker] Claiming clients');
            })
        ]).catch(error => {
            console.error('[Service Worker] Activation failed:', error);
        })
    );
});

// Fetch event - triggered when the web app makes a request
self.addEventListener('fetch', event => {
    console.log('[Service Worker] Fetching:', event.request.url);

    // Handle different types of requests
    if (event.request.url.includes('/status-data')) {
        // Handle status data requests separately
        handleStatusDataFetch(event);
    } else if (event.request.url.includes('github.com') || 
               event.request.url.includes('shields.io')) {
        // Handle GitHub and badge requests with network-first strategy
        handleAPIFetch(event);
    } else {
        // Handle regular asset requests with cache-first strategy
        handleAssetFetch(event);
    }
});

// Handle status data requests
function handleStatusDataFetch(event) {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response before caching
                const clonedResponse = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => {
                    cache.put(event.request, clonedResponse);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
}

// Handle API requests (GitHub, shields.io)
function handleAPIFetch(event) {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone and cache fresh data
                const clonedResponse = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => {
                    cache.put(event.request, clonedResponse);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
}

// Handle regular asset requests
function handleAssetFetch(event) {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[Service Worker] Found in cache:', event.request.url);
                    return response;
                }

                console.log('[Service Worker] Fetching resource:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                                console.log('[Service Worker] Resource cached:', event.request.url);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('[Service Worker] Fetch failed:', error);
                        // You might want to return a custom offline page here
                        return new Response('Offline content not available');
                    });
            })
    );
}

// Background sync event
self.addEventListener('sync', event => {
    console.log('[Service Worker] Background sync:', event.tag);
    if (event.tag === 'status-update') {
        event.waitUntil(
            updateStatuses()
                .catch(error => {
                    console.error('[Service Worker] Background sync failed:', error);
                })
        );
    }
});

// Push notification event
self.addEventListener('push', event => {
    console.log('[Service Worker] Push received:', event);
    const options = {
        body: event.data.text(),
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png'
    };

    event.waitUntil(
        self.registration.showNotification('The Laboratory', options)
            .catch(error => {
                console.error('[Service Worker] Push notification failed:', error);
            })
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('[Service Worker] Notification click:', event);
    event.notification.close();

    event.waitUntil(
        clients.openWindow('/')
            .catch(error => {
                console.error('[Service Worker] Open window failed:', error);
            })
    );
});

// Helper function to update statuses
async function updateStatuses() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const response = await fetch('/status-data');
        await cache.put('/status-data', response.clone());
        return response;
    } catch (error) {
        console.error('[Service Worker] Update statuses failed:', error);
        throw error;
    }
}

// Log any unhandled errors
self.addEventListener('error', event => {
    console.error('[Service Worker] Unhandled error:', event.error);
});

// Log any unhandled promise rejections
self.addEventListener('unhandledrejection', event => {
    console.error('[Service Worker] Unhandled promise rejection:', event.reason);
});
