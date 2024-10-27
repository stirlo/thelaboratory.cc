// sw.js
const CACHE_VERSION = 'v3';
const CACHE_NAME = `laboratory-${CACHE_VERSION}`;
const RUNTIME_CACHE = 'laboratory-runtime';

const CACHED_ASSETS = [
    // HTML
    '/',
    '/index.html',
    '/status.html',
    '/thankyou.html',

    // JavaScript
    '/assets/js/main.js',
    '/assets/js/sites.js',
    '/assets/js/status.js',
    '/assets/js/thankyou.js',

    // CSS
    '/assets/css/style.css',

    // Data
    '/assets/data/thankyou.txt',

    // Project Images
    '/assets/images/projects/zmanim_ICS.png',
    '/assets/images/projects/adhan-flipper-512x512.png',
    '/assets/images/projects/adhan-swift-512x512.png',
    '/assets/images/projects/infinitereality.cc-384x384.png',
    '/assets/images/projects/JPT-flipper-512x512.png',
    '/assets/images/projects/oursquadis.top-512x512.png',
    '/assets/images/projects/stirlo.be-512x512.png',
    '/assets/images/projects/stirlo.space-512x512.png',
    '/assets/images/projects/tfp-green-512.png',
    '/assets/images/projects/thegossroom-512x512.png',
    '/assets/images/projects/alarm-clock.svg',
    '/assets/images/projects/apple-touch-icon.png',

    // Icons
    '/assets/images/icons/android-chrome-192x192.png',
    '/assets/images/icons/android-chrome-512x512.png',
    '/assets/images/icons/apple-touch-icon.png',
    '/assets/images/icons/favicon-32x32.png',
    '/assets/images/icons/favicon-16x16.png',
    '/assets/images/icons/safari-pinned-tab.svg',

    // Manifest
    '/site.webmanifest'
];

// [Rest of the service worker code remains the same as provided in the previous message]


// Install event with improved error handling
self.addEventListener('install', event => {
    console.log('[SW] Installing new version...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell and assets');
                return cache.addAll(CACHED_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('[SW] Install failed:', error);
                throw error;
            })
    );
});

// Activate event with clean up
self.addEventListener('activate', event => {
    console.log('[SW] Activating new version...');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => (name.startsWith('laboratory-') || name === RUNTIME_CACHE) && name !== CACHE_NAME)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            }),
            // Take control immediately
            self.clients.claim()
        ])
    );
});

// Enhanced fetch event handler
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Handle API requests (GitHub)
    if (url.hostname === 'api.github.com') {
        event.respondWith(handleApiRequest(event.request));
        return;
    }

    // Handle badge requests (shields.io)
    if (url.hostname.includes('shields.io')) {
        event.respondWith(handleBadgeRequest(event.request));
        return;
    }

    // Handle status data requests
    if (url.pathname.includes('/status-data')) {
        event.respondWith(handleStatusDataRequest(event.request));
        return;
    }

    // Handle static assets
    if (CACHED_ASSETS.includes(url.pathname)) {
        event.respondWith(handleStaticAsset(event.request));
        return;
    }

    // Default handling
    event.respondWith(handleDefaultRequest(event.request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('API data unavailable offline', { status: 503 });
    }
}

// Handle badge requests with stale-while-revalidate strategy
async function handleBadgeRequest(request) {
    const cache = await caches.open(RUNTIME_CACHE);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request)
        .then(response => {
            cache.put(request, response.clone());
            return response;
        });

    return cachedResponse || fetchPromise;
}

// Handle status data with network-first strategy
async function handleStatusDataRequest(request) {
    try {
        const response = await fetch(request);
        const cache = await caches.open(RUNTIME_CACHE);
        await cache.put(request, response.clone());
        return response;
    } catch (error) {
        return caches.match(request);
    }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Static asset fetch failed:', error);
        return new Response('Asset unavailable offline', { status: 503 });
    }
}

// Handle default requests with network-first strategy
async function handleDefaultRequest(request) {
    try {
        const response = await fetch(request);
        if (response.ok && (response.type === 'basic' || response.type === 'cors')) {
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Content unavailable offline', { status: 503 });
    }
}

// Background sync support
self.addEventListener('sync', event => {
    if (event.tag === 'status-update') {
        event.waitUntil(
            fetch('/status-data')
                .then(response => {
                    if (response.ok) {
                        return caches.open(RUNTIME_CACHE)
                            .then(cache => cache.put('/status-data', response));
                    }
                })
                .catch(console.error)
        );
    }
});

// Push notification support
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/assets/images/projects/apple-touch-icon.png',
        badge: '/assets/images/projects/apple-touch-icon.png'
    };

    event.waitUntil(
        self.registration.showNotification('The Laboratory', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});

// Error handling
self.addEventListener('error', event => {
    console.error('[SW] Unhandled error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});
