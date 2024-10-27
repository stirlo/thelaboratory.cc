const CACHE_NAME = 'laboratory-v3';
const OFFLINE_URL = '/offline.html';

const CACHED_ASSETS = [
    '/',
    '/index.html',
    '/status.html',
    '/thankyou.html',
    '/offline.html',
    '/assets/css/style.css',
    '/assets/js/sites.js',
    '/assets/js/status.js',
    '/assets/js/thankyou.js',
    '/site.webmanifest',
    '/assets/images/icons/favicon.ico',
    '/assets/images/icons/apple-touch-icon.png'
];

const CACHE_STRATEGIES = {
    cacheFirst: [
        '/assets/images/',
        '/assets/css/',
        '/assets/fonts/',
        'favicon',
        '.ico',
        '.png',
        '.jpg',
        '.jpeg',
        '.webp',
        '.css',
        '.woff2'
    ],
    networkFirst: [
        '/status',
        '/api/',
        'github.com'
    ]
};

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell and assets');
                return cache.addAll(CACHED_ASSETS)
                    .catch(error => {
                        console.error('[SW] Cache addAll error:', error);
                        return Promise.resolve();
                    });
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.all([
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames
                            .filter(cacheName => cacheName !== CACHE_NAME)
                            .map(cacheName => caches.delete(cacheName))
                    );
                }),
            self.clients.claim()
        ])
    );
});

function shouldCacheFirst(url) {
    return CACHE_STRATEGIES.cacheFirst.some(pattern => url.includes(pattern));
}

function shouldNetworkFirst(url) {
    return CACHE_STRATEGIES.networkFirst.some(pattern => url.includes(pattern));
}

async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return new Response('Network error happened', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return caches.match(OFFLINE_URL);
    }
}

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Skip non-HTTP(S) requests and browser-extension requests
    if (!url.protocol.startsWith('http')) return;

    // Handle same-origin requests only
    if (url.origin !== self.location.origin) {
        if (!event.request.url.includes('github.com')) return;
    }

    event.respondWith(
        (async () => {
            try {
                if (shouldCacheFirst(url.pathname)) {
                    return await cacheFirstStrategy(event.request);
                }
                if (shouldNetworkFirst(url.pathname)) {
                    return await networkFirstStrategy(event.request);
                }
                // Default to network-first for everything else
                return await networkFirstStrategy(event.request);
            } catch (error) {
                console.error('[SW] Fetch handler error:', error);
                return caches.match(OFFLINE_URL);
            }
        })()
    );
});

// Handle service worker updates
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Error handling
self.addEventListener('error', event => {
    console.error('[SW] Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});
